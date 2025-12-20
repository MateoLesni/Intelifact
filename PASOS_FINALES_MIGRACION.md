# ✅ Cambios Completados - Migración a GCS con Nombres Virtuales

## 📋 Resumen de lo implementado

### Backend
- ✅ Endpoint GET `/api/facturas` ahora incluye `renombre` y `nombre_fisico`

### Frontend
- ✅ **ProveedoresDashboard.jsx**: Usa `renombre` para mostrar y descargar
- ✅ **PedidosDashboard.jsx**: Usa `renombre` para descargar

---

## 🚨 PASOS QUE DEBES HACER AHORA

### 1. Ejecutar SQL en Supabase (URGENTE)

Ve a **Supabase Dashboard → SQL Editor** y pega el contenido de **[poblar_renombre.sql](poblar_renombre.sql)**

**¿Por qué es urgente?**
- Las imágenes antiguas tienen `renombre = NULL`
- Sin esto, el frontend intentará usar `renombre` y recibirá `null`
- El código tiene fallback (`|| img.imagen_url.split...`) pero es mejor tener los datos poblados

**Verifica el resultado:**
- La query debe mostrar: "sin_renombre: 0"
- Si muestra un número > 0, hay un problema

---

### 2. Reiniciar el backend

```bash
# Detén el servidor (Ctrl+C)
# Reinicia:
npm run server
```

---

### 3. Reiniciar el frontend

```bash
# En la otra terminal, Ctrl+C
# Reinicia:
npm run dev
```

---

### 4. Probar el flujo completo

**Test 1: Nueva factura**
1. Crear factura nueva con 2-3 imágenes
2. ✅ Verificar que se suben correctamente
3. ✅ Verificar que se ven en Pedidos
4. ✅ Generar MR
5. ✅ Verificar que nombres cambian a formato `FC_...`
6. ✅ Descargar imagen → debe tener nombre `FC_...`

**Test 2: Factura vieja (antes de migración)**
1. Ir a una factura que ya existía
2. ✅ Verificar que las imágenes se ven
3. ✅ Descargar → debe tener el nombre correcto
4. ✅ Si no tiene MR, generar MR
5. ✅ Verificar que `renombre` se actualiza a `FC_...`

---

## ⚠️ PROBLEMAS POTENCIALES Y SOLUCIONES

### Problema 1: Frontend sigue mostrando nombre físico

**Causa**: El navegador tiene cache de JavaScript

**Solución**:
```
Ctrl + F5 (fuerza recarga sin cache)
O
Ctrl + Shift + R
```

---

### Problema 2: Imágenes dan 404 en producción (Vercel)

**Causa posible**: Las imágenes se subieron cuando el bucket NO era público

**Cómo verificar**:
1. Copia URL de una imagen del screenshot
2. Pégala en navegador incógnito
3. Si da 403 Forbidden → el bucket no está público correctamente

**Solución**:
- Verifica en Google Cloud Console que el bucket tiene el permiso `allUsers → Storage Object Viewer`
- Las imágenes subidas DESPUÉS de hacer el bucket público funcionarán
- Las imágenes subidas ANTES necesitan ser re-subidas O hacerlas públicas manualmente

---

### Problema 3: Al hacer MR, el nombre virtual NO se genera

**Cómo verificar**:
1. Genera MR para una factura
2. Revisa los logs del backend (terminal donde corre `npm run server`)
3. Debe decir: `📸 Actualizando nombres virtuales de X imagen(es)...`
4. Debe mostrar: `1. "nombre_fisico.jpg" → "FC_...jpg"`

**Si NO aparece**:
- Revisa que la factura tenga imágenes asociadas
- Revisa en Supabase que la tabla `factura_imagenes` tiene registros para esa factura

---

### Problema 4: Descarga con nombre incorrecto

**Síntomas**:
- Al descargar desde Proveedores, el nombre del archivo es el físico (3159-xxx.jpg) en vez del virtual (FC_xxx.jpg)

**Causa**:
- El campo `renombre` está NULL en la base de datos

**Solución**:
1. Ejecuta la query SQL del paso 1
2. Si ya la ejecutaste, verifica en Supabase:
   ```sql
   SELECT id, renombre, nombre_fisico
   FROM factura_imagenes
   WHERE renombre IS NULL
   LIMIT 10;
   ```
3. Si hay resultados, algo falló en la query de población

---

### Problema 5: Error al generar MR - "nombre_fisico is null"

**Síntomas**:
```
ERROR al generar MR:
Cannot read properties of null (reading 'nombre_fisico')
```

