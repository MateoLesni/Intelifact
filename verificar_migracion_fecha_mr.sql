-- Script para verificar la migración de fecha_mr y fecha_mr_timestamp
-- Ejecutar DESPUÉS de agregar_fecha_mr_timestamp.sql

-- 1. Verificar que TODAS las facturas con MR tienen ambas fechas
SELECT
    'Facturas con MR pero sin fecha_mr' as alerta,
    COUNT(*) as cantidad
FROM facturas
WHERE mr_estado = true AND fecha_mr IS NULL
UNION ALL
SELECT
    'Facturas con MR pero sin fecha_mr_timestamp' as alerta,
    COUNT(*) as cantidad
FROM facturas
WHERE mr_estado = true AND fecha_mr_timestamp IS NULL
UNION ALL
SELECT
    'Facturas con MR y ambas fechas (OK)' as alerta,
    COUNT(*) as cantidad
FROM facturas
WHERE mr_estado = true AND fecha_mr IS NOT NULL AND fecha_mr_timestamp IS NOT NULL;

-- 2. Verificar que las fechas coinciden (mismo día)
-- Detectar inconsistencias donde la fecha DATE y el día del TIMESTAMP no coinciden
SELECT
    id,
    nro_factura,
    mr_numero,
    fecha_mr,
    fecha_mr_timestamp,
    DATE(fecha_mr_timestamp) as fecha_del_timestamp,
    CASE
        WHEN fecha_mr::DATE = DATE(fecha_mr_timestamp) THEN 'OK'
        ELSE 'INCONSISTENTE'
    END as estado
FROM facturas
WHERE mr_estado = true
  AND fecha_mr IS NOT NULL
  AND fecha_mr_timestamp IS NOT NULL
  AND fecha_mr::DATE != DATE(fecha_mr_timestamp)
LIMIT 20;

-- 3. Ver distribución por fecha (ambas columnas)
SELECT
    fecha_mr,
    COUNT(*) as facturas_con_mr,
    MIN(fecha_mr_timestamp) as primera_mr_del_dia,
    MAX(fecha_mr_timestamp) as ultima_mr_del_dia
FROM facturas
WHERE mr_estado = true AND fecha_mr IS NOT NULL
GROUP BY fecha_mr
ORDER BY fecha_mr DESC
LIMIT 10;

-- 4. Comparar formatos de fecha_mr (detectar si hay legacy con timestamp)
SELECT
    CASE
        WHEN fecha_mr::TEXT ~ '^\d{4}-\d{2}-\d{2}$' THEN 'Formato DATE (correcto)'
        WHEN fecha_mr::TEXT ~ '^\d{4}-\d{2}-\d{2}T' THEN 'Formato TIMESTAMP (legacy)'
        ELSE 'Formato desconocido'
    END as formato,
    COUNT(*) as cantidad
FROM facturas
WHERE fecha_mr IS NOT NULL
GROUP BY formato;

-- 5. Ver ejemplos de cada formato
-- Formato correcto (DATE)
SELECT 'DATE correcto' as tipo, id, nro_factura, fecha_mr, fecha_mr_timestamp
FROM facturas
WHERE fecha_mr::TEXT ~ '^\d{4}-\d{2}-\d{2}$'
  AND mr_estado = true
ORDER BY created_at DESC
LIMIT 3;

-- Formato legacy (TIMESTAMP en columna DATE)
SELECT 'TIMESTAMP legacy' as tipo, id, nro_factura, fecha_mr, fecha_mr_timestamp
FROM facturas
WHERE fecha_mr::TEXT ~ '^\d{4}-\d{2}-\d{2}T'
  AND mr_estado = true
ORDER BY created_at DESC
LIMIT 3;

-- 6. Resumen final
SELECT
    'Total facturas' as metrica,
    COUNT(*)::TEXT as valor
FROM facturas
UNION ALL
SELECT
    'Facturas con MR',
    COUNT(*)::TEXT
FROM facturas
WHERE mr_estado = true
UNION ALL
SELECT
    'MR con fecha_mr (DATE)',
    COUNT(*)::TEXT
FROM facturas
WHERE mr_estado = true AND fecha_mr IS NOT NULL
UNION ALL
SELECT
    'MR con fecha_mr_timestamp (TIMESTAMP)',
    COUNT(*)::TEXT
FROM facturas
WHERE mr_estado = true AND fecha_mr_timestamp IS NOT NULL
UNION ALL
SELECT
    'MR con AMBAS fechas',
    COUNT(*)::TEXT
FROM facturas
WHERE mr_estado = true AND fecha_mr IS NOT NULL AND fecha_mr_timestamp IS NOT NULL;
