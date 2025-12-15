import React, { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

function GestionDashboard({ user }) {
  const [facturas, setFacturas] = useState([]);
  const [facturasFiltradas, setFacturasFiltradas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [localAbierto, setLocalAbierto] = useState(null);
  const [mesAbierto, setMesAbierto] = useState(null);
  const [filtroGlobal, setFiltroGlobal] = useState('');
  const [filtroNombreArchivo, setFiltroNombreArchivo] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [imagenesEliminadas, setImagenesEliminadas] = useState(new Set());

  useEffect(() => {
    loadFacturas();

    // Auto-refresh cada 5 minutos para mantener datos actualizados
    const intervalId = setInterval(() => {
      loadFacturas();
    }, 300000); // 5 minutos

    // Limpiar intervalo al desmontar componente
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    // Aplicar filtro global
    if (!filtroGlobal.trim()) {
      setFacturasFiltradas(facturas);
    } else {
      const filtered = facturas.filter(factura => {
        const searchTerm = filtroGlobal.toLowerCase();
        return (
          factura.local?.toLowerCase().includes(searchTerm) ||
          factura.nro_factura?.toLowerCase().includes(searchTerm) ||
          factura.proveedor?.toLowerCase().includes(searchTerm)
        );
      });
      setFacturasFiltradas(filtered);
    }
  }, [filtroGlobal, facturas]);

  const loadFacturas = async () => {
    try {
      const response = await fetch(`${API_URL}/facturas?rol=${user.rol}&userId=${user.id}`);
      const data = await response.json();
      setFacturas(data);
      setFacturasFiltradas(data);
    } catch (error) {
      console.error('Error al cargar facturas:', error);
    } finally {
      setLoading(false);
    }
  };

  // Función para formatear solo la fecha en zona horaria de Argentina
  const formatearSoloFecha = (fechaISO) => {
    if (!fechaISO) return 'Sin fecha';

    let fechaStr = String(fechaISO);

    if (!fechaStr.endsWith('Z') && !fechaStr.match(/[+-]\d{2}:\d{2}$/) && !fechaStr.includes('T')) {
      fechaStr = fechaStr + 'T00:00:00Z';
    } else if (fechaStr.includes('T') && !fechaStr.endsWith('Z') && !fechaStr.match(/[+-]\d{2}:\d{2}$/)) {
      fechaStr = fechaStr + 'Z';
    }

    const fecha = new Date(fechaStr);
    if (isNaN(fecha.getTime())) {
      console.warn('Fecha inválida:', fechaISO);
      return 'Sin fecha';
    }

    const partes = new Intl.DateTimeFormat('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).formatToParts(fecha);

    const valores = {};
    partes.forEach(({ type, value }) => {
      valores[type] = value;
    });

    return `${valores.day}/${valores.month}/${valores.year}`;
  };

  // Obtener mes y año de una fecha
  const obtenerMesAnio = (fechaISO) => {
    if (!fechaISO) return 'Sin fecha';

    let fechaStr = String(fechaISO);
    if (!fechaStr.endsWith('Z') && !fechaStr.match(/[+-]\d{2}:\d{2}$/) && !fechaStr.includes('T')) {
      fechaStr = fechaStr + 'T00:00:00Z';
    } else if (fechaStr.includes('T') && !fechaStr.endsWith('Z') && !fechaStr.match(/[+-]\d{2}:\d{2}$/)) {
      fechaStr = fechaStr + 'Z';
    }

    const fecha = new Date(fechaStr);
    if (isNaN(fecha.getTime())) return 'Sin fecha';

    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    const mes = fecha.getMonth();
    const anio = fecha.getFullYear();

    return `${meses[mes]} ${anio}`;
  };

  // Manejar error de carga de imagen
  const handleImagenError = (url) => {
    setImagenesEliminadas(prev => new Set([...prev, url]));
  };

  // Organizar facturas por local y mes
  const organizarPorLocalYMes = () => {
    const carpetas = {};

    facturasFiltradas.forEach(factura => {
      const local = factura.local || 'Sin local';
      const mesAnio = obtenerMesAnio(factura.fecha_mr);

      if (!carpetas[local]) {
        carpetas[local] = {};
      }

      if (!carpetas[local][mesAnio]) {
        carpetas[local][mesAnio] = [];
      }

      // Agregar solo las imágenes que NO han sido eliminadas
      if (factura.factura_imagenes && factura.factura_imagenes.length > 0) {
        factura.factura_imagenes.forEach(img => {
          if (!imagenesEliminadas.has(img.imagen_url)) {
            carpetas[local][mesAnio].push({
              url: img.imagen_url,
              nombre: img.imagen_url.split('/').pop(),
              factura: factura
            });
          }
        });
      }
    });

    return carpetas;
  };

  const carpetas = organizarPorLocalYMes();

  // Descargar una imagen individual
  const descargarImagen = async (url, nombre) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const urlBlob = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = urlBlob;
      a.download = nombre;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(urlBlob);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error al descargar imagen:', error);
      alert('Error al descargar la imagen');
    }
  };

  // Descargar todas las imágenes de un mes
  const descargarTodasDelMes = async (local, mes) => {
    const imagenes = carpetas[local]?.[mes] || [];

    if (imagenes.length === 0) {
      alert('No hay imágenes para descargar');
      return;
    }

    // Mostrar confirmación
    if (!confirm(`¿Descargar ${imagenes.length} imágenes de ${local} - ${mes}?`)) {
      return;
    }

    // Descargar una por una con pequeño delay
    for (let i = 0; i < imagenes.length; i++) {
      const img = imagenes[i];
      await descargarImagen(img.url, `${local}_${mes}_${i + 1}_${img.nombre}`);
      // Pequeño delay para no saturar el navegador
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    alert(`Se descargaron ${imagenes.length} imágenes correctamente`);
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Cargando facturas...</p>
      </div>
    );
  }

  // Filtrar imágenes por nombre de archivo si hay filtro activo
  const imagenesFiltradas = (imagenes) => {
    if (!filtroNombreArchivo.trim()) return imagenes;
    return imagenes.filter(img =>
      img.nombre.toLowerCase().includes(filtroNombreArchivo.toLowerCase())
    );
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '1.5rem', color: '#2c3e50' }}>Gestión - Imágenes por Local y Mes</h2>

      {/* Filtros */}
      <div style={{
        marginBottom: '1.5rem',
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap'
      }}>
        <input
          type="text"
          placeholder="🔍 Buscar por local, factura o proveedor..."
          value={filtroGlobal}
          onChange={(e) => setFiltroGlobal(e.target.value)}
          style={{
            flex: 1,
            minWidth: '250px',
            padding: '0.6rem 1rem',
            border: '2px solid #ddd',
            borderRadius: '8px',
            fontSize: '0.95rem'
          }}
        />

        {(localAbierto || mesAbierto) && (
          <input
            type="text"
            placeholder="🔍 Filtrar imágenes por nombre..."
            value={filtroNombreArchivo}
            onChange={(e) => setFiltroNombreArchivo(e.target.value)}
            style={{
              flex: 1,
              minWidth: '250px',
              padding: '0.6rem 1rem',
              border: '2px solid #ddd',
              borderRadius: '8px',
              fontSize: '0.95rem'
            }}
          />
        )}
      </div>

      {/* Vista de carpetas por local */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {Object.keys(carpetas).sort().map(local => {
          const totalImagenes = Object.values(carpetas[local]).reduce((sum, imgs) => sum + imgs.length, 0);

          return (
            <div
              key={local}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                border: localAbierto === local ? '3px solid #e67e22' : '1px solid #ecf0f1'
              }}
              onClick={() => {
                setLocalAbierto(localAbierto === local ? null : local);
                setMesAbierto(null);
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{
                padding: '1.5rem',
                backgroundColor: '#e67e22',
                color: 'white'
              }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>
                  📍 {local}
                </h3>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', opacity: 0.9 }}>
                  {totalImagenes} imágenes
                </p>
              </div>

              {/* Meses dentro del local */}
              {localAbierto === local && (
                <div style={{ padding: '1rem' }} onClick={(e) => e.stopPropagation()}>
                  {Object.keys(carpetas[local]).sort().reverse().map(mes => {
                    const imagenesDelMes = carpetas[local][mes];

                    return (
                      <div
                        key={mes}
                        style={{
                          marginBottom: '0.75rem',
                          padding: '0.75rem',
                          backgroundColor: mesAbierto === mes ? '#fff3cd' : '#f8f9fa',
                          borderRadius: '8px',
                          border: mesAbierto === mes ? '2px solid #e67e22' : '1px solid #dee2e6'
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer'
                          }}
                          onClick={() => setMesAbierto(mesAbierto === mes ? null : mes)}
                        >
                          <div>
                            <strong style={{ color: '#2c3e50' }}>📅 {mes}</strong>
                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#666' }}>
                              {imagenesDelMes.length} imágenes
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              descargarTodasDelMes(local, mes);
                            }}
                            style={{
                              padding: '0.4rem 0.8rem',
                              backgroundColor: '#27ae60',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              fontWeight: '500'
                            }}
                            onMouseOver={(e) => e.target.style.backgroundColor = '#229954'}
                            onMouseOut={(e) => e.target.style.backgroundColor = '#27ae60'}
                          >
                            ⬇ Descargar todo
                          </button>
                        </div>

                        {/* Imágenes del mes */}
                        {mesAbierto === mes && (
                          <div style={{
                            marginTop: '1rem',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                            gap: '0.75rem'
                          }}>
                            {imagenesFiltradas(imagenesDelMes).map((item, idx) => (
                              <div
                                key={idx}
                                style={{
                                  position: 'relative',
                                  borderRadius: '8px',
                                  overflow: 'hidden',
                                  border: '1px solid #ddd',
                                  backgroundColor: '#fff'
                                }}
                              >
                                <img
                                  src={item.url}
                                  alt={item.nombre}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedImage(item.url);
                                    setZoomLevel(1);
                                  }}
                                  style={{
                                    width: '100%',
                                    height: '120px',
                                    objectFit: 'cover',
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s'
                                  }}
                                  onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                  onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                  onError={() => handleImagenError(item.url)}
                                />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    descargarImagen(item.url, item.nombre);
                                  }}
                                  style={{
                                    position: 'absolute',
                                    bottom: '5px',
                                    right: '5px',
                                    backgroundColor: 'rgba(39, 174, 96, 0.9)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '0.3rem 0.5rem',
                                    cursor: 'pointer',
                                    fontSize: '0.75rem'
                                  }}
                                >
                                  ⬇
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal de imagen ampliada */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '2rem'
          }}
        >
          <div style={{ position: 'relative', maxWidth: '95%', maxHeight: '95%' }}>
            {/* Controles de zoom */}
            <div style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              display: 'flex',
              gap: '0.5rem',
              zIndex: 1001
            }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setZoomLevel(prev => Math.min(prev + 0.5, 3));
                }}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#3498db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                +
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setZoomLevel(prev => Math.max(prev - 0.5, 0.5));
                }}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#3498db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                -
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImage(null);
                }}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                ✕
              </button>
            </div>

            <img
              src={selectedImage}
              alt="Vista ampliada"
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: zoomLevel === 1 ? '100%' : 'none',
                maxHeight: zoomLevel === 1 ? '100%' : 'none',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
                transform: `scale(${zoomLevel})`,
                cursor: zoomLevel > 1 ? 'grab' : 'default'
              }}
              draggable={false}
              onError={() => {
                handleImagenError(selectedImage);
                setSelectedImage(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default GestionDashboard;
