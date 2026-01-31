-- ============================================
-- SCRIPT CORRECTO V2: LOCALES Y ASIGNACIONES
-- ============================================
-- Usa los nombres exactos de usuarios con guión bajo
-- ============================================

-- PASO 1: Eliminar locales incorrectos que se crearon antes
-- ============================================
DELETE FROM locales WHERE local IN (
  'UFC04', 'UFC08', 'UFP14', 'UFP19',
  'UFR03', 'UFR07', 'UFR11', 'UFR15', 'UFR19',
  'UFS03', 'UFS05', 'UFS09', 'UFS17',
  'UFV02', 'UFV06', 'UFV10', 'UFV12', 'UFV16',
  'UFD05', 'UFD09', 'UFD13', 'UFD17', 'UFD21', 'UFD23',
  'UFH03', 'UFH05', 'UFH09', 'UFH13', 'UFH17', 'UFH19',
  'UFH21', 'UFH23', 'UFH25', 'UFH27', 'UFH29', 'UFH31',
  'UFH33', 'UFH35', 'UFH37', 'UFH39',
  'USS02', 'USS04', 'USS06', 'USS08', 'USS10',
  'USS12', 'USS14', 'USS16', 'USS18', 'USS20',
  'USS22', 'USS24', 'USS26',
  'USP04', 'USP08', 'USP12', 'USP16', 'USP20', 'USP24', 'USP26',
  'USC04', 'USC06', 'USC08', 'USC10', 'USC12',
  'USC14', 'USC16', 'USC18', 'USC20',
  'URT02', 'URT04', 'URT06', 'URT08', 'URT10',
  'URT12', 'URT14', 'URT16', 'URT18',
  'URM02', 'URM04',
  'USM02', 'USM04', 'USM06', 'USM08', 'USM10',
  'USM12', 'USM14', 'USM16', 'USM18', 'USM20',
  'USM22', 'USM24', 'USM26', 'USM28', 'USM30',
  'USM32', 'USM34', 'USM36', 'USM38', 'USM40',
  'USM42', 'USM44',
  'URQ03', 'URQ05', 'URQ09', 'URQ13', 'URQ17',
  'URQ19', 'URQ21', 'URQ23', 'URQ25', 'URQ27',
  'URQ31', 'URQ33', 'URQ37',
  'URC02', 'URC04', 'URC06', 'URC08', 'URC10',
  'URC12', 'URC14', 'URC16', 'URC18', 'URC20',
  'URC22', 'URC24',
  'URD02', 'URD04', 'URD06', 'URD08', 'URD10',
  'URD12', 'URD14', 'URD16', 'URD18', 'URD20',
  'URD22', 'URD24', 'URD26', 'URD28', 'URD30',
  'URD32', 'URD34', 'URD36', 'URD38', 'URD40',
  'URD42', 'URD44', 'URD46', 'URD48', 'URD50',
  'URD52', 'URD54', 'URD56'
);

-- PASO 2: Crear los locales correctos según locales.md
-- ============================================

-- Locales para Adm_Constitucion (42 locales)
INSERT INTO locales (local, categoria) VALUES
('UFB09', 'Trenes'),
('UFB69', 'Trenes'),
('UFB106', 'Trenes'),
('UFB11', 'Trenes'),
('UFB130', 'Trenes'),
('UFB61', 'Trenes'),
('UFB86', 'Trenes'),
('HL01', 'Trenes'),
('UFB07', 'Trenes'),
('UFB92', 'Trenes'),
('KC01', 'Trenes'),
('BA04', 'Trenes'),
('BA06', 'Trenes'),
('BA05', 'Trenes'),
('JM23', 'Trenes'),
('JM12', 'Trenes'),
('JM13', 'Trenes'),
('JM21', 'Trenes'),
('JM22', 'Trenes'),
('JM25', 'Trenes'),
('JM32', 'Trenes'),
('JM33', 'Trenes'),
('JM39', 'Trenes'),
('JM42', 'Trenes'),
('BA07', 'Trenes'),
('PF00', 'Trenes'),
('PF02', 'Trenes'),
('PF05', 'Trenes'),
('PF06', 'Trenes'),
('JM28', 'Trenes'),
('SH04', 'Trenes'),
('SH11', 'Trenes'),
('TH07', 'Trenes'),
('TH13', 'Trenes'),
('TH54', 'Trenes'),
('PF03', 'Trenes'),
('PF04', 'Trenes'),
('UFB123', 'Trenes'),
('SH18', 'Trenes'),
('UFB124', 'Trenes'),
('UFB53', 'Trenes'),
('UFB12', 'Trenes')
ON CONFLICT (local) DO NOTHING;

