import React, { useState } from 'react';

function TestCompresion() {
  const [imagenOriginal, setImagenOriginal] = useState(null);
  const [imagenComprimida, setImagenComprimida] = useState(null);
  const [quality, setQuality] = useState(0.8);
  const [tamanioOriginal, setTamanioOriginal] = useState(0);
  const [tamanioComprimido, setTamanioComprimido] = useState(0);
  const [procesando, setProcesando] = useState(false);

  const comprimirImagen = async (file, qualityValue) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Mantener dimensiones originales (no redimensionar)
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            resolve({ url, size: blob.size });
          }, 'image/jpeg', qualityValue);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setProcesando(true);

    // Mostrar original
    const urlOriginal = URL.createObjectURL(file);
    setImagenOriginal(urlOriginal);
    setTamanioOriginal(file.size);

    // Comprimir
    const resultado = await comprimirImagen(file, quality);
    setImagenComprimida(resultado.url);
    setTamanioComprimido(resultado.size);

    setProcesando(false);
  };

  const handleQualityChange = async (newQuality) => {
    setQuality(newQuality);

    if (!imagenOriginal) return;

    setProcesando(true);

    // Re-comprimir con nueva calidad
    const file = document.querySelector('input[type="file"]').files[0];
    const resultado = await comprimirImagen(file, newQuality);
    setImagenComprimida(resultado.url);
    setTamanioComprimido(resultado.size);

    setProcesando(false);
  };

  const formatSize = (bytes) => {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  const ahorroPercentaje = tamanioOriginal > 0
    ? ((1 - tamanioComprimido / tamanioOriginal) * 100).toFixed(1)
    : 0;

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '2rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginBottom: '2rem'
      }}>
        <h2 style={{ marginBottom: '1rem' }}>🧪 Prueba de Compresión de Imágenes</h2>
        <p style={{ color: '#7f8c8d', marginBottom: '2rem' }}>
          Sube una factura para ver la diferencia entre original y comprimida.
          Puedes hacer zoom en ambas imágenes para comparar detalles.
        </p>

        {/* Selector de archivo */}
        <div style={{ marginBottom: '2rem' }}>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{
              padding: '1rem',
              border: '2px dashed #3498db',
              borderRadius: '8px',
              width: '100%',
              cursor: 'pointer'
            }}
          />
        </div>

        {/* Control de calidad */}
        {imagenOriginal && (
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '1.5rem',
            borderRadius: '8px',
            marginBottom: '2rem'
          }}>
            <label style={{ display: 'block', marginBottom: '1rem', fontWeight: 'bold' }}>
              Calidad de compresión: {(quality * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0.5"
              max="1"
              step="0.05"
              value={quality}
              onChange={(e) => handleQualityChange(parseFloat(e.target.value))}
              style={{ width: '100%', marginBottom: '1rem' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#7f8c8d' }}>
              <span>50% (Máximo ahorro)</span>
              <span>100% (Sin compresión)</span>
            </div>
          </div>
        )}

        {/* Estadísticas */}
        {imagenOriginal && !procesando && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            <div style={{
              backgroundColor: '#e3f2fd',
              padding: '1rem',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.5rem' }}>
                Tamaño Original
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2196f3' }}>
                {formatSize(tamanioOriginal)}
              </div>
            </div>

            <div style={{
              backgroundColor: '#e8f5e9',
              padding: '1rem',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.5rem' }}>
                Tamaño Comprimido
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4caf50' }}>
                {formatSize(tamanioComprimido)}
              </div>
            </div>

            <div style={{
              backgroundColor: '#fff3e0',
              padding: '1rem',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.5rem' }}>
                Ahorro
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ff9800' }}>
                {ahorroPercentaje}%
              </div>
            </div>
          </div>
        )}

        {procesando && (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#3498db' }}>
            ⏳ Procesando imagen...
          </div>
        )}
      </div>

      {/* Comparación lado a lado */}
      {imagenOriginal && imagenComprimida && !procesando && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(600px, 1fr))',
          gap: '2rem'
        }}>
          {/* Original */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ marginBottom: '1rem', color: '#2196f3' }}>
              📷 Original ({formatSize(tamanioOriginal)})
            </h3>
            <div style={{
              border: '2px solid #2196f3',
              borderRadius: '8px',
              overflow: 'auto',
              maxHeight: '600px'
            }}>
              <img
                src={imagenOriginal}
                alt="Original"
                style={{ width: '100%', display: 'block' }}
              />
            </div>
          </div>

          {/* Comprimida */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ marginBottom: '1rem', color: '#4caf50' }}>
              🗜️ Comprimida ({formatSize(tamanioComprimido)}) - {ahorroPercentaje}% ahorro
            </h3>
            <div style={{
              border: '2px solid #4caf50',
              borderRadius: '8px',
              overflow: 'auto',
              maxHeight: '600px'
            }}>
              <img
                src={imagenComprimida}
                alt="Comprimida"
                style={{ width: '100%', display: 'block' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Guía de interpretación */}
      {imagenOriginal && (
        <div style={{
          marginTop: '2rem',
          backgroundColor: '#fff3cd',
          border: '2px solid #ffc107',
          borderRadius: '8px',
          padding: '1.5rem'
        }}>
          <h4 style={{ marginBottom: '1rem' }}>💡 Cómo interpretar los resultados</h4>
          <ul style={{ paddingLeft: '1.5rem', lineHeight: '1.8' }}>
            <li><strong>50-70% calidad:</strong> Visible degradación, solo para thumbnails</li>
            <li><strong>70-80% calidad:</strong> ⭐ RECOMENDADO - Imperceptible en pantalla, gran ahorro</li>
            <li><strong>80-90% calidad:</strong> Excelente calidad, incluso con zoom moderado</li>
            <li><strong>90-100% calidad:</strong> Casi idéntico al original, poco ahorro</li>
          </ul>
          <p style={{ marginTop: '1rem', fontStyle: 'italic', color: '#856404' }}>
            💡 Tip: Haz zoom (Ctrl + rueda del mouse) en ambas imágenes para comparar detalles.
            Si no ves diferencia significativa al 80%, esa es tu configuración ideal.
          </p>
        </div>
      )}
    </div>
  );
}

export default TestCompresion;
