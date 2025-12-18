-- Diagnóstico completo del estado actual de Storage
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query

-- 1. Ver estado de RLS en storage.objects
SELECT
    schemaname,
    tablename,
    rowsecurity as "RLS Habilitado"
FROM pg_tables
WHERE schemaname = 'storage'
  AND tablename = 'objects';

-- 2. Ver TODAS las políticas actuales en storage.objects
SELECT
    policyname as "Nombre de Política",
    cmd as "Comando (SELECT/INSERT/UPDATE/DELETE)",
    roles as "Roles",
    qual as "Condición USING",
    with_check as "Condición WITH CHECK"
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY policyname;

-- 3. Ver configuración del bucket 'facturas'
SELECT
    id,
    name as "Nombre Bucket",
    public as "Es Público",
    file_size_limit as "Límite de Tamaño",
    allowed_mime_types as "MIME Types Permitidos",
    avif_autodetection as "Auto AVIF"
FROM storage.buckets
WHERE name = 'facturas';

-- 4. Contar archivos en el bucket
SELECT
    COUNT(*) as "Total Archivos en Bucket"
FROM storage.objects
WHERE bucket_id = 'facturas';

-- 5. Ver archivos recientes y su metadata
SELECT
    id,
    name as "Nombre Archivo",
    created_at as "Fecha Creación",
    metadata->>'size' as "Tamaño",
    metadata->>'mimetype' as "MIME Type"
FROM storage.objects
WHERE bucket_id = 'facturas'
ORDER BY created_at DESC
LIMIT 10;
