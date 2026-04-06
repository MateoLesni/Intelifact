import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import HistorialAuditoria from './HistorialAuditoria';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// Proveedores que NO permiten generar MR para facturas de categoría "Trenes"
const PROVEEDORES_SIN_MR_TRENES = [
  'sgogo',
  'panaderia gourmet (sgo del estero)',
  'sgopan',
  'celasan',
  'centralpan',
  'deposito centralpan',
  'deposito central',
  'deposito bimbo',
  'deposito kioscos',
  'deposito ng',
  'planta santiago gourmet'
];

// Locales que SIEMPRE permiten MR, incluso siendo Trenes con proveedores bloqueados
const LOCALES_EXCEPCION_MR = ['Alma Cerrito', 'Tostado Trenes'];

// Función para verificar si una factura tiene MR bloqueado
const esMRBloqueado = (factura) => {
  // Las Notas de Crédito NUNCA tienen MR
  if (factura.tipo === 'nota_credito') return true;

  // EXCEPCIÓN: Locales especiales siempre permiten MR
  if (LOCALES_EXCEPCION_MR.includes(factura.local)) {
    return false;
  }

  // La categoría puede venir directamente de la factura o del JOIN con locales
  const categoria = factura.locales?.categoria || factura.categoria;
  return categoria === 'Trenes' && PROVEEDORES_SIN_MR_TRENES.includes(factura.proveedor?.toLowerCase());
};

