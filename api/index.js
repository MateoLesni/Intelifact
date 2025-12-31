require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');
const { Storage } = require('@google-cloud/storage');
const sharp = require('sharp');
const path = require('path');

const app = express();

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
// Usar SERVICE_ROLE_KEY para operaciones del backend (bypasea RLS)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

console.log('=== CONFIGURACIÓN SUPABASE ===');
console.log('URL:', supabaseUrl);
console.log('Key presente:', !!supabaseKey);
console.log('Usando SERVICE_ROLE_KEY:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log('Key (primeros 20 chars):', supabaseKey?.substring(0, 20) + '...');

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: Faltan las credenciales de Supabase en el archivo .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ======= CONFIGURACIÓN GOOGLE CLOUD STORAGE =======
let gcsStorage;
let gcsBucket;

try {
  // En local: usa el archivo JSON
  // En Vercel: usa variables de entorno
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Desarrollo local
    gcsStorage = new Storage({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      projectId: process.env.GCS_PROJECT_ID
    });
  } else {
    // Producción (Vercel)
    gcsStorage = new Storage({
      projectId: process.env.GCS_PROJECT_ID,
      credentials: {
        client_email: process.env.GCS_CLIENT_EMAIL,
        private_key: process.env.GCS_PRIVATE_KEY?.replace(/\\n/g, '\n')
      }
    });
  }

  gcsBucket = gcsStorage.bucket(process.env.GCS_BUCKET_NAME);

  console.log('=== CONFIGURACIÓN GCS ===');
  console.log('Project ID:', process.env.GCS_PROJECT_ID);
  console.log('Bucket:', process.env.GCS_BUCKET_NAME);
  console.log('Cliente inicializado: ✓');
  console.log('========================');
} catch (error) {
  console.error('❌ ERROR al inicializar GCS:', error.message);
  process.exit(1);
}
// ==================================================

// Middleware
app.use(cors());
app.use(express.json());

// Configuración de multer para manejar archivos
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB límite
});

// Función para sanitizar nombres de archivo de forma segura
// Elimina caracteres inválidos y normaliza el nombre
const sanitizeFilename = (filename) => {
  if (!filename) return 'imagen';

  return filename
    .normalize('NFD') // Normalizar Unicode
    .replace(/[\u0300-\u036f]/g, '') // Eliminar tildes/acentos
    .replace(/\s+/g, '_') // Espacios → guion bajo
    .replace(/[^\w\s.-]/g, '') // Solo alfanuméricos, espacios, puntos, guiones
    .replace(/_{2,}/g, '_') // Múltiples guiones bajos → uno solo
    .replace(/^[._-]+/, '') // Eliminar puntos/guiones al inicio
    .replace(/[._-]+$/, '') // Eliminar puntos/guiones al final
    .substring(0, 200); // Limitar longitud
};

// Función para comprimir imágenes antes de subir
// Optimiza el tamaño del archivo sin sacrificar mucha calidad
const compressImage = async (buffer, mimetype) => {
  try {
    // Si es PDF, retornar sin modificar
    if (mimetype === 'application/pdf') {
      return buffer;
    }

    // Si no es imagen, retornar sin modificar
    if (!mimetype.startsWith('image/')) {
      return buffer;
    }

    // Formatos que no deben ser comprimidos (SVG es vectorial, HEIC/HEIF pueden no ser soportados por Sharp)
    const NO_COMPRESS_FORMATS = ['image/svg+xml', 'image/heic', 'image/heif'];
    if (NO_COMPRESS_FORMATS.includes(mimetype)) {
      console.log(`ℹ️ Formato ${mimetype} no se comprime, usando original`);
      return buffer;
    }

    // Comprimir imagen con sharp
    // NOTA DE ESCALABILIDAD: Sharp es extremadamente eficiente y usa streaming
    // Procesa millones de imágenes sin problemas de memoria
    const compressed = await sharp(buffer)
      .resize(2400, 2400, { // Max 2400x2400px, mantiene aspect ratio
        fit: 'inside',
        withoutEnlargement: true // No agrandar imágenes pequeñas
      })
      .jpeg({
        quality: 85, // 85% calidad - buen balance entre tamaño y calidad
        mozjpeg: true // Usar MozJPEG para mejor compresión
      })
      .toBuffer();

    const originalSize = buffer.length;
    const compressedSize = compressed.length;
    const savings = ((1 - compressedSize / originalSize) * 100).toFixed(1);

    console.log(`📦 Compresión: ${(originalSize / 1024).toFixed(0)} KB → ${(compressedSize / 1024).toFixed(0)} KB (ahorró ${savings}%)`);

    return compressed;
  } catch (error) {
    console.error('⚠️ Error al comprimir imagen, usando original:', error.message);
    return buffer; // Si falla, usar original (fail-safe)
  }
};