-- Locales para Adm_Oeste (21 locales)
INSERT INTO locales (local, categoria) VALUES
('UFB13', 'Trenes'),
('UFB134', 'Trenes'),
('KF01', 'Trenes'),
('KM00', 'Trenes'),
('KM04', 'Trenes'),
('BR03', 'Trenes'),
('CR08', 'Trenes'),
('LI00', 'Trenes'),
('MJ30', 'Trenes'),
('LI01', 'Trenes'),
('LI05', 'Trenes'),
('LI07', 'Trenes'),
('LI09', 'Trenes'),
('MJ15', 'Trenes'),
('MJ16', 'Trenes'),
('MJ22', 'Trenes'),
('MJ23', 'Trenes'),
('MJ24', 'Trenes'),
('MJ35', 'Trenes'),
('LI11', 'Trenes'),
('CR05', 'Trenes')
ON CONFLICT (local) DO NOTHING;

-- Locales para Adm_Once (29 locales)
INSERT INTO locales (local, categoria) VALUES
('UFB01', 'Trenes'),
('UFB03', 'Trenes'),
('UFB128', 'Trenes'),
('UFB93', 'Trenes'),
('KO11', 'Trenes'),
('KO01', 'Trenes'),
('KO04', 'Trenes'),
('KO05', 'Trenes'),
('UFB52', 'Trenes'),
('KO02', 'Trenes'),
('HO03', 'Trenes'),
('HO04', 'Trenes'),
('HO07', 'Trenes'),
('HO13', 'Trenes'),
('HO19', 'Trenes'),
('HO21', 'Trenes'),
('HO22', 'Trenes'),
('HO33', 'Trenes'),
('HO43', 'Trenes'),
('HO47', 'Trenes'),
('HO48', 'Trenes'),
('HO50', 'Trenes'),
('HO54', 'Trenes'),
('HO44', 'Trenes'),
('HO46', 'Trenes'),
('HO55', 'Trenes'),
('HO25', 'Trenes'),
('UFB129', 'Trenes'),
('UFB133', 'Trenes')
ON CONFLICT (local) DO NOTHING;

-- Locales para Adm_Retiro (11 locales)
INSERT INTO locales (local, categoria) VALUES
('UFB89', 'Trenes'),
('ZT51', 'Trenes'),
('KR01', 'Trenes'),
('CC11', 'Trenes'),
('CC12', 'Trenes'),
('JM07', 'Trenes'),
('CR14', 'Trenes'),
('JM60', 'Trenes'),
('CR13', 'Trenes'),
('JM43', 'Trenes'),
('JM45', 'Trenes')
ON CONFLICT (local) DO NOTHING;

-- Locales para Adm_ZonaSur (49 locales)
INSERT INTO locales (local, categoria) VALUES
('UFB110', 'Trenes'),
('UFB31', 'Trenes'),
('UFB32', 'Trenes'),
('UFB33', 'Trenes'),
('UFB50', 'Trenes'),
('UFB60', 'Trenes'),
('UFB82', 'Trenes'),
('UFB127', 'Trenes'),
('KZ02', 'Trenes'),
('ZI32', 'Trenes'),
('BR04', 'Trenes'),
('CL02', 'Trenes'),
('ZF05', 'Trenes'),
('ZF08', 'Trenes'),
('ZF18', 'Trenes'),
('ZF19', 'Trenes'),
('ZI01', 'Trenes'),
('ZI02', 'Trenes'),
('ZI03', 'Trenes'),
('ZI04', 'Trenes'),
('ZI06', 'Trenes'),
('ZI10', 'Trenes'),
('ZI11', 'Trenes'),
('ZI14', 'Trenes'),
('ZI18', 'Trenes'),
('ZI27', 'Trenes'),
('ZI23', 'Trenes'),
('ZF22', 'Trenes'),
('ZI33', 'Trenes'),
('ZI28', 'Trenes'),
('ZI29', 'Trenes'),
('ZI30', 'Trenes'),
('ZI31', 'Trenes'),
('ZJ06', 'Trenes'),
('ZJ10', 'Trenes'),
('ZJ11', 'Trenes'),
('ZJ14', 'Trenes'),
('ZJ17', 'Trenes'),
('ZT03', 'Trenes'),
('ZT18', 'Trenes'),
('ZT19', 'Trenes'),
('ZT20', 'Trenes'),
('ZT33', 'Trenes'),
('ZT34', 'Trenes'),
('ZJ02', 'Trenes'),
('UFB55', 'Trenes'),
('UFB132', 'Trenes'),
('ZF20', 'Trenes'),
('ZT60', 'Trenes')
ON CONFLICT (local) DO NOTHING;

