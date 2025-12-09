-- Migración para convertir fecha_mr de DATE a TIMESTAMP WITH TIME ZONE
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query
-- Copiar y pegar este código completo y ejecutar

-- Convertir la columna fecha_mr a TIMESTAMP WITH TIME ZONE
ALTER TABLE facturas
ALTER COLUMN fecha_mr TYPE TIMESTAMP WITH TIME ZONE
USING CASE
    WHEN fecha_mr IS NOT NULL THEN fecha_mr::TIMESTAMP WITH TIME ZONE
    ELSE NULL
END;

-- Verificar el cambio
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'facturas'
AND column_name = 'fecha_mr';
