# Configuración de Supabase Storage para InteliFact

## Problema
Error "Forbidden" o "Unexpected token 'F'" al subir imágenes.

## Causa
El bucket de Supabase Storage no tiene las políticas correctas configuradas.

## Solución

### Paso 1: Acceder a Supabase Dashboard
1. Ve a https://supabase.com/dashboard
2. Selecciona tu proyecto InteliFact
3. Click en **Storage** en el menú lateral izquierdo

### Paso 2: Configurar el Bucket 'facturas'
1. Busca el bucket llamado `facturas`
2. Click en los 3 puntos (⋮) → **Edit bucket**
3. **IMPORTANTE**: Asegúrate que esté marcado como **Public bucket**
4. Click en **Save**

### Paso 3: Configurar Políticas de Acceso (RLS Policies)

#### Opción A: Política Permisiva (Recomendada para testing)
1. Ve a la pestaña **Policies** del bucket `facturas`
2. Click en **New Policy**
3. **Nombre**: `Allow all operations`
4. **Allowed operations**: Selecciona todas (SELECT, INSERT, UPDATE, DELETE)
5. **Policy definition**:
   ```sql
   true
   ```
6. Click **Save**

#### Opción B: Política Restrictiva (Recomendada para producción)
1. Ve a la pestaña **Policies** del bucket `facturas`
2. Crea 2 políticas:

**Política 1: Permitir subir archivos**
- **Nombre**: `Allow INSERT for all users`
- **Allowed operation**: INSERT
- **Policy definition**:
  ```sql
  true
  ```

**Política 2: Permitir leer archivos**
- **Nombre**: `Allow SELECT for all users`
- **Allowed operation**: SELECT
- **Policy definition**:
  ```sql
  true
  ```

### Paso 4: Verificar Variables de Entorno en Vercel
1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Verifica que tengas:
   - `VITE_SUPABASE_URL`: URL de tu proyecto Supabase
   - `VITE_SUPABASE_ANON_KEY`: Anon key de Supabase
   - `SUPABASE_SERVICE_KEY`: Service role key (solo para backend)

### Paso 5: Probar la Configuración
1. Haz hard refresh en la app (Ctrl + Shift + R)
2. Intenta subir una imagen pequeña (<1 MB)
3. Si funciona, el problema está resuelto

## Validaciones Implementadas

### Frontend (OperacionDashboard.jsx)
- ✅ Validación de tamaño máximo: 4.5 MB
- ✅ Validación de tipos permitidos: JPG, PNG, GIF, WEBP, PDF
- ✅ Validación de archivos corruptos o vacíos
- ✅ Mensajes de error claros para el usuario

### Backend (api/index.js)
- ✅ Validación doble de tamaño
- ✅ Validación doble de tipos MIME
- ✅ Manejo específico de error "Forbidden"
- ✅ Verificación de uploads exitosos
- ✅ Logs detallados en consola
- ✅ Mensajes de error en español

## Mensajes de Error Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| "Forbidden" / "Sin permisos" | Políticas RLS no configuradas | Seguir Paso 3 |
| "Archivo excede 4.5 MB" | Imagen muy grande | Comprimir imagen |
| "Formato no válido" | Tipo de archivo no permitido | Usar JPG, PNG, GIF, WEBP o PDF |
| "Archivo vacío o corrupto" | Archivo dañado | Usar otro archivo |
| "Error desconocido" | Problema de red/timeout | Reintentar o revisar conexión |

## Límites del Sistema

- **Tamaño máximo por archivo**: 4.5 MB
- **Tipos permitidos**: JPG, JPEG, PNG, GIF, WEBP, PDF
- **Máximo de archivos por factura**: 10
- **Límite de Vercel (Free tier)**: ~4.5 MB por request

## Contacto
Si el problema persiste después de seguir estos pasos, contacta al administrador del sistema.
