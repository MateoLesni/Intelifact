import React, { useState, useEffect } from 'react';
import HistorialAuditoria from './HistorialAuditoria';

const API_URL = import.meta.env.VITE_API_URL || '/api';

function PedidosDashboard({ user }) {
  const [facturas, setFacturas] = useState([]);
  const [facturasFiltradas, setFacturasFiltradas] = useState([]);
  const [locales, setLocales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showMRModal, setShowMRModal] = useState(null);
  const [mrNumero, setMrNumero] = useState('');
  const [selectedImages, setSelectedImages] = useState(null);
  const [expandedImage, setExpandedImage] = useState(null);
  const [showHistorial, setShowHistorial] = useState(null);
  const [filtros, setFiltros] = useState({
    id: '',
    fecha: '',
    local: '',
    nro_factura: '',
    nro_oc: '',
    proveedor: '',
    mr_numero: ''
  });

  useEffect(() => {
    loadFacturas();
    loadAllLocales();
  }, []);

  useEffect(() => {
    // Aplicar filtros
    let filtered = facturas;

    Object.keys(filtros).forEach(key => {
      if (filtros[key].trim()) {
        filtered = filtered.filter(factura => {
          const value = key === 'id'
            ? factura[key]?.toString()
            : key === 'fecha'
            ? new Date(factura[key]).toLocaleDateString()
            : factura[key];
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
      setFacturas(data);
      setFacturasFiltradas(data);
    } catch (error) {
      console.error('Error al cargar facturas:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllLocales = async () => {
    try {
      const response = await fetch(`${API_URL}/locales?userId=1`);
      const data = await response.json();
      setLocales(data);
    } catch (error) {
      console.error('Error al cargar locales:', error);
    }
  };

  const handleEdit = (factura) => {
    setEditingId(factura.id);
    setEditForm({
      fecha: factura.fecha.split('T')[0],
      local: factura.local,
      nro_factura: factura.nro_factura,
      nro_oc: factura.nro_oc,
      proveedor: factura.proveedor
    });
  };

  const handleUpdate = async (id) => {
    try {
      const response = await fetch(`${API_URL}/facturas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editForm, usuario_id: user.id })
      });

      if (response.ok) {
        alert('Factura actualizada correctamente');
        setEditingId(null);
        loadFacturas();
      } else {
        const error = await response.json();
        alert('Error: ' + error.error);
      }
    } catch (error) {
      alert('Error al actualizar factura: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Está seguro de eliminar esta factura?')) return;

    try {
      const response = await fetch(`${API_URL}/facturas/${id}?usuario_id=${user.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        alert('Factura eliminada correctamente');
        loadFacturas();
      } else {
        const error = await response.json();
        alert('Error: ' + error.error);
      }
    } catch (error) {
      alert('Error al eliminar factura: ' + error.message);
    }
  };

  const handleGenerateMR = async () => {
    if (!mrNumero.trim()) {
      alert('Debe ingresar un número de MR');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/facturas/${showMRModal}/mr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mr_numero: mrNumero, usuario_id: user.id })
      });

      if (response.ok) {
        alert('MR generada correctamente');
        setShowMRModal(null);
        setMrNumero('');
        loadFacturas();
      } else {
        const error = await response.json();
        alert('Error: ' + error.error);
      }
    } catch (error) {
      alert('Error al generar MR: ' + error.message);
    }
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
      <h2 style={{ marginBottom: '2rem' }}>Gestión de Facturas</h2>

      {facturas.length === 0 ? (
        <div className="empty-state">
          <p>No hay facturas disponibles</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <thead>
              <tr style={{ backgroundColor: '#2c3e50', color: 'white' }}>
                <th style={{ padding: '1rem', textAlign: 'left' }}>ID</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Fecha</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Local</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Nro. Factura</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Nro. OC</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Proveedor</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Cargado por</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>Imágenes</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>MR</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>Acciones</th>
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
                <th style={{ padding: '0.5rem' }}>
                  <input
                    type="text"
                    value={filtros.mr_numero}
                    onChange={(e) => setFiltros({ ...filtros, mr_numero: e.target.value })}
                    placeholder="Filtrar..."
                    style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem' }}
                  />
                </th>
                <th style={{ padding: '0.5rem' }}></th>
              </tr>
            </thead>
            <tbody>
              {facturasFiltradas.map((factura, index) => (
                <tr key={factura.id} style={{ borderBottom: '1px solid #ecf0f1', backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa' }}>
                  <td style={{ padding: '1rem' }}>{factura.id}</td>

                  {editingId === factura.id ? (
                    <>
                      <td style={{ padding: '0.5rem' }}>
                        <input
                          type="date"
                          value={editForm.fecha}
                          onChange={(e) => setEditForm({ ...editForm, fecha: e.target.value })}
                          style={{ width: '100%', padding: '0.5rem' }}
                        />
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <select
                          value={editForm.local}
                          onChange={(e) => setEditForm({ ...editForm, local: e.target.value })}
                          style={{ width: '100%', padding: '0.5rem' }}
                        >
                          {locales.map((local) => (
                            <option key={local.id} value={local.local}>
                              {local.local}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <input
                          type="text"
                          value={editForm.nro_factura}
                          onChange={(e) => setEditForm({ ...editForm, nro_factura: e.target.value })}
                          style={{ width: '100%', padding: '0.5rem' }}
                        />
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <input
                          type="text"
                          value={editForm.nro_oc}
                          onChange={(e) => setEditForm({ ...editForm, nro_oc: e.target.value })}
                          style={{ width: '100%', padding: '0.5rem' }}
                        />
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <input
                          type="text"
                          value={editForm.proveedor}
                          onChange={(e) => setEditForm({ ...editForm, proveedor: e.target.value })}
                          style={{ width: '100%', padding: '0.5rem' }}
                        />
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ padding: '1rem' }}>{new Date(factura.fecha).toLocaleDateString()}</td>
                      <td style={{ padding: '1rem' }}>{factura.local}</td>
                      <td style={{ padding: '1rem' }}>{factura.nro_factura}</td>
                      <td style={{ padding: '1rem' }}>{factura.nro_oc}</td>
                      <td style={{ padding: '1rem' }}>{factura.proveedor}</td>
                    </>
                  )}

                  <td style={{ padding: '1rem' }}>{factura.usuarios?.nombre || '-'}</td>

                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    {factura.factura_imagenes && factura.factura_imagenes.length > 0 && (
                      <button
                        onClick={() => setSelectedImages(factura.factura_imagenes)}
                        className="btn btn-primary"
                        style={{ padding: '0.5rem', fontSize: '0.85rem' }}
                      >
                        🖼️ Ver ({factura.factura_imagenes.length})
                      </button>
                    )}
                  </td>

                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    {factura.mr_estado ? (
                      <span className="badge badge-success">{factura.mr_numero}</span>
                    ) : (
                      <span style={{ color: '#95a5a6' }}>-</span>
                    )}
                  </td>

                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                      {editingId === factura.id ? (
                        <>
                          <button
                            onClick={() => handleUpdate(factura.id)}
                            className="btn btn-success"
                            style={{ padding: '0.5rem', fontSize: '0.85rem' }}
                          >
                            💾 Guardar
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="btn btn-secondary"
                            style={{ padding: '0.5rem', fontSize: '0.85rem' }}
                          >
                            ✕ Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          {!factura.mr_estado && (
                            <button
                              onClick={() => setShowMRModal(factura.id)}
                              className="btn btn-success"
                              style={{ padding: '0.5rem', fontSize: '0.85rem' }}
                            >
                              📝 Generar MR
                            </button>
                          )}
                          {user.rol === 'pedidos_admin' && (
                            <>
                              <button
                                onClick={() => handleEdit(factura)}
                                className="btn btn-primary"
                                style={{ padding: '0.5rem', fontSize: '0.85rem' }}
                              >
                                ✏️ Editar
                              </button>
                              <button
                                onClick={() => handleDelete(factura.id)}
                                className="btn btn-danger"
                                style={{ padding: '0.5rem', fontSize: '0.85rem' }}
                              >
                                🗑️ Eliminar
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setShowHistorial(factura.id)}
                            className="btn btn-secondary"
                            style={{ padding: '0.5rem', fontSize: '0.85rem' }}
                          >
                            📋 Historial
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de MR */}
      {showMRModal && (
        <div className="modal" onClick={() => setShowMRModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <button className="modal-close" onClick={() => setShowMRModal(null)}>
              ✕
            </button>
            <h3 style={{ marginBottom: '1rem' }}>Generar MR</h3>
            <div className="form-group">
              <label>Número de MR</label>
              <input
                type="text"
                value={mrNumero}
                onChange={(e) => setMrNumero(e.target.value)}
                placeholder="Ingrese el número de MR"
                autoFocus
              />
            </div>
            <button onClick={handleGenerateMR} className="btn btn-success" style={{ width: '100%' }}>
              Confirmar
            </button>
          </div>
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
              {selectedImages.map((img, index) => (
                <div key={index} style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  backgroundColor: '#f9f9f9'
                }}>
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
                  <div style={{ padding: '1rem' }}>
                    <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.5rem' }}>
                      Imagen {index + 1} de {selectedImages.length}
                    </p>
                    <button
                      onClick={() => descargarImagen(img.imagen_url, `factura_imagen_${index + 1}.jpg`)}
                      className="btn btn-primary"
                      style={{ width: '100%' }}
                    >
                      ⬇️ Descargar Imagen
                    </button>
                  </div>
                </div>
              ))}
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

export default PedidosDashboard;
