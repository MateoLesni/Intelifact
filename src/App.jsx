import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Navbar from './components/Navbar';
import OperacionDashboard from './components/OperacionDashboard';
import PedidosDashboard from './components/PedidosDashboard';
import ProveedoresDashboard from './components/ProveedoresDashboard';
import ProveedoresViewerDashboard from './components/ProveedoresViewerDashboard';
import GestionViewerDashboard from './components/GestionViewerDashboard';
import ImagenVerifier from './components/ImagenVerifier';

function App() {
  const [user, setUser] = useState(null);
  const pedidosRef = useRef(null);

  useEffect(() => {
    // Verificar si hay usuario guardado en localStorage
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const handleCreateUser = () => {
    if (pedidosRef.current) {
      pedidosRef.current.openCreateUser();
    }
  };

  const handleCreateProveedor = () => {
    if (pedidosRef.current) {
      pedidosRef.current.openCreateProveedor();
    }
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <Navbar
        user={user}
        onLogout={handleLogout}
        onCreateUser={handleCreateUser}
        onCreateProveedor={handleCreateProveedor}
      />
      <Routes>
        <Route
          path="/"
          element={
            user.rol === 'operacion' ? (
              <OperacionDashboard user={user} />
            ) : user.rol === 'pedidos' || user.rol === 'pedidos_admin' ? (
              <PedidosDashboard user={user} ref={pedidosRef} />
            ) : user.rol === 'proveedores' ? (
              <ProveedoresDashboard user={user} />
            ) : user.rol === 'proveedores_viewer' ? (
              <ProveedoresViewerDashboard user={user} />
            ) : user.rol === 'gestion' ? (
              <GestionViewerDashboard user={user} />
            ) : (
              <Navigate to="/" />
            )
          }
        />
        {/* Ruta de verificación de imágenes solo para pedidos_admin */}
        {user.rol === 'pedidos_admin' && (
          <Route path="/verificar-imagenes" element={<ImagenVerifier />} />
        )}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
