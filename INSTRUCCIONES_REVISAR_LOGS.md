# Instrucciones para revisar logs de Vercel

Para encontrar por qué algunas imágenes no se suben correctamente, necesitamos revisar los logs del backend.

## Pasos:

1. **Ve a Vercel Dashboard**
   - https://vercel.com/
   - Selecciona tu proyecto `intelifact`

2. **Ve a la pestaña "Logs"**
   - Click en "Logs" en el menú superior
   - Filtra por "All" o "Errors"

3. **Busca errores recientes de upload**
   - Busca líneas que contengan:
     - `Error al subir`
     - `uploadError`
     - `No se pudo confirmar la subida`
     - `Error al guardar referencia`
     - `storage`

4. **Específicamente busca:**
   - ¿Hay mensajes de error con código de status 403 (Forbidden)?
   - ¿Hay mensajes de error con código 401 (Unauthorized)?
   - ¿Hay errores de "policy violation"?
   - ¿Hay errores de "RLS"?

5. **Copia y pega aquí:**
   - Los últimos 5-10 errores relacionados con upload de imágenes
   - Incluye el timestamp y el mensaje completo

## Lo que estamos buscando:

Si ves algo como:
```
Error: new row violates row-level security policy
```
→ Significa que RLS está bloqueando el upload

Si ves:
```
Error: 403 Forbidden
```
→ Significa que el SERVICE_ROLE_KEY no está configurado

Si ves:
```
Error: No se pudo confirmar la subida de [archivo]
```
→ Significa que el upload falló pero no sabemos por qué

---

**Alternativamente**, si no puedes acceder a los logs, dime:
- ¿Agregaste la variable `SUPABASE_SERVICE_ROLE_KEY` en Vercel?
- ¿Ves esa variable en Vercel Dashboard > Settings > Environment Variables?
