// Esta clave es pública. La autorización de los datos la aplican las políticas RLS.
export const SUPABASE_URL = "https://qipwjpllecrkoegfknbx.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_f_OPTtNjfvPLCeBavADdaQ_QO_kBo82";

export const DEMO_BUSINESS_ID = "117545fa-f439-4723-bbad-a80bde548581";

let clientPromise;

export function getClient() {
  if (!clientPromise) {
    clientPromise =
      import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm")
        .then(({ createClient }) =>
          createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY),
        )
        .catch(() => {
          clientPromise = null;
          throw new Error(
            "No se pudo conectar. Comprueba tu conexión y vuelve a intentarlo.",
          );
        });
  }

  return clientPromise;
}