// ============ AUTENTICACIÓN ============

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Buscar usuario por nombre (no por username)
    const { data: usuario, error: userError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('nombre', username)
      .eq('password', password)
      .single();

    if (userError || !usuario) {
      console.error('Error de login:', userError);
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Obtener locales asignados si es usuario de operación
    let localesAsignados = [];
    if (usuario.rol === 'operacion') {
      const { data: userLocales } = await supabase
        .from('usuario_locales')
        .select('local_id, locales(*)')
        .eq('usuario_id', usuario.id);

      localesAsignados = userLocales?.map(ul => ul.locales) || [];
    }

    // Eliminar password de la respuesta
    delete usuario.password;

    res.json({ ...usuario, locales: localesAsignados });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ FACTURAS ============

// Obtener facturas según rol
app.get('/api/facturas', async (req, res) => {
  try {
    const { rol, userId, vistaCompleta } = req.query;

    // IMPORTANTE: Supabase limita a 1000 registros por query
    // Usamos paginación para obtener TODOS los registros
    let allFacturas = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      let query = supabase
        .from('facturas')
        .select(`
          *,
          factura_imagenes(imagen_url, renombre, nombre_fisico),
          usuarios(nombre),
          created_at,
          fecha_mr,
          fecha_mr_timestamp
        `)
        .order('created_at', { ascending: false })
        .range(from, from + pageSize - 1);

      // Filtrar según rol
      if (rol === 'operacion') {
        // Los usuarios de operación ven facturas de sus locales asignados
        const { data: userLocales } = await supabase
          .from('usuario_locales')
          .select('local')
          .eq('usuario_id', userId);

        const locales = userLocales?.map(ul => ul.local) || [];
        query = query.in('local', locales);
      } else if (rol === 'proveedores' || (rol === 'proveedores_viewer' && vistaCompleta !== 'true')) {
        // Solo facturas con MR (excepto proveedores_viewer con vistaCompleta)
        query = query.eq('mr_estado', true);
      }
      // rol 'pedidos', 'pedidos_admin', 'gestion' y 'proveedores_viewer' (con vistaCompleta) ven todas las facturas

      const { data: pageData, error } = await query;

      if (error) throw error;

      if (pageData && pageData.length > 0) {
        allFacturas = allFacturas.concat(pageData);
        from += pageSize;
        hasMore = pageData.length === pageSize; // Si trajo menos de 1000, ya no hay más
      } else {
        hasMore = false;
      }
    }

    const facturas = allFacturas;

    // Log para verificar cantidad de registros (ayuda a detectar si estamos llegando al límite)
    console.log(`[${new Date().toISOString()}] Facturas obtenidas: ${facturas?.length || 0} para rol: ${rol}, userId: ${userId}`);

    // Obtener categorías de los locales manualmente
    // Filtrar facturas que tengan local (ignorar las que tienen local null de facturas antiguas)
    const facturasConLocal = facturas.filter(f => f.local != null);
    const localesUnicos = [...new Set(facturasConLocal.map(f => f.local))];

    const { data: localesData } = await supabase
      .from('locales')
      .select('local, categoria')
      .in('local', localesUnicos);

    // Crear un mapa de local -> categoría
    const localCategoriaMap = {};
    localesData?.forEach(l => {
      localCategoriaMap[l.local] = l.categoria;
    });

    // Agregar la categoría a cada factura
    const facturasConCategoria = facturas.map(f => ({
      ...f,
      locales: {
        categoria: f.local ? localCategoriaMap[f.local] || null : null
      }
    }));

    res.json(facturasConCategoria);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear factura con imágenes
app.post('/api/facturas', upload.array('imagenes', 10), async (req, res) => {
  try {
    const { fecha, local, nro_factura, nro_oc, proveedor, usuario_id } = req.body;
    const imagenes = req.files;

    // Validar que haya al menos una imagen
    if (!imagenes || imagenes.length === 0) {
      return res.status(400).json({ error: 'Debe adjuntar al menos una imagen' });
    }

    // Validar tamaño de archivos (por si el frontend no lo hizo)
    const MAX_SIZE = 4.5 * 1024 * 1024; // 4.5 MB
    const archivosGrandes = imagenes.filter(img => img.size > MAX_SIZE);
    if (archivosGrandes.length > 0) {
      return res.status(400).json({
        error: `Los siguientes archivos exceden el límite de 4.5 MB: ${archivosGrandes.map(f => f.originalname).join(', ')}`
      });
    }

    // Validar tipos de archivo permitidos
    const ALLOWED_TYPES = [
      // Imágenes comunes
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/tiff',
      'image/svg+xml',
      'image/heic',
      'image/heif',
      // PDFs
      'application/pdf'
    ];
    const archivosTipoInvalido = imagenes.filter(img => !ALLOWED_TYPES.includes(img.mimetype));
    if (archivosTipoInvalido.length > 0) {
      return res.status(400).json({
        error: `Archivos con formato no permitido: ${archivosTipoInvalido.map(f => `${f.originalname} (${f.mimetype})`).join(', ')}`
      });
    }

    // Validar campos requeridos
    if (!fecha || !local || !nro_factura || !nro_oc || !proveedor) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    // ======= DEBUG: Log detallado de campos recibidos =======
    console.log('\n🔍 DATOS RECIBIDOS PARA CREAR FACTURA:');
    console.log('================================================');
    console.log(`📅 fecha: "${fecha}" (length: ${fecha?.length}, type: ${typeof fecha})`);
    console.log(`🏪 local: "${local}" (length: ${local?.length}, type: ${typeof local})`);
    console.log(`📄 nro_factura: "${nro_factura}" (length: ${nro_factura?.length}, type: ${typeof nro_factura})`);
    console.log(`📋 nro_oc: "${nro_oc}" (length: ${nro_oc?.length}, type: ${typeof nro_oc})`);
    console.log(`🏢 proveedor: "${proveedor}" (length: ${proveedor?.length}, type: ${typeof proveedor})`);

    // Detectar caracteres especiales
    const detectarCaracteresEspeciales = (str, fieldName) => {
      const especiales = /[^a-zA-Z0-9\s\-_.,áéíóúÁÉÍÓÚñÑ]/g;
      const matches = str?.match(especiales);
      if (matches && matches.length > 0) {
        console.log(`⚠️  ${fieldName} contiene caracteres especiales: ${matches.join(', ')}`);
        console.log(`   Caracteres completos: [${Array.from(str).map(c => `'${c}'`).join(', ')}]`);
      }
    };

    detectarCaracteresEspeciales(nro_factura, 'nro_factura');
    detectarCaracteresEspeciales(nro_oc, 'nro_oc');
    detectarCaracteresEspeciales(proveedor, 'proveedor');
    detectarCaracteresEspeciales(local, 'local');
    console.log('================================================\n');

    // Obtener categoría del local
    const { data: localData, error: localError } = await supabase
      .from('locales')
      .select('categoria')
      .eq('local', local)
      .single();

    if (localError) throw new Error('Local no encontrado');

    // Preparar datos para insertar
    const facturaData = {
      fecha,
      local,
      nro_factura,
      nro_oc,
      proveedor,
      categoria: localData.categoria,
      usuario_carga_id: parseInt(usuario_id)
    };

    console.log('Intentando insertar factura con datos:', facturaData);

    // Insertar factura
    const { data: factura, error: facturaError } = await supabase
      .from('facturas')
      .insert(facturaData)
      .select()
      .single();

    if (facturaError) {
      console.error('========================================');
      console.error('❌ ERROR AL INSERTAR FACTURA');
      console.error('========================================');
      console.error('Error completo:', JSON.stringify(facturaError, null, 2));
      console.error('Mensaje:', facturaError.message);
      console.error('Código:', facturaError.code);
      console.error('Detalles:', facturaError.details);
      console.error('Hint:', facturaError.hint);
      console.error('Datos enviados:', JSON.stringify(facturaData, null, 2));
      console.error('========================================');

      let errorMsg = 'Error al crear la factura';

      if (facturaError.message?.includes('pattern') || facturaError.message?.includes('formato')) {
        // Intentar identificar qué campo causó el error
        let campoProblematico = 'desconocido';

        // PostgreSQL a veces incluye el nombre de la columna en el error
        if (facturaError.message.includes('nro_factura')) campoProblematico = 'Número de Factura';
        else if (facturaError.message.includes('nro_oc')) campoProblematico = 'Número de OC';
        else if (facturaError.message.includes('proveedor')) campoProblematico = 'Proveedor';
        else if (facturaError.message.includes('local')) campoProblematico = 'Local';

        errorMsg = `ERROR DE FORMATO en el campo: ${campoProblematico}\n\n` +
                   `El valor ingresado contiene caracteres no permitidos o no cumple con el formato esperado.\n\n` +
                   `Valores ingresados:\n` +
                   `• Nro Factura: "${nro_factura}"\n` +
                   `• Nro OC: "${nro_oc}"\n` +
                   `• Proveedor: "${proveedor}"\n` +
                   `• Local: "${local}"\n\n` +
                   `Por favor verifique que no haya caracteres especiales inválidos (/, \\, |, etc.)`;
      } else if (facturaError.code === '23505') {
        errorMsg = 'Ya existe una factura con ese número. Verifique el número de factura.';
      } else if (facturaError.code === '23503') {
        errorMsg = 'El local seleccionado no existe. Contacte al administrador.';
      } else if (facturaError.message) {
        errorMsg = `Error: ${facturaError.message}`;
      }

      throw new Error(errorMsg);
    }

    console.log(`\n🚀 SUBIENDO ${imagenes.length} IMAGEN(ES) A GOOGLE CLOUD STORAGE`);
    console.log('================================================');

    // Rastrear nombres usados para evitar duplicados en 'renombre'
    const nombresUsados = new Map(); // nombre base -> contador

    // ======= SUBIR IMÁGENES A GOOGLE CLOUD STORAGE =======
    const imagenesPromises = imagenes.map(async (imagen, index) => {
      const sanitizedName = sanitizeFilename(imagen.originalname);
      const timestamp = Date.now() + index; // Evitar colisiones si se suben simultáneamente
      const nombreFisico = `${factura.id}-${timestamp}-${sanitizedName}`;

      console.log(`\n--- Imagen ${index + 1}/${imagenes.length} ---`);
      console.log(`📁 Original: ${imagen.originalname}`);
      console.log(`💾 Nombre físico: ${nombreFisico}`);
      console.log(`📏 Tamaño original: ${(imagen.size / 1024).toFixed(0)} KB`);

      try {
        // Comprimir imagen antes de subir
        const compressedBuffer = await compressImage(imagen.buffer, imagen.mimetype);

        // Crear archivo en GCS
        const file = gcsBucket.file(nombreFisico);

        // Subir archivo a GCS
        // NOTA DE ESCALABILIDAD: GCS maneja millones de uploads concurrentes
        // No hay límite práctico en cantidad de archivos o tamaño del bucket
        await file.save(compressedBuffer, {
          metadata: {
            contentType: imagen.mimetype,
            metadata: {
              originalName: imagen.originalname,
              facturaId: factura.id.toString(),
              uploadedAt: new Date().toISOString()
            }
          }
        });

        // Obtener URL pública
        // El bucket está configurado como público a nivel de bucket (Uniform Bucket-Level Access)
        const publicUrl = `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${nombreFisico}`;

        console.log(`✅ URL pública: ${publicUrl}`);

        // ======= GENERAR RENOMBRE ÚNICO =======
        // Si hay múltiples imágenes con el mismo nombre original, agregar sufijo _2, _3, etc.
        let renombreUnico = sanitizedName;

        if (nombresUsados.has(sanitizedName)) {
          const contador = nombresUsados.get(sanitizedName) + 1;
          nombresUsados.set(sanitizedName, contador);

          // Separar nombre y extensión
          const lastDot = sanitizedName.lastIndexOf('.');
          const nombreSinExt = lastDot > -1 ? sanitizedName.substring(0, lastDot) : sanitizedName;
          const extension = lastDot > -1 ? sanitizedName.substring(lastDot) : '';

          renombreUnico = `${nombreSinExt}_${contador}${extension}`;
          console.log(`⚠️  Nombre duplicado detectado, renombrando a: ${renombreUnico}`);
        } else {
          nombresUsados.set(sanitizedName, 1);
        }

        // ======= INSERTAR EN BASE DE DATOS CON NUEVAS COLUMNAS =======
        const imagenData = {
          factura_id: factura.id,
          imagen_url: publicUrl,
          nombre_fisico: nombreFisico,
          renombre: renombreUnico, // Nombre único con sufijo si es necesario
          content_type: imagen.mimetype,
          file_size_bytes: compressedBuffer.length
        };

        console.log(`💾 Guardando referencia en DB con renombre: ${renombreUnico}`);

        const { error: insertError } = await supabase
          .from('factura_imagenes')
          .insert(imagenData);

        if (insertError) {
          console.error('❌ Error al insertar referencia en DB:', insertError);
          // Eliminar archivo de GCS si falla la DB (cleanup)
          await file.delete().catch(err => console.error('Error al eliminar archivo:', err));
          throw new Error(`Error al guardar referencia de ${imagen.originalname}: ${insertError.message}`);
        }

        console.log(`✅ Imagen ${index + 1} subida y registrada exitosamente`);

        return publicUrl;
      } catch (error) {
        console.error(`❌ Error procesando ${imagen.originalname}:`, error.message);
        throw error;
      }
    });

    await Promise.all(imagenesPromises);

    console.log('\n================================================');
    console.log(`✅ TODAS LAS IMÁGENES SUBIDAS EXITOSAMENTE`);
    console.log('================================================\n');

    res.json(factura);
  } catch (error) {
    console.error('Error creating factura:', error);
    // Asegurar que siempre devolvemos un mensaje de error claro
    const errorMessage = error.message || 'Error desconocido al crear la factura';
    res.status(500).json({ error: errorMessage });
  }
});

// Actualizar factura
app.put('/api/facturas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha, local, nro_factura, nro_oc, proveedor, usuario_id } = req.body;

    // Obtener datos anteriores para auditoría
    const { data: facturaAnterior } = await supabase
      .from('facturas')
      .select('*')
      .eq('id', id)
      .single();

    // Actualizar factura
    const { data, error } = await supabase
      .from('facturas')
      .update({
        fecha,
        local,
        nro_factura,
        nro_oc,
        proveedor,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Registrar en auditoría
    console.log('Registrando modificación en auditoría...');
    const { error: auditoriaError } = await supabase
      .from('auditoria')
      .insert({
        factura_id: parseInt(id),
        usuario_id: parseInt(usuario_id),
        accion: 'modificacion',
        datos_anteriores: facturaAnterior,
        datos_nuevos: data
      });

    if (auditoriaError) {
      console.error('ERROR al guardar auditoría de modificación:', auditoriaError);
    } else {
      console.log('✅ Auditoría de modificación guardada correctamente');
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar factura
app.delete('/api/facturas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { usuario_id } = req.query;

    // Obtener datos para auditoría
    const { data: facturaAnterior } = await supabase
      .from('facturas')
      .select('*, factura_imagenes(*)')
      .eq('id', id)
      .single();

    // IMPORTANTE: Registrar en auditoría ANTES de eliminar (por el foreign key constraint)
    console.log('Registrando eliminación en auditoría...');
    console.log('factura_id:', id);
    console.log('usuario_id:', usuario_id);

    const { error: auditoriaError } = await supabase
      .from('auditoria')
      .insert({
        factura_id: parseInt(id),
        usuario_id: parseInt(usuario_id),
        accion: 'eliminacion',
        datos_anteriores: facturaAnterior,
        datos_nuevos: null
      });

    if (auditoriaError) {
      console.error('ERROR al guardar auditoría de eliminación:', auditoriaError);
      console.error('Detalles:', JSON.stringify(auditoriaError, null, 2));
      throw new Error('No se pudo registrar la auditoría: ' + auditoriaError.message);
    } else {
      console.log('✅ Auditoría de eliminación guardada correctamente');
    }

    // Eliminar imágenes del storage
    const imagenes = facturaAnterior.factura_imagenes || [];
    for (const img of imagenes) {
      const fileName = img.imagen_url.split('/').pop();
      await supabase.storage.from('facturas').remove([fileName]);
    }

    // Eliminar factura (cascade eliminará las referencias)
    const { error } = await supabase
      .from('facturas')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Factura eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generar MR - NUEVA VERSIÓN CON NOMBRES VIRTUALES
app.post('/api/facturas/:id/mr', async (req, res) => {
  const { id } = req.params;
  const { mr_numero, usuario_id } = req.body;

  try {
    console.log(`\n🏷️  GENERANDO MR ${mr_numero} PARA FACTURA ${id}`);
    console.log('================================================');

    // Validar que no exista otra factura con este número de MR
    const { data: existingMR, error: checkError } = await supabase
      .from('facturas')
      .select('id, nro_factura')
      .eq('mr_numero', mr_numero)
      .neq('id', id)
      .maybeSingle();

    if (checkError) {
      console.error('❌ Error al verificar MR duplicada:', checkError);
      throw new Error('Error al verificar número de MR');
    }

    if (existingMR) {
      console.log(`⚠️  MR ${mr_numero} ya existe en factura ${existingMR.nro_factura}`);
      return res.status(400).json({
        error: `El número de MR ${mr_numero} ya está asignado a la factura ${existingMR.nro_factura}`
      });
    }

    // Obtener datos de la factura
    const { data: factura, error: facturaError } = await supabase
      .from('facturas')
      .select('*')
      .eq('id', id)
      .single();

    if (facturaError || !factura) {
      throw new Error('Factura no encontrada');
    }

    console.log(`📄 Factura: ${factura.nro_factura}`);
    console.log(`🏪 Local: ${factura.local}`);
    console.log(`🏢 Proveedor: ${factura.proveedor}`);
    console.log(`📋 OC: ${factura.nro_oc}`);

    // CRÍTICO: La fecha_mr NUNCA debe cambiar una vez establecida
    const ahora = new Date();
    const timestampCompleto = ahora.toISOString();
    const soloFecha = ahora.toISOString().split('T')[0];

    const fechaMR_date = factura.fecha_mr || soloFecha;
    const fechaMR_timestamp = factura.fecha_mr_timestamp || timestampCompleto;

    // Actualizar factura con MR
    const { error: updateError } = await supabase
      .from('facturas')
      .update({
        mr_numero,
        mr_estado: true,
        fecha_mr: fechaMR_date,
        fecha_mr_timestamp: fechaMR_timestamp,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      console.error('❌ Error al actualizar factura:', updateError);
      throw new Error('Error al actualizar la factura con el MR');
    }

    console.log('✅ Factura actualizada con MR');

    // ======= GENERAR NOMBRES VIRTUALES PARA LAS IMÁGENES =======
    // IMPORTANTE: Solo actualizamos la columna 'renombre' en la DB
    // NO tocamos archivos físicos - quedan inmutables en GCS
    const { data: imagenes, error: imagenesError } = await supabase
      .from('factura_imagenes')
      .select('*')
      .eq('factura_id', id);

    if (imagenesError) {
      console.error('❌ Error al obtener imágenes:', imagenesError);
      throw new Error('Error al obtener las imágenes de la factura');
    }

    console.log(`\n📸 Actualizando nombres virtuales de ${imagenes.length} imagen(es)...`);

    // Limpiar datos para el nombre virtual
    const localLimpio = sanitizeFilename(factura.local || 'NoLocal');
    const proveedorLimpio = sanitizeFilename(factura.proveedor || 'NoProveedor');
    const mrLimpio = sanitizeFilename(mr_numero || 'NoMR');
    const nroFacturaLimpio = sanitizeFilename(factura.nro_factura || 'NoFactura');
    const nroOcLimpio = sanitizeFilename(factura.nro_oc || 'NoOC');

    // Actualizar el campo 'renombre' en cada imagen (NO tocar archivos físicos)
    for (let i = 0; i < imagenes.length; i++) {
      const img = imagenes[i];
      const extension = path.extname(img.nombre_fisico) || '.jpg';

      // Generar nombre virtual usando el formato FC_
      const nombreVirtual = `FC_${nroFacturaLimpio}_OC_${nroOcLimpio}_MR_${mrLimpio}_${localLimpio}_${proveedorLimpio}${i > 0 ? `_${i + 1}` : ''}${extension}`;

      console.log(`${i + 1}. "${img.nombre_fisico}" → "${nombreVirtual}"`);

      // SOLO actualizar la columna 'renombre' en la DB
      // El archivo físico permanece con su nombre original
      const { error: updateImgError } = await supabase
        .from('factura_imagenes')
        .update({
          renombre: nombreVirtual,
          updated_at: new Date().toISOString()
        })
        .eq('id', img.id);

      if (updateImgError) {
        console.error(`⚠️  Error al actualizar imagen ${i + 1}:`, updateImgError);
        // No lanzar error, continuar con las demás
      }
    }

    console.log('✅ Nombres virtuales actualizados');

    // Registrar en auditoría
    await supabase
      .from('auditoria')
      .insert({
        factura_id: id,
        usuario_id: parseInt(usuario_id),
        accion: 'generacion_mr',
        detalles: { mr_numero }
      });

    console.log('✅ Auditoría registrada');
    console.log('================================================');
    console.log(`✅ MR ${mr_numero} GENERADA EXITOSAMENTE\n`);

    res.json({ message: 'MR generada correctamente' });
  } catch (error) {
    console.error('❌ ERROR EN GENERACIÓN DE MR:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ LOCALES ============

app.get('/api/locales', async (req, res) => {
  try {
    const { userId } = req.query;

    // Obtener locales asignados al usuario
    const { data, error } = await supabase
      .from('usuario_locales')
      .select('local')
      .eq('usuario_id', userId);

    if (error) throw error;

    // Obtener información completa de cada local
    const localesNombres = data.map(item => item.local);

    const { data: localesCompletos, error: localesError } = await supabase
      .from('locales')
      .select('*')
      .in('local', localesNombres);

    if (localesError) throw localesError;

    res.json(localesCompletos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ PROVEEDORES ============

app.get('/api/proveedores', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('proveedores')
      .select('*')
      .order('proveedor', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/proveedores', async (req, res) => {
  try {
    const { proveedor } = req.body;

    // Validaciones
    if (!proveedor || !proveedor.trim()) {
      return res.status(400).json({ error: 'El nombre del proveedor es requerido' });
    }

    // Verificar que el proveedor no exista
    const { data: existingProveedor } = await supabase
      .from('proveedores')
      .select('id')
      .eq('proveedor', proveedor.trim())
      .single();

    if (existingProveedor) {
      return res.status(400).json({ error: 'El proveedor ya existe' });
    }

    // Crear proveedor
    const { data, error } = await supabase
      .from('proveedores')
      .insert({
        proveedor: proveedor.trim()
      })
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ USUARIOS ============

app.post('/api/usuarios', async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;

    // Validaciones
    if (!nombre || !email || !password || !rol) {
      return res.status(400).json({ error: 'Nombre, email, contraseña y rol son requeridos' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Email inválido' });
    }

    // Verificar que el rol sea válido
    const rolesPermitidos = ['operacion', 'pedidos', 'pedidos_admin', 'proveedores'];
    if (!rolesPermitidos.includes(rol)) {
      return res.status(400).json({ error: 'Rol no válido' });
    }

    // Verificar que el usuario no exista
    const { data: existingUser } = await supabase
      .from('usuarios')
      .select('id')
      .eq('nombre', nombre)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'El nombre de usuario ya existe' });
    }

    // Verificar que el email no exista
    const { data: existingEmail } = await supabase
      .from('usuarios')
      .select('id')
      .eq('email', email)
      .single();

    if (existingEmail) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    // Crear usuario (por ahora sin hash)
    const { data, error } = await supabase
      .from('usuarios')
      .insert({
        nombre,
        email,
        password, // TODO: Agregar hash con bcrypt
        rol
      })
      .select()
      .single();

    if (error) throw error;

    // No devolver la contraseña
    delete data.password;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ AUDITORÍA ============

app.get('/api/auditoria', async (req, res) => {
  try {
    const { facturaId } = req.query;

    const { data, error } = await supabase
      .from('auditoria')
      .select('*, usuarios(nombre)')
      .eq('factura_id', facturaId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ VERIFICACIÓN DE IMÁGENES ============

// Verificar qué imágenes están rotas (no existen en Storage)
app.get('/api/verificar-imagenes', async (req, res) => {
  try {
    console.log('Iniciando verificación de imágenes...');

    // Obtener todas las referencias de imágenes
    const { data: imagenes, error } = await supabase
      .from('factura_imagenes')
      .select('id, factura_id, imagen_url')
      .order('created_at', { ascending: false });

    if (error) throw error;

    console.log(`Total de referencias de imágenes: ${imagenes.length}`);

    // Verificar cada imagen
    const resultados = [];
    let verificadas = 0;
    let rotas = 0;
    let funcionales = 0;

    for (const img of imagenes) {
      try {
        // Hacer HEAD request para verificar si existe (más rápido que GET)
        const response = await fetch(img.imagen_url, { method: 'HEAD' });

        const estado = {
          id: img.id,
          factura_id: img.factura_id,
          imagen_url: img.imagen_url,
          existe: response.ok,
          status_code: response.status
        };

        if (response.ok) {
          funcionales++;
        } else {
          rotas++;
          resultados.push(estado); // Solo guardar las rotas
        }

        verificadas++;

        // Log cada 100 imágenes
        if (verificadas % 100 === 0) {
          console.log(`Progreso: ${verificadas}/${imagenes.length} (${rotas} rotas)`);
        }
      } catch (error) {
        rotas++;
        resultados.push({
          id: img.id,
          factura_id: img.factura_id,
          imagen_url: img.imagen_url,
          existe: false,
          status_code: 'ERROR',
          error: error.message
        });
      }
    }

    console.log(`Verificación completada: ${funcionales} funcionales, ${rotas} rotas`);

    res.json({
      total: imagenes.length,
      verificadas,
      funcionales,
      rotas,
      imagenesRotas: resultados
    });
  } catch (error) {
    console.error('Error en verificación de imágenes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Eliminar referencias huérfanas (imágenes que no existen en Storage)
app.delete('/api/limpiar-referencias-huerfanas', async (req, res) => {
  try {
    const { imagenesRotas } = req.body; // Array de IDs de factura_imagenes a eliminar

    if (!imagenesRotas || !Array.isArray(imagenesRotas)) {
      return res.status(400).json({ error: 'Se requiere un array de IDs' });
    }

    console.log(`Eliminando ${imagenesRotas.length} referencias huérfanas...`);

    const { data, error } = await supabase
      .from('factura_imagenes')
      .delete()
      .in('id', imagenesRotas);

    if (error) throw error;

    console.log(`Referencias eliminadas exitosamente`);

    res.json({
      success: true,
      eliminadas: imagenesRotas.length
    });
  } catch (error) {
    console.error('Error eliminando referencias:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Test de conexión a Supabase
app.get('/api/test-db', async (req, res) => {
  try {
    console.log('Probando conexión a Supabase...');

    // Intentar obtener usuarios
    const { data, error, count } = await supabase
      .from('usuarios')
      .select('*', { count: 'exact' });

    if (error) {
      console.error('Error al conectar con Supabase:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
        details: error
      });
    }

    console.log('Conexión exitosa! Usuarios encontrados:', count);
    res.json({
      success: true,
      message: 'Conexión a Supabase exitosa',
      usuarios_count: count,
      usuarios: data
    });
  } catch (error) {
    console.error('Error en test-db:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Para desarrollo local
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Exportar para Vercel
module.exports = app;
