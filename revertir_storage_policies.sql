-- Script para REVERTIR los cambios de storage y restaurar el estado original
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query

-- 1. ELIMINAR las políticas que acabamos de crear
DROP POLICY IF EXISTS "Allow public read access to facturas" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated insert to facturas" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update to facturas" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete to facturas" ON storage.objects;

-- 2. Ver las políticas actuales (para verificar que se eliminaron)
SELECT
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY policyname;

-- 3. Ver configuración actual del bucket
SELECT
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets
WHERE name = 'facturas';

-- NOTA: Si el bucket estaba como public = false antes, ejecuta:
-- UPDATE storage.buckets SET public = false WHERE name = 'facturas';

-- 4. Verificar estado final
SELECT
    'Políticas de storage' as tipo,
    COUNT(*) as cantidad
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
UNION ALL
SELECT
    'Bucket facturas público',
    CASE WHEN public THEN 1 ELSE 0 END
FROM storage.buckets
WHERE name = 'facturas';
