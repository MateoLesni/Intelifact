-- Script para verificar triggers y funciones que puedan estar eliminando facturas
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query

-- 1. Ver todos los triggers en la tabla facturas
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing,
    action_orientation
FROM information_schema.triggers
WHERE event_object_table = 'facturas'
ORDER BY trigger_name;

-- 2. Ver funciones que puedan estar relacionadas con eliminación
SELECT
    n.nspname as schema,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE pg_get_functiondef(p.oid) ILIKE '%facturas%'
  AND pg_get_functiondef(p.oid) ILIKE '%delete%'
ORDER BY function_name;

-- 3. Ver constraints CASCADE que puedan estar eliminando facturas
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND (tc.table_name = 'facturas' OR ccu.table_name = 'facturas')
  AND rc.delete_rule = 'CASCADE';