-- ============================================
-- PASO 3: Eliminar asignaciones anteriores incorrectas
-- ============================================
DELETE FROM usuario_locales
WHERE usuario_id IN (
  SELECT id FROM usuarios WHERE nombre IN (
    'Adm_Constitucion', 'Adm_Once', 'Adm_Retiro', 'Adm_Oeste', 'Adm_ZonaSur'
  )
);

-- ============================================
-- PASO 4: Asignar locales correctos a cada usuario
-- ============================================

-- Asignaciones para Adm_Constitucion (42 locales)
INSERT INTO usuario_locales (usuario_id, local)
SELECT u.id, l.local
FROM usuarios u
CROSS JOIN (
  SELECT 'UFB09' AS local UNION ALL SELECT 'UFB69' UNION ALL SELECT 'UFB106' UNION ALL SELECT 'UFB11' UNION ALL SELECT 'UFB130' UNION ALL
  SELECT 'UFB61' UNION ALL SELECT 'UFB86' UNION ALL SELECT 'HL01' UNION ALL SELECT 'UFB07' UNION ALL SELECT 'UFB92' UNION ALL
  SELECT 'KC01' UNION ALL SELECT 'BA04' UNION ALL SELECT 'BA06' UNION ALL SELECT 'BA05' UNION ALL SELECT 'JM23' UNION ALL
  SELECT 'JM12' UNION ALL SELECT 'JM13' UNION ALL SELECT 'JM21' UNION ALL SELECT 'JM22' UNION ALL SELECT 'JM25' UNION ALL
  SELECT 'JM32' UNION ALL SELECT 'JM33' UNION ALL SELECT 'JM39' UNION ALL SELECT 'JM42' UNION ALL SELECT 'BA07' UNION ALL
  SELECT 'PF00' UNION ALL SELECT 'PF02' UNION ALL SELECT 'PF05' UNION ALL SELECT 'PF06' UNION ALL SELECT 'JM28' UNION ALL
  SELECT 'SH04' UNION ALL SELECT 'SH11' UNION ALL SELECT 'TH07' UNION ALL SELECT 'TH13' UNION ALL SELECT 'TH54' UNION ALL
  SELECT 'PF03' UNION ALL SELECT 'PF04' UNION ALL SELECT 'UFB123' UNION ALL SELECT 'SH18' UNION ALL SELECT 'UFB124' UNION ALL
  SELECT 'UFB53' UNION ALL SELECT 'UFB12'
) l
WHERE u.nombre = 'Adm_Constitucion';

-- Asignaciones para Adm_Oeste (21 locales)
INSERT INTO usuario_locales (usuario_id, local)
SELECT u.id, l.local
FROM usuarios u
CROSS JOIN (
  SELECT 'UFB13' AS local UNION ALL SELECT 'UFB134' UNION ALL SELECT 'KF01' UNION ALL SELECT 'KM00' UNION ALL SELECT 'KM04' UNION ALL
  SELECT 'BR03' UNION ALL SELECT 'CR08' UNION ALL SELECT 'LI00' UNION ALL SELECT 'MJ30' UNION ALL SELECT 'LI01' UNION ALL
  SELECT 'LI05' UNION ALL SELECT 'LI07' UNION ALL SELECT 'LI09' UNION ALL SELECT 'MJ15' UNION ALL SELECT 'MJ16' UNION ALL
  SELECT 'MJ22' UNION ALL SELECT 'MJ23' UNION ALL SELECT 'MJ24' UNION ALL SELECT 'MJ35' UNION ALL SELECT 'LI11' UNION ALL
  SELECT 'CR05'
) l
WHERE u.nombre = 'Adm_Oeste';

-- Asignaciones para Adm_Once (29 locales)
INSERT INTO usuario_locales (usuario_id, local)
SELECT u.id, l.local
FROM usuarios u
CROSS JOIN (
  SELECT 'UFB01' AS local UNION ALL SELECT 'UFB03' UNION ALL SELECT 'UFB128' UNION ALL SELECT 'UFB93' UNION ALL SELECT 'KO11' UNION ALL
  SELECT 'KO01' UNION ALL SELECT 'KO04' UNION ALL SELECT 'KO05' UNION ALL SELECT 'UFB52' UNION ALL SELECT 'KO02' UNION ALL
  SELECT 'HO03' UNION ALL SELECT 'HO04' UNION ALL SELECT 'HO07' UNION ALL SELECT 'HO13' UNION ALL SELECT 'HO19' UNION ALL
  SELECT 'HO21' UNION ALL SELECT 'HO22' UNION ALL SELECT 'HO33' UNION ALL SELECT 'HO43' UNION ALL SELECT 'HO47' UNION ALL
  SELECT 'HO48' UNION ALL SELECT 'HO50' UNION ALL SELECT 'HO54' UNION ALL SELECT 'HO44' UNION ALL SELECT 'HO46' UNION ALL
  SELECT 'HO55' UNION ALL SELECT 'HO25' UNION ALL SELECT 'UFB129' UNION ALL SELECT 'UFB133'
) l
WHERE u.nombre = 'Adm_Once';

