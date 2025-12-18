-- Script SIMPLIFICADO para crear políticas de storage
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query

-- PASO 1: Ver estado actual
SELECT
    'Estado Actual' as info,
    COUNT(*) as "Total Políticas Actuales"
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects';

-- PASO 2: Eliminar políticas existentes (si las hay)
DROP POLICY IF EXISTS "Public read access for facturas" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated insert for facturas" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update for facturas" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete for facturas" ON storage.objects;

-- También eliminar políticas antiguas que puedan existir
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to facturas" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated insert to facturas" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update to facturas" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete to facturas" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read facturas" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload facturas" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update facturas" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete facturas" ON storage.objects;
DROP POLICY IF EXISTS "Public can read facturas" ON storage.objects;

-- PASO 3: Crear las 4 políticas necesarias

-- Política 1: Lectura PÚBLICA (sin autenticación)
CREATE POLICY "Public read for facturas"
ON storage.objects
FOR SELECT
USING (bucket_id = 'facturas');

-- Política 2: Subir solo autenticados
CREATE POLICY "Auth insert for facturas"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'facturas');

-- Política 3: Actualizar solo autenticados
CREATE POLICY "Auth update for facturas"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'facturas')
WITH CHECK (bucket_id = 'facturas');

-- Política 4: Eliminar solo autenticados
CREATE POLICY "Auth delete for facturas"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'facturas');

-- PASO 4: Asegurar bucket público
UPDATE storage.buckets
SET public = true
WHERE name = 'facturas';

-- PASO 5: VERIFICACIÓN FINAL
SELECT '========== VERIFICACIÓN ==========' as info;

SELECT
    'Políticas Creadas' as tipo,
    COUNT(*) as cantidad
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects';

SELECT
    policyname as "Política",
    cmd as "Comando",
    roles::text as "Roles"
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY cmd;

SELECT
    name as "Bucket",
    public as "Es Público"
FROM storage.buckets
WHERE name = 'facturas';

-- Mensaje de resultado
SELECT
CASE
    WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects') = 4
    THEN '✓ ÉXITO: 4 políticas creadas correctamente'
    ELSE '✗ ERROR: No se crearon todas las políticas'
END as "RESULTADO";
