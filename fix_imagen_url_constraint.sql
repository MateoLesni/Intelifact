-- Script para arreglar el constraint de imagen_url que está bloqueando uploads
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query

-- 1. Ver todos los constraints de la tabla factura_imagenes
SELECT
    con.conname AS constraint_name,
    con.contype AS constraint_type,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE rel.relname = 'factura_imagenes'
  AND nsp.nspname = 'public';

-- 2. Ver específicamente el constraint de imagen_url (si existe un CHECK constraint)
SELECT
    con.conname AS constraint_name,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'factura_imagenes'
  AND con.contype = 'c'  -- CHECK constraints
  AND pg_get_constraintdef(con.oid) LIKE '%imagen_url%';

-- 3. Ver la definición de la columna imagen_url
SELECT
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'factura_imagenes'
  AND column_name = 'imagen_url';

-- 4. Si encontraste un constraint problemático (por ejemplo, 'factura_imagenes_imagen_url_check'), eliminarlo:
-- DESCOMENTA LA SIGUIENTE LÍNEA DESPUÉS DE VERIFICAR EL NOMBRE DEL CONSTRAINT:
-- ALTER TABLE factura_imagenes DROP CONSTRAINT IF EXISTS factura_imagenes_imagen_url_check;

-- 5. OPCIONAL: Agregar un nuevo constraint más permisivo (solo valida que sea una URL)
-- ALTER TABLE factura_imagenes
-- ADD CONSTRAINT factura_imagenes_imagen_url_valid_url
-- CHECK (imagen_url ~ '^https?://[^\s]+$');

-- 6. Verificar que ya no hay constraints problemáticos
SELECT
    con.conname AS constraint_name,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'factura_imagenes'
  AND con.contype = 'c';
