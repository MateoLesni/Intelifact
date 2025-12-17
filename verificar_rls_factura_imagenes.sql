-- Script para verificar las políticas RLS de factura_imagenes
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query

-- 1. Verificar si RLS está habilitado en factura_imagenes
SELECT
    schemaname,
    tablename,
    rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename = 'factura_imagenes';

-- 2. Ver todas las políticas RLS de factura_imagenes
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd AS operation,
    qual AS using_expression,
    with_check AS with_check_expression
FROM pg_policies
WHERE tablename = 'factura_imagenes';

-- 3. SOLUCIÓN TEMPORAL: Deshabilitar RLS para testing (NO RECOMENDADO EN PRODUCCIÓN)
-- DESCOMENTA SOLO SI QUIERES PROBAR SIN RLS:
-- ALTER TABLE factura_imagenes DISABLE ROW LEVEL SECURITY;

-- 4. SOLUCIÓN PERMANENTE: Crear política permisiva para INSERT
-- Esta política permite a usuarios autenticados insertar imágenes
DROP POLICY IF EXISTS "Allow authenticated users to insert images" ON factura_imagenes;

CREATE POLICY "Allow authenticated users to insert images"
ON factura_imagenes
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 5. Crear política permisiva para SELECT
DROP POLICY IF EXISTS "Allow authenticated users to read images" ON factura_imagenes;

CREATE POLICY "Allow authenticated users to read images"
ON factura_imagenes
FOR SELECT
TO authenticated
USING (true);

-- 6. Crear política permisiva para UPDATE
DROP POLICY IF EXISTS "Allow authenticated users to update images" ON factura_imagenes;

CREATE POLICY "Allow authenticated users to update images"
ON factura_imagenes
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 7. Crear política permisiva para DELETE
DROP POLICY IF EXISTS "Allow authenticated users to delete images" ON factura_imagenes;

CREATE POLICY "Allow authenticated users to delete images"
ON factura_imagenes
FOR DELETE
TO authenticated
USING (true);

-- 8. Verificar que las políticas se crearon correctamente
SELECT
    policyname,
    cmd AS operation,
    roles
FROM pg_policies
WHERE tablename = 'factura_imagenes';
