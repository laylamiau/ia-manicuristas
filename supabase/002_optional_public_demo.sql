-- OPCIONAL: ejecutar únicamente si se quiere publicar la miniweb DEMO.
-- Permite leer el negocio DEMO, sus servicios y su portfolio sin iniciar sesión.
-- No concede escrituras ni acceso a citas, asociaciones u otros negocios.
-- El contenido futuro de este mismo negocio DEMO también será público.
BEGIN;

CREATE POLICY "Public can read the demo business"
  ON public.businesses
  FOR SELECT
  TO anon, authenticated
  USING (id = '117545fa-f439-4723-bbad-a80bde548581'::uuid);

CREATE POLICY "Public can read demo services"
  ON public.services
  FOR SELECT
  TO anon, authenticated
  USING (business_id = '117545fa-f439-4723-bbad-a80bde548581'::uuid);

CREATE POLICY "Public can read demo portfolio"
  ON public.portfolio
  FOR SELECT
  TO anon, authenticated
  USING (business_id = '117545fa-f439-4723-bbad-a80bde548581'::uuid);

COMMIT;
