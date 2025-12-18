-- Script para deshabilitar RLS en storage.objects (SOLUCIÓN TEMPORAL)
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query

-- IMPORTANTE: Esto deshabilita Row Level Security para storage.objects
-- Esto permite que el backend con ANON_KEY pueda subir archivos

-- 1. Ver estado actual de RLS
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'storage'
  AND tablename = 'objects';

-- 2. DESHABILITAR RLS en storage.objects
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- 3. Verificar que se deshabilitó
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'storage'
  AND tablename = 'objects';

-- 4. Eliminar todas las políticas (ya no son necesarias sin RLS)
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
    END LOOP;
END $$;

-- 5. Verificar que no hay políticas
SELECT
    COUNT(*) as total_policies
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects';

-- 6. Asegurar que el bucket es público
UPDATE storage.buckets
SET public = true
WHERE name = 'facturas';

-- 7. Verificar configuración final
SELECT
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets
WHERE name = 'facturas';
