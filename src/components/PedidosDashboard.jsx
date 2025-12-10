import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import HistorialAuditoria from './HistorialAuditoria';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const PedidosDashboard = forwardRef(({ user, readOnly = false, vistaCompleta = false }, ref) => {
  useImperativeHandle(ref, () => ({
    openCreateUser: () => !readOnly && setShowCreateUser(true),
    openCreateProveedor: () => !readOnly && setShowCreateProveedor(true)
  }));
  const [facturas, setFacturas] = useState([]);
  const [facturasFiltradas, setFacturasFiltradas] = useState([]);
  const [locales, setLocales] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showMRModal, setShowMRModal] = useState(null);
  const [mrNumero, setMrNumero] = useState('');
  const [selectedImages, setSelectedImages] = useState(null);
  const [expandedImage, setExpandedImage] = useState(null);
  const [showHistorial, setShowHistorial] = useState(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateProveedor, setShowCreateProveedor] = useState(false);
  const [newUser, setNewUser] = useState({ nombre: '', password: '', email: '' });
  const [newProveedor, setNewProveedor] = useState({ proveedor: '' });
  const [filtros, setFiltros] = useState({
    id: '',
    fecha: '',
    local: '',
    nro_factura: '',
    nro_oc: '',
    proveedor: '',
    mr_numero: ''
  });
  const [filtroMR, setFiltroMR] = useState('todos'); // 'todos', 'con_mr', 'sin_mr'
  const [localesSeleccionados, setLocalesSeleccionados] = useState(() => {
    // Cargar filtro de locales desde localStorage
    const saved = localStorage.getItem(`filtroLocales_${user.id}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [showLocalesFilter, setShowLocalesFilter] = useState(false);

  // Filtro de rango de fechas (por defecto últimos 30 días)
  const [rangoFechas, setRangoFechas] = useState(() => {
    const saved = localStorage.getItem(`rangoFechas_${user.id}`);
    if (saved) {
      return JSON.parse(saved);
    }
    // Por defecto: últimos 30 días
    const hoy = new Date();
    const hace30Dias = new Date();
    hace30Dias.setDate(hoy.getDate() - 30);
    return {
      desde: hace30Dias.toISOString().split('T')[0],
      hasta: hoy.toISOString().split('T')[0],
      preset: '30' // '30', '60', 'custom'
    };
  });
  const [showRangoFechasModal, setShowRangoFechasModal] = useState(false);

  useEffect(() => {
    loadFacturas();
    loadAllLocales();
    loadProveedores();
  }, []);

  // Guardar filtro de locales en localStorage cuando cambie
  useEffect(() => {
    localStorage.setItem(`filtroLocales_${user.id}`, JSON.stringify(localesSeleccionados));
  }, [localesSeleccionados, user.id]);

  // Guardar rango de fechas en localStorage cuando cambie
  useEffect(() => {
    localStorage.setItem(`rangoFechas_${user.id}`, JSON.stringify(rangoFechas));
  }, [rangoFechas, user.id]);

  useEffect(() => {
    // Aplicar filtros
    let filtered = facturas;

    // Filtro de rango de fechas
    if (rangoFechas.desde && rangoFechas.hasta) {
      filtered = filtered.filter(f => {
        const fechaFactura = new Date(f.fecha);
        const desde = new Date(rangoFechas.desde);
        const hasta = new Date(rangoFechas.hasta);
        // Ajustar horas para comparar solo fechas
        fechaFactura.setHours(0, 0, 0, 0);
        desde.setHours(0, 0, 0, 0);
        hasta.setHours(23, 59, 59, 999);
        return fechaFactura >= desde && fechaFactura <= hasta;
      });
    }

    // Filtro de locales seleccionados (para usuarios pedidos, pedidos_admin y proveedores_viewer)
    if ((user.rol === 'pedidos' || user.rol === 'pedidos_admin' || user.rol === 'proveedores_viewer') && localesSeleccionados.length > 0) {
      filtered = filtered.filter(f => localesSeleccionados.includes(f.local));
    }

    // Filtro de MR
    if (filtroMR === 'con_mr') {
      filtered = filtered.filter(f => f.mr_estado === true);
    } else if (filtroMR === 'sin_mr') {
      filtered = filtered.filter(f => !f.mr_estado || f.mr_estado === false);
    }

    // Filtros de columnas
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
  }, [filtros, filtroMR, facturas, localesSeleccionados, rangoFechas, user.rol]);

  const loadFacturas = async () => {
    try {
      // Si vistaCompleta es true, pasar parámetro adicional al backend
      const url = vistaCompleta
        ? `${API_URL}/facturas?rol=${user.rol}&userId=${user.id}&vistaCompleta=true`
        : `${API_URL}/facturas?rol=${user.rol}&userId=${user.id}`;
      const response = await fetch(url);
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

  const loadAllLocales = async () => {
    try {
      const response = await fetch(`${API_URL}/locales?userId=1`);
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

  const handleCreateUser = async (e) => {
    e.preventDefault();

    if (!newUser.nombre.trim() || !newUser.password.trim() || !newUser.email.trim()) {
      alert('Por favor complete todos los campos');
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUser.email)) {
      alert('Por favor ingrese un email válido');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/usuarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: newUser.nombre,
          email: newUser.email,
          password: newUser.password,
          rol: 'pedidos'
        })
      });

      if (response.ok) {
        alert('Usuario creado correctamente');
        setShowCreateUser(false);
        setNewUser({ nombre: '', password: '', email: '' });
      } else {
        const error = await response.json();
        alert('Error al crear usuario: ' + error.error);
      }
    } catch (error) {
      alert('Error al crear usuario: ' + error.message);
    }
  };

  const handleCreateProveedor = async (e) => {
    e.preventDefault();

    if (!newProveedor.proveedor.trim()) {
      alert('Por favor ingrese el nombre del proveedor');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/proveedores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proveedor: newProveedor.proveedor
        })
      });

      if (response.ok) {
        alert('Proveedor creado correctamente');
        setShowCreateProveedor(false);
        setNewProveedor({ proveedor: '' });
        loadProveedores(); // Recargar lista de proveedores
      } else {
        const error = await response.json();
        alert('Error al crear proveedor: ' + error.error);
      }
    } catch (error) {
      alert('Error al crear proveedor: ' + error.message);
    }
  };

  const toggleLocalSelection = (localNombre) => {
    setLocalesSeleccionados(prev => {
      if (prev.includes(localNombre)) {
        return prev.filter(l => l !== localNombre);
      } else {
        return [...prev, localNombre];
      }
    });
  };

  const limpiarFiltroLocales = () => {
    setLocalesSeleccionados([]);
  };

  // Funciones para manejar rango de fechas
  const aplicarRangoPreset = (dias) => {
    const hoy = new Date();
    const desde = new Date();
    desde.setDate(hoy.getDate() - dias);
    setRangoFechas({
      desde: desde.toISOString().split('T')[0],
      hasta: hoy.toISOString().split('T')[0],
      preset: dias.toString()
    });
  };

  const aplicarRangoPersonalizado = (desde, hasta) => {
    setRangoFechas({
      desde,
      hasta,
      preset: 'custom'
    });
  };

  // Obtener lista única de locales de las facturas
  const localesUnicos = [...new Set(facturas.map(f => f.local).filter(l => l))].sort();

  // Función para formatear fecha y hora en zona horaria de Argentina
  const formatearFechaHoraArgentina = (fechaISO, soloFecha = false) => {
    if (!fechaISO) return '-';

    // Asegurarnos de que el string tenga formato ISO válido
    let fechaStr = fechaISO;
    let esSoloFecha = false;

    // Si la fecha no tiene 'Z' al final ni offset de zona horaria, agregarla
    if (!fechaStr.endsWith('Z') && !fechaStr.includes('+') && !fechaStr.includes('T')) {
      // Es solo una fecha YYYY-MM-DD (formato antiguo), marcarla
      esSoloFecha = true;
      fechaStr = fechaStr + 'T00:00:00Z';
    } else if (fechaStr.includes('T') && !fechaStr.endsWith('Z') && !fechaStr.includes('+')) {
      // Tiene hora pero no zona horaria, asumir UTC
      fechaStr = fechaStr + 'Z';
    }

    // Crear fecha desde ISO string (el navegador automáticamente lo interpreta como UTC)
    const fecha = new Date(fechaStr);

    // Verificar si la fecha es válida
    if (isNaN(fecha.getTime())) {
      return '-';
    }

    // Si es solo fecha O se solicita solo fecha, mostrar sin hora
    if (esSoloFecha || soloFecha) {
      const partes = new Intl.DateTimeFormat('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      }).formatToParts(fecha);

      const valores = {};
      partes.forEach(({ type, value }) => {
        valores[type] = value;
      });

      return `${valores.day}/${valores.month}/${valores.year}`;
    }

    // Formatear usando Intl.DateTimeFormat para convertir a zona horaria Argentina
    const partes = new Intl.DateTimeFormat('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(fecha);

    const valores = {};
    partes.forEach(({ type, value }) => {
      valores[type] = value;
    });

    return `${valores.day}/${valores.month}/${valores.year}, ${valores.hour}:${valores.minute}`;
  };

  if (loading) {
    return <div className="container"><div className="loading">Cargando...</div></div>;
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ margin: 0 }}>Gestión de Facturas</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Filtro de Locales - Para usuarios pedidos, pedidos_admin y proveedores_viewer */}
          {(user.rol === 'pedidos' || user.rol === 'pedidos_admin' || user.rol === 'proveedores_viewer') && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowLocalesFilter(!showLocalesFilter)}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #3498db',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  backgroundColor: localesSeleccionados.length > 0 ? '#3498db' : 'white',
                  color: localesSeleccionados.length > 0 ? 'white' : '#3498db',
                  fontWeight: '600',
                  fontSize: '0.875rem'
                }}
              >
                🏪 Locales {localesSeleccionados.length > 0 && `(${localesSeleccionados.length})`}
              </button>

              {showLocalesFilter && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '0.5rem',
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  padding: '1rem',
                  minWidth: '250px',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  zIndex: 1000
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid #ecf0f1', paddingBottom: '0.5rem' }}>
                    <strong style={{ fontSize: '0.9rem', color: '#2c3e50' }}>Filtrar por Locales</strong>
                    <button
                      onClick={() => setShowLocalesFilter(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '1.2rem',
                        cursor: 'pointer',
                        color: '#95a5a6'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  {localesSeleccionados.length > 0 && (
                    <button
                      onClick={limpiarFiltroLocales}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        marginBottom: '0.75rem',
                        border: '1px solid #e74c3c',
                        borderRadius: '4px',
                        backgroundColor: '#fee',
                        color: '#e74c3c',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                    >
                      Limpiar Filtro
                    </button>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {localesUnicos.map(local => (
                      <label
                        key={local}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.5rem',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          backgroundColor: localesSeleccionados.includes(local) ? '#e3f2fd' : 'transparent',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseOver={(e) => {
                          if (!localesSeleccionados.includes(local)) {
                            e.currentTarget.style.backgroundColor = '#f5f5f5';
                          }
                        }}
                        onMouseOut={(e) => {
                          if (!localesSeleccionados.includes(local)) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={localesSeleccionados.includes(local)}
                          onChange={() => toggleLocalSelection(local)}
                          style={{ cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '0.875rem', color: '#2c3e50' }}>{local}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Filtro de Rango de Fechas */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowRangoFechasModal(!showRangoFechasModal)}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #9b59b6',
                borderRadius: '4px',
                cursor: 'pointer',
                backgroundColor: rangoFechas.preset !== '30' ? '#9b59b6' : 'white',
                color: rangoFechas.preset !== '30' ? 'white' : '#9b59b6',
                fontWeight: '600',
                fontSize: '0.875rem'
              }}
            >
              📅 {rangoFechas.preset === '30' ? 'Últimos 30 días' : rangoFechas.preset === '60' ? 'Últimos 60 días' : 'Rango personalizado'}
            </button>

            {showRangoFechasModal && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '0.5rem',
                backgroundColor: 'white',
                border: '1px solid #ddd',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                padding: '1rem',
                minWidth: '320px',
                zIndex: 1000
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #ecf0f1', paddingBottom: '0.5rem' }}>
                  <strong style={{ fontSize: '0.9rem', color: '#2c3e50' }}>Rango de Fechas</strong>
                  <button
                    onClick={() => setShowRangoFechasModal(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '1.2rem',
                      cursor: 'pointer',
                      color: '#95a5a6'
                    }}
                  >
                    ✕
                  </button>
                </div>

                {/* Opciones predefinidas */}
                <div style={{ marginBottom: '1rem' }}>
                  <p style={{ fontSize: '0.85rem', fontWeight: '600', color: '#7f8c8d', marginBottom: '0.5rem' }}>Rangos predefinidos:</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <button
                      onClick={() => {
                        aplicarRangoPreset(30);
                        setShowRangoFechasModal(false);
                      }}
                      style={{
                        padding: '0.6rem',
                        border: rangoFechas.preset === '30' ? '2px solid #9b59b6' : '1px solid #ddd',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        backgroundColor: rangoFechas.preset === '30' ? '#f4ecf7' : 'white',
                        textAlign: 'left',
                        fontSize: '0.875rem',
                        fontWeight: rangoFechas.preset === '30' ? '600' : '400'
                      }}
                    >
                      Últimos 30 días
                    </button>
                    <button
                      onClick={() => {
                        aplicarRangoPreset(60);
                        setShowRangoFechasModal(false);
                      }}
                      style={{
                        padding: '0.6rem',
                        border: rangoFechas.preset === '60' ? '2px solid #9b59b6' : '1px solid #ddd',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        backgroundColor: rangoFechas.preset === '60' ? '#f4ecf7' : 'white',
                        textAlign: 'left',
                        fontSize: '0.875rem',
                        fontWeight: rangoFechas.preset === '60' ? '600' : '400'
                      }}
                    >
                      Últimos 60 días
                    </button>
                  </div>
                </div>

                {/* Rango personalizado */}
                <div>
                  <p style={{ fontSize: '0.85rem', fontWeight: '600', color: '#7f8c8d', marginBottom: '0.5rem' }}>Rango personalizado:</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: '#7f8c8d', display: 'block', marginBottom: '0.25rem' }}>Desde:</label>
                      <input
                        type="date"
                        value={rangoFechas.desde}
                        onChange={(e) => aplicarRangoPersonalizado(e.target.value, rangoFechas.hasta)}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '0.875rem'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: '#7f8c8d', display: 'block', marginBottom: '0.25rem' }}>Hasta:</label>
                      <input
                        type="date"
                        value={rangoFechas.hasta}
                        onChange={(e) => aplicarRangoPersonalizado(rangoFechas.desde, e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '0.875rem'
                        }}
                      />
                    </div>
                    <button
                      onClick={() => setShowRangoFechasModal(false)}
                      style={{
                        padding: '0.6rem',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        backgroundColor: '#9b59b6',
                        color: 'white',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        marginTop: '0.5rem'
                      }}
                    >
                      Aplicar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: '#ecf0f1', padding: '0.25rem', borderRadius: '6px' }}>
            <button
              onClick={() => setFiltroMR('todos')}
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                backgroundColor: filtroMR === 'todos' ? '#2c3e50' : 'transparent',
                color: filtroMR === 'todos' ? 'white' : '#2c3e50',
                fontWeight: filtroMR === 'todos' ? '600' : '400',
                fontSize: '0.875rem',
                transition: 'all 0.2s'
              }}
            >
              Todas ({facturasFiltradas.length})
            </button>
            <button
              onClick={() => setFiltroMR('con_mr')}
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                backgroundColor: filtroMR === 'con_mr' ? '#27ae60' : 'transparent',
                color: filtroMR === 'con_mr' ? 'white' : '#27ae60',
                fontWeight: filtroMR === 'con_mr' ? '600' : '400',
                fontSize: '0.875rem',
                transition: 'all 0.2s'
              }}
            >
              Con MR ({facturasFiltradas.filter(f => f.mr_estado).length})
            </button>
            <button
              onClick={() => setFiltroMR('sin_mr')}
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                backgroundColor: filtroMR === 'sin_mr' ? '#e74c3c' : 'transparent',
                color: filtroMR === 'sin_mr' ? 'white' : '#e74c3c',
                fontWeight: filtroMR === 'sin_mr' ? '600' : '400',
                fontSize: '0.875rem',
                transition: 'all 0.2s'
              }}
            >
              Sin MR ({facturasFiltradas.filter(f => !f.mr_estado).length})
            </button>
          </div>
        </div>
      </div>

      {facturas.length === 0 ? (
        <div className="empty-state">
          <p>No hay facturas disponibles</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <thead>
              <tr style={{ backgroundColor: '#2c3e50', color: 'white' }}>
                <th style={{ padding: '0.5rem 0.6rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: '600', width: '50px' }}>ID</th>
                <th style={{ padding: '0.5rem 0.6rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: '600', width: '80px' }}>Fecha</th>
                <th style={{ padding: '0.5rem 0.6rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: '600', width: '100px' }}>Local</th>
                <th style={{ padding: '0.5rem 0.6rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: '600', width: '80px' }}>FC</th>
                <th style={{ padding: '0.5rem 0.6rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: '600', width: '80px' }}>OC</th>
                <th style={{ padding: '0.5rem 0.6rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: '600', width: '120px' }}>Proveedor</th>
                <th style={{ padding: '0.5rem 0.6rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: '600', width: '70px' }}>Usuario</th>
                <th style={{ padding: '0.5rem 0.6rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: '600', width: '110px' }}>Fecha Carga</th>
                <th style={{ padding: '0.5rem 0.6rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: '600', width: '50px' }}>IMG</th>
                <th style={{ padding: '0.5rem 0.6rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: '600', width: '70px' }}>MR</th>
                <th style={{ padding: '0.5rem 0.6rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: '600', width: '110px' }}>Fecha MR</th>
                <th style={{ padding: '0.5rem 0.6rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: '600', width: '140px' }}>Acciones</th>
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
                <th style={{ padding: '0.5rem' }}></th>
              </tr>
            </thead>
            <tbody>
              {facturasFiltradas.map((factura, index) => (
                <tr key={factura.id} style={{ borderBottom: '1px solid #e1e8ed', backgroundColor: index % 2 === 0 ? 'white' : '#fafbfc', fontSize: '0.8rem' }}>
                  <td style={{ padding: '0.5rem 0.6rem', fontWeight: '500', color: '#666' }}>#{factura.id}</td>

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
                        <select
                          value={editForm.proveedor}
                          onChange={(e) => setEditForm({ ...editForm, proveedor: e.target.value })}
                          style={{ width: '100%', padding: '0.5rem' }}
                        >
                          {proveedores.map((prov) => (
                            <option key={prov.id} value={prov.proveedor}>
                              {prov.proveedor}
                            </option>
                          ))}
                        </select>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ padding: '0.5rem 0.6rem', color: '#444' }}>
                        {(() => {
                          const [year, month, day] = factura.fecha.split('-');
                          return `${day}/${month}/${year.slice(2)}`;
                        })()}
                      </td>
                      <td style={{ padding: '0.5rem 0.6rem', color: '#444' }}>{factura.local}</td>
                      <td style={{ padding: '0.5rem 0.6rem', fontWeight: '500', color: '#2c3e50' }}>{factura.nro_factura}</td>
                      <td style={{ padding: '0.5rem 0.6rem', color: '#444' }}>{factura.nro_oc}</td>
                      <td style={{ padding: '0.5rem 0.6rem', color: '#444', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{factura.proveedor}</td>
                    </>
                  )}

                  <td style={{ padding: '0.5rem 0.6rem', color: '#666', fontSize: '0.75rem' }}>{factura.usuarios?.nombre || '-'}</td>

                  <td style={{ padding: '0.5rem 0.6rem', color: '#666', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                    {formatearFechaHoraArgentina(factura.created_at)}
                  </td>

                  <td style={{ padding: '0.5rem 0.6rem', textAlign: 'center' }}>
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

                  <td style={{ padding: '0.5rem 0.6rem', textAlign: 'center' }}>
                    {factura.mr_estado ? (
                      <span style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '10px',
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        backgroundColor: '#d4edda',
                        color: '#155724'
                      }}>{factura.mr_numero}</span>
                    ) : (
                      <span style={{ color: '#bdc3c7', fontSize: '0.8rem' }}>—</span>
                    )}
                  </td>

                  <td style={{ padding: '0.5rem 0.6rem', color: '#666', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                    {factura.fecha_mr ? formatearFechaHoraArgentina(factura.fecha_mr) : '-'}
                  </td>

                  <td style={{ padding: '0.5rem 0.6rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                      {editingId === factura.id && !readOnly ? (
                        <>
                          <button
                            onClick={() => handleUpdate(factura.id)}
                            style={{
                              padding: '0.35rem 0.6rem',
                              fontSize: '0.75rem',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              backgroundColor: '#27ae60',
                              color: 'white',
                              fontWeight: '500'
                            }}
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            style={{
                              padding: '0.35rem 0.6rem',
                              fontSize: '0.75rem',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              backgroundColor: '#95a5a6',
                              color: 'white',
                              fontWeight: '500'
                            }}
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <>
                          {!readOnly && !factura.mr_estado && (
                            <button
                              onClick={() => setShowMRModal(factura.id)}
                              style={{
                                padding: '0.35rem 0.7rem',
                                fontSize: '0.75rem',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                backgroundColor: '#27ae60',
                                color: 'white',
                                fontWeight: '500'
                              }}
                              title="Generar MR"
                            >
                              MR
                            </button>
                          )}
                          {!readOnly && user.rol === 'pedidos_admin' && (
                            <>
                              <button
                                onClick={() => handleEdit(factura)}
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
                                title="Editar"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDelete(factura.id)}
                                style={{
                                  padding: '0.35rem 0.6rem',
                                  fontSize: '0.75rem',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  backgroundColor: '#e74c3c',
                                  color: 'white',
                                  fontWeight: '500'
                                }}
                                title="Eliminar"
                              >
                                🗑️
                              </button>
                            </>
                          )}
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

      {/* Modal de crear usuario */}
      {showCreateUser && (
        <div className="modal" onClick={() => setShowCreateUser(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <button className="modal-close" onClick={() => setShowCreateUser(false)}>
              ✕
            </button>
            <h3 style={{ marginBottom: '1.5rem', color: '#2c3e50' }}>Crear Usuario de Pedidos</h3>
            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <label style={{ color: '#2c3e50', fontWeight: '600' }}>Nombre de Usuario</label>
                <input
                  type="text"
                  value={newUser.nombre}
                  onChange={(e) => setNewUser({ ...newUser, nombre: e.target.value })}
                  placeholder="Ej: juan_perez"
                  required
                  autoFocus
                  style={{
                    borderRadius: '8px',
                    border: '2px solid #e1e8ed',
                    padding: '0.875rem'
                  }}
                />
                <small style={{ display: 'block', marginTop: '0.5rem', color: '#6c757d', fontSize: '0.85rem' }}>
                  El usuario podrá ver todas las facturas sin restricciones de local
                </small>
              </div>
              <div className="form-group">
                <label style={{ color: '#2c3e50', fontWeight: '600' }}>Email</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="usuario@empresa.com"
                  required
                  style={{
                    borderRadius: '8px',
                    border: '2px solid #e1e8ed',
                    padding: '0.875rem'
                  }}
                />
              </div>
              <div className="form-group">
                <label style={{ color: '#2c3e50', fontWeight: '600' }}>Contraseña</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Ingrese contraseña segura"
                  required
                  style={{
                    borderRadius: '8px',
                    border: '2px solid #e1e8ed',
                    padding: '0.875rem'
                  }}
                />
                <small style={{ display: 'block', marginTop: '0.5rem', color: '#6c757d', fontSize: '0.85rem' }}>
                  Mínimo 6 caracteres recomendado
                </small>
              </div>
              <div style={{
                backgroundColor: '#e8f4fd',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                border: '1px solid #b8daf5'
              }}>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#2c3e50' }}>
                  <strong>Rol:</strong> Pedidos (sin permisos de administrador)
                </p>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#6c757d' }}>
                  El usuario podrá generar MR pero no editar ni eliminar facturas
                </p>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateUser(false);
                    setNewUser({ nombre: '', password: '', email: '' });
                  }}
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '0.875rem', borderRadius: '8px' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-success"
                  style={{ flex: 1, padding: '0.875rem', borderRadius: '8px' }}
                >
                  Crear Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Crear Proveedor */}
      {showCreateProveedor && (
        <div className="modal" onClick={() => setShowCreateProveedor(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <button className="modal-close" onClick={() => setShowCreateProveedor(false)}>✕</button>
            <h3 style={{ marginBottom: '1.5rem', color: '#2c3e50' }}>Crear Proveedor</h3>
            <form onSubmit={handleCreateProveedor}>
              <div className="form-group">
                <label style={{ color: '#2c3e50', fontWeight: '600' }}>Nombre del Proveedor</label>
                <input
                  type="text"
                  value={newProveedor.proveedor}
                  onChange={(e) => setNewProveedor({ ...newProveedor, proveedor: e.target.value })}
                  placeholder="Ej: Proveedor SA"
                  required
                  style={{
                    borderRadius: '8px',
                    border: '2px solid #e1e8ed',
                    padding: '0.875rem'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateProveedor(false)}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-success">
                  Crear Proveedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
});

export default PedidosDashboard;
