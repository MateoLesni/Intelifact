-- Script SQL para crear las tablas en Supabase
-- Ejecutar en: Supabase Dashboard > SQL Editor

-- Tabla de locales
CREATE TABLE locales (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de usuarios
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  rol VARCHAR(50) NOT NULL CHECK (rol IN ('operacion', 'pedidos', 'proveedores')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de relación usuarios-locales (solo para usuarios de operación)
CREATE TABLE usuario_locales (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
  local_id INTEGER REFERENCES locales(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(usuario_id, local_id)
);

-- Tabla de facturas
CREATE TABLE facturas (
  id SERIAL PRIMARY KEY,
  fecha DATE NOT NULL,
  local_id INTEGER REFERENCES locales(id) ON DELETE CASCADE,
  nro_oc VARCHAR(255) NOT NULL,
  proveedor VARCHAR(255) NOT NULL,
  usuario_carga_id INTEGER REFERENCES usuarios(id),
  mr_numero VARCHAR(255),
  mr_estado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de imágenes de facturas
CREATE TABLE factura_imagenes (
  id SERIAL PRIMARY KEY,
  factura_id INTEGER REFERENCES facturas(id) ON DELETE CASCADE,
  imagen_url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de auditoría (registro de cambios y eliminaciones)
CREATE TABLE auditoria (
  id SERIAL PRIMARY KEY,
  factura_id INTEGER,
  usuario_id INTEGER REFERENCES usuarios(id),
  accion VARCHAR(50) NOT NULL CHECK (accion IN ('modificacion', 'eliminacion', 'generacion_mr')),
  datos_anteriores JSONB,
  datos_nuevos JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para mejorar el rendimiento
CREATE INDEX idx_facturas_local ON facturas(local_id);
CREATE INDEX idx_facturas_mr ON facturas(mr_estado);
CREATE INDEX idx_usuario_locales_usuario ON usuario_locales(usuario_id);
CREATE INDEX idx_factura_imagenes_factura ON factura_imagenes(factura_id);
CREATE INDEX idx_auditoria_factura ON auditoria(factura_id);

-- Datos de ejemplo (opcional)
-- Locales de ejemplo
INSERT INTO locales (nombre) VALUES
  ('Local Centro'),
  ('Local Norte'),
  ('Local Sur'),
  ('Local Este');

-- Usuarios de ejemplo (contraseña: "password123" - en producción usar bcrypt)
INSERT INTO usuarios (email, password, nombre, rol) VALUES
  ('operacion@empresa.com', 'password123', 'Usuario Operación', 'operacion'),
  ('pedidos@empresa.com', 'password123', 'Usuario Pedidos', 'pedidos'),
  ('proveedores@empresa.com', 'password123', 'Usuario Proveedores', 'proveedores');

-- Asignar locales al usuario de operación (id 1)
INSERT INTO usuario_locales (usuario_id, local_id) VALUES
  (1, 1),
  (1, 2);
