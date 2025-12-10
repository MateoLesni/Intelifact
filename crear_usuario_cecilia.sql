-- Script SQL para crear usuario Cecilia con rol proveedores_viewer
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query

-- Primero, verificar si el usuario ya existe
SELECT id, nombre, email, rol FROM usuarios WHERE email = 'cecilia@empresa.com';

-- Si no existe, crear el usuario Cecilia
-- IMPORTANTE: Cambiar 'password123' por una contraseña segura antes de ejecutar
INSERT INTO usuarios (email, password, nombre, rol, created_at)
VALUES ('cecilia@empresa.com', 'password123', 'Cecilia', 'proveedores_viewer', NOW())
ON CONFLICT (email) DO NOTHING;

-- Verificar que se creó correctamente
SELECT id, nombre, email, rol, created_at FROM usuarios WHERE email = 'cecilia@empresa.com';

-- NOTA: En producción, la contraseña debería estar hasheada con bcrypt
-- Este script usa contraseña en texto plano solo para desarrollo/pruebas
