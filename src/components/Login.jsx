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
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #2a5298 0%, #1e3c72 100%)',
            borderRadius: '50%',
            margin: '0 auto 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(30, 60, 114, 0.3)'
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 2V8H20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 13H8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 17H8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M10 9H9H8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2>InteliFact</h2>
          <p style={{ color: '#6c757d', fontSize: '0.95rem', marginTop: '0.5rem' }}>
            Sistema de Gestión de Facturas
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label style={{ color: '#2c3e50', fontWeight: '600' }}>Usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Ingrese su usuario"
              autoComplete="username"
              style={{
                borderRadius: '8px',
                border: '2px solid #e1e8ed',
                padding: '0.875rem',
                fontSize: '0.95rem',
                transition: 'border-color 0.3s'
              }}
            />
          </div>
          <div className="form-group">
            <label style={{ color: '#2c3e50', fontWeight: '600' }}>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Ingrese su contraseña"
              autoComplete="current-password"
              style={{
                borderRadius: '8px',
                border: '2px solid #e1e8ed',
                padding: '0.875rem',
                fontSize: '0.95rem',
                transition: 'border-color 0.3s'
              }}
            />
          </div>
          {error && (
            <div style={{
              backgroundColor: '#fee',
              color: '#c33',
              padding: '0.75rem',
              borderRadius: '8px',
              fontSize: '0.9rem',
              marginBottom: '1rem',
              border: '1px solid #fcc'
            }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              width: '100%',
              marginTop: '1rem',
              padding: '0.875rem',
              fontSize: '1rem',
              borderRadius: '8px',
              border: 'none'
            }}
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div style={{
          marginTop: '2rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid #e1e8ed'
        }}>
          <p style={{
            fontSize: '0.85rem',
            color: '#6c757d',
            textAlign: 'center',
            marginBottom: '0.75rem'
          }}>
            Usuarios de demostración:
          </p>
          <div style={{
            display: 'grid',
            gap: '0.5rem',
            fontSize: '0.85rem'
          }}>
            <div style={{
              padding: '0.5rem 0.75rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '6px',
              border: '1px solid #e1e8ed'
            }}>
              <strong style={{ color: '#2a5298' }}>operacion</strong> / password123
            </div>
            <div style={{
              padding: '0.5rem 0.75rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '6px',
              border: '1px solid #e1e8ed'
            }}>
              <strong style={{ color: '#2a5298' }}>pedidos</strong> / password123
            </div>
            <div style={{
              padding: '0.5rem 0.75rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '6px',
              border: '1px solid #e1e8ed'
            }}>
              <strong style={{ color: '#2a5298' }}>proveedores</strong> / password123
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
