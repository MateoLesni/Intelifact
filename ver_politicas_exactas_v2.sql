-- Ver EXACTAMENTE qué políticas existen y cómo están configuradas
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query

SELECT
    policyname as "Nombre Política",
    cmd as "Comando",
    roles::text as "Roles Permitidos",
    qual as "Condición USING (raw)",
    with_check as "Condición WITH CHECK (raw)",

    -- Interpretación
    CASE
        WHEN cmd = 'SELECT' AND roles::text LIKE '%public%' THEN '✓ Lectura pública OK'
        WHEN cmd = 'SELECT' AND roles::text LIKE '%authenticated%' THEN '⚠ Lectura solo autenticados'
        WHEN cmd = 'INSERT' AND roles::text LIKE '%authenticated%' THEN '✓ Subida solo autenticados OK'
        WHEN cmd = 'INSERT' AND roles::text LIKE '%anon%' THEN '⚠ Subida con ANON_KEY'
        WHEN cmd = 'UPDATE' AND roles::text LIKE '%authenticated%' THEN '✓ Actualización solo autenticados OK'
        WHEN cmd = 'DELETE' AND roles::text LIKE '%authenticated%' THEN '✓ Eliminación solo autenticados OK'
        ELSE '? Configuración no estándar'
    END as "Estado"

FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY cmd, policyname;

-- Ver si RLS está habilitado
SELECT
    'RLS Status' as info,
    CASE WHEN rowsecurity THEN 'HABILITADO ⚠' ELSE 'DESHABILITADO' END as estado
FROM pg_tables
WHERE schemaname = 'storage'
  AND tablename = 'objects';

-- Contar políticas por tipo
SELECT
    cmd as "Tipo Operación",
    COUNT(*) as "Cantidad de Políticas"
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
GROUP BY cmd
ORDER BY cmd;
