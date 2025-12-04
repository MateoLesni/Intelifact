# InteliFact - Sistema de Gestión de Facturas

Sistema web para la gestión de facturas con diferentes roles de usuario (Operación, Pedidos, Proveedores).

## Características

- **Rol Operación**: Carga de facturas con imágenes para locales asignados
- **Rol Pedidos**: Visualización, modificación, eliminación y generación de MR
- **Rol Proveedores**: Visualización de facturas con MR generada
- Sistema de auditoría que registra todas las modificaciones y eliminaciones
- Interfaz responsive y amigable

## Tecnologías

- **Frontend**: React + Vite
- **Backend**: Node.js + Express
- **Base de datos**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage para imágenes
- **Deployment**: Vercel

## Instalación Local

### 1. Clonar el repositorio

```bash
git clone <tu-repositorio>
cd intelifact_web
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar Supabase

1. Crear una cuenta en [Supabase](https://supabase.com)
2. Crear un nuevo proyecto
3. En el SQL Editor, ejecutar el script `supabase-schema.sql`
4. Crear un bucket de storage llamado "facturas" (público)
5. Copiar las credenciales del proyecto

### 4. Configurar variables de entorno

Crear un archivo `.env` en la raíz del proyecto:

```bash
cp .env.example .env
```

Editar `.env` con tus credenciales de Supabase:

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu-clave-anon
VITE_API_URL=/api
```

### 5. Ejecutar en desarrollo

```bash
# Terminal 1 - Frontend
npm run dev

# Terminal 2 - Backend
npm run server
```

La aplicación estará disponible en `http://localhost:5173`

## Deployment en Vercel

### 1. Preparar el proyecto

Asegurarse de que el proyecto esté en un repositorio Git (GitHub, GitLab, etc.)

### 2. Conectar con Vercel

1. Ir a [vercel.com](https://vercel.com)
2. Hacer clic en "Import Project"
3. Seleccionar tu repositorio
4. Vercel detectará automáticamente la configuración

### 3. Configurar variables de entorno en Vercel

En la configuración del proyecto en Vercel, agregar las siguientes variables:

```
SUPABASE_URL = https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY = tu-clave-anon
VITE_API_URL = /api
```

### 4. Deploy

Hacer clic en "Deploy". Vercel construirá y desplegará automáticamente.

### 5. Configurar Supabase Storage

1. En Supabase Dashboard, ir a Storage
2. Crear un bucket llamado "facturas"
3. Hacerlo público:
   - Click en el bucket
   - Políticas → New Policy → "Allow public access"
   - Permitir SELECT para todos

## Usuarios de Prueba

Por defecto, el sistema incluye 3 usuarios de ejemplo:

- **Operación**: operacion@empresa.com / password123
- **Pedidos**: pedidos@empresa.com / password123
- **Proveedores**: proveedores@empresa.com / password123

## Estructura del Proyecto

```
intelifact_web/
├── api/
│   └── index.js          # API Express (backend)
├── src/
│   ├── components/
│   │   ├── Login.jsx
│   │   ├── Navbar.jsx
│   │   ├── OperacionDashboard.jsx
│   │   ├── PedidosDashboard.jsx
│   │   └── ProveedoresDashboard.jsx
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── vite.config.js
├── vercel.json           # Configuración de Vercel
├── supabase-schema.sql   # Script SQL para crear tablas
└── package.json
```

## Base de Datos

### Tablas principales:

- `usuarios`: Almacena los usuarios del sistema
- `locales`: Locales de la empresa
- `usuario_locales`: Relación usuarios-locales (para rol Operación)
- `facturas`: Datos de las facturas
- `factura_imagenes`: URLs de imágenes de facturas
- `auditoria`: Registro de modificaciones y eliminaciones

## API Endpoints

- `POST /api/auth/login` - Iniciar sesión
- `GET /api/facturas` - Obtener facturas (filtrado por rol)
- `POST /api/facturas` - Crear factura con imágenes
- `PUT /api/facturas/:id` - Actualizar factura
- `DELETE /api/facturas/:id` - Eliminar factura
- `POST /api/facturas/:id/mr` - Generar MR
- `GET /api/locales` - Obtener locales del usuario
- `GET /api/auditoria` - Obtener historial de auditoría

## Funcionalidades por Rol

### Operación
- Ver facturas de sus locales asignados
- Cargar nuevas facturas con imágenes
- Solo puede cargar facturas para locales asignados

### Pedidos
- Ver todas las facturas
- Modificar facturas (se registra en auditoría)
- Eliminar facturas (se registra en auditoría)
- Generar MR con número
- Ver imágenes de facturas

### Proveedores
- Ver solo facturas con MR generada
- Ver imágenes de facturas
- Solo lectura

## Seguridad

- Las contraseñas están almacenadas en texto plano en el ejemplo (CAMBIAR en producción)
- Implementar bcrypt para hash de contraseñas en producción
- Validar permisos en cada endpoint
- Las imágenes se almacenan en Supabase Storage

## Mejoras Futuras

- [ ] Encriptación de contraseñas con bcrypt
- [ ] JWT para autenticación
- [ ] Paginación de facturas
- [ ] Filtros y búsqueda
- [ ] Exportación a Excel/PDF
- [ ] Notificaciones por email
- [ ] Dashboard con estadísticas
- [ ] Gestión de usuarios desde la app

## Soporte

Para problemas o preguntas, crear un issue en el repositorio.

## Licencia

MIT
