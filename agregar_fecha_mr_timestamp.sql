-- Script para agregar columna fecha_mr_timestamp a la tabla facturas
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query

-- 1. Ver estructura actual de la tabla facturas (columnas relacionadas con MR)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'facturas'
  AND column_name IN ('fecha_mr', 'mr_numero', 'mr_estado')
ORDER BY ordinal_position;

-- 2. Agregar nueva columna fecha_mr_timestamp (TIMESTAMP WITH TIME ZONE)
-- Esta columna guardará la fecha y hora exacta de generación del MR
ALTER TABLE facturas
ADD COLUMN IF NOT EXISTS fecha_mr_timestamp TIMESTAMPTZ;

-- 3. MIGRAR datos existentes: copiar fecha_mr a fecha_mr_timestamp
-- Solo para facturas que YA tienen MR generado
UPDATE facturas
SET fecha_mr_timestamp = fecha_mr::TIMESTAMPTZ
WHERE mr_estado = true AND fecha_mr IS NOT NULL AND fecha_mr_timestamp IS NULL;

-- 4. Verificar que se creó correctamente
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'facturas'
  AND column_name LIKE 'fecha_mr%'
ORDER BY column_name;

-- 5. Ver ejemplos de facturas con ambas fechas
SELECT
    id,
    nro_factura,
    mr_numero,
    mr_estado,
    fecha_mr as fecha_mr_date,
    fecha_mr_timestamp,
    created_at,
    updated_at
FROM facturas
WHERE mr_estado = true
ORDER BY created_at DESC
LIMIT 10;

-- 6. OPCIONAL: Ver estadísticas de migración
SELECT
    COUNT(*) as total_facturas,
    COUNT(CASE WHEN mr_estado = true THEN 1 END) as con_mr,
    COUNT(CASE WHEN fecha_mr IS NOT NULL THEN 1 END) as con_fecha_mr,
    COUNT(CASE WHEN fecha_mr_timestamp IS NOT NULL THEN 1 END) as con_fecha_mr_timestamp
FROM facturas;

-- NOTAS IMPORTANTES:
-- - fecha_mr: tipo DATE (solo fecha, sin hora) - Para Proveedores
-- - fecha_mr_timestamp: tipo TIMESTAMPTZ (fecha + hora + zona) - Para Pedidos
-- - Ambas columnas son nullable (pueden ser NULL si no tienen MR)
-- - El backend las llenará automáticamente al generar MR
