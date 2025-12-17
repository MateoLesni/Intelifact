# Solución: Storage Excedido en Supabase

## 🎯 Problema confirmado
Has excedido el límite de 1 GB del plan gratuito de Supabase.

**Síntomas:**
- Algunas imágenes dan 404 (no siguen patrón cronológico)
- El archivo puede existir físicamente pero el CDN niega acceso
- Comportamiento aleatorio/intermitente

**Causa raíz:**
Supabase está limitando/bloqueando acceso al Storage por exceder cuota.

---

## ✅ Soluciones (en orden de prioridad)

### **Opción 1: Upgrade a Plan Pro (RECOMENDADO)**

**Costo:** $25/mes
**Incluye:**
- 8 GB de Database storage
- 100 GB de Bandwidth
- 100 GB de Storage (vs 1 GB gratuito)
- Sin throttling ni limitaciones

**Cómo hacer upgrade:**
1. Supabase Dashboard > Settings > Billing
2. Click en "Upgrade to Pro"
3. Ingresar tarjeta de crédito
4. Confirmar upgrade

**Ventajas:**
- ✅ Solución permanente
- ✅ Sin pérdida de datos
- ✅ Restaura acceso inmediato a todas las imágenes
- ✅ Permite crecimiento futuro
- ✅ Mejor performance (sin throttling)

---

### **Opción 2: Optimizar imágenes existentes**

Si no puedes pagar ahora, reduce el tamaño:

**A. Comprimir imágenes antes de subir (IMPLEMENTAR AHORA)**

Agregar compresión automática en el frontend:

```javascript
// En OperacionDashboard.jsx - antes de subir
async function comprimirImagen(file, maxWidthOrHeight = 1920, quality = 0.8) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Redimensionar si es muy grande
        if (width > maxWidthOrHeight || height > maxWidthOrHeight) {
          if (width > height) {
            height = (height / width) * maxWidthOrHeight;
            width = maxWidthOrHeight;
          } else {
            width = (width / height) * maxWidthOrHeight;
            height = maxWidthOrHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          resolve(new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now()
          }));
        }, 'image/jpeg', quality);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
```

**Ahorro esperado:** 60-80% del tamaño por imagen

---

**B. Eliminar imágenes de facturas MUY antiguas**

Política sugerida:
- Mantener imágenes de últimos 3 meses completas
- Para facturas > 3 meses: mantener solo si NO tienen MR generado
- Para facturas > 6 meses CON MR: eliminar imágenes

**Script SQL para identificar candidatos:**

```sql
-- Ver tamaño estimado por mes
SELECT
    TO_CHAR(f.created_at, 'YYYY-MM') as mes,
    COUNT(fi.id) as imagenes,
    f.mr_estado
FROM facturas f
JOIN factura_imagenes fi ON fi.factura_id = f.id
WHERE f.created_at < NOW() - INTERVAL '3 months'
GROUP BY TO_CHAR(f.created_at, 'YYYY-MM'), f.mr_estado
ORDER BY mes DESC;

-- Obtener IDs de imágenes a eliminar (facturas > 6 meses CON MR)
SELECT fi.id, fi.imagen_url, f.nro_factura, f.mr_numero
FROM factura_imagenes fi
JOIN facturas f ON f.id = fi.factura_id
WHERE f.created_at < NOW() - INTERVAL '6 months'
  AND f.mr_estado = true;
```

**⚠️ ANTES DE ELIMINAR:**
1. Descargar backup de imágenes usando la vista de Gestión (ZIP por mes)
2. Guardar backup en Google Drive / OneDrive
3. Luego sí eliminar de Supabase

---

### **Opción 3: Migrar Storage a otro proveedor**

Si el costo de Supabase es prohibitivo:

**Alternativas más baratas:**
- **Cloudinary:** 25 GB gratis, luego $0.02/GB
- **Backblaze B2:** $0.005/GB ($0.01/GB de bandwidth)
- **AWS S3:** $0.023/GB (cuidado con bandwidth)
- **Cloudflare R2:** $0.015/GB, 0 costo de bandwidth

**Requiere:**
- Migrar código para usar nueva API
- Migrar archivos existentes
- Actualizar URLs en base de datos
- Complejidad: ALTA

---

## 🚨 Acción INMEDIATA requerida

**OPCIÓN A (ideal):** Upgrade a Pro ahora
- Costo: $25/mes
- Tiempo: 5 minutos
- Resuelve todo inmediatamente

**OPCIÓN B (temporal):** Reducir a < 1 GB manualmente
1. Usar herramienta "Verificar Imágenes" que creamos
2. Identificar imágenes rotas (ya no existen igual)
3. Limpiar referencias huérfanas
4. Eliminar imágenes antiguas con MR (después de backup)
5. Implementar compresión para nuevas uploads
6. Meta: bajar a ~800 MB para tener margen

---

## 📊 Cálculo de costo-beneficio

**Plan Pro ($25/mes = $300/año):**
- 100 GB de Storage
- ~50,000 imágenes a 2 MB cada una
- 4+ años de operación sin problema
- Costo por factura: ~$0.006 (despreciable)

**Alternativa (optimización manual):**
- Tiempo de desarrollo: 4-6 horas
- Mantenimiento mensual: 1-2 horas
- Riesgo de pérdida de datos: ALTO
- Complejidad: ALTA
- Ahorro: $25/mes

**Recomendación:** UPGRADE a Pro. El tiempo y riesgo de la alternativa no vale la pena.

---

## 📞 Próximos pasos

1. **Decidir:** ¿Upgrade o optimización manual?
2. **Si upgrade:** Hacerlo AHORA en Supabase Dashboard
3. **Si optimización:**
   - Primero: hacer backup de imágenes importantes
   - Segundo: implementar compresión
   - Tercero: limpiar imágenes antiguas
4. **Monitorear:** Configurar alerta cuando llegues a 80% de cuota
