import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function Navbar({ user, onLogout, onCreateUser, onCreateProveedor }) {
  const navigate = useNavigate();
  const location = useLocation();

  const rolNames = {
    operacion: 'Operación',
    pedidos: 'Pedidos',
    pedidos_admin: 'Pedidos Admin',
    proveedores: 'Proveedores'
  };

  const enVerificador = location.pathname === '/verificar-imagenes';

  return (
    <nav className="navbar">
      <h1>InteliFact</h1>
      <div className="navbar-info">
        <span>{user.nombre}</span>
        <span>Rol: {rolNames[user.rol]}</span>
        {user.rol === 'pedidos_admin' && (
          <>
            {!enVerificador && (
              <>
                <button
                  onClick={onCreateUser}
                  className="btn btn-success"
                  style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                >
                  + Crear Usuario
                </button>
                <button
                  onClick={onCreateProveedor}
                  className="btn btn-success"
                  style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                >
                  + Crear Proveedor
                </button>
              </>
            )}
            <button
              onClick={() => navigate(enVerificador ? '/' : '/verificar-imagenes')}
              className="btn"
              style={{
                fontSize: '0.875rem',
                padding: '0.5rem 1rem',
                backgroundColor: enVerificador ? '#95a5a6' : '#e67e22',
                color: 'white'
              }}
            >
              {enVerificador ? '← Volver a Facturas' : '🔍 Verificar Imágenes'}
            </button>
          </>
        )}
        <button onClick={onLogout} className="btn btn-secondary">
          Cerrar Sesión
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
