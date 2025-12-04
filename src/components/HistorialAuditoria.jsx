import React, { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

function HistorialAuditoria({ facturaId, onClose }) {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistorial();
  }, [facturaId]);

  const loadHistorial = async () => {
    try {
      const response = await fetch(`${API_URL}/auditoria?facturaId=${facturaId}`);
      const data = await response.json();
      setHistorial(data);
    } catch (error) {
      console.error('Error al cargar historial:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatearAccion = (accion) => {
    const acciones = {
      modificacion: 'Modificación',
      eliminacion: 'Eliminación',
      generacion_mr: 'Generación de MR'
    };
    return acciones[accion] || accion;
  };

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderCambios = (item) => {
    if (item.accion === 'eliminacion') {
      return (
        <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#ffe6e6', borderRadius: '4px' }}>
          <strong>Datos eliminados:</strong>
          <ul style={{ marginTop: '0.5rem', marginLeft: '1.5rem' }}>
            <li>Nro. Factura: {item.datos_anteriores?.nro_factura}</li>
            <li>Nro. OC: {item.datos_anteriores?.nro_oc}</li>
            <li>Proveedor: {item.datos_anteriores?.proveedor}</li>
          </ul>
        </div>
      );
    }

    if (item.accion === 'generacion_mr') {
      return (
        <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#e6f7e6', borderRadius: '4px' }}>
          <strong>MR generada:</strong> {item.datos_nuevos?.mr_numero}
        </div>
      );
    }

    if (item.accion === 'modificacion' && item.datos_anteriores && item.datos_nuevos) {
      const cambios = [];
      const campos = ['nro_factura', 'nro_oc', 'proveedor', 'fecha', 'categoria'];

      campos.forEach(campo => {
        if (item.datos_anteriores[campo] !== item.datos_nuevos[campo]) {
          cambios.push({
            campo,
            anterior: item.datos_anteriores[campo],
            nuevo: item.datos_nuevos[campo]
          });
        }
      });

      if (cambios.length === 0) return null;

      return (
        <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#fff4e6', borderRadius: '4px' }}>
          <strong>Cambios realizados:</strong>
          <ul style={{ marginTop: '0.5rem', marginLeft: '1.5rem' }}>
            {cambios.map((cambio, idx) => (
              <li key={idx}>
                <strong>{cambio.campo}:</strong> {cambio.anterior} → {cambio.nuevo}
              </li>
            ))}
          </ul>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
        <button className="modal-close" onClick={onClose}>
          ✕
        </button>
        <h2 style={{ marginBottom: '1.5rem' }}>Historial de Auditoría</h2>

        {loading ? (
          <div className="loading">Cargando historial...</div>
        ) : historial.length === 0 ? (
          <div className="empty-state">
            <p>No hay registros de auditoría para esta factura</p>
          </div>
        ) : (
          <div>
            {historial.map((item, index) => (
              <div key={item.id} className="card" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                  <div>
                    <span className={`badge ${
                      item.accion === 'eliminacion' ? 'badge-danger' :
                      item.accion === 'generacion_mr' ? 'badge-success' :
                      'badge-warning'
                    }`} style={{
                      backgroundColor:
                        item.accion === 'eliminacion' ? '#dc3545' :
                        item.accion === 'generacion_mr' ? '#28a745' :
                        '#ffc107',
                      color: 'white'
                    }}>
                      {formatearAccion(item.accion)}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.85rem', color: '#7f8c8d' }}>
                    <div>{formatearFecha(item.created_at)}</div>
                    <div style={{ marginTop: '0.2rem' }}>
                      <strong>Usuario:</strong> {item.usuarios?.nombre || 'Sistema'}
                    </div>
                  </div>
                </div>
                {renderCambios(item)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default HistorialAuditoria;
