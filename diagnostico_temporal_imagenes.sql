-- Diagnóstico temporal: ¿Cuándo se crearon las imágenes que ahora están rotas?
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query

-- 1. Ver distribución de imágenes por fecha de creación
SELECT
    DATE(fi.created_at) as fecha_creacion,
    COUNT(*) as total_imagenes
FROM factura_imagenes fi
GROUP BY DATE(fi.created_at)
ORDER BY fecha_creacion DESC;

-- 2. Ver la imagen problemática específica (factura 569265)
SELECT
    fi.id,
    fi.factura_id,
    fi.imagen_url,
    fi.created_at as imagen_creada,
    f.fecha as fecha_factura,
    f.mr_numero,
    f.mr_estado,
    f.fecha_mr,
    f.created_at as factura_creada
FROM factura_imagenes fi
JOIN facturas f ON f.id = fi.factura_id
WHERE fi.factura_id = 569265;

-- 3. Ver si hay un patrón: ¿Las imágenes antiguas están rotas pero las nuevas funcionan?
-- Esto sugeriría limpieza por fecha
SELECT
    CASE
        WHEN fi.created_at < NOW() - INTERVAL '30 days' THEN 'Más de 30 días'
        WHEN fi.created_at < NOW() - INTERVAL '7 days' THEN 'Entre 7 y 30 días'
        ELSE 'Últimos 7 días'
    END as antiguedad,
    COUNT(*) as total_imagenes
FROM factura_imagenes fi
GROUP BY antiguedad
ORDER BY
    CASE antiguedad
        WHEN 'Últimos 7 días' THEN 1
        WHEN 'Entre 7 y 30 días' THEN 2
        ELSE 3
    END;

-- 4. Ver si hay un patrón por tamaño de nombre de archivo
-- Archivos con nombres muy largos podrían haber tenido problemas
SELECT
    CASE
        WHEN LENGTH(imagen_url) < 100 THEN 'URL corta'
        WHEN LENGTH(imagen_url) < 150 THEN 'URL media'
        ELSE 'URL larga'
    END as longitud_url,
    COUNT(*) as cantidad
FROM factura_imagenes
GROUP BY longitud_url;

-- 5. Ver patrón de facturas con MR: ¿Las que tienen MR tienen más probabilidad de tener imágenes rotas?
SELECT
    f.mr_estado,
    COUNT(DISTINCT f.id) as total_facturas,
    COUNT(fi.id) as total_imagenes
FROM facturas f
LEFT JOIN factura_imagenes fi ON fi.factura_id = f.id
GROUP BY f.mr_estado;

-- 6. Ver últimas facturas con MR generado (las más susceptibles a tener imágenes "vistas y luego borradas")
SELECT
    f.id,
    f.nro_factura,
    f.mr_numero,
    f.fecha_mr,
    COUNT(fi.id) as total_imagenes,
    array_agg(RIGHT(fi.imagen_url, 60)) as nombres_archivos
FROM facturas f
LEFT JOIN factura_imagenes fi ON fi.factura_id = f.id
WHERE f.mr_estado = true
GROUP BY f.id, f.nro_factura, f.mr_numero, f.fecha_mr
ORDER BY f.fecha_mr DESC
LIMIT 20;
