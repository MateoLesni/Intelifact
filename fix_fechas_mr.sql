-- Script para corregir fechas MR desfasadas por 1 día
-- Las fechas guardadas están 1 día atrás, necesitamos sumar 1 día

-- Ver las fechas actuales antes de corregir
SELECT id, nro_factura, mr_numero, fecha_mr,
       fecha_mr + INTERVAL '1 day' as fecha_mr_corregida
FROM facturas
WHERE fecha_mr IN ('2025-12-03', '2025-12-04')
  AND mr_estado = true
ORDER BY fecha_mr, id;

-- Corregir fecha_mr del 3/12 al 4/12
UPDATE facturas
SET fecha_mr = '2025-12-04'
WHERE fecha_mr = '2025-12-03'
  AND mr_estado = true;

-- Corregir fecha_mr del 4/12 al 5/12
UPDATE facturas
SET fecha_mr = '2025-12-05'
WHERE fecha_mr = '2025-12-04'
  AND mr_estado = true;

-- Verificar cambios
SELECT id, nro_factura, mr_numero, fecha_mr
FROM facturas
WHERE fecha_mr IN ('2025-12-04', '2025-12-05')
  AND mr_estado = true
ORDER BY fecha_mr, id;