const PedidosDashboard = forwardRef(({ user, readOnly = false, vistaCompleta = false }, ref) => {
  useImperativeHandle(ref, () => ({
    openCreateUser: () => !readOnly && setShowCreateUser(true),
    openCreateProveedor: () => !readOnly && setShowCreateProveedor(true)
  }));
  const [facturas, setFacturas] = useState([]);
  const [facturasFiltradas, setFacturasFiltradas] = useState([]);

  const [contadoresMR, setContadoresMR] = useState({ todas: 0, conMR: 0, sinMR: 0 });
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
  const [imagenesConError, setImagenesConError] = useState(new Set());
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateProveedor, setShowCreateProveedor] = useState(false);
  const [newUser, setNewUser] = useState({ nombre: '', password: '', email: '', rol: 'pedidos' });
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
  const [filtroFechaMR, setFiltroFechaMR] = useState(''); // Filtro por fecha de MR (YYYY-MM-DD)
  const [filtroFechaCarga, setFiltroFechaCarga] = useState(''); // Filtro por fecha de carga (YYYY-MM-DD)
  const [generatingMR, setGeneratingMR] = useState(false); // Estado para prevenir doble-click
  const [localesSeleccionados, setLocalesSeleccionados] = useState(() => {
    // Cargar filtro de locales desde localStorage
    const saved = localStorage.getItem(`filtroLocales_${user.id}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [showLocalesFilter, setShowLocalesFilter] = useState(false);
  const [busquedaLocal, setBusquedaLocal] = useState('');

  // Filtro de proveedores (persistente)
  const [proveedoresSeleccionados, setProveedoresSeleccionados] = useState(() => {
    const saved = localStorage.getItem(`filtroProveedores_${user.id}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [showProveedoresFilter, setShowProveedoresFilter] = useState(false);
  const [busquedaProveedor, setBusquedaProveedor] = useState('');

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

  // Paginación server-side
  const [paginaActual, setPaginaActual] = useState(1);
  const registrosPorPagina = 500;
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);

  // Calcular "hasta" real considerando presets
  const getHastaReal = () => {
    if (rangoFechas.preset === '30' || rangoFechas.preset === '60') {
      return new Date().toISOString().split('T')[0];
    }
    return rangoFechas.hasta;
  };

  // Cargar facturas desde el backend con filtros server-side
  const loadFacturas = async (pageOverride) => {
    try {
      const page = pageOverride || paginaActual;
      const params = new URLSearchParams({
        rol: user.rol,
        userId: user.id,
        page: page.toString(),
        limit: registrosPorPagina.toString()
      });

      if (vistaCompleta) params.set('vistaCompleta', 'true');

      // Rango de fechas
      if (rangoFechas.desde) params.set('desde', rangoFechas.desde);
      if (rangoFechas.hasta) params.set('hasta', getHastaReal());

      // Filtro MR
      if (filtroMR !== 'todos') params.set('filtroMR', filtroMR);

      // Filtros persistentes (multiselección)
      if (localesSeleccionados.length > 0) params.set('localesSeleccionados', JSON.stringify(localesSeleccionados));
      if (proveedoresSeleccionados.length > 0) params.set('proveedoresSeleccionados', JSON.stringify(proveedoresSeleccionados));

      // Filtros de columnas
      if (filtros.id.trim()) params.set('filtroId', filtros.id.trim());
      if (filtros.fecha.trim()) params.set('filtroFecha', filtros.fecha.trim());
      if (filtros.local.trim()) params.set('filtroLocal', filtros.local.trim());
      if (filtros.nro_factura.trim()) params.set('filtroNroFactura', filtros.nro_factura.trim());
      if (filtros.nro_oc.trim()) params.set('filtroNroOc', filtros.nro_oc.trim());
      if (filtros.proveedor.trim()) params.set('filtroProveedor', filtros.proveedor.trim());
      if (filtros.mr_numero.trim()) params.set('filtroMrNumero', filtros.mr_numero.trim());

      // Filtros de fecha exacta
      if (filtroFechaMR.trim()) params.set('filtroFechaMR', filtroFechaMR.trim());
      if (filtroFechaCarga.trim()) params.set('filtroFechaCarga', filtroFechaCarga.trim());

      const response = await fetch(`${API_URL}/facturas?${params.toString()}`);
      const result = await response.json();

      setFacturas(result.data || []);
      setFacturasFiltradas(result.data || []);
      setTotalRegistros(result.total || 0);
      setTotalPaginas(result.totalPages || 1);
    } catch (error) {
      console.error('Error al cargar facturas:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cargar contadores de MR desde el backend (fuente de verdad)
  const loadContadores = async () => {
    if (!rangoFechas.desde || !rangoFechas.hasta) return;

    try {
      const response = await fetch(`${API_URL}/facturas/contadores?desde=${rangoFechas.desde}&hasta=${getHastaReal()}`);
      const data = await response.json();
      setContadoresMR(data);
    } catch (error) {
      console.error('Error al cargar contadores:', error);
    }
  };

  // Carga inicial
  useEffect(() => {
    loadFacturas(1);
    loadContadores();
    loadAllLocales();
    loadProveedores();

    // Auto-refresh cada 5 minutos
    const intervalId = setInterval(() => {
      loadFacturas();
      loadContadores();
    }, 300000);

    return () => clearInterval(intervalId);
  }, []);

  // Guardar filtros persistentes en localStorage
  useEffect(() => {
    localStorage.setItem(`filtroLocales_${user.id}`, JSON.stringify(localesSeleccionados));
  }, [localesSeleccionados, user.id]);

  useEffect(() => {
    localStorage.setItem(`filtroProveedores_${user.id}`, JSON.stringify(proveedoresSeleccionados));
  }, [proveedoresSeleccionados, user.id]);

  useEffect(() => {
    localStorage.setItem(`rangoFechas_${user.id}`, JSON.stringify(rangoFechas));
  }, [rangoFechas, user.id]);

  // Recargar contadores cuando cambie el rango de fechas
  useEffect(() => {
    loadContadores();
  }, [rangoFechas]);

  // Debounce timer para filtros de columnas (evita llamar al backend por cada tecla)
  const [debounceTimer, setDebounceTimer] = useState(null);

  // Recargar datos cuando cambian los filtros (con debounce para texto)
  useEffect(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => {
      setPaginaActual(1);
      loadFacturas(1);
    }, 400); // 400ms de espera después de la última tecla
    setDebounceTimer(timer);
    return () => clearTimeout(timer);
  }, [filtros, filtroFechaMR, filtroFechaCarga]);

  // Recargar datos inmediatamente cuando cambian filtros no-texto
  useEffect(() => {
    setPaginaActual(1);
    loadFacturas(1);
  }, [filtroMR, localesSeleccionados, proveedoresSeleccionados, rangoFechas]);

  // Recargar datos cuando cambia la página
  useEffect(() => {
    loadFacturas();
  }, [paginaActual]);

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
        loadContadores();
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
      const response = await fetch(`${API_URL}/facturas/${id}?usuario_id=${user.id}&rol=${user.rol}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        alert('Factura eliminada correctamente');
        loadFacturas();
        loadContadores();
      } else {
        const error = await response.json();
        alert('Error: ' + error.error);
      }
    } catch (error) {
      alert('Error al eliminar factura: ' + error.message);
    }
  };

  const handleGenerateMR = async () => {
    // Prevenir ejecución si ya está procesando
    if (generatingMR) {
      return;
    }

    if (!mrNumero.trim()) {
      alert('Debe ingresar un número de MR');
      return;
    }

    setGeneratingMR(true);

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
        loadContadores();
      } else {
        const error = await response.json();
        alert('Error: ' + error.error);
      }
    } catch (error) {
      alert('Error al generar MR: ' + error.message);
    } finally {
      setGeneratingMR(false);
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

  // Manejar error de carga de imagen
  const handleImageError = (url) => {
    console.error('Error al cargar imagen:', url);
    setImagenesConError(prev => new Set([...prev, url]));
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
          rol: newUser.rol
        })
      });

      if (response.ok) {
        alert('Usuario creado correctamente');
        setShowCreateUser(false);
        setNewUser({ nombre: '', password: '', email: '', rol: 'pedidos' });
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
    setBusquedaLocal('');
  };

  // Funciones para manejar filtro de proveedores
  const toggleProveedorSelection = (proveedorNombre) => {
    setProveedoresSeleccionados(prev => {
      if (prev.includes(proveedorNombre)) {
        return prev.filter(p => p !== proveedorNombre);
      } else {
        return [...prev, proveedorNombre];
      }
    });
  };

  const limpiarFiltroProveedores = () => {
    setProveedoresSeleccionados([]);
    setBusquedaProveedor('');
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

  // Obtener lista de locales y proveedores desde los datos cargados del backend (no de la página actual)
  const localesUnicos = locales.map(l => l.local).sort();
  const proveedoresUnicos = proveedores.map(p => p.proveedor).sort();

  // Filtrar locales por búsqueda
  const localesFiltrados = busquedaLocal.trim()
    ? localesUnicos.filter(l => l.toLowerCase().includes(busquedaLocal.toLowerCase()))
    : localesUnicos;

  // Filtrar proveedores por búsqueda
  const proveedoresFiltrados = busquedaProveedor.trim()
    ? proveedoresUnicos.filter(p => p.toLowerCase().includes(busquedaProveedor.toLowerCase()))
    : proveedoresUnicos;

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
          {/* Filtro de Locales - Para usuarios pedidos, pedidos_admin, compras y proveedores_viewer */}
          {(user.rol === 'pedidos' || user.rol === 'pedidos_admin' || user.rol === 'compras' || user.rol === 'proveedores_viewer') && (
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
                  {/* Campo de búsqueda */}
                  <input
                    type="text"
                    placeholder="Buscar local..."
                    value={busquedaLocal}
                    onChange={(e) => setBusquedaLocal(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      marginBottom: '0.75rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '0.85rem',
                      boxSizing: 'border-box'
                    }}
                  />
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
                      Limpiar Filtro ({localesSeleccionados.length})
                    </button>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto' }}>
                    {localesFiltrados.map(local => (
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

          {/* Filtro de Proveedores - Para usuarios pedidos, pedidos_admin, compras y proveedores_viewer */}
          {(user.rol === 'pedidos' || user.rol === 'pedidos_admin' || user.rol === 'compras' || user.rol === 'proveedores_viewer') && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowProveedoresFilter(!showProveedoresFilter)}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #e67e22',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  backgroundColor: proveedoresSeleccionados.length > 0 ? '#e67e22' : 'white',
                  color: proveedoresSeleccionados.length > 0 ? 'white' : '#e67e22',
                  fontWeight: '600',
                  fontSize: '0.875rem'
                }}
              >
                🏢 Proveedores {proveedoresSeleccionados.length > 0 && `(${proveedoresSeleccionados.length})`}
              </button>

              {showProveedoresFilter && (
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
                  minWidth: '280px',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  zIndex: 1000
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid #ecf0f1', paddingBottom: '0.5rem' }}>
                    <strong style={{ fontSize: '0.9rem', color: '#2c3e50' }}>Filtrar por Proveedores</strong>
                    <button
                      onClick={() => setShowProveedoresFilter(false)}
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
                  {/* Campo de búsqueda */}
                  <input
                    type="text"
                    placeholder="Buscar proveedor..."
                    value={busquedaProveedor}
                    onChange={(e) => setBusquedaProveedor(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      marginBottom: '0.75rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '0.85rem',
                      boxSizing: 'border-box'
                    }}
                  />
                  {proveedoresSeleccionados.length > 0 && (
                    <button
                      onClick={limpiarFiltroProveedores}
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
                      Limpiar Filtro ({proveedoresSeleccionados.length})
                    </button>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto' }}>
                    {proveedoresFiltrados.map(proveedor => (
                      <label
                        key={proveedor}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.5rem',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          backgroundColor: proveedoresSeleccionados.includes(proveedor) ? '#fdf2e9' : 'transparent',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseOver={(e) => {
                          if (!proveedoresSeleccionados.includes(proveedor)) {
                            e.currentTarget.style.backgroundColor = '#f5f5f5';
                          }
                        }}
                        onMouseOut={(e) => {
                          if (!proveedoresSeleccionados.includes(proveedor)) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={proveedoresSeleccionados.includes(proveedor)}
                          onChange={() => toggleProveedorSelection(proveedor)}
                          style={{ cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '0.875rem', color: '#2c3e50' }}>{proveedor}</span>
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
                  <strong style={{ fontSize: '0.9rem', color: '#2c3e50' }}>
                    {user.rol === 'proveedores_viewer' ? 'Rango de Fecha de MR' : 'Rango de Fecha de Factura'}
                  </strong>
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

          {filtroFechaMR && (
            <div style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '4px',
              fontSize: '0.875rem',
              color: '#856404',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              📅 Filtrado por Fecha MR: {(() => {
                const [year, month, day] = filtroFechaMR.split('-');
                return `${day}/${month}/${year}`;
              })()}
              <button
                onClick={() => setFiltroFechaMR('')}
                style={{
                  background: '#856404',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  padding: '2px 8px',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                ✕ Quitar
              </button>
            </div>
          )}

          {filtroFechaCarga && (
            <div style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#d1ecf1',
              border: '1px solid #17a2b8',
              borderRadius: '4px',
              fontSize: '0.875rem',
              color: '#0c5460',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              📅 Filtrado por Fecha de Carga: {(() => {
                const [year, month, day] = filtroFechaCarga.split('-');
                return `${day}/${month}/${year}`;
              })()}
              <button
                onClick={() => setFiltroFechaCarga('')}
                style={{
                  background: '#0c5460',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  padding: '2px 8px',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                ✕ Quitar
              </button>
            </div>
          )}

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
              Todas ({contadoresMR.todas})
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
              Con MR ({contadoresMR.conMR})
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
              Sin MR ({contadoresMR.sinMR})
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
                <th style={{ padding: '0.5rem' }}>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="date"
                      value={filtroFechaCarga}
                      onChange={(e) => setFiltroFechaCarga(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem' }}
                    />
                    {filtroFechaCarga && (
                      <button
                        onClick={() => setFiltroFechaCarga('')}
                        style={{
                          position: 'absolute',
                          right: '5px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: '#e74c3c',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          padding: '2px 6px',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          fontWeight: 'bold'
                        }}
                        title="Limpiar filtro"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </th>
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
                <th style={{ padding: '0.5rem' }}>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="date"
                      value={filtroFechaMR}
                      onChange={(e) => setFiltroFechaMR(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem' }}
                    />
                    {filtroFechaMR && (
                      <button
                        onClick={() => setFiltroFechaMR('')}
                        style={{
                          position: 'absolute',
                          right: '5px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: '#e74c3c',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          padding: '2px 6px',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          fontWeight: '600'
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </th>
                <th style={{ padding: '0.5rem' }}></th>
              </tr>
            </thead>
            <tbody>
              {facturasFiltradas
                .map((factura, index) => {
                const mrBloqueado = esMRBloqueado(factura);
                return (
                <tr
                  key={factura.id}
                  style={{
                    borderBottom: '1px solid #e1e8ed',
                    backgroundColor: factura.tipo === 'nota_credito'
                      ? '#fde8e8'
                      : mrBloqueado
                        ? '#f0f0f0'
                        : (index % 2 === 0 ? 'white' : '#fafbfc'),
                    fontSize: '0.8rem',
                    opacity: mrBloqueado && factura.tipo !== 'nota_credito' ? 0.75 : 1
                  }}
                  title={factura.tipo === 'nota_credito' ? 'Nota de Crédito' : (mrBloqueado ? 'MR no disponible para este proveedor en Trenes' : '')}
                >
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
                      <td style={{ padding: '0.5rem 0.6rem', fontWeight: '500', color: '#2c3e50' }}>
                        {factura.tipo === 'nota_credito' && (
                          <span style={{
                            backgroundColor: '#e74c3c',
                            color: 'white',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px',
                            fontSize: '0.6rem',
                            marginRight: '0.3rem',
                            fontWeight: '700'
                          }}>NC</span>
                        )}
                        {factura.nro_factura}
                      </td>
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
                    {factura.fecha_mr_timestamp ? formatearFechaHoraArgentina(factura.fecha_mr_timestamp) : (factura.fecha_mr ? formatearFechaHoraArgentina(factura.fecha_mr, true) : '-')}
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
                          {!readOnly && !factura.mr_estado && !mrBloqueado && (
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
                          {!readOnly && user.rol === 'pedidos_admin' && factura.tipo !== 'nota_credito' && (
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
                          {user.rol === 'compras' && factura.tipo === 'nota_credito' && (
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
                              title="Eliminar NC"
                            >
                              🗑️
                            </button>
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
              )})}
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
              {/* Botón anterior */}
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

              {/* Números de página */}
              {(() => {
                const botonesPaginas = [];

                // Mostrar máximo 7 botones de página
                let inicio = Math.max(1, paginaActual - 3);
                let fin = Math.min(totalPaginas, inicio + 6);

                // Ajustar inicio si estamos cerca del final
                if (fin - inicio < 6) {
                  inicio = Math.max(1, fin - 6);
                }

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
                        border: paginaActual === i ? '2px solid #9b59b6' : '1px solid #ddd',
                        borderRadius: '4px',
                        backgroundColor: paginaActual === i ? '#9b59b6' : '#fff',
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

              {/* Botón siguiente */}
              <button
                onClick={() => {
                  setPaginaActual(prev => Math.min(totalPaginas, prev + 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                disabled={paginaActual >= totalPaginas}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: paginaActual >= totalPaginas ? '#f5f5f5' : '#fff',
                  color: paginaActual >= totalPaginas ? '#999' : '#333',
                  cursor: paginaActual >= totalPaginas ? 'not-allowed' : 'pointer',
                  fontWeight: '500'
                }}
              >
                Siguiente →
              </button>

              {/* Información de página */}
              <span style={{
                marginLeft: '1rem',
                color: '#666',
                fontSize: '0.9rem'
              }}>
                Página {paginaActual} de {totalPaginas}
                ({totalRegistros} facturas)
              </span>
            </div>
          )}
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
            <button
              onClick={handleGenerateMR}
              disabled={generatingMR}
              className="btn btn-success"
              style={{
                width: '100%',
                opacity: generatingMR ? 0.6 : 1,
                cursor: generatingMR ? 'not-allowed' : 'pointer'
              }}
            >
              {generatingMR ? 'Generando MR...' : 'Confirmar'}
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
              {selectedImages.map((img, index) => {
                const tieneError = imagenesConError.has(img.imagen_url);

                // Detectar si es PDF basándose en la URL
                const esPDF = img.imagen_url && (
                  img.imagen_url.toLowerCase().endsWith('.pdf') ||
                  img.imagen_url.includes('.pdf?') ||
                  img.imagen_url.includes('application/pdf')
                );

                return (
                  <div key={index} style={{
                    border: tieneError ? '2px solid #e74c3c' : '1px solid #ddd',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    backgroundColor: tieneError ? '#fee' : '#f9f9f9'
                  }}>
                    <div style={{ position: 'relative', cursor: tieneError ? 'default' : 'pointer' }} onClick={() => !tieneError && !esPDF && setExpandedImage(img.imagen_url)}>
                      {tieneError ? (
                        // Mostrar estado de error
                        <div style={{
                          width: '100%',
                          height: '400px',
                          backgroundColor: '#f8d7da',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#721c24',
                          padding: '2rem'
                        }}>
                          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
                          <h4 style={{ marginBottom: '0.5rem' }}>Imagen no disponible</h4>
                          <p style={{ fontSize: '0.85rem', textAlign: 'center', marginBottom: '1rem' }}>
                            La imagen no se pudo cargar. Puede haber sido eliminada del servidor o la URL es inválida.
                          </p>
                          <details style={{ width: '100%', marginTop: '1rem' }}>
                            <summary style={{ cursor: 'pointer', fontSize: '0.8rem', color: '#666' }}>Ver URL</summary>
                            <code style={{
                              display: 'block',
                              marginTop: '0.5rem',
                              padding: '0.5rem',
                              backgroundColor: '#fff',
                              fontSize: '0.7rem',
                              wordBreak: 'break-all',
                              borderRadius: '4px'
                            }}>
                              {img.imagen_url}
                            </code>
                          </details>
                        </div>
                      ) : esPDF ? (
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
                        // Mostrar imagen normal
                        <>
                          <img
                            src={img.imagen_url}
                            alt={`Imagen ${index + 1}`}
                            onError={() => handleImageError(img.imagen_url)}
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
                        </>
                      )}
                    </div>
                    <div style={{ padding: '1rem' }}>
                      <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.5rem' }}>
                        {esPDF ? 'PDF' : 'Imagen'} {index + 1} de {selectedImages.length}
                      </p>
                      {!tieneError && (
                        <button
                          onClick={() => descargarImagen(img.imagen_url, img.renombre || (esPDF ? `factura_${index + 1}.pdf` : `factura_imagen_${index + 1}.jpg`))}
                          className="btn btn-primary"
                          style={{ width: '100%' }}
                        >
                          ⬇️ Descargar {esPDF ? 'PDF' : 'Imagen'}
                        </button>
                      )}
                      {tieneError && (
                        <button
                          onClick={() => {
                            // Intentar abrir en nueva pestaña para verificar
                            window.open(img.imagen_url, '_blank');
                          }}
                          className="btn btn-secondary"
                          style={{ width: '100%', backgroundColor: '#6c757d' }}
                        >
                          🔗 Abrir URL en nueva pestaña
                        </button>
                      )}
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
              <div className="form-group">
                <label style={{ color: '#2c3e50', fontWeight: '600' }}>Rol del Usuario</label>
                <select
                  value={newUser.rol}
                  onChange={(e) => setNewUser({ ...newUser, rol: e.target.value })}
                  required
                  style={{
                    borderRadius: '8px',
                    border: '2px solid #e1e8ed',
                    padding: '0.875rem',
                    width: '100%',
                    cursor: 'pointer'
                  }}
                >
                  <option value="pedidos">Pedidos</option>
                  <option value="compras">Compras (Solo Lectura)</option>
                </select>
              </div>
              <div style={{
                backgroundColor: newUser.rol === 'compras' ? '#fff3cd' : '#e8f4fd',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                border: newUser.rol === 'compras' ? '1px solid #ffc107' : '1px solid #b8daf5'
              }}>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#2c3e50' }}>
                  <strong>Permisos del rol {newUser.rol === 'pedidos' ? 'Pedidos' : 'Compras'}:</strong>
                </p>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#6c757d' }}>
                  {newUser.rol === 'pedidos'
                    ? 'Puede generar MR pero no editar ni eliminar facturas'
                    : 'Solo visualización: puede ver facturas, imágenes y filtrar por locales, pero NO puede generar MR, editar ni eliminar'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateUser(false);
                    setNewUser({ nombre: '', password: '', email: '', rol: 'pedidos' });
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
