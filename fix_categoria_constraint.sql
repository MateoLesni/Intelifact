-- Script para eliminar el CHECK constraint restrictivo en la columna categoria
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query

-- 1. Ver el constraint actual
SELECT
    con.conname AS constraint_name,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'facturas' AND con.conname = 'facturas_categoria_check';

-- 2. Eliminar el CHECK constraint restrictivo
ALTER TABLE facturas DROP CONSTRAINT IF EXISTS facturas_categoria_check;

-- 3. Verificar que se eliminó correctamente
SELECT
    con.conname AS constraint_name,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'facturas' AND con.conname = 'facturas_categoria_check';
-- (No debería devolver ninguna fila)

-- 4. Ver todas las categorías actualmente en uso
SELECT DISTINCT categoria
FROM facturas
WHERE categoria IS NOT NULL
ORDER BY categoria;

-- 5. Ver todas las categorías en la tabla locales
SELECT DISTINCT categoria
FROM locales
WHERE categoria IS NOT NULL
ORDER BY categoria;

-- OPCIONAL: Si quieres agregar un nuevo CHECK constraint más flexible
-- que permita NULL o cualquier texto no vacío (descomenta si lo necesitas):
/*
ALTER TABLE facturas
ADD CONSTRAINT facturas_categoria_check
CHECK (categoria IS NULL OR LENGTH(TRIM(categoria)) > 0);
*/

-- 6. Verificar estructura final de la tabla facturas
\d facturas
