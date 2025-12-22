# 🔍 Verificar Imágenes Rotas (404)

## Opciones Disponibles

Tienes **2 opciones** para verificar las imágenes rotas:

---

## 📊 **OPCIÓN 1: Queries SQL (Más Rápido)**

### Ventajas:
- ✅ Instantáneo
- ✅ No requiere instalar nada
- ✅ Identifica imágenes en Supabase Storage (probables 404)

### Desventaja:
- ⚠️ No verifica si las URLs dan 404 realmente, solo muestra dónde están alojadas

### Cómo Usar:

1. **Abre Supabase Dashboard**
   - Ve a tu proyecto → SQL Editor

2. **Ejecuta la Query 1 del archivo** `verificar_imagenes_rotas.sql`
   ```sql
   -- QUERY 1: Listado completo de imágenes potencialmente rotas
   SELECT
       f.created_at::date as fecha_carga,
       f.local,
       f.nro_factura,
       ...
   ```

3. **Exporta a CSV**
   - Click en **"Download CSV"** (arriba a la derecha)
   - Abre el CSV en Excel

4. **Analiza los resultados**
   - Columna `tipo_storage`:
     - `Supabase Storage` → Probablemente da 404 (imágenes viejas)
     - `Google Cloud Storage` → Debería funcionar (imágenes nuevas)

---

## 🤖 **OPCIÓN 2: Script Automático (Más Preciso)**

### Ventajas:
- ✅ Verifica cada URL automáticamente
- ✅ Identifica 404 reales
- ✅ Genera 2 CSVs listos para analizar
- ✅ Muestra resumen por local

### Desventaja:
- ⚠️ Tarda varios minutos (verifica URL por URL)

### Cómo Usar:

1. **Ejecuta el script**
   ```bash
   node verificar_imagenes_404.js
   ```

2. **Espera a que termine**
   - Verá el progreso cada 50 imágenes
   - Puede tardar 5-15 minutos dependiendo de cuántas imágenes tengas

3. **Revisa los archivos generados**
   - **`imagenes_404.csv`**: Listado completo de imágenes con problemas
   - **`resumen_por_local.csv`**: Resumen agrupado por local

4. **Abre en Excel**
   - Excel → Abrir → Selecciona el CSV
   - Activa filtros para explorar los datos

---

## 📋 **Columnas en el CSV (Script Automático)**

| Columna | Descripción |
|---------|-------------|
| **Fecha Carga** | Fecha en que se creó la factura |
| **Local** | Local asociado |
| **Nro Factura** | Número de factura |
| **Proveedor** | Proveedor |
| **OC** | Orden de compra |
| **MR** | Número de MR (si tiene) |
| **URL** | URL completa de la imagen |
| **Nombre Archivo** | Nombre del archivo |
| **Storage** | SUPABASE, GCS, u OTRO |
| **Status** | 404, URL_NULL, SIN_IMAGENES, ERROR_RED |
| **Problema** | Descripción del problema |

---

## 🎯 **Interpretar Resultados**

### Status Posibles:

| Status | Significado | Acción |
|--------|-------------|--------|
| **404** | Imagen no existe en el storage | ⚠️ Imagen perdida |
| **URL_NULL** | La imagen no tiene URL en la DB | ⚠️ Error al subir |
| **SIN_IMAGENES** | La factura no tiene imágenes | ℹ️ Normal (no todas tienen) |
| **ERROR_RED** | Timeout o error de red | 🔄 Reintentar |
| **403** | Acceso denegado | 🔒 Problema de permisos |

---

## 📊 **Análisis en Excel**

Una vez abierto el CSV en Excel:

1. **Filtrar por Storage**
   - Filtrar columna "Storage" = "SUPABASE"
   - Estas son las imágenes viejas que probablemente dan 404

2. **Ordenar por Fecha**
   - Columna "Fecha Carga" → Ordenar Z-A (más reciente primero)
   - Ver cuándo empezaron los problemas

3. **Agrupar por Local**
   - Usar tabla dinámica (Pivot Table)
   - Filas: Local
   - Valores: Contar "Status"
   - Ver qué locales tienen más problemas

4. **Filtrar por Status**
   - Filtrar columna "Status" = "404"
   - Ver solo las imágenes confirmadas como perdidas

---

## 🔧 **Queries Adicionales en SQL**

El archivo `verificar_imagenes_rotas.sql` incluye 6 queries:

1. **QUERY 1**: Listado completo (para exportar)
2. **QUERY 2**: Resumen por local y fecha
3. **QUERY 3**: Resumen por mes (tendencia)
4. **QUERY 4**: Facturas sin imágenes
5. **QUERY 5**: Facturas con URL NULL
6. **QUERY 6**: Archivos huérfanos en storage

Ejecuta cada una según lo que necesites analizar.

---

## 💡 **Recomendaciones**

### Si tienes pocas facturas (<500):
- Usa **Opción 2 (Script)** → Más preciso

### Si tienes muchas facturas (>1000):
- Empieza con **Opción 1 (SQL)** → Identifica rápido
- Luego usa **Opción 2** solo en fechas/locales específicos

### Para análisis mensual:
- Ejecuta **QUERY 3** (resumen por mes)
- Identifica cuándo empezaron los problemas

---

## 🚨 **Problemas Comunes**

### "El script tarda mucho"
- **Normal**: Verifica cada URL individualmente
- **Espera**: Puede tardar hasta 15-20 minutos
- **Alternativa**: Usa las queries SQL primero

### "Error: Cannot find module '@supabase/supabase-js'"
- Ejecuta: `npm install`

### "Error: Missing environment variables"
- Verifica que `.env.local` tenga:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

---

## 📁 **Archivos Generados**

Después de ejecutar el script:

```
proyecto/
├── imagenes_404.csv          ← Listado completo de problemas
├── resumen_por_local.csv     ← Resumen agrupado
└── verificar_imagenes_404.js ← Script (no modificar)
```

---

## 🎯 **Siguiente Paso**

Una vez que tengas el listado de imágenes rotas:

1. **Identificar patrones**:
   - ¿Todas son de Supabase Storage?
   - ¿De qué fechas?
   - ¿Qué locales afecta más?

2. **Decidir acción**:
   - Migrar imágenes viejas a GCS
   - Pedir a usuarios que resuban las facturas afectadas
   - Marcar facturas como "sin imagen disponible"

---

**¿Necesitas ayuda con el análisis o la migración?** Avísame.
