-- ============================================
-- SCRIPT COMPLETO: CREAR USUARIOS DE ZONA
-- ============================================
-- Este script crea:
-- 1. 156 locales en la categoría 'Trenes'
-- 2. 5 usuarios administradores de zona
-- 3. Asignaciones de locales a cada usuario
-- ============================================

-- PASO 1: Insertar todos los locales faltantes
-- ============================================

-- Locales para Adm Constitucion (41 locales)
INSERT INTO locales (local, categoria) VALUES
('UFB09', 'Trenes'),
('UFC04', 'Trenes'),
('UFC08', 'Trenes'),
('UFP14', 'Trenes'),
('UFP19', 'Trenes'),
('UFR03', 'Trenes'),
('UFR07', 'Trenes'),
('UFR11', 'Trenes'),
('UFR15', 'Trenes'),
('UFR19', 'Trenes'),
('UFS03', 'Trenes'),
('UFS05', 'Trenes'),
('UFS09', 'Trenes'),
('UFS17', 'Trenes'),
('UFV02', 'Trenes'),
('UFV06', 'Trenes'),
('UFV10', 'Trenes'),
('UFV12', 'Trenes'),
('UFV16', 'Trenes'),
('UFD05', 'Trenes'),
('UFD09', 'Trenes'),
('UFD13', 'Trenes'),
('UFD17', 'Trenes'),
('UFD21', 'Trenes'),
('UFD23', 'Trenes'),
('UFH03', 'Trenes'),
('UFH05', 'Trenes'),
('UFH09', 'Trenes'),
('UFH13', 'Trenes'),
('UFH17', 'Trenes'),
('UFH19', 'Trenes'),
('UFH21', 'Trenes'),
('UFH23', 'Trenes'),
('UFH25', 'Trenes'),
('UFH27', 'Trenes'),
('UFH29', 'Trenes'),
('UFH31', 'Trenes'),
('UFH33', 'Trenes'),
('UFH35', 'Trenes'),
('UFH37', 'Trenes'),
('UFH39', 'Trenes')
ON CONFLICT (local) DO NOTHING;

-- Locales para Adm Once (29 locales)
INSERT INTO locales (local, categoria) VALUES
('USS02', 'Trenes'),
('USS04', 'Trenes'),
('USS06', 'Trenes'),
('USS08', 'Trenes'),
('USS10', 'Trenes'),
('USS12', 'Trenes'),
('USS14', 'Trenes'),
('USS16', 'Trenes'),
('USS18', 'Trenes'),
('USS20', 'Trenes'),
('USS22', 'Trenes'),
('USS24', 'Trenes'),
('USS26', 'Trenes'),
('USP04', 'Trenes'),
('USP08', 'Trenes'),
('USP12', 'Trenes'),
('USP16', 'Trenes'),
('USP20', 'Trenes'),
('USP24', 'Trenes'),
('USP26', 'Trenes'),
('USC04', 'Trenes'),
('USC06', 'Trenes'),
('USC08', 'Trenes'),
('USC10', 'Trenes'),
('USC12', 'Trenes'),
('USC14', 'Trenes'),
('USC16', 'Trenes'),
('USC18', 'Trenes'),
('USC20', 'Trenes')
ON CONFLICT (local) DO NOTHING;

-- Locales para Adm Retiro (11 locales)
INSERT INTO locales (local, categoria) VALUES
('URT02', 'Trenes'),
('URT04', 'Trenes'),
('URT06', 'Trenes'),
('URT08', 'Trenes'),
('URT10', 'Trenes'),
('URT12', 'Trenes'),
('URT14', 'Trenes'),
('URT16', 'Trenes'),
('URT18', 'Trenes'),
('URM02', 'Trenes'),
('URM04', 'Trenes')
ON CONFLICT (local) DO NOTHING;

-- Locales para Adm Oeste (22 locales)
INSERT INTO locales (local, categoria) VALUES
('USM02', 'Trenes'),
('USM04', 'Trenes'),
('USM06', 'Trenes'),
('USM08', 'Trenes'),
('USM10', 'Trenes'),
('USM12', 'Trenes'),
('USM14', 'Trenes'),
('USM16', 'Trenes'),
('USM18', 'Trenes'),
('USM20', 'Trenes'),
('USM22', 'Trenes'),
('USM24', 'Trenes'),
('USM26', 'Trenes'),
('USM28', 'Trenes'),
('USM30', 'Trenes'),
('USM32', 'Trenes'),
('USM34', 'Trenes'),
('USM36', 'Trenes'),
('USM38', 'Trenes'),
('USM40', 'Trenes'),
('USM42', 'Trenes'),
('USM44', 'Trenes')
ON CONFLICT (local) DO NOTHING;

