import React, { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

function ImagenVerifier() {
  const [verificando, setVerificando] = useState(false);
  const [limpiando, setLimpiando] = useState(false);
  const [resultados, setResultados] = useState(null);
  const [progreso, setProgreso] = useState('');

  const verificarImagenes = async () => {
    if (!confirm('¿Verificar todas las imágenes? Este proceso puede tardar varios minutos.')) {
      return;
    }

    setVerificando(true);
    setProgreso('Iniciando verificación...');
    setResultados(null);

    try {
      const response = await fetch(`${API_URL}/verificar-imagenes`);

      if (!response.ok) {
        throw new Error('Error al verificar imágenes');
      }

      const data = await response.json();
      setResultados(data);
      setProgreso('');

      if (data.rotas > 0) {
        alert(`Verificación completada: ${data.rotas} imágenes rotas encontradas de ${data.total} totales`);
      } else {
        alert(`¡Excelente! Todas las ${data.total} imágenes están funcionando correctamente.`);
      }
    } catch (error) {
      console.error('Error verificando imágenes:', error);
      alert('Error al verificar imágenes: ' + error.message);
      setProgreso('');
    } finally {
      setVerificando(false);
    }
  };

  const limpiarReferenciasHuerfanas = async () => {
    if (!resultados || !resultados.imagenesRotas || resultados.imagenesRotas.length === 0) {
      alert('No hay referencias huérfanas para limpiar');
      return;
    }

    const confirmMsg = `¿Eliminar ${resultados.imagenesRotas.length} referencias huérfanas de la base de datos?\n\n` +
                       `ADVERTENCIA: Esta acción NO puede deshacerse. Las facturas quedarán sin imágenes asociadas.\n\n` +
                       `Se recomienda guardar un backup antes de continuar.`;

    if (!confirm(confirmMsg)) {
      return;
    }

    setLimpiando(true);

    try {
      const idsAEliminar = resultados.imagenesRotas.map(img => img.id);

      const response = await fetch(`${API_URL}/limpiar-referencias-huerfanas`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ imagenesRotas: idsAEliminar })
      });

      if (!response.ok) {
        throw new Error('Error al limpiar referencias');
      }

      const data = await response.json();
      alert(`✅ Se eliminaron ${data.eliminadas} referencias huérfanas exitosamente`);

      // Resetear resultados
      setResultados(null);
    } catch (error) {
      console.error('Error limpiando referencias:', error);
      alert('Error al limpiar referencias: ' + error.message);
    } finally {
      setLimpiando(false);
    }
  };

  const descargarReporte = () => {
    if (!resultados || !resultados.imagenesRotas) return;

    const csvHeader = 'ID,Factura ID,URL,Status Code\n';
    const csvRows = resultados.imagenesRotas.map(img =>
      `${img.id},${img.factura_id},"${img.imagen_url}",${img.status_code || 'ERROR'}`
    ).join('\n');

    const csv = csvHeader + csvRows;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `imagenes-rotas-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '2rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ marginBottom: '1rem', color: '#2c3e50' }}>🔍 Verificador de Imágenes</h2>
        <p style={{ color: '#7f8c8d', marginBottom: '2rem' }}>
          Esta herramienta verifica que todas las imágenes referenciadas en la base de datos
          existan físicamente en el Storage de Supabase. Las referencias huérfanas pueden
          eliminarse para mantener la integridad de los datos.
        </p>

        {/* Botón de verificar */}
        <div style={{ marginBottom: '2rem' }}>
          <button
            onClick={verificarImagenes}
            disabled={verificando}
            style={{
              padding: '1rem 2rem',
              backgroundColor: verificando ? '#95a5a6' : '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: verificando ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {verificando ? '⏳ Verificando...' : '🔍 Verificar Todas las Imágenes'}
          </button>
          {progreso && (
            <p style={{ marginTop: '1rem', color: '#3498db', fontStyle: 'italic' }}>
              {progreso}
            </p>
          )}
        </div>

        {/* Resultados */}
        {resultados && (
          <div style={{
            border: '2px solid #ecf0f1',
            borderRadius: '8px',
            padding: '1.5rem',
            marginBottom: '2rem',
            backgroundColor: '#f8f9fa'
          }}>
            <h3 style={{ marginBottom: '1rem', color: '#2c3e50' }}>📊 Resultados de la Verificación</h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{
                padding: '1rem',
                backgroundColor: 'white',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📸</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2c3e50' }}>
                  {resultados.total}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#7f8c8d' }}>Total de imágenes</div>
              </div>

              <div style={{
                padding: '1rem',
                backgroundColor: 'white',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#27ae60' }}>
                  {resultados.funcionales}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#7f8c8d' }}>Funcionales</div>
              </div>

              <div style={{
                padding: '1rem',
                backgroundColor: resultados.rotas > 0 ? '#fee' : 'white',
                borderRadius: '8px',
                textAlign: 'center',
                border: resultados.rotas > 0 ? '2px solid #e74c3c' : 'none'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                  {resultados.rotas > 0 ? '⚠️' : '✅'}
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: resultados.rotas > 0 ? '#e74c3c' : '#27ae60' }}>
                  {resultados.rotas}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#7f8c8d' }}>Rotas</div>
              </div>
            </div>

            {resultados.rotas > 0 && (
              <>
                <div style={{ marginBottom: '1rem' }}>
                  <h4 style={{ marginBottom: '0.5rem', color: '#e74c3c' }}>
                    ⚠️ Referencias Huérfanas Detectadas
                  </h4>
                  <p style={{ fontSize: '0.9rem', color: '#7f8c8d' }}>
                    Se encontraron {resultados.rotas} referencias a imágenes que ya no existen en el Storage.
                    Puedes descargar un reporte detallado o eliminar estas referencias de la base de datos.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={descargarReporte}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: '#34495e',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    📥 Descargar Reporte CSV
                  </button>

                  <button
                    onClick={limpiarReferenciasHuerfanas}
                    disabled={limpiando}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: limpiando ? '#95a5a6' : '#e74c3c',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: limpiando ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {limpiando ? '⏳ Limpiando...' : '🗑️ Eliminar Referencias Huérfanas'}
                  </button>
                </div>

                {/* Lista de imágenes rotas (máximo 10 para no saturar) */}
                <details style={{ marginTop: '1.5rem' }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '1rem' }}>
                    Ver primeras 10 imágenes rotas
                  </summary>
                  <div style={{
                    maxHeight: '400px',
                    overflowY: 'auto',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    padding: '1rem'
                  }}>
                    {resultados.imagenesRotas.slice(0, 10).map((img, idx) => (
                      <div key={idx} style={{
                        padding: '0.75rem',
                        borderBottom: idx < 9 ? '1px solid #ecf0f1' : 'none',
                        fontSize: '0.85rem'
                      }}>
                        <div style={{ fontWeight: 'bold', color: '#2c3e50' }}>
                          Factura ID: {img.factura_id}
                        </div>
                        <div style={{ color: '#7f8c8d', wordBreak: 'break-all', marginTop: '0.25rem' }}>
                          {img.imagen_url}
                        </div>
                        <div style={{ color: '#e74c3c', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                          Status: {img.status_code}
                        </div>
                      </div>
                    ))}
                    {resultados.imagenesRotas.length > 10 && (
                      <div style={{ padding: '1rem', textAlign: 'center', color: '#7f8c8d', fontStyle: 'italic' }}>
                        ... y {resultados.imagenesRotas.length - 10} más. Descarga el reporte completo.
                      </div>
                    )}
                  </div>
                </details>
              </>
            )}

            {resultados.rotas === 0 && (
              <div style={{
                padding: '1.5rem',
                backgroundColor: '#d4edda',
                border: '2px solid #28a745',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎉</div>
                <h4 style={{ color: '#155724', marginBottom: '0.5rem' }}>¡Todo está en orden!</h4>
                <p style={{ color: '#155724' }}>
                  Todas las imágenes están funcionando correctamente. No se encontraron referencias huérfanas.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Información adicional */}
        <div style={{
          backgroundColor: '#e8f4fd',
          border: '1px solid #3498db',
          borderRadius: '8px',
          padding: '1rem',
          marginTop: '2rem'
        }}>
          <h4 style={{ color: '#2c3e50', marginBottom: '0.5rem' }}>ℹ️ Información</h4>
          <ul style={{ color: '#34495e', fontSize: '0.9rem', paddingLeft: '1.5rem' }}>
            <li>La verificación revisa TODAS las imágenes en la base de datos</li>
            <li>Puede tardar varios minutos dependiendo de la cantidad de imágenes</li>
            <li>Las referencias huérfanas son registros en la BD sin archivo físico en Storage</li>
            <li>Eliminar referencias NO afecta las facturas, solo quita las imágenes asociadas</li>
            <li>Se recomienda hacer un backup antes de eliminar referencias</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default ImagenVerifier;
