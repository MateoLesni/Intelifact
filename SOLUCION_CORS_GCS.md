# 🚨 SOLUCIÓN: Imágenes muestran "Imagen No Disponible"

## Problema Identificado

**Síntoma**: Las imágenes dan error "Imagen No Disponible" en el frontend, pero al abrir la URL directamente en el navegador se ven perfectamente.

**Causa Raíz**: **Falta configuración CORS en el bucket de Google Cloud Storage**

### ¿Qué es CORS y por qué falla?

**CORS (Cross-Origin Resource Sharing)** es una medida de seguridad del navegador que bloquea peticiones entre diferentes dominios.

**En tu caso:**
- Tu aplicación corre en: `localhost:5173` (desarrollo) o `tuapp.vercel.app` (producción)
- Las imágenes están en: `storage.googleapis.com`
- Son **dominios diferentes** → el navegador bloquea la carga

**¿Por qué funciona cuando abres la URL directamente?**
- Cuando pegas la URL en el navegador, NO es una petición cross-origin
- El navegador simplemente muestra el archivo
- NO se aplican restricciones CORS

**¿Por qué falla en el componente React?**
- El código tiene: `<img crossOrigin="anonymous" />`
- Esto le dice al navegador: "necesito acceso CORS a esta imagen"
- El navegador pregunta al servidor (GCS): "¿permites peticiones desde este dominio?"
- GCS responde: (sin headers CORS) → el navegador BLOQUEA la imagen
- React detecta el error → marca la imagen como rota → muestra "Imagen No Disponible"

---

## 🔧 SOLUCIÓN: Configurar CORS en Google Cloud Storage

Necesitas decirle a GCS que permita peticiones desde tu aplicación.

### Opción 1: Usar Google Cloud Console (Interfaz Web) ⭐ RECOMENDADO

1. **Ir a Google Cloud Console**:
   - https://console.cloud.google.com/storage/browser

2. **Seleccionar tu bucket**:
   - Click en `imagenes_intelifact`

3. **Ir a la pestaña "Permissions" (Permisos)**:
   - En la parte superior del bucket

4. **Click en "CORS"** (en el menú lateral izquierdo)

5. **Agregar configuración CORS**:
   - Click en "Edit CORS configuration"
   - Pega el siguiente JSON:

```json
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD"],
    "responseHeader": ["Content-Type", "Access-Control-Allow-Origin"],
    "maxAgeSeconds": 3600
  }
]
```

6. **Guardar**

---

### Opción 2: Usar `gcloud` CLI (Línea de comandos)

**Si prefieres usar la terminal:**

1. **Crear archivo `cors.json`** en la raíz del proyecto:

```json
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD"],
    "responseHeader": ["Content-Type", "Access-Control-Allow-Origin"],
    "maxAgeSeconds": 3600
  }
]
```

2. **Ejecutar comando**:

```bash
gcloud storage buckets update gs://imagenes_intelifact --cors-file=cors.json
```

**Si `gcloud` no está instalado**:
- Descarga: https://cloud.google.com/sdk/docs/install
- O usa la Opción 1 (interfaz web)

---

## 📝 Explicación de la configuración CORS

```json
{
  "origin": ["*"],  // ← Permite peticiones desde CUALQUIER dominio
                    //   (para producción, reemplaza "*" con tu dominio específico)

  "method": ["GET", "HEAD"],  // ← Permite solo lectura (GET) y verificación (HEAD)

  "responseHeader": ["Content-Type", "Access-Control-Allow-Origin"],
                    // ← Headers que el navegador puede leer

  "maxAgeSeconds": 3600  // ← El navegador cachea esta configuración por 1 hora
}
```

### ⚠️ Nota de Seguridad

**`"origin": ["*"]`** significa que CUALQUIER sitio web puede cargar tus imágenes.

**Para este proyecto, esto es ACEPTABLE** porque:
- Las imágenes son facturas internas de la empresa
- No contienen información ultra-sensible
- Ya son públicas (cualquiera con la URL puede verlas)

**Si quieres restringir solo a tu dominio** (recomendado para producción):

```json
{
  "origin": ["https://tuapp.vercel.app", "http://localhost:5173"],
  "method": ["GET", "HEAD"],
  "responseHeader": ["Content-Type", "Access-Control-Allow-Origin"],
  "maxAgeSeconds": 3600
}
```

