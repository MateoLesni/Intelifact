import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const API_URL = import.meta.env.VITE_API_URL || '/api';

function ProveedoresDashboard({ user }) {
  const [facturas, setFacturas] = useState([]);
  const [facturasFiltradas, setFacturasFiltradas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [categoriaAbierta, setCategoriaAbierta] = useState(null);
  const [fechaAbierta, setFechaAbierta] = useState(null);
  const [filtroGlobal, setFiltroGlobal] = useState('');
  const [filtroNombreArchivo, setFiltroNombreArchivo] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [imagenesRotas, setImagenesRotas] = useState(new Set());

  useEffect(() => {
    loadFacturas();

    // Auto-refresh cada 30 segundos para mantener datos actualizados
    const intervalId = setInterval(() => {
      loadFacturas();
    }, 30000); // 30 segundos

    // Limpiar intervalo al desmontar componente
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    // Aplicar filtro global
    if (!filtroGlobal.trim()) {
      setFacturasFiltradas(facturas);
    } else {
      const filtered = facturas.filter(factura => {
        const searchText = filtroGlobal.toLowerCase();
        return (
          factura.id?.toString().includes(searchText) ||
          factura.nro_factura?.toLowerCase().includes(searchText) ||
          factura.nro_oc?.toLowerCase().includes(searchText) ||
          factura.proveedor?.toLowerCase().includes(searchText) ||
          factura.local?.toLowerCase().includes(searchText) ||
          factura.mr_numero?.toLowerCase().includes(searchText) ||
          factura.locales?.categoria?.toLowerCase().includes(searchText)
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

  // Función para formatear solo la fecha
  // CRÍTICO: fecha_mr viene como YYYY-MM-DD (sin hora, sin zona horaria)
  // NO aplicar conversión de zona horaria para evitar cambios de día
  const formatearSoloFecha = (fechaISO) => {
    if (!fechaISO) return 'Sin fecha';

    // Convertir a string por si viene como otro tipo
    let fechaStr = String(fechaISO).trim();

    // Si es formato YYYY-MM-DD (sin hora), parsearlo directamente SIN zona horaria
    if (/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
      const [year, month, day] = fechaStr.split('-');
      return `${day}/${month}/${year}`;
    }

    // Si tiene timestamp completo (legacy), extraer solo la fecha
    if (fechaStr.includes('T')) {
      const soloFecha = fechaStr.split('T')[0];
      const [year, month, day] = soloFecha.split('-');
      return `${day}/${month}/${year}`;
    }

    // Fallback para formatos no esperados
    console.warn('Formato de fecha inesperado:', fechaISO);
    return 'Sin fecha';
  };

  // Manejar error de carga de imagen (marcarla como rota, pero NO filtrarla)
  const handleImagenError = (url) => {
    setImagenesRotas(prev => new Set([...prev, url]));
  };

  // Organizar facturas por categoría y fecha
  const organizarPorCarpetas = () => {
    const carpetas = {};

    facturasFiltradas.forEach(factura => {
      // La categoría viene de la relación con locales
      const categoria = factura.locales?.categoria || 'Sin categoría';

      // Formatear fecha usando la función que maneja timestamps correctamente
      const fechaMR = formatearSoloFecha(factura.fecha_mr);

      if (!carpetas[categoria]) {
        carpetas[categoria] = {};
      }

      if (!carpetas[categoria][fechaMR]) {
        carpetas[categoria][fechaMR] = [];
      }

      // Agregar TODAS las imágenes (incluyendo las rotas)
      if (factura.factura_imagenes && factura.factura_imagenes.length > 0) {
        factura.factura_imagenes.forEach(img => {
          carpetas[categoria][fechaMR].push({
            url: img.imagen_url,
            nombre: img.imagen_url.split('/').pop(),
            factura: factura
          });
        });
      }
    });

    return carpetas;
  };

  const carpetas = organizarPorCarpetas();

  // Obtener la fecha MR más reciente de una categoría
  const getFechaMasReciente = (fechas) => {
    const fechasOrdenadas = Object.keys(fechas).sort((a, b) => {
      if (a === 'Sin fecha') return 1;
      if (b === 'Sin fecha') return -1;
      return new Date(b.split('/').reverse().join('-')) - new Date(a.split('/').reverse().join('-'));
    });
    return fechasOrdenadas[0];
  };

  // Descargar imagen individual
  const descargarImagen = async (url, nombre) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      saveAs(blob, decodeURIComponent(nombre));
    } catch (error) {
      console.error('Error al descargar imagen:', error);
      alert('Error al descargar la imagen');
    }
  };

  // Descargar todas las imágenes de una fecha
  const descargarTodasLasImagenes = async (imagenes, categoria, fecha) => {
    try {
      const zip = new JSZip();
      const folder = zip.folder(`${categoria}_${fecha.replace(/\//g, '-')}`);

      for (const img of imagenes) {
        const response = await fetch(img.url);
        const blob = await response.blob();
        folder.file(decodeURIComponent(img.nombre), blob);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${categoria}_${fecha.replace(/\//g, '-')}.zip`);
    } catch (error) {
      console.error('Error al descargar imágenes:', error);
      alert('Error al crear el archivo ZIP');
    }
  };

  if (loading) {
    return <div className="container"><div className="loading">Cargando...</div></div>;
  }

  // Vista de carpetas (categorías)
  if (!categoriaAbierta) {
    return (
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0 }}>Facturas con MR - Por Categoría</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1', maxWidth: '400px' }}>
            <input
              type="text"
              value={filtroGlobal}
              onChange={(e) => setFiltroGlobal(e.target.value)}
              placeholder="Buscar por FC, OC, proveedor, local, MR, categoría..."
              style={{
                flex: 1,
                padding: '0.75rem',
                fontSize: '0.95rem',
                borderRadius: '4px',
                border: '1px solid #ddd'
              }}
            />
            {filtroGlobal && (
              <button
                onClick={() => setFiltroGlobal('')}
                className="btn btn-secondary"
                style={{ padding: '0.75rem' }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {Object.keys(carpetas).length === 0 ? (
          <div className="empty-state">
            <p>No hay facturas con MR disponibles</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '1.5rem'
          }}>
            {Object.keys(carpetas).map(categoria => {
              const totalImagenes = Object.values(carpetas[categoria]).reduce((acc, imgs) => acc + imgs.length, 0);
              const totalFechas = Object.keys(carpetas[categoria]).length;

              return (
                <div
                  key={categoria}
                  className="card"
                  style={{
                    cursor: 'pointer',
                    textAlign: 'center',
                    padding: '2rem 1rem',
                    transition: 'transform 0.2s, box-shadow 0.2s'
                  }}
                  onClick={() => {
                    setCategoriaAbierta(categoria);
                    // No abrir fecha automáticamente, mostrar lista de fechas
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-5px)';
                    e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.2)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                  }}
                >
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📁</div>
                  <h3 style={{ marginBottom: '0.5rem', color: '#2c3e50' }}>{categoria}</h3>
                  <p style={{ fontSize: '0.85rem', color: '#7f8c8d' }}>
                    {totalFechas} fecha{totalFechas !== 1 ? 's' : ''} • {totalImagenes} imagen{totalImagenes !== 1 ? 'es' : ''}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Vista de fechas dentro de una categoría
  if (categoriaAbierta && !fechaAbierta) {
    const fechas = carpetas[categoriaAbierta];

    return (
      <div className="container">
        <button onClick={() => setCategoriaAbierta(null)} className="btn btn-secondary" style={{ marginBottom: '1rem' }}>
          ← Volver a Categorías
        </button>

        <h2 style={{ marginBottom: '1.5rem' }}>{categoriaAbierta} - Seleccionar Fecha</h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gap: '1.5rem'
        }}>
          {Object.keys(fechas).sort((a, b) => {
            if (a === 'Sin fecha') return 1;
            if (b === 'Sin fecha') return -1;
            return new Date(b.split('/').reverse().join('-')) - new Date(a.split('/').reverse().join('-'));
          }).map(fecha => {
            const imagenes = fechas[fecha];

            return (
              <div
                key={fecha}
                className="card"
                style={{
                  cursor: 'pointer',
                  textAlign: 'center',
                  padding: '2rem 1rem',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                onClick={() => setFechaAbierta(fecha)}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.2)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                }}
              >
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📅</div>
                <h3 style={{ marginBottom: '0.5rem', color: '#2c3e50' }}>{fecha}</h3>
                <p style={{ fontSize: '0.85rem', color: '#7f8c8d' }}>
                  {imagenes.length} imagen{imagenes.length !== 1 ? 'es' : ''}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Vista de imágenes
  const todasImagenes = carpetas[categoriaAbierta][fechaAbierta];

  // Filtrar imágenes por nombre de archivo
  const imagenes = filtroNombreArchivo.trim()
    ? todasImagenes.filter(item =>
        item.nombre.toLowerCase().includes(filtroNombreArchivo.toLowerCase())
      )
    : todasImagenes;

  // Contar imágenes rotas en esta carpeta
  const imagenesRotasEnCarpeta = todasImagenes.filter(item => imagenesRotas.has(item.url)).length;

  return (
    <div className="container">
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={() => setFechaAbierta(null)} className="btn btn-secondary">
          ← Volver a Fechas
        </button>
        <button
          onClick={() => descargarTodasLasImagenes(todasImagenes, categoriaAbierta, fechaAbierta)}
          className="btn btn-success"
        >
          Descargar Todas las Imágenes ({todasImagenes.length})
        </button>
        {imagenesRotasEnCarpeta > 0 && (
          <div style={{
            padding: '0.75rem 1rem',
            backgroundColor: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '4px',
            fontSize: '0.9rem',
            color: '#856404',
            fontWeight: '500'
          }}>
            ⚠️ {imagenesRotasEnCarpeta} imagen{imagenesRotasEnCarpeta !== 1 ? 'es' : ''} no disponible{imagenesRotasEnCarpeta !== 1 ? 's' : ''}
          </div>
        )}
        <input
          type="text"
          value={filtroNombreArchivo}
          onChange={(e) => setFiltroNombreArchivo(e.target.value)}
          placeholder="Filtrar por nombre de archivo..."
          style={{
            flex: '1',
            minWidth: '250px',
            padding: '0.75rem',
            fontSize: '0.95rem',
            borderRadius: '4px',
            border: '1px solid #ddd'
          }}
        />
        {filtroNombreArchivo && (
          <button
            onClick={() => setFiltroNombreArchivo('')}
            className="btn btn-secondary"
            style={{ padding: '0.75rem' }}
          >
            ✕
          </button>
        )}
      </div>

      <h2 style={{ marginBottom: '1.5rem' }}>
        {categoriaAbierta} - {fechaAbierta}
        {filtroNombreArchivo && ` (${imagenes.length} de ${todasImagenes.length})`}
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '1.5rem'
      }}>
        {imagenes.map((item, index) => {
          const estaRota = imagenesRotas.has(item.url);

          return (
            <div
              key={index}
              style={{
                border: estaRota ? '2px solid #dc3545' : '1px solid #ddd',
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: estaRota ? '#fff5f5' : '#f9f9f9'
              }}
            >
              <div style={{ position: 'relative', cursor: estaRota ? 'default' : 'pointer' }} onClick={() => { if (!estaRota) { setSelectedImage(item.url); setZoomLevel(1); } }}>
                {estaRota ? (
                  <div style={{
                    width: '100%',
                    height: '250px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#fff',
                    color: '#dc3545'
                  }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem' }}>Imagen No Disponible</div>
                    <div style={{ fontSize: '0.85rem', color: '#6c757d', textAlign: 'center', padding: '0 1rem' }}>
                      Esta imagen fue eliminada del storage
                    </div>
                  </div>
                ) : (
                  <>
                    <img
                      src={item.url}
                      alt={item.nombre}
                      style={{
                        width: '100%',
                        height: '250px',
                        objectFit: 'contain',
                        backgroundColor: '#fff',
                        transition: 'transform 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                      onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      onError={() => handleImagenError(item.url)}
                    />
                    <div style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      color: 'white',
                      padding: '5px 10px',
                      borderRadius: '4px',
                      fontSize: '0.85rem'
                    }}>
                      🔍 Click para ampliar
                    </div>
                  </>
                )}
              </div>
            <div style={{ padding: '0.75rem' }}>
              <p style={{
                fontSize: '0.8rem',
                color: '#2c3e50',
                fontWeight: '600',
                wordBreak: 'break-word',
                marginBottom: '0.5rem',
                maxHeight: '3em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical'
              }}
              title={item.nombre}
              >
                {item.nombre}
              </p>
              <p style={{
                fontSize: '0.75rem',
                color: '#999',
                marginBottom: '0.5rem'
              }}>
                Imagen {index + 1} de {imagenes.length}
              </p>
              <button
                onClick={() => descargarImagen(item.url, item.nombre)}
                className="btn btn-primary"
                style={{ width: '100%', fontSize: '0.85rem', padding: '0.5rem' }}
              >
                ⬇️ Descargar
              </button>
            </div>
          </div>
          );
        })}
      </div>

      {/* Modal de imagen expandida con zoom */}
      {selectedImage && (
        <div className="modal" onClick={() => setSelectedImage(null)} style={{ backgroundColor: 'rgba(0,0,0,0.95)' }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '98%', maxHeight: '98vh', padding: '1rem', backgroundColor: 'transparent', position: 'relative' }}>
            <button className="modal-close" onClick={() => setSelectedImage(null)} style={{ backgroundColor: 'white', color: 'black', position: 'absolute', top: '10px', right: '10px', zIndex: 1001 }}>
              ✕
            </button>

            {/* Controles de Zoom */}
            <div style={{
              position: 'absolute',
              top: '10px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '0.5rem',
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center',
              zIndex: 1001,
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
            }}>
              <button
                onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}
                style={{
                  padding: '0.5rem 1rem',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  backgroundColor: '#3498db',
                  color: 'white',
                  fontWeight: '600'
                }}
              >
                🔍−
              </button>
              <span style={{ fontWeight: '600', minWidth: '60px', textAlign: 'center' }}>
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel(Math.min(5, zoomLevel + 0.25))}
                style={{
                  padding: '0.5rem 1rem',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  backgroundColor: '#3498db',
                  color: 'white',
                  fontWeight: '600'
                }}
              >
                🔍+
              </button>
              <button
                onClick={() => setZoomLevel(1)}
                style={{
                  padding: '0.5rem 1rem',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  backgroundColor: '#95a5a6',
                  color: 'white',
                  fontSize: '0.85rem'
                }}
              >
                Reset
              </button>
            </div>

            <div style={{
              width: '100%',
              height: '90vh',
              overflow: 'auto',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '2rem'
            }}>
              <img
                src={selectedImage}
                alt="Imagen expandida"
                style={{
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: 'top left',
                  transition: 'transform 0.2s ease',
                  maxWidth: zoomLevel === 1 ? '100%' : 'none',
                  maxHeight: zoomLevel === 1 ? '100%' : 'none',
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain',
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
        </div>
      )}
    </div>
  );
}

export default ProveedoresDashboard;
