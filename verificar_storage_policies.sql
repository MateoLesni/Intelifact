-- Script para verificar políticas de Storage
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query

-- 1. Ver todas las políticas del bucket 'facturas'
SELECT
    id,
    name,
    bucket_id,
    definition
FROM storage.policies
WHERE bucket_id = 'facturas';

-- 2. Ver configuración del bucket
SELECT
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets
WHERE name = 'facturas';

-- 3. SOLUCIÓN: Crear políticas permisivas para el bucket facturas
-- Permitir lectura pública (para que proveedores puedan ver las imágenes)

-- Eliminar políticas existentes si hay conflicto
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;

-- Política para lectura pública (cualquiera puede ver las imágenes)
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'facturas');

-- Política para subir archivos (solo usuarios autenticados)
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'facturas');

-- Política para actualizar archivos (solo usuarios autenticados)
CREATE POLICY "Authenticated users can update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'facturas')
WITH CHECK (bucket_id = 'facturas');

-- Política para eliminar archivos (solo usuarios autenticados)
CREATE POLICY "Authenticated users can delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'facturas');

-- 4. Verificar que las políticas se crearon correctamente
SELECT
    id,
    name,
    bucket_id,
    definition
FROM storage.policies
WHERE bucket_id = 'facturas';
