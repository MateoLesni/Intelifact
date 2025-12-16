require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');

const app = express();

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

console.log('=== CONFIGURACIÓN SUPABASE ===');
console.log('URL:', supabaseUrl);
console.log('Key presente:', !!supabaseKey);
console.log('Key (primeros 20 chars):', supabaseKey?.substring(0, 20) + '...');

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: Faltan las credenciales de Supabase en el archivo .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(cors());
app.use(express.json());

// Configuración de multer para manejar archivos
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB límite
});

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
          factura_imagenes(imagen_url),
          usuarios(nombre),
          created_at,
          fecha_mr
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
    const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
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
      console.error('Error de Supabase al insertar factura:', facturaError);
      console.error('Datos que causaron el error:', facturaData);

      // Proporcionar mensajes más específicos según el tipo de error
      let errorMsg = 'Error al crear la factura';

      if (facturaError.message?.includes('pattern') || facturaError.message?.includes('formato')) {
        errorMsg = 'Uno de los campos tiene un formato inválido. Verifique que:\n' +
                   '- El número de factura solo contenga números\n' +
                   '- El número de OC solo contenga números\n' +
                   '- La fecha esté en formato correcto';
      } else if (facturaError.code === '23505') {
        errorMsg = 'Ya existe una factura con ese número. Verifique el número de factura.';
      } else if (facturaError.code === '23503') {
        errorMsg = 'El local seleccionado no existe. Contacte al administrador.';
      } else if (facturaError.message) {
        errorMsg = `Error: ${facturaError.message}`;
      }

      throw new Error(errorMsg);
    }

    // Función para sanitizar nombres de archivo
    const sanitizeFilename = (filename) => {
      return filename
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Eliminar tildes
        .replace(/[^a-zA-Z0-9._-]/g, '_'); // Reemplazar caracteres especiales con _
    };

    // Subir imágenes a Supabase Storage
    const imagenesPromises = imagenes.map(async (imagen) => {
      const sanitizedName = sanitizeFilename(imagen.originalname);
      const fileName = `${factura.id}-${Date.now()}-${sanitizedName}`;

      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('facturas')
        .upload(fileName, imagen.buffer, {
          contentType: imagen.mimetype
        });

      if (uploadError) {
        console.error('Error uploading to Supabase Storage:', uploadError);
        // Proporcionar mensaje específico según el tipo de error
        let errorMsg = 'Error al subir imagen';
        if (uploadError.message?.includes('Forbidden') || uploadError.statusCode === '403') {
          errorMsg = 'Sin permisos para subir archivos. Contacte al administrador.';
        } else if (uploadError.message?.includes('payload')) {
          errorMsg = 'El archivo es demasiado grande para ser procesado.';
        } else if (uploadError.message) {
          errorMsg = `Error al subir ${imagen.originalname}: ${uploadError.message}`;
        }
        throw new Error(errorMsg);
      }

      // Verificar que el upload fue exitoso
      if (!uploadData || !uploadData.path) {
        throw new Error(`No se pudo confirmar la subida de ${imagen.originalname}`);
      }

      // Obtener URL pública
      const { data: urlData } = supabase
        .storage
        .from('facturas')
        .getPublicUrl(fileName);

      if (!urlData || !urlData.publicUrl) {
        throw new Error(`No se pudo obtener URL pública para ${imagen.originalname}`);
      }

      // Insertar referencia en la tabla
      const imagenData = {
        factura_id: factura.id,
        imagen_url: urlData.publicUrl
      };

      console.log('Insertando referencia de imagen:', imagenData);

      const { error: insertError } = await supabase
        .from('factura_imagenes')
        .insert(imagenData);

      if (insertError) {
        console.error('Error al insertar referencia de imagen:', insertError);
        console.error('Datos de imagen:', imagenData);

        let errorMsg = `Error al guardar referencia de ${imagen.originalname}`;

        if (insertError.message?.includes('pattern') || insertError.message?.includes('formato')) {
          errorMsg = `La URL de la imagen no tiene el formato esperado: ${urlData.publicUrl}`;
        } else if (insertError.message) {
          errorMsg = `${errorMsg}: ${insertError.message}`;
        }

        throw new Error(errorMsg);
      }

      return urlData.publicUrl;
    });

    await Promise.all(imagenesPromises);

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
    await supabase
      .from('auditoria')
      .insert({
        factura_id: parseInt(id),
        usuario_id: parseInt(usuario_id),
        accion: 'modificacion',
        datos_anteriores: facturaAnterior,
        datos_nuevos: data
      });

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

    // Registrar en auditoría
    await supabase
      .from('auditoria')
      .insert({
        factura_id: parseInt(id),
        usuario_id: parseInt(usuario_id),
        accion: 'eliminacion',
        datos_anteriores: facturaAnterior,
        datos_nuevos: null
      });

    res.json({ message: 'Factura eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generar MR
app.post('/api/facturas/:id/mr', async (req, res) => {
  try {
    const { id } = req.params;
    const { mr_numero, usuario_id } = req.body;

    // Obtener datos completos de la factura incluyendo imágenes
    const { data: facturaAnterior } = await supabase
      .from('facturas')
      .select('*, factura_imagenes(*)')
      .eq('id', id)
      .single();

    // Obtener fecha y hora actual en zona horaria de Argentina (Buenos Aires)
    // Guardamos como timestamp ISO para mantener fecha y hora completa
    const fechaMR = new Date().toISOString();

    // Actualizar factura con MR y fecha_mr
    const { data: factura, error } = await supabase
      .from('facturas')
      .update({
        mr_numero,
        mr_estado: true,
        fecha_mr: fechaMR, // Timestamp completo con fecha y hora
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    // Renombrar imágenes con formato: FC_nro_factura_OC_nro_oc_MR_mr_numero_local_proveedor
    const imagenes = facturaAnterior.factura_imagenes || [];
    for (let i = 0; i < imagenes.length; i++) {
      const img = imagenes[i];
      const oldFileName = img.imagen_url.split('/').pop();
      const extension = oldFileName.split('.').pop();

      // Limpiar nombres (remover espacios y caracteres especiales, permitir solo alfanuméricos)
      const localLimpio = (facturaAnterior.local || '').replace(/[^a-zA-Z0-9]/g, '');
      const proveedorLimpio = (facturaAnterior.proveedor || '').replace(/[^a-zA-Z0-9]/g, '');
      const mrLimpio = (mr_numero || '').replace(/[^a-zA-Z0-9]/g, '');
      const nroFacturaLimpio = (facturaAnterior.nro_factura || '').replace(/[^a-zA-Z0-9]/g, '');
      const nroOcLimpio = (facturaAnterior.nro_oc || '').replace(/[^a-zA-Z0-9]/g, '');

      // Formato: FC_88238329_OC_2223_MR_1994849_LocalCentro_Udine.jpeg
      const newFileName = `FC_${nroFacturaLimpio}_OC_${nroOcLimpio}_MR_${mrLimpio}_${localLimpio}_${proveedorLimpio}${i > 0 ? `_${i + 1}` : ''}.${extension}`;

      // Mover/copiar archivo con nuevo nombre
      const { data: fileData, error: downloadError } = await supabase
        .storage
        .from('facturas')
        .download(oldFileName);

      if (downloadError) {
        console.error('Error al descargar archivo:', downloadError);
        continue;
      }

      // Subir con nuevo nombre
      const { error: uploadError } = await supabase
        .storage
        .from('facturas')
        .upload(newFileName, fileData, {
          contentType: `image/${extension}`,
          upsert: true
        });

      if (uploadError) {
        console.error('Error al subir archivo renombrado:', uploadError);
        continue;
      }

      // Eliminar archivo antiguo
      await supabase
        .storage
        .from('facturas')
        .remove([oldFileName]);

      // Obtener nueva URL pública
      const { data: urlData } = supabase
        .storage
        .from('facturas')
        .getPublicUrl(newFileName);

      // Actualizar URL en la base de datos
      await supabase
        .from('factura_imagenes')
        .update({ imagen_url: urlData.publicUrl })
        .eq('id', img.id);
    }

    // Registrar en auditoría
    await supabase
      .from('auditoria')
      .insert({
        factura_id: parseInt(id),
        usuario_id: parseInt(usuario_id),
        accion: 'generacion_mr',
        datos_anteriores: facturaAnterior,
        datos_nuevos: factura
      });

    res.json(factura);
  } catch (error) {
    console.error('Error en generación de MR:', error);
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
