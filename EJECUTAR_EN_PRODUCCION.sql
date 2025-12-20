-- =========================================================
-- EJECUTAR ESTE SQL EN SUPABASE PRODUCCIÓN
-- =========================================================
-- IMPORTANTE: Ejecutar ANTES de hacer el deploy a Vercel
-- =========================================================

-- 1. Agregar nuevas columnas a factura_imagenes
ALTER TABLE factura_imagenes
ADD COLUMN IF NOT EXISTS nombre_fisico TEXT,
ADD COLUMN IF NOT EXISTS renombre TEXT,
ADD COLUMN IF NOT EXISTS content_type TEXT,
ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Crear índice para búsquedas rápidas por nombre físico
CREATE INDEX IF NOT EXISTS idx_factura_imagenes_nombre_fisico
ON factura_imagenes(nombre_fisico);

-- 3. Poblar renombre para imágenes existentes (Supabase Storage)
-- Extrae el nombre del archivo de la URL existente
UPDATE factura_imagenes
SET
    renombre = SUBSTRING(imagen_url FROM '/([^/]+)$'),
    nombre_fisico = SUBSTRING(imagen_url FROM '/([^/]+)$')
WHERE renombre IS NULL AND imagen_url IS NOT NULL;

-- 4. Verificar resultado
SELECT
    'Verificación' as info,
    COUNT(*) as total_imagenes,
    COUNT(nombre_fisico) as con_nombre_fisico,
    COUNT(renombre) as con_renombre,
    COUNT(*) - COUNT(renombre) as sin_renombre
FROM factura_imagenes;

-- Resultado esperado:
-- sin_renombre debe ser 0
-- Si es > 0, hay un problema

-- =========================================================
-- DESPUÉS de ejecutar este SQL:
-- 1. Configurar variables de entorno en Vercel
-- 2. Hacer git push
-- 3. Verificar que Vercel deploy exitosamente
-- =========================================================