Reemplaza `tuapp.vercel.app` con tu dominio real de Vercel.

---

## ✅ Verificar que funcionó

### Test 1: Verificar headers CORS

**En tu terminal** (Windows PowerShell):

```powershell
curl.exe -I "https://storage.googleapis.com/imagenes_intelifact/3180-1766263730902-WhatsApp_Image_2025-12-17_at_14.28.13.jpeg"
```

**Deberías ver**:
```
HTTP/2 200
access-control-allow-origin: *
access-control-expose-headers: Content-Type, Access-Control-Allow-Origin
...
```

Si ves `access-control-allow-origin: *` → **CORS configurado correctamente** ✅

Si NO ves ese header → la configuración no se aplicó, intenta de nuevo.

---

### Test 2: Recargar el frontend

1. **En el navegador**, abre DevTools (F12)
2. **Pestaña "Network"**
3. **Ctrl + Shift + R** (recarga forzada, sin caché)
4. **Las imágenes deberían cargarse correctamente**

Si siguen fallando:
- Espera 1-2 minutos (la configuración CORS puede tardar en propagarse)
- Cierra completamente el navegador y vuelve a abrirlo
- Verifica que la configuración CORS se guardó correctamente en GCS

---

### Test 3: Ver imágenes en el dashboard

1. **Ir a Proveedores Dashboard**
2. **Las imágenes deberían mostrarse correctamente** (no "Imagen No Disponible")
3. **Click en una imagen** → debería abrir el modal de zoom
4. **Descargar una imagen** → debería descargarse con el nombre correcto

---

## 🐛 Troubleshooting

### Problema: Después de configurar CORS, las imágenes SIGUEN fallando

**Posibles causas:**

#### Causa 1: El navegador tiene las imágenes en caché como "rotas"

**Solución**:
1. Abrir DevTools (F12)
2. Click derecho en el botón de recarga
3. Seleccionar "Vaciar caché y volver a cargar forzadamente"
4. O presionar: Ctrl + Shift + Delete → limpiar caché

#### Causa 2: La configuración CORS no se aplicó correctamente

**Verificar**:
```powershell
curl.exe -I "https://storage.googleapis.com/imagenes_intelifact/[NOMBRE_ARCHIVO].jpeg"
```

Si NO ves `access-control-allow-origin` en los headers:
- Ve a Google Cloud Console
- Verifica que el JSON se guardó correctamente
- Intenta eliminar la configuración y volver a agregarla

#### Causa 3: El bucket no es público

**Verificar**:
1. Google Cloud Console → Storage → `imagenes_intelifact`
2. Tab "Permissions"
3. Debe aparecer: `allUsers` con rol `Storage Object Viewer`

Si NO aparece:
```bash
gcloud storage buckets add-iam-policy-binding gs://imagenes_intelifact \
  --member=allUsers \
  --role=roles/storage.objectViewer
```

---

## 🎯 Resumen

**Problema**: Imágenes dan 404 en React pero funcionan al abrirlas directamente
**Causa**: Falta configuración CORS en Google Cloud Storage
**Solución**: Agregar configuración CORS que permita peticiones desde tu aplicación

**Pasos**:
1. ✅ Configurar CORS en bucket de GCS (Opción 1 o 2)
2. ✅ Verificar con `curl` que los headers CORS están presentes
3. ✅ Recargar frontend sin caché (Ctrl + Shift + R)
4. ✅ Verificar que las imágenes se muestran correctamente

**Después de este fix**:
- ✅ Imágenes se verán correctamente en Proveedores Dashboard
- ✅ Imágenes se verán correctamente en Pedidos Dashboard
- ✅ Descarga de imágenes funcionará con nombres virtuales correctos
- ✅ ZIP de imágenes contendrá nombres virtuales correctos

---

## 📌 Siguiente paso después de este fix

Una vez que las imágenes se vean correctamente, debes:

1. **Ejecutar el SQL para poblar renombres** ([poblar_renombre.sql](poblar_renombre.sql))
2. **Reiniciar backend y frontend**
3. **Probar flujo completo**: crear factura → generar MR → verificar nombres

Pero **PRIMERO** arregla el CORS, porque sin eso no podrás verificar nada en el frontend.

---

**¿Necesitas ayuda con alguno de estos pasos?** Avísame si encuentras algún problema.
