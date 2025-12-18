-- Verificar que las políticas se crearon correctamente
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query

-- 1. Ver cuántas políticas hay
SELECT
    COUNT(*) as "Total Políticas"
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects';

-- 2. Ver detalle de cada política
SELECT
    policyname as "Nombre Política",
    cmd as "Comando",
    roles::text as "Roles",
    qual as "Condición USING",
    with_check as "Condición WITH CHECK"
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY cmd;

-- 3. Ver si el bucket es público
SELECT
    name as "Bucket",
    public as "Es Público",
    file_size_limit / 1024 / 1024 as "Límite MB"
FROM storage.buckets
WHERE name = 'facturas';
