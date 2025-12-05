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

  useEffect(() => {
    loadFacturas();
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

  // Organizar facturas por categoría y fecha
  const organizarPorCarpetas = () => {
    const carpetas = {};

    facturasFiltradas.forEach(factura => {
      // La categoría viene de la relación con locales
      const categoria = factura.locales?.categoria || 'Sin categoría';
      const fechaMR = factura.fecha_mr ? new Date(factura.fecha_mr).toLocaleDateString('es-AR') : 'Sin fecha';

      // Debug temporal
      if (factura.mr_numero) {
        console.log(`Factura #${factura.id} - MR: ${factura.mr_numero} - fecha_mr: ${factura.fecha_mr} - fechaMR formateada: ${fechaMR}`);
      }

      if (!carpetas[categoria]) {
        carpetas[categoria] = {};
      }

      if (!carpetas[categoria][fechaMR]) {
        carpetas[categoria][fechaMR] = [];
      }

      // Agregar todas las imágenes de la factura
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
  const imagenes = carpetas[categoriaAbierta][fechaAbierta];

  return (
    <div className="container">
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button onClick={() => setFechaAbierta(null)} className="btn btn-secondary">
          ← Volver a Fechas
        </button>
        <button
          onClick={() => descargarTodasLasImagenes(imagenes, categoriaAbierta, fechaAbierta)}
          className="btn btn-success"
        >
          Descargar Todas las Imágenes ({imagenes.length})
        </button>
      </div>

      <h2 style={{ marginBottom: '1.5rem' }}>
        {categoriaAbierta} - {fechaAbierta}
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
        gap: '2rem'
      }}>
        {imagenes.map((item, index) => (
          <div
            key={index}
            style={{
              border: '1px solid #ddd',
              borderRadius: '8px',
              overflow: 'hidden',
              backgroundColor: '#f9f9f9'
            }}
          >
            <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setSelectedImage(item.url)}>
              <img
                src={item.url}
                alt={item.nombre}
                style={{
                  width: '100%',
                  height: '400px',
                  objectFit: 'contain',
                  backgroundColor: '#fff',
                  transition: 'transform 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
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
            </div>
            <div style={{ padding: '1rem' }}>
              <p style={{
                fontSize: '0.85rem',
                color: '#666',
                wordBreak: 'break-word',
                marginBottom: '0.5rem'
              }}>
                Imagen {index + 1} de {imagenes.length}
              </p>
              <button
                onClick={() => descargarImagen(item.url, item.nombre)}
                className="btn btn-primary"
                style={{ width: '100%' }}
              >
                ⬇️ Descargar Imagen
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de imagen expandida */}
      {selectedImage && (
        <div className="modal" onClick={() => setSelectedImage(null)} style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '98%', maxHeight: '98vh', padding: '1rem', backgroundColor: 'transparent' }}>
            <button className="modal-close" onClick={() => setSelectedImage(null)} style={{ backgroundColor: 'white', color: 'black' }}>
              ✕
            </button>
            <img
              src={selectedImage}
              alt="Imagen expandida"
              style={{
                width: '100%',
                height: '90vh',
                objectFit: 'contain'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default ProveedoresDashboard;
