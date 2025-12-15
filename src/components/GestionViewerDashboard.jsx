import React, { useState } from 'react';
import GestionDashboard from './GestionDashboard';
import PedidosDashboard from './PedidosDashboard';

function GestionViewerDashboard({ user }) {
  const [vistaActual, setVistaActual] = useState('gestion'); // 'gestion' o 'pedidos'

  return (
    <div style={{ padding: '1rem' }}>
      {/* Botones de alternancia */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '1.5rem',
        borderBottom: '2px solid #e0e0e0',
        paddingBottom: '0.5rem'
      }}>
        <button
          onClick={() => setVistaActual('gestion')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: vistaActual === 'gestion' ? '#3498db' : '#ecf0f1',
            color: vistaActual === 'gestion' ? 'white' : '#34495e',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: vistaActual === 'gestion' ? 'bold' : 'normal',
            fontSize: '1rem',
            transition: 'all 0.2s'
          }}
        >
          📁 Vista Gestión (Locales/Meses)
        </button>
        <button
          onClick={() => setVistaActual('pedidos')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: vistaActual === 'pedidos' ? '#3498db' : '#ecf0f1',
            color: vistaActual === 'pedidos' ? 'white' : '#34495e',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: vistaActual === 'pedidos' ? 'bold' : 'normal',
            fontSize: '1rem',
            transition: 'all 0.2s'
          }}
        >
          📋 Vista Pedidos (Solo lectura)
        </button>
      </div>

      {/* Contenido según vista seleccionada */}
      {vistaActual === 'gestion' ? (
        <GestionDashboard user={user} />
      ) : (
        <PedidosDashboard user={user} readOnly={true} vistaCompleta={true} />
      )}
    </div>
  );
}

export default GestionViewerDashboard;