-- Locales para Adm Zona Sur (53 locales)
INSERT INTO locales (local, categoria) VALUES
('URQ03', 'Trenes'),
('URQ05', 'Trenes'),
('URQ09', 'Trenes'),
('URQ13', 'Trenes'),
('URQ17', 'Trenes'),
('URQ19', 'Trenes'),
('URQ21', 'Trenes'),
('URQ23', 'Trenes'),
('URQ25', 'Trenes'),
('URQ27', 'Trenes'),
('URQ31', 'Trenes'),
('URQ33', 'Trenes'),
('URQ37', 'Trenes'),
('URC02', 'Trenes'),
('URC04', 'Trenes'),
('URC06', 'Trenes'),
('URC08', 'Trenes'),
('URC10', 'Trenes'),
('URC12', 'Trenes'),
('URC14', 'Trenes'),
('URC16', 'Trenes'),
('URC18', 'Trenes'),
('URC20', 'Trenes'),
('URC22', 'Trenes'),
('URC24', 'Trenes'),
('URD02', 'Trenes'),
('URD04', 'Trenes'),
('URD06', 'Trenes'),
('URD08', 'Trenes'),
('URD10', 'Trenes'),
('URD12', 'Trenes'),
('URD14', 'Trenes'),
('URD16', 'Trenes'),
('URD18', 'Trenes'),
('URD20', 'Trenes'),
('URD22', 'Trenes'),
('URD24', 'Trenes'),
('URD26', 'Trenes'),
('URD28', 'Trenes'),
('URD30', 'Trenes'),
('URD32', 'Trenes'),
('URD34', 'Trenes'),
('URD36', 'Trenes'),
('URD38', 'Trenes'),
('URD40', 'Trenes'),
('URD42', 'Trenes'),
('URD44', 'Trenes'),
('URD46', 'Trenes'),
('URD48', 'Trenes'),
('URD50', 'Trenes'),
('URD52', 'Trenes'),
('URD54', 'Trenes'),
('URD56', 'Trenes')
ON CONFLICT (local) DO NOTHING;

-- ============================================
-- PASO 2: Crear los 5 usuarios administradores
-- ============================================
-- ============================================
-- PASO 3: Asignar locales a cada usuario
-- ============================================

-- Asignaciones para Adm Constitucion (41 locales)
INSERT INTO usuario_locales (usuario_id, local)
SELECT u.id, l.local
FROM usuarios u
CROSS JOIN (
  SELECT 'UFB09' AS local UNION ALL
  SELECT 'UFC04' UNION ALL SELECT 'UFC08' UNION ALL SELECT 'UFP14' UNION ALL SELECT 'UFP19' UNION ALL
  SELECT 'UFR03' UNION ALL SELECT 'UFR07' UNION ALL SELECT 'UFR11' UNION ALL SELECT 'UFR15' UNION ALL SELECT 'UFR19' UNION ALL
  SELECT 'UFS03' UNION ALL SELECT 'UFS05' UNION ALL SELECT 'UFS09' UNION ALL SELECT 'UFS17' UNION ALL
  SELECT 'UFV02' UNION ALL SELECT 'UFV06' UNION ALL SELECT 'UFV10' UNION ALL SELECT 'UFV12' UNION ALL SELECT 'UFV16' UNION ALL
  SELECT 'UFD05' UNION ALL SELECT 'UFD09' UNION ALL SELECT 'UFD13' UNION ALL SELECT 'UFD17' UNION ALL SELECT 'UFD21' UNION ALL SELECT 'UFD23' UNION ALL
  SELECT 'UFH03' UNION ALL SELECT 'UFH05' UNION ALL SELECT 'UFH09' UNION ALL SELECT 'UFH13' UNION ALL SELECT 'UFH17' UNION ALL SELECT 'UFH19' UNION ALL
  SELECT 'UFH21' UNION ALL SELECT 'UFH23' UNION ALL SELECT 'UFH25' UNION ALL SELECT 'UFH27' UNION ALL SELECT 'UFH29' UNION ALL SELECT 'UFH31' UNION ALL
  SELECT 'UFH33' UNION ALL SELECT 'UFH35' UNION ALL SELECT 'UFH37' UNION ALL SELECT 'UFH39'
) l
WHERE u.nombre = 'Adm Constitucion';

-- Asignaciones para Adm Once (29 locales)
INSERT INTO usuario_locales (usuario_id, local)
SELECT u.id, l.local
FROM usuarios u
CROSS JOIN (
  SELECT 'USS02' AS local UNION ALL SELECT 'USS04' UNION ALL SELECT 'USS06' UNION ALL SELECT 'USS08' UNION ALL SELECT 'USS10' UNION ALL
  SELECT 'USS12' UNION ALL SELECT 'USS14' UNION ALL SELECT 'USS16' UNION ALL SELECT 'USS18' UNION ALL SELECT 'USS20' UNION ALL
  SELECT 'USS22' UNION ALL SELECT 'USS24' UNION ALL SELECT 'USS26' UNION ALL
  SELECT 'USP04' UNION ALL SELECT 'USP08' UNION ALL SELECT 'USP12' UNION ALL SELECT 'USP16' UNION ALL SELECT 'USP20' UNION ALL SELECT 'USP24' UNION ALL SELECT 'USP26' UNION ALL
  SELECT 'USC04' UNION ALL SELECT 'USC06' UNION ALL SELECT 'USC08' UNION ALL SELECT 'USC10' UNION ALL SELECT 'USC12' UNION ALL
  SELECT 'USC14' UNION ALL SELECT 'USC16' UNION ALL SELECT 'USC18' UNION ALL SELECT 'USC20'
) l
WHERE u.nombre = 'Adm Once';

