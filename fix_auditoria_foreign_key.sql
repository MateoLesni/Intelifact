-- Script para arreglar el foreign key de auditoría
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query

-- PROBLEMA: El foreign key auditoria_factura_id_fkey impide guardar auditoría
-- de eliminación porque la factura ya no existe cuando se intenta insertar.

-- SOLUCIÓN 1 (RECOMENDADA): Eliminar el foreign key constraint
-- Esto permite que auditoria guarde factura_id aunque la factura ya no exista
ALTER TABLE auditoria DROP CONSTRAINT IF EXISTS auditoria_factura_id_fkey;

-- Verificar que se eliminó
SELECT
    con.conname AS constraint_name,
    con.contype AS constraint_type,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'auditoria'
  AND con.conname LIKE '%factura_id%';

-- ALTERNATIVA (Si necesitas mantener integridad referencial):
-- Cambiar el constraint para que use ON DELETE SET NULL
-- Primero hay que hacer la columna nullable:
-- ALTER TABLE auditoria ALTER COLUMN factura_id DROP NOT NULL;
--
-- Luego agregar el constraint con ON DELETE SET NULL:
-- ALTER TABLE auditoria
-- ADD CONSTRAINT auditoria_factura_id_fkey
-- FOREIGN KEY (factura_id)
-- REFERENCES facturas(id)
-- ON DELETE SET NULL;

-- Verificar estructura final de auditoria
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'auditoria'
ORDER BY ordinal_position;
