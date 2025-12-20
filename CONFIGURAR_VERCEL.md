# 🚀 Configurar Variables de Entorno en Vercel

## ⚠️ HACER ANTES DEL PUSH

### Paso 1: Ve a Vercel Dashboard

1. https://vercel.com/dashboard
2. Selecciona tu proyecto
3. Settings → Environment Variables

---

### Paso 2: Agregar Variables de Google Cloud Storage

#### **GCS_PROJECT_ID**
```
intelifact
```

#### **GCS_BUCKET_NAME**
```
imagenes_intelifact
```

#### **GCS_CLIENT_EMAIL**

1. Abre el archivo `intelifact-d36d34e46780.json` (local)
2. Busca `"client_email"`
3. Copia el valor (ejemplo: `nombre@proyecto.iam.gserviceaccount.com`)
4. Pégalo en Vercel

#### **GCS_PRIVATE_KEY**

1. Abre el archivo `intelifact-d36d34e46780.json` (local)
2. Busca `"private_key"`
3. **IMPORTANTE**: Copia el valor **EXACTAMENTE** como está (con los `\n`)
4. Ejemplo:
```
-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n
```
5. Pégalo en Vercel **TAL CUAL** (Vercel lo procesará correctamente)

---

### Paso 3: Verificar Variables Existentes

Asegúrate de que también estén configuradas:

- ✅ `SUPABASE_URL`
- ✅ `SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`

---

### Paso 4: Aplicar a Todas las Ramas

Para cada variable:
- Marca: `Production`, `Preview`, `Development`
- Esto asegura que funcione en todos los ambientes

---

## ✅ Checklist Completo

- [ ] SQL ejecutado en Supabase Producción ([EJECUTAR_EN_PRODUCCION.sql](EJECUTAR_EN_PRODUCCION.sql))
- [ ] `GCS_PROJECT_ID` configurada en Vercel
- [ ] `GCS_BUCKET_NAME` configurada en Vercel
- [ ] `GCS_CLIENT_EMAIL` configurada en Vercel
- [ ] `GCS_PRIVATE_KEY` configurada en Vercel (con `\n`)
- [ ] Variables aplicadas a Production, Preview, Development
- [ ] Bucket de GCS tiene CORS configurado (ya hecho ✅)
- [ ] Bucket de GCS es público (ya hecho ✅)

---

## 🚀 Después de Configurar

1. Hacer commit de los cambios
2. Push a main
3. Vercel desplegará automáticamente
4. Monitorear logs en Vercel para verificar que no hay errores

---

## 🐛 Verificar Deployment

**En Vercel Logs, deberías ver:**
```
=== CONFIGURACIÓN GCS ===
Project ID: intelifact
Bucket: imagenes_intelifact
Cliente inicializado: ✓
========================
```

**Si ves error:**
```
❌ ERROR al inicializar GCS: ...
```

→ Revisa que las variables estén configuradas correctamente y que el `PRIVATE_KEY` tenga los `\n` exactos.

---

## 📝 Nota Importante

**El archivo `intelifact-d36d34e46780.json` NUNCA debe subirse a Git.**

Ya está en `.gitignore` para evitar que se suba por error.

En local, el archivo JSON se usa directamente.
En Vercel, usamos las variables de entorno individuales.
