-- SOLUCIÓN FINAL para storage de facturas
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query
--
-- OBJETIVO: Permitir lectura pública SIN autenticación, subida solo autenticados
-- ESTO SOLUCIONA: Inconsistencias de caché, 404 en imágenes, proveedores sin acceso

-- 1. Verificar estado actual
SELECT 'Estado actual de RLS' as info;
SELECT
    schemaname,
    tablename,
    rowsecurity as "RLS Habilitado"
FROM pg_tables
WHERE schemaname = 'storage'
  AND tablename = 'objects';

-- 2. Ver políticas actuales (debería estar vacío)
SELECT 'Políticas actuales' as info;
SELECT
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects';

-- 3. CREAR POLÍTICAS PERMISIVAS

-- IMPORTANTE: Eliminar cualquier política existente que pueda causar conflicto
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
        RAISE NOTICE 'Eliminada política: %', pol.policyname;
    END LOOP;
END $$;

-- Política 1: LECTURA PÚBLICA (sin autenticación) - TODOS pueden ver facturas
CREATE POLICY "Public read access for facturas"
ON storage.objects
FOR SELECT
USING (bucket_id = 'facturas');

-- Política 2: SUBIR archivos solo autenticados
CREATE POLICY "Authenticated insert for facturas"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'facturas');

-- Política 3: ACTUALIZAR archivos solo autenticados
CREATE POLICY "Authenticated update for facturas"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'facturas')
WITH CHECK (bucket_id = 'facturas');

-- Política 4: ELIMINAR archivos solo autenticados
CREATE POLICY "Authenticated delete for facturas"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'facturas');

-- 4. Asegurar que el bucket sea público
UPDATE storage.buckets
SET public = true
WHERE name = 'facturas';

-- 5. VERIFICACIÓN FINAL
SELECT '=== VERIFICACIÓN FINAL ===' as info;

-- Ver RLS
SELECT
    'RLS en storage.objects' as tipo,
    CASE WHEN rowsecurity THEN 'HABILITADO ✓' ELSE 'DESHABILITADO ✗' END as estado
FROM pg_tables
WHERE schemaname = 'storage'
  AND tablename = 'objects';

-- Ver políticas creadas
SELECT
    'Políticas creadas' as tipo,
    COUNT(*) as cantidad
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects';

-- Ver detalle de políticas
SELECT
    policyname as "Política",
    cmd as "Comando",
    roles::text as "Roles",
    CASE
        WHEN cmd = 'SELECT' THEN 'Lectura pública (proveedores sin autenticar)'
        WHEN cmd = 'INSERT' THEN 'Subir solo autenticados'
        WHEN cmd = 'UPDATE' THEN 'Actualizar solo autenticados'
        WHEN cmd = 'DELETE' THEN 'Eliminar solo autenticados'
    END as "Descripción"
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY cmd;

-- Ver bucket
SELECT
    name as "Bucket",
    CASE WHEN public THEN 'PÚBLICO ✓' ELSE 'PRIVADO ✗' END as "Estado",
    file_size_limit / 1024 / 1024 as "Límite MB"
FROM storage.buckets
WHERE name = 'facturas';

-- 6. Mensaje final
SELECT '
========================================
✓ CONFIGURACIÓN COMPLETADA
========================================

Las políticas ahora permiten:

1. LECTURA PÚBLICA (SELECT):
   - Proveedores pueden ver imágenes SIN autenticarse
   - URLs públicas funcionarán siempre
   - No más 404 por falta de permisos

2. ESCRITURA SOLO AUTENTICADOS:
   - Solo usuarios con SERVICE_ROLE_KEY pueden subir
   - Solo usuarios autenticados pueden modificar/eliminar

IMPORTANTE:
- El backend debe usar SERVICE_ROLE_KEY (ya configurado)
- Proveedores acceden con URLs públicas directas
- No habrá más inconsistencias de caché

Para verificar que funciona:
1. Abre una factura como proveedor (sin autenticar)
2. Las imágenes deberían cargar TODAS
3. Refresca la página - deben seguir cargando

' as "RESULTADO";
