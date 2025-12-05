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
    const { rol, userId } = req.query;

    let query = supabase
      .from('facturas')
      .select(`
        *,
        factura_imagenes(imagen_url),
        usuarios(nombre)
      `)
      .order('created_at', { ascending: false });

    // Filtrar según rol
    if (rol === 'operacion') {
      // Los usuarios de operación ven facturas de sus locales asignados
      const { data: userLocales } = await supabase
        .from('usuario_locales')
        .select('local')
        .eq('usuario_id', userId);

      const locales = userLocales?.map(ul => ul.local) || [];
      query = query.in('local', locales);
    } else if (rol === 'proveedores') {
      // Solo facturas con MR
      query = query.eq('mr_estado', true);
    }
    // rol 'pedidos' y 'pedidos_admin' ven todas las facturas

    const { data: facturas, error } = await query;

    if (error) throw error;

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

    // Insertar factura
    const { data: factura, error: facturaError } = await supabase
      .from('facturas')
      .insert({
        fecha,
        local,
        nro_factura,
        nro_oc,
        proveedor,
        categoria: localData.categoria,
        usuario_carga_id: parseInt(usuario_id)
      })
      .select()
      .single();

    if (facturaError) throw facturaError;

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

      if (uploadError) throw uploadError;

      // Obtener URL pública
      const { data: urlData } = supabase
        .storage
        .from('facturas')
        .getPublicUrl(fileName);

      // Insertar referencia en la tabla
      await supabase
        .from('factura_imagenes')
        .insert({
          factura_id: factura.id,
          imagen_url: urlData.publicUrl
        });

      return urlData.publicUrl;
    });

    await Promise.all(imagenesPromises);

    res.json(factura);
  } catch (error) {
    res.status(500).json({ error: error.message });
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

    // Obtener fecha actual en zona horaria de Argentina (Buenos Aires, UTC-3)
    // Usar formato sueco 'sv-SE' que retorna YYYY-MM-DD directamente
    const fechaMR = new Date().toLocaleDateString('sv-SE', {
      timeZone: 'America/Argentina/Buenos_Aires'
    });

    console.log('=== DEBUG FECHA MR ===');
    console.log('Fecha UTC:', new Date().toISOString());
    console.log('Fecha Argentina calculada:', fechaMR);
    console.log('=====================');

    // Actualizar factura con MR y fecha_mr
    const { data: factura, error } = await supabase
      .from('facturas')
      .update({
        mr_numero,
        mr_estado: true,
        fecha_mr: fechaMR, // Fecha en zona horaria Argentina
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
