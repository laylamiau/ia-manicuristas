import { getClient } from "./supabase-client.js";

const BUSINESS_COLUMNS =
  "id,name,tagline,address,schedule,instagram,tiktok,whatsapp,booking_url";
const SERVICE_COLUMNS = "id,name,price";
const PORTFOLIO_COLUMNS = "id,title,service,image_url,description";

export function databaseError(error) {
  if (["42703", "PGRST204"].includes(error.code)) {
    return new Error(
      "Falta aplicar la actualización de la base de datos. Contacta con quien administra la web.",
    );
  }

  if (["42501", "PGRST301", "PGRST302"].includes(error.code)) {
    return new Error(
      "Tu sesión no tiene permiso para esta operación. Vuelve a iniciar sesión.",
    );
  }

  return new Error(
    "No se pudo completar la operación. Comprueba tu conexión y vuelve a intentarlo.",
  );
}

function unwrap(result) {
  if (result.error) throw databaseError(result.error);
  return result.data;
}

function businessFromRow(row) {
  return {
    id: row.id,
    name: row.name,
    tagline: row.tagline ?? "",
    location: row.address ?? "",
    schedule: row.schedule ?? "",
    instagram: row.instagram ?? "",
    tiktok: row.tiktok ?? "",
    whatsapp: row.whatsapp ?? "",
    bookingUrl: row.booking_url ?? "",
  };
}

function portfolioFromRow(row) {
  return {
    id: row.id,
    title: row.title ?? "",
    service: row.service ?? "",
    image: row.image_url ?? "",
    note: row.description ?? "",
  };
}

export async function getMemberships(userId) {
  const client = await getClient();
  const memberships = unwrap(
    await client
      .from("business_users")
      .select("business_id")
      .eq("user_id", userId),
  );
  const ids = [...new Set(memberships.map((item) => item.business_id))];
  if (!ids.length) return [];

  return unwrap(
    await client
      .from("businesses")
      .select("id,name")
      .in("id", ids)
      .order("name"),
  );
}

export async function getData(businessId) {
  const client = await getClient();
  const business = unwrap(
    await client
      .from("businesses")
      .select(BUSINESS_COLUMNS)
      .eq("id", businessId)
      .maybeSingle(),
  );

  if (!business) {
    throw new Error(
      "La miniweb no está disponible o tu cuenta no tiene acceso a este negocio.",
    );
  }

  const [services, portfolio] = await Promise.all([
    client
      .from("services")
      .select(SERVICE_COLUMNS)
      .eq("business_id", businessId)
      .order("created_at")
      .order("id"),
    client
      .from("portfolio")
      .select(PORTFOLIO_COLUMNS)
      .eq("business_id", businessId)
      .order("created_at")
      .order("id"),
  ]);

  return {
    business: businessFromRow(business),
    services: unwrap(services),
    portfolio: unwrap(portfolio).map(portfolioFromRow),
  };
}

async function authorizedClient(context) {
  const client = await getClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user || data.user.id !== context.userId) {
    throw new Error(
      "Tu sesión ha cambiado. Vuelve a iniciar sesión antes de guardar.",
    );
  }

  const memberships = unwrap(
    await client
      .from("business_users")
      .select("business_id")
      .eq("user_id", data.user.id)
      .eq("business_id", context.businessId),
  );

  if (!memberships.length) {
    throw new Error("Tu cuenta ya no tiene acceso a este negocio.");
  }

  // Estos filtros evitan errores en la interfaz; RLS sigue siendo la autoridad.
  return client;
}

function changedRow(result) {
  const rows = unwrap(result);
  if (rows.length !== 1) {
    throw new Error(
      "No se guardó el cambio. El registro ya no existe o no tienes permiso.",
    );
  }
  return rows[0];
}

export async function updateBusiness(context, fields) {
  const client = await authorizedClient(context);
  const columns = {
    name: "name",
    tagline: "tagline",
    location: "address",
    schedule: "schedule",
    instagram: "instagram",
    tiktok: "tiktok",
    whatsapp: "whatsapp",
    bookingUrl: "booking_url",
  };
  const patch = Object.fromEntries(
    Object.entries(fields)
      .filter(([key]) => Object.hasOwn(columns, key))
      .map(([key, value]) => [columns[key], value]),
  );

  return businessFromRow(
    changedRow(
      await client
        .from("businesses")
        .update(patch)
        .eq("id", context.businessId)
        .select(BUSINESS_COLUMNS),
    ),
  );
}

export async function addService(context, fields) {
  const client = await authorizedClient(context);
  return changedRow(
    await client
      .from("services")
      .insert({
        business_id: context.businessId,
        name: fields.name,
        price: fields.price,
      })
      .select(SERVICE_COLUMNS),
  );
}

export async function addPortfolio(context, fields) {
  const client = await authorizedClient(context);
  const row = changedRow(
    await client
      .from("portfolio")
      .insert({
        business_id: context.businessId,
        title: fields.title,
        service: fields.service,
        image_url: fields.image,
        description: fields.note,
      })
      .select(PORTFOLIO_COLUMNS),
  );
  return portfolioFromRow(row);
}

export async function deleteItem(context, table, id) {
  if (!["services", "portfolio"].includes(table))
    throw new Error("Operación no válida.");
  const client = await authorizedClient(context);
  changedRow(
    await client
      .from(table)
      .delete()
      .eq("business_id", context.businessId)
      .eq("id", id)
      .select("id"),
  );
}
