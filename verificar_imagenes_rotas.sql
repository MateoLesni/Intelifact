-- =========================================================
-- VERIFICAR IMÁGENES ROTAS (404) EN SUPABASE STORAGE
-- =========================================================
-- Esta query identifica facturas cuyas imágenes probablemente
-- dan 404 porque fueron eliminadas de Supabase Storage
-- =========================================================

-- QUERY 1: Imágenes que DAN 404 (no existen en storage)
-- Solo muestra las que REALMENTE están rotas
SELECT
    f.created_at::date as fecha_carga,
    f.local,
    f.nro_factura,
    f.proveedor,
    f.nro_oc,
    f.mr_numero,
    f.mr_estado,
    f.fecha_mr,
    fi.imagen_url,
    SUBSTRING(fi.imagen_url FROM '/([^/]+)$') as nombre_archivo,
    f.id as factura_id,
    fi.id as imagen_id,
    CASE
        WHEN fi.imagen_url LIKE '%supabase.co/storage/%' THEN 'Supabase Storage'
        WHEN fi.imagen_url LIKE '%storage.googleapis.com/%' THEN 'Google Cloud Storage'
        ELSE 'Otro'
    END as tipo_storage
FROM facturas f
JOIN factura_imagenes fi ON fi.factura_id = f.id
WHERE
    fi.imagen_url LIKE '%supabase.co/storage/%'
    -- CRÍTICO: Verificar que el archivo NO existe en storage
    AND NOT EXISTS (
        SELECT 1
        FROM storage.objects so
        WHERE so.bucket_id = 'facturas'
        AND fi.imagen_url LIKE '%' || so.name || '%'
    )
ORDER BY
    f.created_at DESC,
    f.local,
    f.nro_factura;

-- =========================================================
-- QUERY 2: Resumen por local y fecha (SOLO imágenes rotas 404)
-- =========================================================
SELECT
    f.created_at::date as fecha,
    f.local,
    COUNT(DISTINCT f.id) as total_facturas_con_404,
    COUNT(fi.id) as total_imagenes_404,
    STRING_AGG(DISTINCT f.nro_factura, ', ' ORDER BY f.nro_factura) as facturas_afectadas
FROM facturas f
JOIN factura_imagenes fi ON fi.factura_id = f.id
WHERE
    fi.imagen_url LIKE '%supabase.co/storage/%'
    -- CRÍTICO: Solo contar las que NO existen en storage
    AND NOT EXISTS (
        SELECT 1
        FROM storage.objects so
        WHERE so.bucket_id = 'facturas'
        AND fi.imagen_url LIKE '%' || so.name || '%'
    )
GROUP BY
    f.created_at::date,
    f.local
ORDER BY
    f.created_at::date DESC,
    f.local;

-- =========================================================
-- QUERY 3: Resumen por mes (SOLO imágenes rotas 404)
-- =========================================================
SELECT
    DATE_TRUNC('month', f.created_at) as mes,
    COUNT(DISTINCT f.id) as facturas_con_404,
    COUNT(fi.id) as imagenes_404,
    COUNT(DISTINCT f.local) as locales_afectados
FROM facturas f
JOIN factura_imagenes fi ON fi.factura_id = f.id
WHERE
    fi.imagen_url LIKE '%supabase.co/storage/%'
    -- CRÍTICO: Solo contar las que NO existen en storage
    AND NOT EXISTS (
        SELECT 1
        FROM storage.objects so
        WHERE so.bucket_id = 'facturas'
        AND fi.imagen_url LIKE '%' || so.name || '%'
    )
GROUP BY
    DATE_TRUNC('month', f.created_at)
ORDER BY
    mes DESC;

-- =========================================================
-- QUERY 4: Facturas SIN imágenes (imagen_url = NULL)
-- Estas son las que fallaron al subir desde el inicio
-- =========================================================
SELECT
    f.created_at::date as fecha_carga,
    f.local,
    f.nro_factura,
    f.proveedor,
    f.nro_oc,
    f.mr_numero,
    u.nombre as usuario,
    f.id as factura_id,
    'SIN IMAGEN' as problema
FROM facturas f
LEFT JOIN factura_imagenes fi ON fi.factura_id = f.id
LEFT JOIN usuarios u ON u.id = f.usuario_id
WHERE
    fi.id IS NULL  -- No tiene ninguna imagen asociada
ORDER BY
    f.created_at DESC;

-- =========================================================
-- QUERY 5: Facturas con imágenes NULL en la URL
-- (registros en DB pero sin URL)
-- =========================================================
SELECT
    f.created_at::date as fecha_carga,
    f.local,
    f.nro_factura,
    f.proveedor,
    f.id as factura_id,
    fi.id as imagen_id,
    'URL NULL' as problema
FROM facturas f
JOIN factura_imagenes fi ON fi.factura_id = f.id
WHERE
    fi.imagen_url IS NULL
ORDER BY
    f.created_at DESC;

-- =========================================================
-- QUERY 6: Verificar qué archivos EXISTEN en storage
-- Esto lo compara con los registros en factura_imagenes
-- =========================================================
SELECT
    so.name as nombre_archivo_storage,
    so.created_at as fecha_subida_storage,
    ROUND(so.metadata->>'size'::numeric / 1024) as tamaño_kb,
    fi.imagen_url,
    f.nro_factura,
    f.local,
    CASE
        WHEN fi.id IS NULL THEN 'Archivo huérfano (sin referencia en DB)'
        ELSE 'OK'
    END as estado
FROM storage.objects so
LEFT JOIN factura_imagenes fi ON fi.imagen_url LIKE '%' || so.name || '%'
LEFT JOIN facturas f ON f.id = fi.factura_id
WHERE
    so.bucket_id = 'facturas'
ORDER BY
    so.created_at DESC
LIMIT 1000;

-- =========================================================
-- INSTRUCCIONES PARA EXPORTAR A CSV/EXCEL:
-- =========================================================
--
-- OPCIÓN 1: Desde Supabase Dashboard
-- 1. Ejecuta la QUERY 1 (listado completo)
-- 2. Click en "Download CSV" (botón arriba a la derecha)
-- 3. Abre el CSV en Excel
--
-- OPCIÓN 2: Usando psql (si tienes acceso)
-- \copy (QUERY COMPLETA AQUÍ) TO '/ruta/imagenes_rotas.csv' CSV HEADER;
--
-- OPCIÓN 3: Desde código Node.js
-- Usar el script que generaré a continuación
--
-- =========================================================

-- =========================================================
-- PARA IDENTIFICAR 404 REALES:
-- Las queries anteriores solo identifican imágenes en Supabase.
-- Para confirmar que DAN 404, necesitas:
--
-- 1. Exportar listado con QUERY 1
-- 2. Probar las URLs manualmente O
-- 3. Usar el script de Node.js que verificará automáticamente
-- =========================================================
