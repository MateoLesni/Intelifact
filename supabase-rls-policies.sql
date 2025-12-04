-- Desactivar RLS temporalmente para desarrollo
-- IMPORTANTE: En producción, deberías crear políticas apropiadas en lugar de deshabilitar RLS

ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE locales DISABLE ROW LEVEL SECURITY;
ALTER TABLE usuario_locales DISABLE ROW LEVEL SECURITY;
ALTER TABLE facturas DISABLE ROW LEVEL SECURITY;
ALTER TABLE factura_imagenes DISABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria DISABLE ROW LEVEL SECURITY;

-- ALTERNATIVA: Si prefieres mantener RLS habilitado, usa estas políticas permisivas
-- (Descomenta las siguientes líneas y comenta las de arriba)

/*
-- Políticas para la tabla usuarios
CREATE POLICY "Permitir lectura de usuarios" ON usuarios FOR SELECT USING (true);
CREATE POLICY "Permitir inserción de usuarios" ON usuarios FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir actualización de usuarios" ON usuarios FOR UPDATE USING (true);
CREATE POLICY "Permitir eliminación de usuarios" ON usuarios FOR DELETE USING (true);

-- Políticas para la tabla locales
CREATE POLICY "Permitir lectura de locales" ON locales FOR SELECT USING (true);
CREATE POLICY "Permitir inserción de locales" ON locales FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir actualización de locales" ON locales FOR UPDATE USING (true);
CREATE POLICY "Permitir eliminación de locales" ON locales FOR DELETE USING (true);

-- Políticas para la tabla usuario_locales
CREATE POLICY "Permitir lectura de usuario_locales" ON usuario_locales FOR SELECT USING (true);
CREATE POLICY "Permitir inserción de usuario_locales" ON usuario_locales FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir actualización de usuario_locales" ON usuario_locales FOR UPDATE USING (true);
CREATE POLICY "Permitir eliminación de usuario_locales" ON usuario_locales FOR DELETE USING (true);

-- Políticas para la tabla facturas
CREATE POLICY "Permitir lectura de facturas" ON facturas FOR SELECT USING (true);
CREATE POLICY "Permitir inserción de facturas" ON facturas FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir actualización de facturas" ON facturas FOR UPDATE USING (true);
CREATE POLICY "Permitir eliminación de facturas" ON facturas FOR DELETE USING (true);

-- Políticas para la tabla factura_imagenes
CREATE POLICY "Permitir lectura de factura_imagenes" ON factura_imagenes FOR SELECT USING (true);
CREATE POLICY "Permitir inserción de factura_imagenes" ON factura_imagenes FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir actualización de factura_imagenes" ON factura_imagenes FOR UPDATE USING (true);
CREATE POLICY "Permitir eliminación de factura_imagenes" ON factura_imagenes FOR DELETE USING (true);

-- Políticas para la tabla auditoria
CREATE POLICY "Permitir lectura de auditoria" ON auditoria FOR SELECT USING (true);
CREATE POLICY "Permitir inserción de auditoria" ON auditoria FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir actualización de auditoria" ON auditoria FOR UPDATE USING (true);
CREATE POLICY "Permitir eliminación de auditoria" ON auditoria FOR DELETE USING (true);
*/
