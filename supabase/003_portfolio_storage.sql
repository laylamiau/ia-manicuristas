-- Configura Storage sin credenciales privilegiadas en el frontend.
-- Ejecutar en Supabase SQL Editor. Reutiliza el bucket si ya existe.
-- El bucket queda PRIVADO. Los archivos se leen con URL firmada (1 hora).
-- Las asociaciones y los trabajos se consultan respetando su RLS existente.
BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('portfolio', 'portfolio', false, 5242880,
        ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "portfolio_member_access" ON storage.objects;
CREATE POLICY "portfolio_member_access"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'portfolio' AND (auth.role() = 'authenticated' AND EXISTS (
      SELECT 1 FROM public.business_users AS membership
      WHERE membership.user_id = (SELECT auth.uid())
        AND membership.business_id::text = (storage.foldername(name))[1]
    )))
  WITH CHECK (bucket_id = 'portfolio' AND (auth.role() = 'authenticated' AND EXISTS (
      SELECT 1 FROM public.business_users AS membership
      WHERE membership.user_id = (SELECT auth.uid())
        AND membership.business_id::text = (storage.foldername(name))[1]
    )));

-- Una imagen asociada a un trabajo solo es legible si ese trabajo lo es.
-- No se añade ninguna política pública a la tabla public.portfolio.
DROP POLICY IF EXISTS "portfolio_visible_images" ON storage.objects;
CREATE POLICY "portfolio_visible_images"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'portfolio' AND ((auth.role() = 'authenticated' AND EXISTS (
      SELECT 1 FROM public.business_users AS membership
      WHERE membership.user_id = (SELECT auth.uid())
        AND membership.business_id::text = (storage.foldername(name))[1]
    )) OR EXISTS (
      SELECT 1 FROM public.portfolio AS item
      WHERE item.image_url = storage.objects.name
        AND item.business_id::text = (storage.foldername(storage.objects.name))[1]
    )));

-- Límites restrictivos: otras políticas permisivas preexistentes no pueden
-- abrir escrituras de este bucket a anónimos o a negocios ajenos.
-- No restringen las operaciones sobre otros buckets.

DROP POLICY IF EXISTS "portfolio_guard_insert" ON storage.objects;
CREATE POLICY "portfolio_guard_insert"
  ON storage.objects AS RESTRICTIVE FOR INSERT TO public
  WITH CHECK (bucket_id <> 'portfolio' OR (auth.role() = 'authenticated' AND EXISTS (
      SELECT 1 FROM public.business_users AS membership
      WHERE membership.user_id = (SELECT auth.uid())
        AND membership.business_id::text = (storage.foldername(name))[1]
    )));

DROP POLICY IF EXISTS "portfolio_guard_update" ON storage.objects;
CREATE POLICY "portfolio_guard_update"
  ON storage.objects AS RESTRICTIVE FOR UPDATE TO public
  USING (bucket_id <> 'portfolio' OR (auth.role() = 'authenticated' AND EXISTS (
      SELECT 1 FROM public.business_users AS membership
      WHERE membership.user_id = (SELECT auth.uid())
        AND membership.business_id::text = (storage.foldername(name))[1]
    )))
  WITH CHECK (bucket_id <> 'portfolio' OR (auth.role() = 'authenticated' AND EXISTS (
      SELECT 1 FROM public.business_users AS membership
      WHERE membership.user_id = (SELECT auth.uid())
        AND membership.business_id::text = (storage.foldername(name))[1]
    )));

DROP POLICY IF EXISTS "portfolio_guard_delete" ON storage.objects;
CREATE POLICY "portfolio_guard_delete"
  ON storage.objects AS RESTRICTIVE FOR DELETE TO public
  USING (bucket_id <> 'portfolio' OR (auth.role() = 'authenticated' AND EXISTS (
      SELECT 1 FROM public.business_users AS membership
      WHERE membership.user_id = (SELECT auth.uid())
        AND membership.business_id::text = (storage.foldername(name))[1]
    )));

DROP POLICY IF EXISTS "portfolio_guard_select" ON storage.objects;
CREATE POLICY "portfolio_guard_select"
  ON storage.objects AS RESTRICTIVE FOR SELECT TO public
  USING (bucket_id <> 'portfolio' OR ((auth.role() = 'authenticated' AND EXISTS (
      SELECT 1 FROM public.business_users AS membership
      WHERE membership.user_id = (SELECT auth.uid())
        AND membership.business_id::text = (storage.foldername(name))[1]
    )) OR EXISTS (
      SELECT 1 FROM public.portfolio AS item
      WHERE item.image_url = storage.objects.name
        AND item.business_id::text = (storage.foldername(storage.objects.name))[1]
    )));

COMMIT;
