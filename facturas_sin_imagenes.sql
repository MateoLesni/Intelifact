-- Identificar facturas que perdieron sus imágenes
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query

-- 1. Facturas CON MR que NO tienen imágenes (MÁS CRÍTICAS)
-- Estas son las que generaron MR basándose en imágenes que ahora están perdidas
SELECT
    f.id,
    f.nro_factura,
    f.local,
    f.proveedor,
    f.mr_numero,
    f.fecha_mr,
    f.fecha,
    f.created_at,
    COUNT(fi.id) as imagenes_restantes
FROM facturas f
LEFT JOIN factura_imagenes fi ON fi.factura_id = f.id
WHERE f.mr_estado = true
GROUP BY f.id, f.nro_factura, f.local, f.proveedor, f.mr_numero, f.fecha_mr, f.fecha, f.created_at
HAVING COUNT(fi.id) = 0
ORDER BY f.fecha_mr DESC;

-- 2. Facturas SIN MR que NO tienen imágenes (MENOS CRÍTICAS)
-- Estas aún no generaron MR, necesitan imágenes para hacerlo
SELECT
    f.id,
    f.nro_factura,
    f.local,
    f.proveedor,
    f.fecha,
    f.created_at,
    COUNT(fi.id) as imagenes_restantes
FROM facturas f
LEFT JOIN factura_imagenes fi ON fi.factura_id = f.id
WHERE f.mr_estado = false OR f.mr_estado IS NULL
GROUP BY f.id, f.nro_factura, f.local, f.proveedor, f.fecha, f.created_at
HAVING COUNT(fi.id) = 0
ORDER BY f.created_at DESC;

-- 3. Resumen general
SELECT
    CASE
        WHEN f.mr_estado = true THEN 'Con MR'
        ELSE 'Sin MR'
    END as estado_mr,
    COUNT(DISTINCT f.id) as total_facturas,
    COUNT(DISTINCT CASE WHEN fi.id IS NULL THEN f.id END) as facturas_sin_imagenes,
    ROUND(
        COUNT(DISTINCT CASE WHEN fi.id IS NULL THEN f.id END)::numeric /
        NULLIF(COUNT(DISTINCT f.id), 0) * 100,
        2
    ) as porcentaje_sin_imagenes
FROM facturas f
LEFT JOIN factura_imagenes fi ON fi.factura_id = f.id
GROUP BY f.mr_estado
ORDER BY f.mr_estado DESC;

-- 4. Facturas específica del screenshot (569265)
SELECT
    f.id,
    f.nro_factura,
    f.local,
    f.proveedor,
    f.mr_numero,
    f.mr_estado,
    f.fecha_mr,
    f.fecha,
    f.created_at,
    COUNT(fi.id) as imagenes_actuales
FROM facturas f
LEFT JOIN factura_imagenes fi ON fi.factura_id = f.id
WHERE f.id = 569265
GROUP BY f.id, f.nro_factura, f.local, f.proveedor, f.mr_numero, f.mr_estado, f.fecha_mr, f.fecha, f.created_at;

-- 5. Ver si hay referencias rotas para esa factura
SELECT
    fi.id,
    fi.factura_id,
    fi.imagen_url,
    fi.created_at
FROM factura_imagenes fi
WHERE fi.factura_id = 569265;
