-- Script corregido para verificar y arreglar políticas de Storage
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query

-- 1. Ver configuración del bucket 'facturas'
SELECT
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets
WHERE name = 'facturas';

-- 2. IMPORTANTE: Hacer el bucket PÚBLICO
-- Esto permite que las URLs públicas funcionen sin autenticación
UPDATE storage.buckets
SET public = true
WHERE name = 'facturas';

-- 3. Verificar que el bucket ahora es público
SELECT
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets
WHERE name = 'facturas';

-- 4. Ver todas las políticas RLS de storage.objects
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects';

-- 5. ELIMINAR todas las políticas restrictivas del bucket facturas
-- (Solo ejecutar si hay políticas que estén bloqueando acceso)
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND (qual LIKE '%facturas%' OR with_check LIKE '%facturas%')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
    END LOOP;
END $$;

-- 6. Crear políticas simples y permisivas

-- Permitir SELECT (lectura) a TODOS para bucket facturas
CREATE POLICY "Allow public read access to facturas"
ON storage.objects FOR SELECT
USING (bucket_id = 'facturas');

-- Permitir INSERT (subir) solo a usuarios autenticados
CREATE POLICY "Allow authenticated insert to facturas"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'facturas');

-- Permitir UPDATE solo a usuarios autenticados
CREATE POLICY "Allow authenticated update to facturas"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'facturas')
WITH CHECK (bucket_id = 'facturas');

-- Permitir DELETE solo a usuarios autenticados
CREATE POLICY "Allow authenticated delete to facturas"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'facturas');

-- 7. Verificar políticas creadas
SELECT
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND (qual LIKE '%facturas%' OR with_check LIKE '%facturas%')
ORDER BY policyname;
