/**
 * Script para verificar qué imágenes dan 404
 * Genera un CSV con las imágenes rotas agrupadas por fecha y local
 *
 * USO:
 * node verificar_imagenes_404.js
 *
 * SALIDA:
 * - imagenes_404.csv (imágenes que dan 404)
 * - resumen_por_local.csv (resumen agrupado)
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Configurar Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

// Función para verificar si una URL da 404
async function verificarURL(url) {
  try {
    const response = await fetch(url, { method: 'HEAD', timeout: 5000 });
    return {
      status: response.status,
      ok: response.ok,
      existe: response.status === 200
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      existe: false,
      error: error.message
    };
  }
}

// Función para formatear fecha
function formatearFecha(fecha) {
  if (!fecha) return '';
  const date = new Date(fecha);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Función para escapar CSV
function escaparCSV(valor) {
  if (valor === null || valor === undefined) return '';
  const str = String(valor);
  // Si contiene comas, comillas o saltos de línea, encerrar en comillas
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function main() {
  console.log('🔍 Iniciando verificación de imágenes...\n');

  // 1. Obtener todas las facturas con imágenes
  console.log('📥 Obteniendo facturas de la base de datos...');
  const { data: facturas, error } = await supabase
    .from('facturas')
    .select(`
      id,
      created_at,
      local,
      nro_factura,
      proveedor,
      nro_oc,
      mr_numero,
      mr_estado,
      fecha_mr,
      factura_imagenes(id, imagen_url, nombre_fisico, renombre)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error al obtener facturas:', error);
    process.exit(1);
  }

  console.log(`✅ ${facturas.length} facturas encontradas\n`);

  // 2. Procesar cada factura e imagen
  const resultados = [];
  let totalImagenes = 0;
  let imagenes404 = 0;
  let imagenesOK = 0;
  let erroresRed = 0;

  console.log('🔍 Verificando URLs de imágenes...');
  console.log('(Esto puede tardar varios minutos)\n');

  for (const factura of facturas) {
    if (!factura.factura_imagenes || factura.factura_imagenes.length === 0) {
      // Factura sin imágenes
      resultados.push({
        fecha_carga: formatearFecha(factura.created_at),
        local: factura.local || '',
        nro_factura: factura.nro_factura || '',
        proveedor: factura.proveedor || '',
        nro_oc: factura.nro_oc || '',
        mr_numero: factura.mr_numero || '',
        imagen_url: '',
        nombre_archivo: '',
        storage_type: '',
        status: 'SIN_IMAGENES',
        problema: 'Factura sin imágenes asociadas'
      });
      continue;
    }

    for (const imagen of factura.factura_imagenes) {
      totalImagenes++;

      if (!imagen.imagen_url) {
        // Imagen con URL NULL
        resultados.push({
          fecha_carga: formatearFecha(factura.created_at),
          local: factura.local || '',
          nro_factura: factura.nro_factura || '',
          proveedor: factura.proveedor || '',
          nro_oc: factura.nro_oc || '',
          mr_numero: factura.mr_numero || '',
          imagen_url: '',
          nombre_archivo: '',
          storage_type: '',
          status: 'URL_NULL',
          problema: 'URL de imagen es NULL'
        });
        continue;
      }

      // Determinar tipo de storage
      let storageType = 'OTRO';
      if (imagen.imagen_url.includes('supabase.co/storage')) {
        storageType = 'SUPABASE';
      } else if (imagen.imagen_url.includes('storage.googleapis.com')) {
        storageType = 'GCS';
      }

      // Verificar URL
      const verificacion = await verificarURL(imagen.imagen_url);

      let status = 'OK';
      let problema = '';

      if (!verificacion.existe) {
        if (verificacion.status === 404) {
          status = '404';
          problema = 'Imagen no encontrada (404)';
          imagenes404++;
        } else if (verificacion.status === 403) {
          status = '403';
          problema = 'Acceso denegado (403)';
        } else if (verificacion.error) {
          status = 'ERROR_RED';
          problema = `Error de red: ${verificacion.error}`;
          erroresRed++;
        } else {
          status = `ERROR_${verificacion.status}`;
          problema = `HTTP ${verificacion.status}`;
        }
      } else {
        imagenesOK++;
      }

      // Solo guardar en resultados si hay problema
      if (status !== 'OK') {
        const nombreArchivo = imagen.imagen_url.split('/').pop() || '';

        resultados.push({
          fecha_carga: formatearFecha(factura.created_at),
          local: factura.local || '',
          nro_factura: factura.nro_factura || '',
          proveedor: factura.proveedor || '',
          nro_oc: factura.nro_oc || '',
          mr_numero: factura.mr_numero || '',
          imagen_url: imagen.imagen_url,
          nombre_archivo: nombreArchivo,
          storage_type: storageType,
          status: status,
          problema: problema
        });
      }

      // Mostrar progreso cada 50 imágenes
      if (totalImagenes % 50 === 0) {
        console.log(`   Procesadas: ${totalImagenes} | OK: ${imagenesOK} | 404: ${imagenes404} | Errores: ${erroresRed}`);
      }
    }
  }

  console.log('\n✅ Verificación completada\n');
  console.log('📊 RESUMEN:');
  console.log(`   Total imágenes verificadas: ${totalImagenes}`);
  console.log(`   ✅ OK (200): ${imagenesOK}`);
  console.log(`   ❌ 404 Not Found: ${imagenes404}`);
  console.log(`   ⚠️  Errores de red: ${erroresRed}`);
  console.log(`   📋 Total problemas: ${resultados.length}\n`);

  // 3. Generar CSV con imágenes rotas
  if (resultados.length > 0) {
    console.log('📝 Generando CSV...');

    const headers = [
      'Fecha Carga',
      'Local',
      'Nro Factura',
      'Proveedor',
      'OC',
      'MR',
      'URL',
      'Nombre Archivo',
      'Storage',
      'Status',
      'Problema'
    ];

    const csvLines = [headers.join(',')];

    resultados.forEach(r => {
      csvLines.push([
        escaparCSV(r.fecha_carga),
        escaparCSV(r.local),
        escaparCSV(r.nro_factura),
        escaparCSV(r.proveedor),
        escaparCSV(r.nro_oc),
        escaparCSV(r.mr_numero),
        escaparCSV(r.imagen_url),
        escaparCSV(r.nombre_archivo),
        escaparCSV(r.storage_type),
        escaparCSV(r.status),
        escaparCSV(r.problema)
      ].join(','));
    });

    fs.writeFileSync('imagenes_404.csv', csvLines.join('\n'), 'utf8');
    console.log('✅ Archivo generado: imagenes_404.csv');

    // 4. Generar resumen por local
    const resumenPorLocal = {};
    resultados.forEach(r => {
      const key = r.local || 'Sin Local';
      if (!resumenPorLocal[key]) {
        resumenPorLocal[key] = {
          local: key,
          total_problemas: 0,
          con_404: 0,
          sin_imagenes: 0,
          url_null: 0
        };
      }
      resumenPorLocal[key].total_problemas++;
      if (r.status === '404') resumenPorLocal[key].con_404++;
      if (r.status === 'SIN_IMAGENES') resumenPorLocal[key].sin_imagenes++;
      if (r.status === 'URL_NULL') resumenPorLocal[key].url_null++;
    });

    const resumenHeaders = ['Local', 'Total Problemas', '404', 'Sin Imágenes', 'URL NULL'];
    const resumenLines = [resumenHeaders.join(',')];

    Object.values(resumenPorLocal)
      .sort((a, b) => b.total_problemas - a.total_problemas)
      .forEach(r => {
        resumenLines.push([
          escaparCSV(r.local),
          r.total_problemas,
          r.con_404,
          r.sin_imagenes,
          r.url_null
        ].join(','));
      });

    fs.writeFileSync('resumen_por_local.csv', resumenLines.join('\n'), 'utf8');
    console.log('✅ Archivo generado: resumen_por_local.csv\n');

    console.log('📁 Archivos generados:');
    console.log('   - imagenes_404.csv (listado completo de problemas)');
    console.log('   - resumen_por_local.csv (resumen agrupado por local)\n');
  } else {
    console.log('✅ No se encontraron imágenes con problemas.\n');
  }

  console.log('🎉 Proceso completado');
}

main().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
