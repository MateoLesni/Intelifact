import React, { useState } from 'react';
import ProveedoresDashboard from './ProveedoresDashboard';
import PedidosDashboard from './PedidosDashboard';

function ProveedoresViewerDashboard({ user }) {
  const [vistaActual, setVistaActual] = useState('proveedores'); // 'proveedores' o 'pedidos'

  return (
    <div>
      {/* Barra de navegación entre vistas */}
      <div style={{
        backgroundColor: '#2c3e50',
        padding: '1rem',
        display: 'flex',
        justifyContent: 'center',
        gap: '1rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '1rem'
      }}>
        <button
          onClick={() => setVistaActual('proveedores')}
          style={{
            padding: '0.75rem 2rem',
            fontSize: '1rem',
            fontWeight: '600',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            backgroundColor: vistaActual === 'proveedores' ? '#3498db' : '#34495e',
            color: 'white',
            transition: 'all 0.3s ease',
            boxShadow: vistaActual === 'proveedores' ? '0 4px 6px rgba(0,0,0,0.2)' : 'none'
          }}
        >
          📁 Vista Proveedores
        </button>
        <button
          onClick={() => setVistaActual('pedidos')}
          style={{
            padding: '0.75rem 2rem',
            fontSize: '1rem',
            fontWeight: '600',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            backgroundColor: vistaActual === 'pedidos' ? '#3498db' : '#34495e',
            color: 'white',
            transition: 'all 0.3s ease',
            boxShadow: vistaActual === 'pedidos' ? '0 4px 6px rgba(0,0,0,0.2)' : 'none'
          }}
        >
          📋 Vista Pedidos
        </button>
      </div>

      {/* Contenido según vista seleccionada */}
      {vistaActual === 'proveedores' ? (
        <ProveedoresDashboard user={user} />
      ) : (
        <PedidosDashboard user={user} readOnly={true} />
      )}
    </div>
  );
}

export default ProveedoresViewerDashboard;