-- Asignaciones para Adm_Retiro (11 locales)
INSERT INTO usuario_locales (usuario_id, local)
SELECT u.id, l.local
FROM usuarios u
CROSS JOIN (
  SELECT 'UFB89' AS local UNION ALL SELECT 'ZT51' UNION ALL SELECT 'KR01' UNION ALL SELECT 'CC11' UNION ALL SELECT 'CC12' UNION ALL
  SELECT 'JM07' UNION ALL SELECT 'CR14' UNION ALL SELECT 'JM60' UNION ALL SELECT 'CR13' UNION ALL SELECT 'JM43' UNION ALL
  SELECT 'JM45'
) l
WHERE u.nombre = 'Adm_Retiro';

-- Asignaciones para Adm_ZonaSur (49 locales)
INSERT INTO usuario_locales (usuario_id, local)
SELECT u.id, l.local
FROM usuarios u
CROSS JOIN (
  SELECT 'UFB110' AS local UNION ALL SELECT 'UFB31' UNION ALL SELECT 'UFB32' UNION ALL SELECT 'UFB33' UNION ALL SELECT 'UFB50' UNION ALL
  SELECT 'UFB60' UNION ALL SELECT 'UFB82' UNION ALL SELECT 'UFB127' UNION ALL SELECT 'KZ02' UNION ALL SELECT 'ZI32' UNION ALL
  SELECT 'BR04' UNION ALL SELECT 'CL02' UNION ALL SELECT 'ZF05' UNION ALL SELECT 'ZF08' UNION ALL SELECT 'ZF18' UNION ALL
  SELECT 'ZF19' UNION ALL SELECT 'ZI01' UNION ALL SELECT 'ZI02' UNION ALL SELECT 'ZI03' UNION ALL SELECT 'ZI04' UNION ALL
  SELECT 'ZI06' UNION ALL SELECT 'ZI10' UNION ALL SELECT 'ZI11' UNION ALL SELECT 'ZI14' UNION ALL SELECT 'ZI18' UNION ALL
  SELECT 'ZI27' UNION ALL SELECT 'ZI23' UNION ALL SELECT 'ZF22' UNION ALL SELECT 'ZI33' UNION ALL SELECT 'ZI28' UNION ALL
  SELECT 'ZI29' UNION ALL SELECT 'ZI30' UNION ALL SELECT 'ZI31' UNION ALL SELECT 'ZJ06' UNION ALL SELECT 'ZJ10' UNION ALL
  SELECT 'ZJ11' UNION ALL SELECT 'ZJ14' UNION ALL SELECT 'ZJ17' UNION ALL SELECT 'ZT03' UNION ALL SELECT 'ZT18' UNION ALL
  SELECT 'ZT19' UNION ALL SELECT 'ZT20' UNION ALL SELECT 'ZT33' UNION ALL SELECT 'ZT34' UNION ALL SELECT 'ZJ02' UNION ALL
  SELECT 'UFB55' UNION ALL SELECT 'UFB132' UNION ALL SELECT 'ZF20' UNION ALL SELECT 'ZT60'
) l
WHERE u.nombre = 'Adm_ZonaSur';

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================

-- Ver cuántos locales tiene cada usuario
SELECT
  u.nombre,
  COUNT(ul.local) as cantidad_locales
FROM usuarios u
LEFT JOIN usuario_locales ul ON u.id = ul.usuario_id
WHERE u.nombre LIKE 'Adm_%'
GROUP BY u.nombre
ORDER BY u.nombre;

-- Ver detalle de locales por usuario (primeros 10 de cada uno)
SELECT
  u.nombre as usuario,
  STRING_AGG(ul.local, ', ' ORDER BY ul.local) as primeros_locales
FROM usuarios u
LEFT JOIN usuario_locales ul ON u.id = ul.usuario_id
WHERE u.nombre LIKE 'Adm_%'
GROUP BY u.nombre
ORDER BY u.nombre;
