-- Ver EXACTAMENTE qué políticas existen y cómo están configuradas
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query

SELECT
    policyname as "Nombre Política",
    cmd as "Comando",
    roles::text as "Roles Permitidos",

    -- Mostrar la condición USING de forma legible
    CASE
        WHEN qual IS NOT NULL THEN pg_get_expr(qual, 'storage.objects'::regclass)
        ELSE '(sin condición)'
    END as "Condición USING",

    -- Mostrar la condición WITH CHECK de forma legible
    CASE
        WHEN with_check IS NOT NULL THEN pg_get_expr(with_check, 'storage.objects'::regclass)
        ELSE '(sin condición)'
    END as "Condición WITH CHECK",

    -- Interpretación
    CASE
        WHEN cmd = 'SELECT' AND roles::text = '{public}' THEN '✓ Lectura pública OK'
        WHEN cmd = 'SELECT' AND roles::text = '{authenticated}' THEN '⚠ Lectura solo autenticados'
        WHEN cmd = 'INSERT' AND roles::text = '{authenticated}' THEN '✓ Subida solo autenticados OK'
        WHEN cmd = 'INSERT' AND roles::text = '{anon}' THEN '⚠ Subida con ANON_KEY permitida'
        WHEN cmd = 'UPDATE' AND roles::text = '{authenticated}' THEN '✓ Actualización solo autenticados OK'
        WHEN cmd = 'DELETE' AND roles::text = '{authenticated}' THEN '✓ Eliminación solo autenticados OK'
        ELSE '? Configuración no estándar'
    END as "Estado"

FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY cmd, policyname;

-- Ver si RLS está habilitado
SELECT
    'RLS Status' as info,
    CASE WHEN rowsecurity THEN 'HABILITADO' ELSE 'DESHABILITADO' END as estado
FROM pg_tables
WHERE schemaname = 'storage'
  AND tablename = 'objects';
