-- Script para limpiar referencias huérfanas de imágenes
-- Estas son referencias en factura_imagenes que apuntan a archivos que NO existen en storage
-- Esto sucedió cuando las imágenes se intentaron subir con ANON_KEY (sin permisos)

-- PASO 1: Ver cuántas referencias huérfanas hay
SELECT
    'Referencias Huérfanas' as tipo,
    COUNT(*) as cantidad
FROM factura_imagenes fi
WHERE NOT EXISTS (
    SELECT 1
    FROM storage.objects so
    WHERE so.bucket_id = 'facturas'
      AND fi.imagen_url LIKE '%' || so.name || '%'
);

-- PASO 2: Ver detalle de las referencias huérfanas (primeras 20)
SELECT
    fi.id as ref_id,
    fi.factura_id,
    fi.imagen_url,
    f.created_at as factura_created,
    CASE
        WHEN f.created_at > NOW() - INTERVAL '4 hours' THEN '⚠ Creada en últimas 4h (durante problema)'
        ELSE 'Creada hace más tiempo'
    END as cuando
FROM factura_imagenes fi
JOIN facturas f ON f.id = fi.factura_id
WHERE NOT EXISTS (
    SELECT 1
    FROM storage.objects so
    WHERE so.bucket_id = 'facturas'
      AND fi.imagen_url LIKE '%' || so.name || '%'
)
ORDER BY f.created_at DESC
LIMIT 20;

-- PASO 3: ELIMINAR referencias huérfanas
-- IMPORTANTE: Esto NO elimina las facturas, solo las referencias de imágenes que no existen

-- Primero hacer un backup de las referencias que se van a eliminar
CREATE TEMP TABLE referencias_huerfanas_backup AS
SELECT
    fi.id,
    fi.factura_id,
    fi.imagen_url,
    NOW() as deleted_at
FROM factura_imagenes fi
WHERE NOT EXISTS (
    SELECT 1
    FROM storage.objects so
    WHERE so.bucket_id = 'facturas'
      AND fi.imagen_url LIKE '%' || so.name || '%'
);

-- Ver cuántas se van a eliminar
SELECT
    'Total a eliminar' as info,
    COUNT(*) as cantidad
FROM referencias_huerfanas_backup;

-- ELIMINAR las referencias huérfanas
DELETE FROM factura_imagenes
WHERE id IN (
    SELECT id FROM referencias_huerfanas_backup
);

-- PASO 4: VERIFICACIÓN FINAL
SELECT '========== LIMPIEZA COMPLETADA ==========' as info;

-- Ver cuántas referencias quedaron
SELECT
    'Referencias restantes' as tipo,
    COUNT(*) as cantidad
FROM factura_imagenes;

-- Verificar que NO quedan huérfanas
SELECT
    'Referencias huérfanas restantes' as tipo,
    COUNT(*) as cantidad
FROM factura_imagenes fi
WHERE NOT EXISTS (
    SELECT 1
    FROM storage.objects so
    WHERE so.bucket_id = 'facturas'
      AND fi.imagen_url LIKE '%' || so.name || '%'
);

-- Ver cuántas facturas quedaron SIN imágenes (pueden necesitar re-upload)
SELECT
    'Facturas sin imágenes' as tipo,
    COUNT(*) as cantidad
FROM facturas f
WHERE NOT EXISTS (
    SELECT 1
    FROM factura_imagenes fi
    WHERE fi.factura_id = f.id
);

-- Mensaje final
SELECT
CASE
    WHEN (SELECT COUNT(*) FROM factura_imagenes fi WHERE NOT EXISTS (SELECT 1 FROM storage.objects so WHERE so.bucket_id = 'facturas' AND fi.imagen_url LIKE '%' || so.name || '%')) = 0
    THEN '✓ ÉXITO: Todas las referencias huérfanas fueron eliminadas'
    ELSE '⚠ ADVERTENCIA: Todavía hay referencias huérfanas'
END as "RESULTADO";

-- OPCIONAL: Ver las primeras 10 facturas que quedaron sin imágenes
SELECT
    f.id as factura_id,
    f.created_at,
    f.nro_factura,
    f.proveedor,
    f.local,
    'Sin imágenes - puede necesitar re-upload' as estado
FROM facturas f
WHERE NOT EXISTS (
    SELECT 1
    FROM factura_imagenes fi
    WHERE fi.factura_id = f.id
)
ORDER BY f.created_at DESC
LIMIT 10;
