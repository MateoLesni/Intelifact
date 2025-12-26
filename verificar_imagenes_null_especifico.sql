-- =========================================================
-- IDENTIFICAR IMÁGENES CON URL NULL EN UNA FECHA/LOCAL ESPECÍFICO
-- =========================================================
-- Esta query te ayudará a identificar exactamente qué imágenes
-- tienen imagen_url = NULL y están siendo contadas pero no descargadas
-- =========================================================

-- QUERY 1: Todas las imágenes NULL con detalles completos
SELECT
    f.id as factura_id,
    f.created_at,
    f.created_at::date as fecha_carga,
    f.local,
    f.nro_factura,
    f.proveedor,
    f.nro_oc,
    f.mr_numero,
    f.fecha_mr,
    fi.id as imagen_id,
    fi.imagen_url,
    fi.renombre,
    fi.nombre_fisico,
    u.nombre as usuario_que_creo,
    -- Categoría del local (para identificar en qué carpeta aparecen en ProveedoresDashboard)
    l.categoria as categoria_local
FROM facturas f
JOIN factura_imagenes fi ON fi.factura_id = f.id
LEFT JOIN usuarios u ON u.id = f.usuario_id
LEFT JOIN locales l ON l.nombre = f.local
WHERE
    fi.imagen_url IS NULL
    AND f.mr_estado = true  -- Solo facturas con MR (las que aparecen en ProveedoresDashboard)
ORDER BY
    f.created_at DESC,
    f.local,
    f.nro_factura;

-- =========================================================
-- QUERY 2: Contar imágenes NULL por fecha de MR y local
-- Esto te ayuda a identificar en qué carpeta de ProveedoresDashboard están
-- =========================================================
SELECT
    f.fecha_mr as fecha_mr,
    l.categoria as categoria,
    f.local,
    COUNT(fi.id) as imagenes_null,
    STRING_AGG(f.nro_factura, ', ') as facturas_afectadas
FROM facturas f
JOIN factura_imagenes fi ON fi.factura_id = f.id
LEFT JOIN locales l ON l.nombre = f.local
WHERE
    fi.imagen_url IS NULL
    AND f.mr_estado = true
GROUP BY
    f.fecha_mr,
    l.categoria,
    f.local
ORDER BY
    f.fecha_mr DESC,
    categoria,
    local;

-- =========================================================
-- QUERY 3: Buscar imágenes NULL en una fecha específica
-- Reemplaza '2025-12-XX' con la fecha que estás descargando
-- =========================================================
SELECT
    f.id as factura_id,
    f.nro_factura,
    f.local,
    f.proveedor,
    fi.id as imagen_id,
    fi.imagen_url,
    'URL NULL - No se puede descargar' as problema
FROM facturas f
JOIN factura_imagenes fi ON fi.factura_id = f.id
WHERE
    fi.imagen_url IS NULL
    AND f.fecha_mr = 'YYYY-MM-DD'  -- ← REEMPLAZA CON TU FECHA
ORDER BY
    f.local,
    f.nro_factura;

-- =========================================================
-- QUERY 4: Comparar total de imágenes vs imágenes válidas por carpeta
-- Te muestra la diferencia entre lo que cuenta y lo que realmente se descarga
-- =========================================================
SELECT
    l.categoria,
    f.fecha_mr,
    COUNT(fi.id) as total_imagenes_en_db,
    COUNT(CASE WHEN fi.imagen_url IS NOT NULL THEN 1 END) as imagenes_descargables,
    COUNT(CASE WHEN fi.imagen_url IS NULL THEN 1 END) as imagenes_null,
    ROUND(
        (COUNT(CASE WHEN fi.imagen_url IS NULL THEN 1 END)::numeric / COUNT(fi.id)::numeric) * 100,
        2
    ) as porcentaje_null
FROM facturas f
JOIN factura_imagenes fi ON fi.factura_id = f.id
LEFT JOIN locales l ON l.nombre = f.local
WHERE
    f.mr_estado = true
GROUP BY
    l.categoria,
    f.fecha_mr
HAVING
    COUNT(CASE WHEN fi.imagen_url IS NULL THEN 1 END) > 0  -- Solo mostrar donde hay NULLs
ORDER BY
    f.fecha_mr DESC,
    categoria;

-- =========================================================
-- INSTRUCCIONES:
-- =========================================================
--
-- 1. Ejecuta QUERY 1 para ver TODAS las imágenes NULL con detalles completos
--
-- 2. Ejecuta QUERY 2 para ver cuántas hay por fecha/categoría
--    - Esto te dirá en qué carpeta de ProveedoresDashboard están las problemáticas
--
-- 3. Si quieres ver imágenes NULL de una fecha específica:
--    - Copia QUERY 3
--    - Reemplaza 'YYYY-MM-DD' con la fecha que estás descargando
--    - Ejecuta
--
-- 4. Ejecuta QUERY 4 para ver el resumen de diferencias
--    - Te mostrará cuántas imágenes se cuentan vs cuántas se pueden descargar
--
-- =========================================================
-- EJEMPLO DE USO:
-- =========================================================
-- Si ves "Descargar Todas las Imágenes (183)" en la fecha 19/12/2025:
--
-- 1. Identifica la fecha en formato SQL:
--    19/12/2025 → '2025-12-19'
--
-- 2. Ejecuta QUERY 3 reemplazando la fecha:
--    WHERE f.fecha_mr = '2025-12-19'
--
-- 3. Verás exactamente qué facturas tienen imágenes NULL en esa fecha
--
-- =========================================================
