-- Script para verificar constraints y validaciones en las tablas de InteliFact
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query

-- 1. Ver todos los constraints de la tabla facturas
SELECT
    con.conname AS constraint_name,
    con.contype AS constraint_type,
    CASE con.contype
        WHEN 'c' THEN 'CHECK constraint'
        WHEN 'f' THEN 'Foreign key'
        WHEN 'p' THEN 'Primary key'
        WHEN 'u' THEN 'Unique'
        WHEN 't' THEN 'Trigger'
        ELSE 'Other'
    END AS constraint_type_desc,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE rel.relname = 'facturas'
ORDER BY con.contype;

-- 2. Ver todos los constraints de la tabla factura_imagenes
SELECT
    con.conname AS constraint_name,
    con.contype AS constraint_type,
    CASE con.contype
        WHEN 'c' THEN 'CHECK constraint'
        WHEN 'f' THEN 'Foreign key'
        WHEN 'p' THEN 'Primary key'
        WHEN 'u' THEN 'Unique'
        WHEN 't' THEN 'Trigger'
        ELSE 'Other'
    END AS constraint_type_desc,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE rel.relname = 'factura_imagenes'
ORDER BY con.contype;

-- 3. Ver estructura completa de la tabla facturas con tipos de datos
SELECT
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'facturas'
ORDER BY ordinal_position;

-- 4. Ver estructura completa de la tabla factura_imagenes
SELECT
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'factura_imagenes'
ORDER BY ordinal_position;

-- 5. Verificar si hay dominios personalizados con validaciones
SELECT
    t.typname AS domain_name,
    pg_catalog.format_type(t.typbasetype, t.typtypmod) AS base_type,
    pg_catalog.pg_get_constraintdef(c.oid, true) AS check_constraint
FROM pg_catalog.pg_type t
LEFT JOIN pg_catalog.pg_constraint c ON (t.oid = c.contypid)
WHERE t.typtype = 'd'
ORDER BY 1;

-- 6. Ver las últimas facturas insertadas exitosamente para comparar formato
SELECT
    id,
    fecha,
    local,
    nro_factura,
    nro_oc,
    proveedor,
    categoria,
    usuario_carga_id,
    created_at
FROM facturas
ORDER BY created_at DESC
LIMIT 5;
