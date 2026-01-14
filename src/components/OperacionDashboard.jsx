import React, { useState, useEffect } from 'react';
import HistorialAuditoria from './HistorialAuditoria';

const API_URL = import.meta.env.VITE_API_URL || '/api';

function OperacionDashboard({ user }) {
  const [facturas, setFacturas] = useState([]);
  const [facturasFiltradas, setFacturasFiltradas] = useState([]);
  const [locales, setLocales] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    fecha: '',
    local: '',
    nro_factura: '',
    nro_oc: '',
    proveedor: ''
  });
  const [imagenes, setImagenes] = useState([]);
  const [selectedImages, setSelectedImages] = useState(null);
  const [expandedImage, setExpandedImage] = useState(null);
  const [showHistorial, setShowHistorial] = useState(null);
  const [creatingFactura, setCreatingFactura] = useState(false);
  const [filtros, setFiltros] = useState({
    id: '',
    fecha: '',
    local: '',
    nro_factura: '',
    nro_oc: '',
    proveedor: ''
  });

  // Paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const registrosPorPagina = 500;

  useEffect(() => {
    loadFacturas();
    loadLocales();
    loadProveedores();

    // Auto-refresh cada 5 minutos para mantener datos actualizados
    const intervalId = setInterval(() => {
      loadFacturas();
    }, 300000); // 5 minutos = 300000ms

    // Limpiar intervalo al desmontar componente
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    // Resetear a página 1 cuando cambien los filtros
    setPaginaActual(1);
  }, [filtros]);

  useEffect(() => {
    // Aplicar filtros
    let filtered = facturas;

    Object.keys(filtros).forEach(key => {
      if (filtros[key].trim()) {
        filtered = filtered.filter(factura => {
          let value;
          if (key === 'id') {
            value = factura[key]?.toString();
          } else if (key === 'fecha') {
            // Formatear fecha manualmente sin usar new Date() para evitar problemas de timezone
            const [year, month, day] = factura[key].split('-');
            value = `${day}/${month}/${year}`;
          } else {
            value = factura[key];
          }
          return value?.toLowerCase().includes(filtros[key].toLowerCase());
        });
      }
    });

    setFacturasFiltradas(filtered);
  }, [filtros, facturas]);

  const loadFacturas = async () => {
    try {
      const response = await fetch(`${API_URL}/facturas?rol=${user.rol}&userId=${user.id}`);
      const data = await response.json();
      // Ordenar por ID descendente (más recientes primero)
      const sortedData = data.sort((a, b) => b.id - a.id);
      setFacturas(sortedData);
      setFacturasFiltradas(sortedData);
    } catch (error) {
      console.error('Error al cargar facturas:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLocales = async () => {
    try {
      const response = await fetch(`${API_URL}/locales?userId=${user.id}`);
      const data = await response.json();
      setLocales(data);
    } catch (error) {
      console.error('Error al cargar locales:', error);
    }
  };

  const loadProveedores = async () => {
    try {
      const response = await fetch(`${API_URL}/proveedores`);
      const data = await response.json();
      setProveedores(data);
    } catch (error) {
      console.error('Error al cargar proveedores:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // PROTECCIÓN: Prevenir múltiples submits
    if (creatingFactura) {
      return;
    }

    if (imagenes.length === 0) {
      alert('Debe adjuntar al menos una imagen');
      return;
    }

    setCreatingFactura(true);

    const formDataToSend = new FormData();
    formDataToSend.append('fecha', formData.fecha);
    formDataToSend.append('local', formData.local);
    formDataToSend.append('nro_factura', formData.nro_factura);
    formDataToSend.append('nro_oc', formData.nro_oc);
    formDataToSend.append('proveedor', formData.proveedor);
    formDataToSend.append('usuario_id', user.id);

    imagenes.forEach((imagen) => {
      formDataToSend.append('imagenes', imagen);
    });

    try {
      const response = await fetch(`${API_URL}/facturas`, {
        method: 'POST',
        body: formDataToSend
      });

      if (response.ok) {
        alert('Factura creada correctamente');
        setShowForm(false);
        setFormData({ fecha: '', local: '', nro_factura: '', nro_oc: '', proveedor: '' });
        setImagenes([]);
        loadFacturas();
      } else {
        const error = await response.json();
        alert('Error: ' + error.error);
      }
    } catch (error) {
      alert('Error al crear factura: ' + error.message);
    } finally {
      setCreatingFactura(false);
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const MAX_SIZE = 4.5 * 1024 * 1024; // 4.5 MB en bytes
    const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

    // Validar archivos
    const filesValidos = [];
    const filesGrandes = [];
    const filesTipoInvalido = [];

    files.forEach(file => {
      // Validar que el archivo no esté corrupto
      if (!file || file.size === 0) {
        filesTipoInvalido.push(`${file.name} (archivo vacío o corrupto)`);
        return;
      }

      // Validar tipo de archivo
      if (!ALLOWED_TYPES.includes(file.type)) {
        filesTipoInvalido.push(`${file.name} (tipo no permitido: ${file.type || 'desconocido'})`);
        return;
      }

      // Validar tamaño
      if (file.size > MAX_SIZE) {
        filesGrandes.push(`${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
        return;
      }

      filesValidos.push(file);
    });

    // Mostrar mensajes de error si hay archivos rechazados
    if (filesTipoInvalido.length > 0) {
      alert(`Los siguientes archivos tienen un formato no válido:\n\n${filesTipoInvalido.join('\n')}\n\nFormatos permitidos: JPG, PNG, GIF, WEBP, PDF`);
    }

    if (filesGrandes.length > 0) {
      alert(`Los siguientes archivos exceden el límite de 4.5 MB:\n\n${filesGrandes.join('\n')}\n\nPor favor, comprime las imágenes antes de subirlas.`);
    }

    if (filesValidos.length > 0) {
      setImagenes([...imagenes, ...filesValidos]);
    } else if (files.length > 0) {
      // Si había archivos pero todos fueron rechazados
      alert('Ningún archivo fue agregado. Por favor revisa los requisitos.');
    }
  };

  const removeImage = (index) => {
    setImagenes(imagenes.filter((_, i) => i !== index));
  };

  const descargarImagen = async (url, nombre) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = nombre || 'imagen.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Error al descargar imagen:', error);
      alert('Error al descargar la imagen');
    }
  };

  if (loading) {
    return <div className="container"><div className="loading">Cargando...</div></div>;
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Mis Facturas</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          {showForm ? 'Cancelar' : '+ Nueva Factura'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3>Cargar Nueva Factura</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label>Fecha</label>
                <input
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Local</label>
                <select
                  value={formData.local}
                  onChange={(e) => setFormData({ ...formData, local: e.target.value })}
                  required
                >
                  <option value="">Seleccione un local</option>
                  {locales.map((local) => (
                    <option key={local.id} value={local.local}>
                      {local.local}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Número de Factura</label>
                <input
                  type="text"
                  value={formData.nro_factura}
                  onChange={(e) => setFormData({ ...formData, nro_factura: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Número de OC</label>
                <input
                  type="text"
                  value={formData.nro_oc}
                  onChange={(e) => setFormData({ ...formData, nro_oc: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Proveedor</label>
                <select
                  value={formData.proveedor}
                  onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
                  required
                >
                  <option value="">Seleccione un proveedor</option>
                  {proveedores.map((prov) => (
                    <option key={prov.id} value={prov.proveedor}>
                      {prov.proveedor}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Imágenes o PDFs de la Factura (obligatorio)</label>
              <div className="file-upload">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  multiple
                  onChange={handleImageChange}
                  id="file-input"
                />
                <label htmlFor="file-input">
                  Haga clic para seleccionar imágenes o PDFs
                </label>
              </div>
              {imagenes.length > 0 && (
                <div className="file-list">
                  {imagenes.map((img, index) => (
                    <div key={index} className="file-item">
                      <span>{img.name}</span>
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="btn btn-danger"
                        style={{ padding: '0.3rem 0.6rem' }}
                      >
                        Eliminar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              type="submit"
              className="btn btn-success"
              disabled={creatingFactura}
              style={{
                opacity: creatingFactura ? 0.6 : 1,
                cursor: creatingFactura ? 'not-allowed' : 'pointer'
              }}
            >
              {creatingFactura ? 'Creando Factura...' : 'Guardar Factura'}
            </button>
          </form>
        </div>
      )}

      {/* Vista Tabular */}
      {facturas.length === 0 ? (
        <div className="empty-state">
          <p>No hay facturas cargadas</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <thead>
              <tr style={{ backgroundColor: '#2c3e50', color: 'white' }}>
                <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>ID</th>
                <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>Fecha</th>
                <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>Local</th>
                <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>FC</th>
                <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>OC</th>
                <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>Proveedor</th>
                <th style={{ padding: '0.6rem 0.8rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600' }}>IMG</th>
                <th style={{ padding: '0.6rem 0.8rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600' }}>MR</th>
                <th style={{ padding: '0.6rem 0.8rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600' }}>Acciones</th>
              </tr>
              <tr style={{ backgroundColor: '#34495e' }}>
                <th style={{ padding: '0.5rem' }}>
                  <input
                    type="text"
                    value={filtros.id}
                    onChange={(e) => setFiltros({ ...filtros, id: e.target.value })}
                    placeholder="Filtrar..."
                    style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem' }}
                  />
                </th>
                <th style={{ padding: '0.5rem' }}>
                  <input
                    type="text"
                    value={filtros.fecha}
                    onChange={(e) => setFiltros({ ...filtros, fecha: e.target.value })}
                    placeholder="Filtrar..."
                    style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem' }}
                  />
                </th>
                <th style={{ padding: '0.5rem' }}>
                  <input
                    type="text"
                    value={filtros.local}
                    onChange={(e) => setFiltros({ ...filtros, local: e.target.value })}
                    placeholder="Filtrar..."
                    style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem' }}
                  />
                </th>
                <th style={{ padding: '0.5rem' }}>
                  <input
                    type="text"
                    value={filtros.nro_factura}
                    onChange={(e) => setFiltros({ ...filtros, nro_factura: e.target.value })}
                    placeholder="Filtrar..."
                    style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem' }}
                  />
                </th>
                <th style={{ padding: '0.5rem' }}>
                  <input
                    type="text"
                    value={filtros.nro_oc}
                    onChange={(e) => setFiltros({ ...filtros, nro_oc: e.target.value })}
                    placeholder="Filtrar..."
                    style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem' }}
                  />
                </th>
                <th style={{ padding: '0.5rem' }}>
                  <input
                    type="text"
                    value={filtros.proveedor}
                    onChange={(e) => setFiltros({ ...filtros, proveedor: e.target.value })}
                    placeholder="Filtrar..."
                    style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem' }}
                  />
                </th>
                <th style={{ padding: '0.5rem' }}></th>
                <th style={{ padding: '0.5rem' }}></th>
                <th style={{ padding: '0.5rem' }}></th>
              </tr>
            </thead>
            <tbody>
              {facturasFiltradas
                .slice((paginaActual - 1) * registrosPorPagina, paginaActual * registrosPorPagina)
                .map((factura, index) => (
                <tr key={factura.id} style={{ borderBottom: '1px solid #e1e8ed', backgroundColor: index % 2 === 0 ? 'white' : '#fafbfc', fontSize: '0.875rem' }}>
                  <td style={{ padding: '0.6rem 0.8rem', fontWeight: '500', color: '#666' }}>#{factura.id}</td>
                  <td style={{ padding: '0.6rem 0.8rem', color: '#444' }}>
                    {(() => {
                      const [year, month, day] = factura.fecha.split('-');
                      return `${day}/${month}/${year.slice(2)}`;
                    })()}
                  </td>
                  <td style={{ padding: '0.6rem 0.8rem', color: '#444' }}>{factura.local}</td>
                  <td style={{ padding: '0.6rem 0.8rem', fontWeight: '500', color: '#2c3e50' }}>{factura.nro_factura}</td>
                  <td style={{ padding: '0.6rem 0.8rem', color: '#444' }}>{factura.nro_oc}</td>
                  <td style={{ padding: '0.6rem 0.8rem', color: '#444', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{factura.proveedor}</td>
                  <td style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>
                    {factura.factura_imagenes && factura.factura_imagenes.length > 0 && (
                      <button
                        onClick={() => setSelectedImages(factura.factura_imagenes)}
                        style={{
                          padding: '0.35rem 0.6rem',
                          fontSize: '0.75rem',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          backgroundColor: '#3498db',
                          color: 'white',
                          fontWeight: '500'
                        }}
                      >
                        🖼️ {factura.factura_imagenes.length}
                      </button>
                    )}
                  </td>
                  <td style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>
                    {factura.mr_estado ? (
                      <span style={{
                        padding: '0.25rem 0.6rem',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        backgroundColor: '#d4edda',
                        color: '#155724'
                      }}>{factura.mr_numero}</span>
                    ) : (
                      <span style={{ color: '#bdc3c7', fontSize: '0.875rem' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>
                    <button
                      onClick={() => setShowHistorial(factura.id)}
                      style={{
                        padding: '0.35rem 0.6rem',
                        fontSize: '0.75rem',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        backgroundColor: 'white',
                        color: '#666',
                        fontWeight: '500'
                      }}
                      title="Historial"
                    >
                      📋
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Paginación */}
          {facturasFiltradas.length > registrosPorPagina && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '1.5rem 0',
              backgroundColor: 'white',
              borderTop: '2px solid #e1e8ed'
            }}>
              <button
                onClick={() => {
                  setPaginaActual(prev => Math.max(1, prev - 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                disabled={paginaActual === 1}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: paginaActual === 1 ? '#f5f5f5' : '#fff',
                  color: paginaActual === 1 ? '#999' : '#333',
                  cursor: paginaActual === 1 ? 'not-allowed' : 'pointer',
                  fontWeight: '500'
                }}
              >
                ← Anterior
              </button>

              {(() => {
                const totalPaginas = Math.ceil(facturasFiltradas.length / registrosPorPagina);
                const botonesPaginas = [];
                let inicio = Math.max(1, paginaActual - 3);
                let fin = Math.min(totalPaginas, inicio + 6);
                if (fin - inicio < 6) inicio = Math.max(1, fin - 6);

                for (let i = inicio; i <= fin; i++) {
                  botonesPaginas.push(
                    <button
                      key={i}
                      onClick={() => {
                        setPaginaActual(i);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      style={{
                        padding: '0.5rem 0.75rem',
                        border: paginaActual === i ? '2px solid #3498db' : '1px solid #ddd',
                        borderRadius: '4px',
                        backgroundColor: paginaActual === i ? '#3498db' : '#fff',
                        color: paginaActual === i ? '#fff' : '#333',
                        cursor: 'pointer',
                        fontWeight: paginaActual === i ? '600' : '500',
                        minWidth: '40px'
                      }}
                    >
                      {i}
                    </button>
                  );
                }
                return botonesPaginas;
              })()}

              <button
                onClick={() => {
                  const totalPaginas = Math.ceil(facturasFiltradas.length / registrosPorPagina);
                  setPaginaActual(prev => Math.min(totalPaginas, prev + 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                disabled={paginaActual >= Math.ceil(facturasFiltradas.length / registrosPorPagina)}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: paginaActual >= Math.ceil(facturasFiltradas.length / registrosPorPagina) ? '#f5f5f5' : '#fff',
                  color: paginaActual >= Math.ceil(facturasFiltradas.length / registrosPorPagina) ? '#999' : '#333',
                  cursor: paginaActual >= Math.ceil(facturasFiltradas.length / registrosPorPagina) ? 'not-allowed' : 'pointer',
                  fontWeight: '500'
                }}
              >
                Siguiente →
              </button>

              <span style={{ marginLeft: '1rem', color: '#666', fontSize: '0.9rem' }}>
                Página {paginaActual} de {Math.ceil(facturasFiltradas.length / registrosPorPagina)}
                ({facturasFiltradas.length} facturas)
              </span>
            </div>
          )}
        </div>
      )}

      {/* Modal de imágenes */}
      {selectedImages && (
        <div className="modal" onClick={() => setSelectedImages(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '95%', maxHeight: '95vh', overflow: 'auto' }}>
            <button className="modal-close" onClick={() => setSelectedImages(null)}>
              ✕
            </button>
            <h3 style={{ marginBottom: '1.5rem' }}>Imágenes de la Factura ({selectedImages.length})</h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
              gap: '2rem'
            }}>
              {selectedImages.map((img, index) => {
                // Detectar si es PDF basándose en la URL
                const esPDF = img.imagen_url && (
                  img.imagen_url.toLowerCase().endsWith('.pdf') ||
                  img.imagen_url.includes('.pdf?') ||
                  img.imagen_url.includes('application/pdf')
                );

                return (
                  <div key={index} style={{
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    backgroundColor: '#f9f9f9'
                  }}>
                    {esPDF ? (
                      // Visor de PDF
                      <div style={{ position: 'relative', backgroundColor: '#fff' }}>
                        <iframe
                          src={img.imagen_url}
                          style={{
                            width: '100%',
                            height: '400px',
                            border: 'none'
                          }}
                          title={`PDF ${index + 1}`}
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
                          📄 PDF
                        </div>
                      </div>
                    ) : (
                      // Visor de imagen
                      <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setExpandedImage(img.imagen_url)}>
                        <img
                          src={img.imagen_url}
                          alt={`Imagen ${index + 1}`}
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
                    )}
                    <div style={{ padding: '1rem' }}>
                      <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.5rem' }}>
                        {esPDF ? 'PDF' : 'Imagen'} {index + 1} de {selectedImages.length}
                      </p>
                      <button
                        onClick={() => descargarImagen(img.imagen_url, esPDF ? `factura_${index + 1}.pdf` : `factura_imagen_${index + 1}.jpg`)}
                      className="btn btn-primary"
                      style={{ width: '100%' }}
                    >
                      ⬇️ Descargar {esPDF ? 'PDF' : 'Imagen'}
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal de imagen expandida */}
      {expandedImage && (
        <div className="modal" onClick={() => setExpandedImage(null)} style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '98%', maxHeight: '98vh', padding: '1rem', backgroundColor: 'transparent' }}>
            <button className="modal-close" onClick={() => setExpandedImage(null)} style={{ backgroundColor: 'white', color: 'black' }}>
              ✕
            </button>
            <img
              src={expandedImage}
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

      {showHistorial && (
        <HistorialAuditoria facturaId={showHistorial} onClose={() => setShowHistorial(null)} />
      )}
    </div>
  );
}

export default OperacionDashboard;
