-- Script para agregar el rol 'gestion' al constraint de usuarios
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query

-- 1. Ver el constraint actual
SELECT
    con.conname AS constraint_name,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'usuarios' AND con.conname = 'usuarios_rol_check';

-- 2. Eliminar el CHECK constraint restrictivo
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;

-- 3. Crear nuevo CHECK constraint que incluya 'gestion'
ALTER TABLE usuarios
ADD CONSTRAINT usuarios_rol_check
CHECK (rol IN ('operacion', 'pedidos', 'pedidos_admin', 'proveedores', 'proveedores_viewer', 'gestion'));

-- 4. Verificar que se creó correctamente
SELECT
    con.conname AS constraint_name,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'usuarios' AND con.conname = 'usuarios_rol_check';

-- 5. Ahora sí, crear el usuario gestion
INSERT INTO usuarios (email, password, nombre, rol, created_at)
VALUES ('gestion@empresa.com', 'gestion1809', 'Gestión', 'gestion', NOW())
ON CONFLICT (email) DO NOTHING;

-- 6. Verificar que se creó correctamente
SELECT * FROM usuarios WHERE rol = 'gestion';
