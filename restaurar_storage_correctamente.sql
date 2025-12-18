-- Script para RESTAURAR las políticas de storage correctamente
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query

-- IMPORTANTE: Este script restaura las políticas necesarias para que funcione el sistema

-- 1. Ver estado actual
SELECT
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY policyname;

-- 2. Crear políticas MÍNIMAS necesarias para que funcione

-- Permitir SELECT (lectura) a usuarios autenticados
CREATE POLICY "Authenticated users can read facturas"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'facturas');

-- Permitir INSERT (subir) a usuarios autenticados
CREATE POLICY "Authenticated users can upload facturas"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'facturas');

-- Permitir UPDATE a usuarios autenticados
CREATE POLICY "Authenticated users can update facturas"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'facturas')
WITH CHECK (bucket_id = 'facturas');

-- Permitir DELETE a usuarios autenticados
CREATE POLICY "Authenticated users can delete facturas"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'facturas');

-- 3. ADEMÁS: Permitir lectura PÚBLICA (para que proveedores puedan ver sin autenticarse)
CREATE POLICY "Public can read facturas"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'facturas');

-- 4. Asegurar que el bucket sea público
UPDATE storage.buckets
SET public = true
WHERE name = 'facturas';

-- 5. Verificar políticas creadas
SELECT
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY policyname;

-- 6. Verificar configuración del bucket
SELECT
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets
WHERE name = 'facturas';
