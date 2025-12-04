import React from 'react';

function Navbar({ user, onLogout }) {
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
        <button onClick={onLogout} className="btn btn-secondary">
          Cerrar Sesión
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
