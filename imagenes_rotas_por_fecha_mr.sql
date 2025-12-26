-- =========================================================
-- IMÁGENES ROTAS FILTRADAS POR FECHA DE MR
-- =========================================================
-- Esta query te muestra las imágenes rotas de una fecha MR específica
-- =========================================================

-- QUERY: Imágenes rotas con fecha MR específica
SELECT
    f.created_at::date as fecha_carga,
    f.fecha_mr as fecha_mr,
    f.local,
    f.nro_factura,
    f.proveedor,
    COALESCE(fi.renombre, SUBSTRING(fi.imagen_url FROM '/([^/]+)$'), 'Sin nombre') as nombre_imagen,
    CASE
        WHEN fi.imagen_url IS NULL THEN 'URL NULL'
        WHEN fi.imagen_url LIKE '%supabase.co/storage/%' THEN 'Supabase Eliminada'
        WHEN fi.imagen_url LIKE '%storage.googleapis.com/%' THEN 'GCS Posible 404'
        ELSE 'Otro'
    END as tipo_problema,
    fi.imagen_url,
    f.id as factura_id,
    fi.id as imagen_id
FROM facturas f
JOIN factura_imagenes fi ON fi.factura_id = f.id
WHERE
    -- FILTRO POR FECHA MR (CAMBIA AQUÍ LA FECHA)
    f.fecha_mr = '2025-12-23'
    AND (
        -- URLs NULL
        fi.imagen_url IS NULL
        OR (
            -- Supabase: archivo eliminado
            fi.imagen_url LIKE '%supabase.co/storage/%'
            AND NOT EXISTS (
                SELECT 1
                FROM storage.objects so
                WHERE so.bucket_id = 'facturas'
                AND fi.imagen_url LIKE '%' || so.name || '%'
            )
        )
        OR (
            -- GCS: posibles 404 antes de la migración estable
            fi.imagen_url LIKE '%storage.googleapis.com/%'
            AND f.created_at::date <= '2025-12-19'
        )
    )
ORDER BY
    f.local,
    f.nro_factura;

-- =========================================================
-- RESUMEN: Contar imágenes rotas por tipo en esa fecha
-- =========================================================
SELECT
    f.fecha_mr,
    COUNT(fi.id) as total_imagenes_rotas,
    SUM(CASE WHEN fi.imagen_url IS NULL THEN 1 ELSE 0 END) as url_null,
    SUM(CASE
        WHEN fi.imagen_url LIKE '%supabase.co/storage/%'
        AND NOT EXISTS (
            SELECT 1 FROM storage.objects so
            WHERE so.bucket_id = 'facturas'
            AND fi.imagen_url LIKE '%' || so.name || '%'
        ) THEN 1 ELSE 0
    END) as supabase_eliminadas,
    SUM(CASE
        WHEN fi.imagen_url LIKE '%storage.googleapis.com/%'
        AND f.created_at::date <= '2025-12-19'
        THEN 1 ELSE 0
    END) as gcs_posible_404
FROM facturas f
JOIN factura_imagenes fi ON fi.factura_id = f.id
WHERE
    f.fecha_mr = '2025-12-23'
    AND (
        fi.imagen_url IS NULL
        OR (
            fi.imagen_url LIKE '%supabase.co/storage/%'
            AND NOT EXISTS (
                SELECT 1 FROM storage.objects so
                WHERE so.bucket_id = 'facturas'
                AND fi.imagen_url LIKE '%' || so.name || '%'
            )
        )
        OR (
            fi.imagen_url LIKE '%storage.googleapis.com/%'
            AND f.created_at::date <= '2025-12-19'
        )
    )
GROUP BY f.fecha_mr;

-- =========================================================
-- TODAS las imágenes de esa fecha (para comparar)
-- =========================================================
SELECT
    f.fecha_mr,
    COUNT(fi.id) as total_imagenes,
    COUNT(CASE WHEN fi.imagen_url IS NOT NULL THEN 1 END) as imagenes_con_url,
    COUNT(CASE WHEN fi.imagen_url IS NULL THEN 1 END) as imagenes_sin_url
FROM facturas f
JOIN factura_imagenes fi ON fi.factura_id = f.id
WHERE f.fecha_mr = '2025-12-23'
GROUP BY f.fecha_mr;
