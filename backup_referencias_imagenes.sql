-- BACKUP de todas las referencias de imágenes
-- Ejecutar ANTES de limpiar cualquier cosa
-- Guarda este resultado en un archivo .csv

SELECT
    fi.id,
    fi.factura_id,
    fi.imagen_url,
    fi.created_at,
    f.nro_factura,
    f.local,
    f.proveedor,
    f.mr_numero,
    f.mr_estado
FROM factura_imagenes fi
JOIN facturas f ON f.id = fi.factura_id
ORDER BY fi.created_at DESC;

-- Si alguna vez necesitas restaurar una referencia:
-- INSERT INTO factura_imagenes (factura_id, imagen_url, created_at)
-- VALUES ([factura_id], '[url]', '[fecha]');