-- Asignaciones para Adm Retiro (11 locales)
INSERT INTO usuario_locales (usuario_id, local)
SELECT u.id, l.local
FROM usuarios u
CROSS JOIN (
  SELECT 'URT02' AS local UNION ALL SELECT 'URT04' UNION ALL SELECT 'URT06' UNION ALL SELECT 'URT08' UNION ALL SELECT 'URT10' UNION ALL
  SELECT 'URT12' UNION ALL SELECT 'URT14' UNION ALL SELECT 'URT16' UNION ALL SELECT 'URT18' UNION ALL
  SELECT 'URM02' UNION ALL SELECT 'URM04'
) l
WHERE u.nombre = 'Adm Retiro';

-- Asignaciones para Adm Oeste (22 locales)
INSERT INTO usuario_locales (usuario_id, local)
SELECT u.id, l.local
FROM usuarios u
CROSS JOIN (
  SELECT 'USM02' AS local UNION ALL SELECT 'USM04' UNION ALL SELECT 'USM06' UNION ALL SELECT 'USM08' UNION ALL SELECT 'USM10' UNION ALL
  SELECT 'USM12' UNION ALL SELECT 'USM14' UNION ALL SELECT 'USM16' UNION ALL SELECT 'USM18' UNION ALL SELECT 'USM20' UNION ALL
  SELECT 'USM22' UNION ALL SELECT 'USM24' UNION ALL SELECT 'USM26' UNION ALL SELECT 'USM28' UNION ALL SELECT 'USM30' UNION ALL
  SELECT 'USM32' UNION ALL SELECT 'USM34' UNION ALL SELECT 'USM36' UNION ALL SELECT 'USM38' UNION ALL SELECT 'USM40' UNION ALL
  SELECT 'USM42' UNION ALL SELECT 'USM44'
) l
WHERE u.nombre = 'Adm Oeste';

-- Asignaciones para Adm Zona Sur (53 locales)
INSERT INTO usuario_locales (usuario_id, local)
SELECT u.id, l.local
FROM usuarios u
CROSS JOIN (
  SELECT 'URQ03' AS local UNION ALL SELECT 'URQ05' UNION ALL SELECT 'URQ09' UNION ALL SELECT 'URQ13' UNION ALL SELECT 'URQ17' UNION ALL
  SELECT 'URQ19' UNION ALL SELECT 'URQ21' UNION ALL SELECT 'URQ23' UNION ALL SELECT 'URQ25' UNION ALL SELECT 'URQ27' UNION ALL
  SELECT 'URQ31' UNION ALL SELECT 'URQ33' UNION ALL SELECT 'URQ37' UNION ALL
  SELECT 'URC02' UNION ALL SELECT 'URC04' UNION ALL SELECT 'URC06' UNION ALL SELECT 'URC08' UNION ALL SELECT 'URC10' UNION ALL
  SELECT 'URC12' UNION ALL SELECT 'URC14' UNION ALL SELECT 'URC16' UNION ALL SELECT 'URC18' UNION ALL SELECT 'URC20' UNION ALL
  SELECT 'URC22' UNION ALL SELECT 'URC24' UNION ALL
  SELECT 'URD02' UNION ALL SELECT 'URD04' UNION ALL SELECT 'URD06' UNION ALL SELECT 'URD08' UNION ALL SELECT 'URD10' UNION ALL
  SELECT 'URD12' UNION ALL SELECT 'URD14' UNION ALL SELECT 'URD16' UNION ALL SELECT 'URD18' UNION ALL SELECT 'URD20' UNION ALL
  SELECT 'URD22' UNION ALL SELECT 'URD24' UNION ALL SELECT 'URD26' UNION ALL SELECT 'URD28' UNION ALL SELECT 'URD30' UNION ALL
  SELECT 'URD32' UNION ALL SELECT 'URD34' UNION ALL SELECT 'URD36' UNION ALL SELECT 'URD38' UNION ALL SELECT 'URD40' UNION ALL
  SELECT 'URD42' UNION ALL SELECT 'URD44' UNION ALL SELECT 'URD46' UNION ALL SELECT 'URD48' UNION ALL SELECT 'URD50' UNION ALL
  SELECT 'URD52' UNION ALL SELECT 'URD54' UNION ALL SELECT 'URD56'
) l
WHERE u.nombre = 'Adm Zona Sur';

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================

-- Ver los usuarios creados
SELECT id, nombre, email, rol FROM usuarios WHERE nombre LIKE 'Adm%';

-- Ver cuántos locales tiene cada usuario
SELECT
  u.nombre,
  COUNT(ul.local) as cantidad_locales
FROM usuarios u
LEFT JOIN usuario_locales ul ON u.id = ul.usuario_id
WHERE u.nombre LIKE 'Adm%'
GROUP BY u.nombre
ORDER BY u.nombre;
