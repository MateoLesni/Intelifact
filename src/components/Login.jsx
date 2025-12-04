import React, { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al iniciar sesión');
      }

      onLogin(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>InteliFact</h2>
        <p style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#7f8c8d' }}>
          Sistema de Gestión de Facturas
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="nombre_usuario"
              autoComplete="username"
            />
          </div>
          <div className="form-group">
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          {error && <div className="error">{error}</div>}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: '1rem' }}
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>
        <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#ecf0f1', borderRadius: '4px', fontSize: '0.85rem' }}>
          <strong>Usuarios de prueba:</strong>
          <ul style={{ marginTop: '0.5rem', marginLeft: '1.5rem' }}>
            <li>Usuario: operacion</li>
            <li>Usuario: pedidos</li>
            <li>Usuario: proveedores</li>
          </ul>
          <p style={{ marginTop: '0.5rem' }}>Contraseña: password123</p>
        </div>
      </div>
    </div>
  );
}

export default Login;
