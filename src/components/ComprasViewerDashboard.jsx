import React, { useState, useEffect, useCallback } from 'react';
import PedidosDashboard from './PedidosDashboard';
import ProveedorMesDashboard from './ProveedorMesDashboard';

const API_URL = import.meta.env.VITE_API_URL || '/api';

function ComprasViewerDashboard({ user }) {
  const [vistaActual, setVistaActual] = useState('pedidos');
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados para el formulario de carga
  const [showForm, setShowForm] = useState(false);
  const [locales, setLocales] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [tipoDocumento, setTipoDocumento] = useState('nota_credito');
  const [formData, setFormData] = useState({
    fecha: '',
    local: '',
    nro_factura: '',
    nro_oc: '',
    proveedor: ''
  });
  const [imagenes, setImagenes] = useState([]);
  const [creatingFactura, setCreatingFactura] = useState(false);

  const loadFacturas = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/facturas?rol=${user.rol}&userId=${user.id}`);
      const data = await response.json();
      setFacturas(data);
    } catch (error) {
      console.error('Error al cargar facturas:', error);
    } finally {
      setLoading(false);
    }
  }, [user.rol, user.id]);

  const loadLocales = async () => {
    try {
      const response = await fetch(`${API_URL}/locales?userId=${user.id}&rol=${user.rol}`);
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

  useEffect(() => {
    loadFacturas();
    loadLocales();
    loadProveedores();
    const intervalId = setInterval(() => loadFacturas(), 300000);
    return () => clearInterval(intervalId);
  }, [loadFacturas]);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const MAX_SIZE = 4.5 * 1024 * 1024;
    const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

    const filesValidos = [];
    const filesGrandes = [];
    const filesTipoInvalido = [];

    files.forEach(file => {
      if (!file || file.size === 0) {
        filesTipoInvalido.push(`${file.name} (archivo vacío o corrupto)`);
        return;
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        filesTipoInvalido.push(`${file.name} (tipo no permitido: ${file.type || 'desconocido'})`);
        return;
      }
      if (file.size > MAX_SIZE) {
        filesGrandes.push(`${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
        return;
      }
      filesValidos.push(file);
    });

    if (filesTipoInvalido.length > 0) {
      alert(`Los siguientes archivos tienen un formato no válido:\n\n${filesTipoInvalido.join('\n')}\n\nFormatos permitidos: JPG, PNG, GIF, WEBP, PDF`);
    }
    if (filesGrandes.length > 0) {
      alert(`Los siguientes archivos exceden el límite de 4.5 MB:\n\n${filesGrandes.join('\n')}\n\nPor favor, comprime las imágenes antes de subirlas.`);
    }
    if (filesValidos.length > 0) {
      setImagenes([...imagenes, ...filesValidos]);
    } else if (files.length > 0) {
      alert('Ningún archivo fue agregado. Por favor revisa los requisitos.');
    }
  };

  const removeImage = (index) => {
    setImagenes(imagenes.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (creatingFactura) return;

    if (imagenes.length === 0) {
      alert('Debe adjuntar al menos una imagen');
      return;
    }

    const totalSize = imagenes.reduce((sum, img) => sum + img.size, 0);
    const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);
    const MAX_TOTAL_SIZE = 4 * 1024 * 1024;

    if (totalSize > MAX_TOTAL_SIZE) {
      alert(`El tamaño total de las imágenes (${totalSizeMB} MB) excede el límite de 4 MB.\n\nPor favor:\n- Suba las imágenes por separado, o\n- Comprima las imágenes antes de subirlas`);
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
    formDataToSend.append('tipo', tipoDocumento);

    imagenes.forEach((imagen) => {
      formDataToSend.append('imagenes', imagen);
    });

    try {
      const response = await fetch(`${API_URL}/facturas`, {
        method: 'POST',
        body: formDataToSend
      });

      if (response.ok) {
        const label = tipoDocumento === 'nota_credito' ? 'Nota de Crédito' : 'Factura';
        alert(`${label} creada correctamente`);
        setShowForm(false);
        setFormData({ fecha: '', local: '', nro_factura: '', nro_oc: '', proveedor: '' });
        setImagenes([]);
        setTipoDocumento('nota_credito');
        loadFacturas();
      } else {
        const error = await response.json();
        alert('Error: ' + error.error);
      }
    } catch (error) {
      alert('Error al crear: ' + error.message);
    } finally {
      setCreatingFactura(false);
    }
  };

  const tabs = [
    { id: 'cargar', label: 'Cargar Factura / NC', icon: '➕' },
    { id: 'pedidos', label: 'Pedidos (Solo lectura)', icon: '📋' },
    { id: 'proveedores', label: 'Proveedores / Meses', icon: '🏢' }
  ];

  const tipoLabel = tipoDocumento === 'nota_credito' ? 'Nota de Crédito' : 'Factura';

  return (
    <div style={{ padding: '1rem' }}>
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '1.5rem',
        borderBottom: '2px solid #e0e0e0',
        paddingBottom: '0.5rem',
        flexWrap: 'wrap'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setVistaActual(tab.id)}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: vistaActual === tab.id ? '#3498db' : '#ecf0f1',
              color: vistaActual === tab.id ? 'white' : '#34495e',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: vistaActual === tab.id ? 'bold' : 'normal',
              fontSize: '1rem',
              transition: 'all 0.2s'
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {vistaActual === 'cargar' && (
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2>Cargar Factura / Nota de Crédito</h2>
            <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
              {showForm ? 'Cancelar' : `+ Nueva ${tipoLabel}`}
            </button>
          </div>

          {showForm && (
            <div className="card" style={{ marginBottom: '2rem' }}>
              <h3>Cargar Nueva {tipoLabel}</h3>
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Tipo de Documento</label>
                    <select
                      value={tipoDocumento}
                      onChange={(e) => setTipoDocumento(e.target.value)}
                      required
                      style={{
                        borderColor: tipoDocumento === 'nota_credito' ? '#e74c3c' : '#3498db',
                        borderWidth: '2px'
                      }}
                    >
                      <option value="factura">Factura</option>
                      <option value="nota_credito">Nota de Crédito</option>
                    </select>
                  </div>
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
                    <label>{tipoDocumento === 'nota_credito' ? 'Número de NC' : 'Número de Factura'}</label>
                    <input
                      type="text"
                      value={formData.nro_factura}
                      onChange={(e) => setFormData({ ...formData, nro_factura: e.target.value })}
                      required
                      placeholder={tipoDocumento === 'nota_credito' ? 'Número de NC (0 si no tiene)' : ''}
                    />
                  </div>
                  <div className="form-group">
                    <label>Número de OC</label>
                    <input
                      type="text"
                      value={formData.nro_oc}
                      onChange={(e) => setFormData({ ...formData, nro_oc: e.target.value })}
                      required
                      placeholder={tipoDocumento === 'nota_credito' ? '0 si no tiene' : ''}
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

                {tipoDocumento === 'nota_credito' && (
                  <div style={{
                    backgroundColor: '#fef3cd',
                    border: '1px solid #ffc107',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    marginBottom: '1rem',
                    fontSize: '0.9rem',
                    color: '#856404'
                  }}>
                    Las Notas de Crédito no generan MR y viajan directamente a Proveedores.
                  </div>
                )}

                <div className="form-group">
                  <label>Imágenes o PDFs (obligatorio)</label>
                  <div className="file-upload">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      multiple
                      onChange={handleImageChange}
                      id="file-input-compras"
                    />
                    <label htmlFor="file-input-compras">
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
                  {creatingFactura ? `Creando ${tipoLabel}...` : `Guardar ${tipoLabel}`}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {vistaActual === 'pedidos' && (
        <PedidosDashboard user={user} readOnly={true} vistaCompleta={true} />
      )}

      {vistaActual === 'proveedores' && (
        <ProveedorMesDashboard user={user} facturas={facturas} loading={loading} />
      )}
    </div>
  );
}

export default ComprasViewerDashboard;
