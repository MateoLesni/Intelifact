/**
 * SCRIPT DE DEBUG PARA IDENTIFICAR IMÁGENES PROBLEMÁTICAS
 *
 * CÓMO USAR:
 * 1. Abre ProveedoresDashboard en el navegador
 * 2. Navega hasta la carpeta donde ves "Descargar Todas las Imágenes (183)"
 * 3. Abre la consola del navegador (F12)
 * 4. Copia y pega este código completo
 * 5. Presiona Enter
 *
 * Te mostrará:
 * - Cuántas imágenes tienen URL NULL
 * - Cuántas imágenes tienen URL válida
 * - Lista detallada de las problemáticas
 */

(function debugImagenes() {
  console.clear();
  console.log('🔍 INICIANDO DEBUG DE IMÁGENES...\n');

  // Obtener el estado de React desde el DOM
  // Esto funciona si React está en modo desarrollo
  const reactRoot = document.querySelector('#root');

  if (!reactRoot) {
    console.error('❌ No se encontró el root de React');
    return;
  }

  // Intentar obtener datos desde el componente
  // Método 1: Buscar en React DevTools
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    console.log('✓ React DevTools detectado');
    console.log('💡 TIP: Abre React DevTools y busca el estado "todasImagenes"');
  }

  // Método 2: Analizar las imágenes visibles en el DOM
  console.log('\n📊 ANÁLISIS DEL DOM:\n');

  const imageElements = document.querySelectorAll('img[src*="storage"]');
  console.log(`Total de elementos <img> en la página: ${imageElements.length}`);

  const brokenImages = Array.from(imageElements).filter(img => {
    return !img.complete || img.naturalHeight === 0;
  });

  console.log(`Imágenes rotas detectadas: ${brokenImages.length}`);

  if (brokenImages.length > 0) {
    console.log('\n🔴 IMÁGENES ROTAS:');
    brokenImages.forEach((img, i) => {
      console.log(`${i + 1}. ${img.src}`);
    });
  }

  // Método 3: Interceptar fetch para capturar próximas descargas
  console.log('\n🎯 INSTALANDO INTERCEPTOR DE FETCH...');
  console.log('👉 Ahora intenta descargar el ZIP y verás qué imágenes fallan\n');

  const originalFetch = window.fetch;
  let fetchCount = 0;
  let fetchErrors = 0;
  const failedUrls = [];

  window.fetch = async function(...args) {
    const url = args[0];

    // Solo interceptar URLs de storage
    if (typeof url === 'string' && (url.includes('storage.googleapis.com') || url.includes('supabase.co/storage'))) {
      fetchCount++;

      try {
        const response = await originalFetch(...args);

        if (!response.ok) {
          fetchErrors++;
          failedUrls.push({ url, status: response.status });
          console.error(`❌ [${fetchCount}] FALLÓ: ${url} (Status: ${response.status})`);
        } else {
          console.log(`✓ [${fetchCount}] OK: ${url.substring(0, 80)}...`);
        }

        return response;
      } catch (error) {
        fetchErrors++;
        failedUrls.push({ url, error: error.message });
        console.error(`❌ [${fetchCount}] ERROR: ${url} - ${error.message}`);
        throw error;
      }
    }

    return originalFetch(...args);
  };

  // Función helper para ver el resumen
  window.verResumenImagenes = function() {
    console.log('\n📊 RESUMEN DE DESCARGAS:');
    console.log(`Total intentos: ${fetchCount}`);
    console.log(`Exitosas: ${fetchCount - fetchErrors}`);
    console.log(`Fallidas: ${fetchErrors}`);

    if (failedUrls.length > 0) {
      console.log('\n🔴 URLs QUE FALLARON:');
      failedUrls.forEach((item, i) => {
        console.log(`\n${i + 1}. URL: ${item.url}`);
        console.log(`   ${item.status ? `Status: ${item.status}` : `Error: ${item.error}`}`);
      });
    }
  };

  console.log('✅ Interceptor instalado');
  console.log('\n📝 INSTRUCCIONES:');
  console.log('1. Haz click en "Descargar Todas las Imágenes"');
  console.log('2. Espera a que termine (verás los logs aquí)');
  console.log('3. Ejecuta: verResumenImagenes()');
  console.log('\n');
})();
