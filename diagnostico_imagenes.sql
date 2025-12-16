-- Script de diagnóstico para imágenes dañadas en InteliFact
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query

-- 1. Ver ejemplos de URLs almacenadas actualmente
SELECT
    fi.id,
    fi.factura_id,
    fi.imagen_url,
    fi.created_at,
    f.nro_factura,
    f.local
FROM factura_imagenes fi
JOIN facturas f ON f.id = fi.factura_id
ORDER BY fi.created_at DESC
LIMIT 10;

-- 2. Ver la factura específica del screenshot (ID 569265)
SELECT
    f.id,
    f.nro_factura,
    f.local,
    f.proveedor,
    f.fecha,
    f.mr_estado,
    f.mr_numero,
    COUNT(fi.id) as total_imagenes
FROM facturas f
LEFT JOIN factura_imagenes fi ON fi.factura_id = f.id
WHERE f.id = 569265
GROUP BY f.id, f.nro_factura, f.local, f.proveedor, f.fecha, f.mr_estado, f.mr_numero;

-- 3. Ver las imágenes de esa factura específica
SELECT
    id,
    factura_id,
    imagen_url,
    created_at
FROM factura_imagenes
WHERE factura_id = 569265;

-- 4. Verificar patrón de URLs (deben tener estructura consistente)
SELECT
    SUBSTRING(imagen_url FROM 1 FOR 50) as url_inicio,
    COUNT(*) as cantidad
FROM factura_imagenes
GROUP BY SUBSTRING(imagen_url FROM 1 FOR 50)
ORDER BY cantidad DESC;

-- 5. Ver si hay URLs NULL o vacías
SELECT
    COUNT(*) as total_imagenes,
    COUNT(CASE WHEN imagen_url IS NULL THEN 1 END) as urls_null,
    COUNT(CASE WHEN imagen_url = '' THEN 1 END) as urls_vacias
FROM factura_imagenes;

-- 6. Comparar URLs antiguas vs nuevas (por fecha)
SELECT
    DATE(created_at) as fecha,
    SUBSTRING(imagen_url FROM 1 FOR 60) as patron_url,
    COUNT(*) as cantidad
FROM factura_imagenes
GROUP BY DATE(created_at), SUBSTRING(imagen_url FROM 1 FOR 60)
ORDER BY fecha DESC
LIMIT 20;

-- 7. IMPORTANTE: Ver configuración del bucket de Storage
-- NOTA: Esto debe verificarse en: Supabase Dashboard > Storage > facturas bucket > Settings
-- Debe estar marcado como "Public bucket" o tener políticas RLS correctas
