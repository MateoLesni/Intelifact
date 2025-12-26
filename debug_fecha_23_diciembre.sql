-- =========================================================
-- DEBUG: TODAS LAS IMÁGENES DE LA FECHA 23/12/2025
-- =========================================================
-- Vamos a ver TODAS las imágenes sin filtros para entender qué pasa
-- =========================================================

-- PASO 1: Ver TODAS las imágenes de esa fecha (sin filtros)
SELECT
    f.id as factura_id,
    f.fecha_mr,
    f.local,
    f.nro_factura,
    f.proveedor,
    fi.id as imagen_id,
    fi.imagen_url,
    fi.renombre,
    fi.nombre_fisico,
    -- Verificar si la URL es NULL
    CASE WHEN fi.imagen_url IS NULL THEN 'SI' ELSE 'NO' END as url_es_null,
    -- Verificar tipo de storage
    CASE
        WHEN fi.imagen_url IS NULL THEN 'NULL'
        WHEN fi.imagen_url LIKE '%supabase.co/storage/%' THEN 'SUPABASE'
        WHEN fi.imagen_url LIKE '%storage.googleapis.com/%' THEN 'GCS'
        ELSE 'OTRO'
    END as tipo_storage,
    -- Longitud de la URL (para detectar URLs vacías o raras)
    LENGTH(fi.imagen_url) as url_length
FROM facturas f
JOIN factura_imagenes fi ON fi.factura_id = f.id
WHERE f.fecha_mr = '2025-12-23'
ORDER BY f.local, f.nro_factura, fi.id;

-- =========================================================
-- PASO 2: Contar cuántas imágenes hay por tipo
-- =========================================================
SELECT
    COUNT(*) as total_imagenes,
    COUNT(CASE WHEN fi.imagen_url IS NULL THEN 1 END) as con_url_null,
    COUNT(CASE WHEN fi.imagen_url IS NOT NULL THEN 1 END) as con_url_valida,
    COUNT(CASE WHEN fi.imagen_url LIKE '%supabase.co/storage/%' THEN 1 END) as supabase,
    COUNT(CASE WHEN fi.imagen_url LIKE '%storage.googleapis.com/%' THEN 1 END) as gcs,
    COUNT(CASE WHEN fi.imagen_url NOT LIKE '%supabase.co/storage/%'
               AND fi.imagen_url NOT LIKE '%storage.googleapis.com/%'
               AND fi.imagen_url IS NOT NULL THEN 1 END) as otro
FROM facturas f
JOIN factura_imagenes fi ON fi.factura_id = f.id
WHERE f.fecha_mr = '2025-12-23';

-- =========================================================
-- PASO 3: Ver facturas de esa fecha agrupadas por local
-- =========================================================
SELECT
    f.local,
    COUNT(DISTINCT f.id) as facturas,
    COUNT(fi.id) as imagenes
FROM facturas f
LEFT JOIN factura_imagenes fi ON fi.factura_id = f.id
WHERE f.fecha_mr = '2025-12-23'
GROUP BY f.local
ORDER BY f.local;

-- =========================================================
-- PASO 4: Ver si hay imágenes duplicadas (mismo nombre físico)
-- =========================================================
SELECT
    fi.nombre_fisico,
    COUNT(*) as veces_repetido,
    STRING_AGG(f.nro_factura, ', ') as facturas
FROM facturas f
JOIN factura_imagenes fi ON fi.factura_id = f.id
WHERE f.fecha_mr = '2025-12-23'
  AND fi.nombre_fisico IS NOT NULL
GROUP BY fi.nombre_fisico
HAVING COUNT(*) > 1
ORDER BY veces_repetido DESC;

-- =========================================================
-- PASO 5: Buscar la imagen que SABEMOS que da error
-- Necesitamos la URL exacta de la imagen rota que ves en la pantalla
-- =========================================================
-- INSTRUCCIONES:
-- 1. Haz click derecho en la imagen rota → "Inspeccionar elemento"
-- 2. Busca el atributo src="..." de la imagen
-- 3. Copia la URL completa
-- 4. Pégala aquí abajo reemplazando 'URL_DE_LA_IMAGEN_ROTA'
-- 5. Ejecuta esta query

SELECT
    f.id as factura_id,
    f.fecha_mr,
    f.local,
    f.nro_factura,
    fi.id as imagen_id,
    fi.imagen_url,
    fi.renombre,
    'ESTA ES LA IMAGEN ROTA' as nota
FROM facturas f
JOIN factura_imagenes fi ON fi.factura_id = f.id
WHERE fi.imagen_url = 'URL_DE_LA_IMAGEN_ROTA';  -- ← PEGA LA URL AQUÍ

-- =========================================================
-- PASO 6: Verificar si existe en storage.objects
-- (también necesitas la URL de la imagen rota)
-- =========================================================
SELECT
    name,
    created_at,
    metadata->>'size' as size_bytes
FROM storage.objects
WHERE bucket_id = 'facturas'
  AND name LIKE '%PARTE_DEL_NOMBRE%';  -- ← PEGA PARTE DEL NOMBRE AQUÍ
