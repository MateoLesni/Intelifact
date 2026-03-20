import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const API_URL = import.meta.env.VITE_API_URL || '/api';

function ProveedorMesDashboard({ user }) {
  const [facturas, setFacturas] = useState([]);
  const [facturasFiltradas, setFacturasFiltradas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [proveedorAbierto, setProveedorAbierto] = useState(null);
  const [mesAbierto, setMesAbierto] = useState(null);
  const [filtroGlobal, setFiltroGlobal] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [imagenesEliminadas, setImagenesEliminadas] = useState(new Set());

  useEffect(() => {
    loadFacturas();
    const intervalId = setInterval(() => loadFacturas(), 300000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!filtroGlobal.trim()) {
      setFacturasFiltradas(facturas);
    } else {
      const searchTerm = filtroGlobal.toLowerCase();
      setFacturasFiltradas(facturas.filter(f =>
        f.proveedor?.toLowerCase().includes(searchTerm) ||
        f.local?.toLowerCase().includes(searchTerm) ||
        f.nro_factura?.toLowerCase().includes(searchTerm)
      ));
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
    return `${meses[fecha.getMonth()]} ${fecha.getFullYear()}`;
  };

  const handleImagenError = (url) => {
    setImagenesEliminadas(prev => new Set([...prev, url]));
  };

  // Organizar por Proveedor > Mes
  const organizarPorProveedorYMes = () => {
    const carpetas = {};

    facturasFiltradas.forEach(factura => {
      const proveedor = factura.proveedor || 'Sin proveedor';
      const mesAnio = obtenerMesAnio(factura.fecha);

      if (!carpetas[proveedor]) carpetas[proveedor] = {};
      if (!carpetas[proveedor][mesAnio]) carpetas[proveedor][mesAnio] = [];

      if (factura.factura_imagenes && factura.factura_imagenes.length > 0) {
        factura.factura_imagenes.forEach(img => {
          if (img.imagen_url && !imagenesEliminadas.has(img.imagen_url)) {
            carpetas[proveedor][mesAnio].push({
              url: img.imagen_url,
              nombre: img.imagen_url.split('/').pop(),
              local: factura.local || 'Sin local',
              nroFactura: factura.nro_factura || ''
            });
          }
        });
      }
    });

    return carpetas;
  };

  const carpetas = organizarPorProveedorYMes();

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

  const descargarTodasDelMes = async (proveedor, mes) => {
    const imagenes = carpetas[proveedor]?.[mes] || [];

    if (imagenes.length === 0) {
      alert('No hay imagenes para descargar');
      return;
    }

    if (!confirm(`¿Descargar ${imagenes.length} imagenes de ${proveedor} - ${mes} como ZIP?`)) {
      return;
    }

    try {
      const zip = new JSZip();
      const nombreCarpeta = `${proveedor.replace(/ /g, '_')}_${mes.replace(/ /g, '_')}`;
      const carpetaZip = zip.folder(nombreCarpeta);

      let descargadas = 0;
      let fallidas = 0;
      const nombresUsados = new Map();

      for (const img of imagenes) {
        try {
          const response = await fetch(img.url);
          if (!response.ok) {
            fallidas++;
            continue;
          }
          const blob = await response.blob();

          let nombreArchivo = img.nombre;
          if (nombresUsados.has(nombreArchivo)) {
            const contador = nombresUsados.get(nombreArchivo) + 1;
            nombresUsados.set(nombreArchivo, contador);
            const lastDot = nombreArchivo.lastIndexOf('.');
            const nombreSinExt = lastDot > -1 ? nombreArchivo.substring(0, lastDot) : nombreArchivo;
            const extension = lastDot > -1 ? nombreArchivo.substring(lastDot) : '';
            nombreArchivo = `${nombreSinExt}_${contador}${extension}`;
          } else {
            nombresUsados.set(nombreArchivo, 1);
          }

          carpetaZip.file(nombreArchivo, blob);
          descargadas++;
        } catch (error) {
          console.error(`Error descargando ${img.nombre}:`, error);
          fallidas++;
        }
      }

      if (descargadas === 0) {
        alert('No se pudo descargar ninguna imagen.');
        return;
      }

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${nombreCarpeta}.zip`);

      if (fallidas > 0) {
        alert(`ZIP creado.\n\n${descargadas} descargadas\n${fallidas} no disponibles (404)`);
      } else {
        alert(`Se descargaron ${descargadas} imagenes en un archivo ZIP`);
      }
    } catch (error) {
      console.error('Error creando ZIP:', error);
      alert('Error al crear el archivo ZIP');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Cargando facturas...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1800px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '1.5rem', color: '#2c3e50' }}>
        Facturas por Proveedor y Mes
      </h2>

      {/* Filtro */}
      <div style={{ marginBottom: '1.5rem' }}>
        <input
          type="text"
          placeholder="Buscar por proveedor, local o factura..."
          value={filtroGlobal}
          onChange={(e) => setFiltroGlobal(e.target.value)}
          style={{
            width: '100%',
            maxWidth: '400px',
            padding: '0.6rem 1rem',
            border: '2px solid #ddd',
            borderRadius: '8px',
            fontSize: '0.95rem'
          }}
        />
      </div>

      {Object.keys(carpetas).length === 0 && (
        <div style={{
          padding: '3rem',
          textAlign: 'center',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ color: '#7f8c8d', marginBottom: '1rem' }}>No hay facturas</h3>
          <p style={{ color: '#95a5a6' }}>
            {filtroGlobal ? 'No se encontraron resultados.' : 'No hay facturas cargadas.'}
          </p>
        </div>
      )}

      {/* Cards por proveedor */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {Object.keys(carpetas).sort().map(proveedor => {
          const totalImagenes = Object.values(carpetas[proveedor]).reduce((sum, imgs) => sum + imgs.length, 0);
          const totalMeses = Object.keys(carpetas[proveedor]).length;

          return (
            <div
              key={proveedor}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                border: proveedorAbierto === proveedor ? '3px solid #8e44ad' : '1px solid #ecf0f1'
              }}
              onClick={() => {
                setProveedorAbierto(proveedorAbierto === proveedor ? null : proveedor);
                setMesAbierto(null);
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{
                padding: '1.5rem',
                backgroundColor: '#8e44ad',
                color: 'white'
              }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>
                  {proveedor}
                </h3>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', opacity: 0.9 }}>
                  {totalImagenes} imagenes en {totalMeses} {totalMeses === 1 ? 'mes' : 'meses'}
                </p>
              </div>

              {/* Meses dentro del proveedor */}
              {proveedorAbierto === proveedor && (
                <div style={{ padding: '1rem' }} onClick={(e) => e.stopPropagation()}>
                  {Object.keys(carpetas[proveedor]).sort().reverse().map(mes => {
                    const imagenesDelMes = carpetas[proveedor][mes];
                    // Contar locales distintos en este mes
                    const localesEnMes = [...new Set(imagenesDelMes.map(img => img.local))];

                    return (
                      <div
                        key={mes}
                        style={{
                          marginBottom: '0.75rem',
                          padding: '0.75rem',
                          backgroundColor: mesAbierto === mes ? '#f3e5f5' : '#f8f9fa',
                          borderRadius: '8px',
                          border: mesAbierto === mes ? '2px solid #8e44ad' : '1px solid #dee2e6'
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
                            <strong style={{ color: '#2c3e50' }}>{mes}</strong>
                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#666' }}>
                              {imagenesDelMes.length} imagenes - {localesEnMes.length} {localesEnMes.length === 1 ? 'local' : 'locales'}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              descargarTodasDelMes(proveedor, mes);
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
                            Descargar todo
                          </button>
                        </div>

                        {/* Imagenes del mes */}
                        {mesAbierto === mes && (
                          <div style={{ marginTop: '1rem' }}>
                            {/* Info de locales */}
                            <p style={{ fontSize: '0.8rem', color: '#8e44ad', marginBottom: '0.5rem' }}>
                              Locales: {localesEnMes.join(', ')}
                            </p>
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                              gap: '0.75rem'
                            }}>
                              {imagenesDelMes.map((item, idx) => (
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
                                    loading="lazy"
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
                                  {/* Etiqueta del local */}
                                  <div style={{
                                    position: 'absolute',
                                    top: '4px',
                                    left: '4px',
                                    backgroundColor: 'rgba(142, 68, 173, 0.85)',
                                    color: 'white',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontSize: '0.65rem',
                                    fontWeight: '500'
                                  }}>
                                    {item.local}
                                  </div>
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
                                    Descargar
                                  </button>
                                </div>
                              ))}
                            </div>
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
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '2rem'
          }}
        >
          <div style={{ position: 'relative', maxWidth: '95%', maxHeight: '95%' }}>
            <div style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              display: 'flex',
              gap: '0.5rem',
              zIndex: 1001
            }}>
              <button
                onClick={(e) => { e.stopPropagation(); setZoomLevel(prev => Math.min(prev + 0.5, 3)); }}
                style={{ padding: '0.5rem 1rem', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}
              >+</button>
              <button
                onClick={(e) => { e.stopPropagation(); setZoomLevel(prev => Math.max(prev - 0.5, 0.5)); }}
                style={{ padding: '0.5rem 1rem', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}
              >-</button>
              <button
                onClick={(e) => { e.stopPropagation(); setSelectedImage(null); }}
                style={{ padding: '0.5rem 1rem', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}
              >X</button>
            </div>
            <img
              src={selectedImage}
              alt="Vista ampliada"
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: zoomLevel === 1 ? '100%' : 'none',
                maxHeight: zoomLevel === 1 ? '100%' : 'none',
                width: 'auto', height: 'auto',
                objectFit: 'contain',
                transform: `scale(${zoomLevel})`,
                cursor: zoomLevel > 1 ? 'grab' : 'default'
              }}
              draggable={false}
              onError={() => { handleImagenError(selectedImage); setSelectedImage(null); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default ProveedorMesDashboard;
