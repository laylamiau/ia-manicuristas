-- Ejecutar una vez en Supabase SQL Editor. No elimina datos ni políticas.
-- Conserva los campos que ya ofrecía la web y faltaban en el esquema.
BEGIN;

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS booking_url text;

ALTER TABLE public.portfolio
  ADD COLUMN IF NOT EXISTS service text;

-- RLS ya está activo. Sin esta política, las políticas de las demás tablas
-- no pueden encontrar la asociación del usuario autenticado con su negocio.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'business_users'
      AND policyname = 'Users can read their own business memberships'
  ) THEN
    CREATE POLICY "Users can read their own business memberships"
      ON public.business_users
      FOR SELECT
      TO authenticated
      USING (user_id = (SELECT auth.uid()));
  END IF;
END;
$$;

COMMIT;
