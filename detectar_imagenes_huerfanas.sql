-- Script para detectar referencias huérfanas (imágenes que ya no existen en Storage)
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query

-- 1. Ver todas las facturas que tienen imágenes asociadas
SELECT
    f.id,
    f.nro_factura,
    f.local,
    f.proveedor,
    f.fecha,
    f.mr_estado,
    f.mr_numero,
    COUNT(fi.id) as total_imagenes,
    array_agg(fi.imagen_url) as urls_imagenes
FROM facturas f
INNER JOIN factura_imagenes fi ON fi.factura_id = f.id
GROUP BY f.id, f.nro_factura, f.local, f.proveedor, f.fecha, f.mr_estado, f.mr_numero
ORDER BY f.created_at DESC;

-- 2. Ver facturas con MR que tienen imágenes (más críticas)
SELECT
    f.id,
    f.nro_factura,
    f.local,
    f.proveedor,
    f.mr_numero,
    COUNT(fi.id) as total_imagenes
FROM facturas f
INNER JOIN factura_imagenes fi ON fi.factura_id = f.id
WHERE f.mr_estado = true
GROUP BY f.id, f.nro_factura, f.local, f.proveedor, f.mr_numero
ORDER BY f.created_at DESC;

-- 3. Estadísticas generales
SELECT
    COUNT(DISTINCT f.id) as total_facturas_con_imagenes,
    COUNT(fi.id) as total_referencias_imagenes,
    COUNT(DISTINCT CASE WHEN f.mr_estado = true THEN f.id END) as facturas_con_mr_con_imagenes
FROM facturas f
INNER JOIN factura_imagenes fi ON fi.factura_id = f.id;

-- 4. Ver la factura específica problemática (569265)
SELECT
    f.*,
    fi.id as imagen_id,
    fi.imagen_url,
    fi.created_at as imagen_created_at
FROM facturas f
LEFT JOIN factura_imagenes fi ON fi.factura_id = f.id
WHERE f.id = 569265;

-- 5. Ver patrón de nombres de archivo para identificar posibles duplicados
SELECT
    RIGHT(imagen_url, 100) as nombre_archivo_final,
    COUNT(*) as cantidad
FROM factura_imagenes
GROUP BY RIGHT(imagen_url, 100)
HAVING COUNT(*) > 1
ORDER BY cantidad DESC;

-- NOTA: Para verificar si las imágenes realmente existen en Storage,
-- necesitas usar la interfaz web de Supabase:
-- Dashboard > Storage > facturas bucket > buscar el archivo
-- O usar un script de Node.js para verificar cada URL con fetch()
