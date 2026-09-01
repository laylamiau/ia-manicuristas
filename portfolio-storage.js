import { SUPABASE_URL } from "./supabase-client.js";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function validateImage(file) {
  if (!file || !IMAGE_TYPES[file.type]) {
    throw new Error("Elige una imagen JPG, PNG o WebP.");
  }
  if (!file.size || file.size > MAX_IMAGE_BYTES) {
    throw new Error("La imagen debe ocupar entre 1 byte y 5 MB.");
  }
}

export async function uploadImage(client, businessId, file) {
  validateImage(file);
  const path = `${businessId}/${crypto.randomUUID()}.${IMAGE_TYPES[file.type]}`;
  const { error } = await client.storage.from("portfolio").upload(path, file, {
    contentType: file.type,
    cacheControl: "3600",
    upsert: false,
  });
  if (error) {
    throw new Error(
      "No se pudo subir la imagen. Comprueba la conexión y que el almacenamiento esté configurado para tu negocio.",
    );
  }
  return path;
}

// Conserva las URL externas antiguas. Las rutas nuevas se firman al leer,
// nunca se guarda en la tabla una URL temporal que acabaría caducando.
export async function resolveImage(client, value, businessId) {
  if (!value) return { image: "", imageError: false };
  let path = value;
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      const prefix = "/storage/v1/object/public/portfolio/";
      if (url.origin !== SUPABASE_URL || !url.pathname.startsWith(prefix)) {
        return { image: value, imageError: false };
      }
      path = decodeURIComponent(url.pathname.slice(prefix.length));
    } catch {
      return { image: "", imageError: true };
    }
  }
  if (!path.startsWith(`${businessId}/`) || path.includes("..")) {
    return { image: "", imageError: true };
  }
  try {
    const { data, error } = await client.storage
      .from("portfolio")
      .createSignedUrl(path, 3600);
    return { image: error ? "" : data.signedUrl, imageError: Boolean(error) };
  } catch {
    return { image: "", imageError: true };
  }
}
