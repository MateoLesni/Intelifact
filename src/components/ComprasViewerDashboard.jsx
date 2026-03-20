import React, { useState } from 'react';
import PedidosDashboard from './PedidosDashboard';
import ProveedorMesDashboard from './ProveedorMesDashboard';

function ComprasViewerDashboard({ user }) {
  const [vistaActual, setVistaActual] = useState('pedidos');

  const tabs = [
    { id: 'pedidos', label: 'Pedidos (Solo lectura)', icon: '📋' },
    { id: 'proveedores', label: 'Proveedores / Meses', icon: '🏢' }
  ];

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

      {vistaActual === 'pedidos' ? (
        <PedidosDashboard user={user} readOnly={true} vistaCompleta={true} />
      ) : (
        <ProveedorMesDashboard user={user} />
      )}
    </div>
  );
}

export default ComprasViewerDashboard;
