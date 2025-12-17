-- Script para verificar constraints en la tabla facturas
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query

-- 1. Ver todos los constraints de la tabla facturas
SELECT
    con.conname AS constraint_name,
    con.contype AS constraint_type,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE rel.relname = 'facturas'
  AND nsp.nspname = 'public';

-- 2. Ver específicamente CHECK constraints
SELECT
    con.conname AS constraint_name,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'facturas'
  AND con.contype = 'c'  -- CHECK constraints
ORDER BY con.conname;

-- 3. Ver definición de columnas que podrían tener patterns (nro_factura, nro_oc, etc)
SELECT
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'facturas'
  AND column_name IN ('nro_factura', 'nro_oc', 'local', 'proveedor', 'fecha')
ORDER BY ordinal_position;

-- 4. Si encuentras un constraint problemático, eliminarlo:
-- EJEMPLO: ALTER TABLE facturas DROP CONSTRAINT IF EXISTS facturas_nro_factura_check;
-- EJEMPLO: ALTER TABLE facturas DROP CONSTRAINT IF EXISTS facturas_nro_oc_check;

-- 5. Verificar constraints después de eliminar
SELECT
    con.conname AS constraint_name,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'facturas'
  AND con.contype = 'c';