**Causa**:
- Imágenes viejas que no tienen `nombre_fisico` poblado

**Solución**:
Ejecuta en Supabase:
```sql
-- Poblar nombre_fisico para imágenes que no lo tienen
UPDATE factura_imagenes
SET nombre_fisico = SUBSTRING(imagen_url FROM '/([^/]+)$')
WHERE nombre_fisico IS NULL;
```

---

### Problema 6: ZIP descargado tiene nombres físicos

**En ProveedoresDashboard**, al descargar todas las imágenes de una fecha como ZIP:

**Verificar**: Abre el ZIP y mira los nombres de archivo

**Si son nombres físicos (3159-xxx.jpg)**:
- El frontend NO está leyendo `renombre` correctamente
- Verifica que el backend envía `renombre` en la respuesta

**Cómo verificar backend**:
1. Abre DevTools (F12)
2. Tab "Network"
3. Recarga la página
4. Busca request a `/api/facturas`
5. Click en "Response"
6. Busca una factura y mira `factura_imagenes`
7. Debe tener: `{imagen_url: "...", renombre: "...", nombre_fisico: "..."}`

**Si no tiene esos campos**:
- El cambio en `api/index.js` línea 195 no se aplicó
- Reinicia el backend con `npm run server`

---

## 📊 Cómo verificar que todo funciona

### Checklist completo

- [ ] Backend reiniciado
- [ ] Frontend reiniciado
- [ ] SQL ejecutado (renombre poblado)
- [ ] Nueva factura: Sube correctamente
- [ ] Nueva factura: Imágenes se ven
- [ ] Nueva factura: Al generar MR, `renombre` cambia a `FC_...`
- [ ] Nueva factura: Descarga con nombre `FC_...`
- [ ] Factura vieja: Imágenes se ven
- [ ] Factura vieja: Descarga con nombre correcto
- [ ] Proveedores: Muestra nombres correctos (no físicos)
- [ ] Proveedores: ZIP tiene nombres correctos
- [ ] Pedidos: Descarga con nombre correcto

---

## 🔍 Logs importantes a revisar

### Al subir imagen nueva:

```
🚀 SUBIENDO 1 IMAGEN(ES) A GOOGLE CLOUD STORAGE
--- Imagen 1/1 ---
📁 Original: WhatsApp Image.jpg
💾 Nombre físico: 3159-1766255680123-WhatsApp_Image.jpg
📏 Tamaño original: 1024 KB
📦 Compresión: 1024 KB → 512 KB (ahorró 50.0%)
✅ URL pública: https://storage.googleapis.com/imagenes_intelifact/3159-...
💾 Guardando referencia en DB...
✅ Imagen 1 subida y registrada exitosamente
✅ TODAS LAS IMÁGENES SUBIDAS EXITOSAMENTE
```

### Al generar MR:

```
🏷️  GENERANDO MR 1000080394 PARA FACTURA 3159
📄 Factura: 116885
🏪 Local: Kona Verduleria 66
🏢 Proveedor: RAICES
📋 OC: 00
✅ Factura actualizada con MR

📸 Actualizando nombres virtuales de 2 imagen(es)...
1. "3159-1766255680123-WhatsApp_Image.jpg" → "FC_116885_OC_00_MR_1000080394_Kona_Verduleria_66_RAICES.jpg"
2. "3159-1766255680456-WhatsApp_Image_2.jpg" → "FC_116885_OC_00_MR_1000080394_Kona_Verduleria_66_RAICES_2.jpg"
✅ Nombres virtuales actualizados
✅ Auditoría registrada
✅ MR 1000080394 GENERADA EXITOSAMENTE
```

**Si los logs NO se ven así**, hay un problema.

---

## 🚀 Siguiente paso después de pruebas

Si TODO funciona correctamente en local:

1. **Commit de los cambios**
2. **Push a Vercel**
3. **Monitorear primeros uploads en producción**

**IMPORTANTE**: Las imágenes viejas en Supabase Storage siguen ahí. No se han migrado a GCS todavía. Eso se hace en una fase posterior.

---

## 📝 Archivos modificados

| Archivo | Cambio | Líneas |
|---------|--------|--------|
| api/index.js | GET /facturas incluye renombre y nombre_fisico | 195 |
| src/components/ProveedoresDashboard.jsx | Usa renombre para mostrar/descargar | 122 |
| src/components/PedidosDashboard.jsx | Usa renombre para descargar | 1453 |

---

¿Tienes alguna duda o encuentras algún problema? Avísame de inmediato.
