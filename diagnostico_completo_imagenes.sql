-- Script de diagnóstico completo para imágenes 404
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query

-- 1. Ver facturas recientes con sus imágenes
SELECT
    f.id,
    f.nro_factura,
    f.created_at as fecha_creacion,
    f.mr_estado,
    COUNT(fi.id) as total_imagenes,
    json_agg(
        json_build_object(
            'imagen_id', fi.id,
            'url', fi.imagen_url,
            'created_at', fi.created_at
        ) ORDER BY fi.created_at
    ) as imagenes
FROM facturas f
LEFT JOIN factura_imagenes fi ON fi.factura_id = f.id
WHERE f.created_at >= NOW() - INTERVAL '7 days'
GROUP BY f.id, f.nro_factura, f.created_at, f.mr_estado
ORDER BY f.created_at DESC
LIMIT 20;

-- 2. Ver referencias de imágenes sin factura (huérfanas)
SELECT
    fi.id,
    fi.factura_id,
    fi.imagen_url,
    fi.created_at,
    f.id as factura_existe
FROM factura_imagenes fi
LEFT JOIN facturas f ON f.id = fi.factura_id
WHERE f.id IS NULL
ORDER BY fi.created_at DESC
LIMIT 20;

-- 3. Comparar cantidad de facturas con imágenes vs sin imágenes
SELECT
    'Con imágenes' as tipo,
    COUNT(DISTINCT f.id) as cantidad_facturas
FROM facturas f
INNER JOIN factura_imagenes fi ON fi.factura_id = f.id
UNION ALL
SELECT
    'Sin imágenes' as tipo,
    COUNT(f.id) as cantidad_facturas
FROM facturas f
LEFT JOIN factura_imagenes fi ON fi.factura_id = f.id
WHERE fi.id IS NULL;

-- 4. Ver patrones de URLs de imágenes
SELECT
    SUBSTRING(imagen_url FROM 'https://[^/]+') as dominio,
    SUBSTRING(imagen_url FROM '/storage/v1/object/public/([^/]+)') as bucket,
    COUNT(*) as cantidad
FROM factura_imagenes
GROUP BY dominio, bucket;

-- 5. Ver facturas creadas recientemente (últimas 24 horas)
SELECT
    f.id,
    f.nro_factura,
    f.created_at,
    COUNT(fi.id) as imagenes_count,
    string_agg(fi.imagen_url, ' | ') as urls
FROM facturas f
LEFT JOIN factura_imagenes fi ON fi.factura_id = f.id
WHERE f.created_at >= NOW() - INTERVAL '24 hours'
GROUP BY f.id, f.nro_factura, f.created_at
ORDER BY f.created_at DESC;

-- 6. Ver auditoría de eliminaciones recientes
SELECT
    a.id,
    a.factura_id,
    a.accion,
    a.created_at,
    u.nombre as usuario,
    a.datos_anteriores->>'nro_factura' as nro_factura
FROM auditoria a
LEFT JOIN usuarios u ON u.id = a.usuario_id
WHERE a.accion = 'eliminacion'
  AND a.created_at >= NOW() - INTERVAL '7 days'
ORDER BY a.created_at DESC
LIMIT 20;
