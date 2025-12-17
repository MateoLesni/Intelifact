# Diagnóstico de Imágenes Rotas - Pasos Inmediatos

## 1. Verificar cuota de Storage (MÁS IMPORTANTE)
1. Ir a: https://supabase.com/dashboard/project/[tu-project-id]/settings/billing
2. Buscar la sección "Storage"
3. Ver el uso actual: `X GB / 1 GB` (plan gratuito)
4. Si está al 100% o cerca → **ESTE ES EL PROBLEMA**

**Si está lleno:**
- Opción A: Upgrade a plan Pro ($25/mes = 25 GB incluidos)
- Opción B: Eliminar imágenes antiguas (después de hacer backup)

---

## 2. Verificar configuración del bucket
1. Ir a: Supabase Dashboard > Storage > facturas (bucket)
2. Click en el ícono de engranaje (⚙️) al lado del nombre
3. Verificar:
   - ✅ "Public bucket" debe estar MARCADO
   - ❌ Si está desmarcado → Las URLs públicas no funcionan

**Si está privado:**
- Marcarlo como público
- O implementar signed URLs en el código

---

## 3. Buscar el archivo manualmente
1. Ir a: Storage > facturas
2. Buscar en el navegador del bucket: `FC_33590_OC_4474876`
3. Resultados posibles:
   - **Archivo NO aparece** → Fue eliminado (por límite de cuota probablemente)
   - **Archivo SÍ aparece** → Problema de permisos o configuración
   - **Archivo aparece pero URL da 404** → Problema de cache/CDN de Supabase

---

## 4. Verificar políticas de retención (Storage Lifecycle)
1. Ir a: Storage > facturas > Settings
2. Buscar sección "Object lifecycle" o "Lifecycle configuration"
3. Ver si hay reglas como:
   - "Delete objects older than X days"
   - "Delete objects when bucket reaches X size"

**Si hay reglas:**
- Desactivarlas si no son intencionales

---

## 5. Revisar RLS Policies
1. Ir a: Storage > facturas > Policies
2. Ver si hay policies restrictivas
3. Para bucket público, NO debería haber policies que bloqueen SELECT

**Si hay policies problemáticas:**
- Desactivarlas temporalmente para probar
- Ajustar para permitir acceso público a archivos

---

## 6. Usar la herramienta de verificación
1. Login como pedidos_admin en InteliFact
2. Click en "🔍 Verificar Imágenes" (botón naranja en navbar)
3. Click en "Verificar Todas las Imágenes"
4. Esperar resultados
5. Descargar reporte CSV para análisis

Esto te dirá:
- Total de imágenes rotas
- Cuáles facturas están afectadas
- Patrón temporal (¿todas antiguas? ¿todas recientes?)

---

## 7. Verificar estado de Supabase
1. Ir a: https://status.supabase.com/
2. Ver si hay incidentes reportados
3. Especialmente problemas con "Storage" o "CDN"

---

## Resultado esperado por causa

| Síntoma | Causa probable |
|---------|---------------|
| Storage al 100% | **Cuota excedida** → Upgrade o limpieza |
| Bucket dice "Private" | **Permisos** → Marcar como público |
| Archivo no aparece en lista | **Eliminado** → Por cuota automática |
| Archivo aparece pero URL da 404 | **Cache/CDN** → Problema de Supabase |
| Policies restrictivas activas | **RLS** → Ajustar policies |

---

## Contacto Soporte Supabase
Si ninguno de los pasos anteriores funciona:
- Email: support@supabase.io
- Dashboard > Support > New ticket
- Incluir:
  - Project ID
  - URL de ejemplo que falla
  - Fecha aproximada cuando funcionaba
  - Screenshot de configuración de Storage
