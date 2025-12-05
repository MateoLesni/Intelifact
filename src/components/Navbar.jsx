import React from 'react';

function Navbar({ user, onLogout, onCreateUser, onCreateProveedor }) {
  const rolNames = {
    operacion: 'Operación',
    pedidos: 'Pedidos',
    pedidos_admin: 'Pedidos Admin',
    proveedores: 'Proveedores'
  };

  return (
    <nav className="navbar">
      <h1>InteliFact</h1>
      <div className="navbar-info">
        <span>{user.nombre}</span>
        <span>Rol: {rolNames[user.rol]}</span>
        {user.rol === 'pedidos_admin' && (
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
        <button onClick={onLogout} className="btn btn-secondary">
          Cerrar Sesión
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
