# 🏢 Sistema de Control de Asistencia

Sistema web para gestión integral de asistencias con dos módulos principales: registro manual administrativo y registro automático tipo kiosko.

## 📋 Características Principales

- ✅ **Registro Manual**: Interface administrativa para registrar asistencias con estados (presente/tardanza/falta/permiso)
- ⏱️ **Kiosko de Auto-Registro**: Pantalla pública donde empleados marcan entrada/salida con su DNI
- 📊 **Dashboard y Reportes**: Visualización de estadísticas y exportación a Excel
- 🔐 **Autenticación JWT**: Sistema de login seguro para administradores
- 🎨 **Diseño Responsive**: Interface adaptable a dispositivos móviles y tablets

## 🛠️ Tecnologías Utilizadas

### Backend
- Node.js + Express
- Supabase (PostgreSQL)
- JWT para autenticación
- bcrypt para hash de contraseñas

### Frontend
- HTML5 + CSS3 + JavaScript Vanilla
- SheetJS (xlsx.js) para exportación a Excel
- Diseño responsive sin frameworks

## 📁 Estructura del Proyecto

```
control-asistencia/
│
├── server.js                    # Servidor Express con todas las rutas
├── database.js                  # Conexión a Supabase
├── package.json                 # Dependencias del proyecto
├── .env                         # Variables de entorno (no incluido en git)
├── .env.example                 # Ejemplo de variables de entorno
├── .gitignore                   # Archivos ignorados por git
│
├── middleware/
│   └── auth.js                  # Middleware de autenticación JWT
│
└── public/
    ├── index.html              # Página de inicio
    ├── login.html              # Login administrativo
    ├── registro-manual.html    # Registro manual de asistencia
    ├── kiosko.html             # Kiosko auto-registro
    ├── dashboard.html          # Dashboard y reportes
    │
    ├── css/
    │   └── style.css           # Estilos globales
    │
    └── js/
        ├── login.js
        ├── registro-manual.js
        ├── kiosko.js
        └── dashboard.js
```

## 🚀 Instalación

### 1. Clonar o descargar el proyecto

```bash
cd control-asistencia
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Copiar el archivo `.env.example` a `.env` y configurar las variables:

```env
# Supabase Configuration
SUPABASE_URL=tu_url_de_supabase
SUPABASE_KEY=tu_service_role_key

# JWT Secret
JWT_SECRET=tu_secreto_jwt_seguro

# Server Configuration
PORT=3000
NODE_ENV=development
```

### 4. Verificar que las tablas existen en Supabase

El sistema utiliza las siguientes tablas que deben estar creadas en Supabase:

- `empleados`
- `sedes`
- `proyectos`
- `dtt`
- `registros_asistencia_manual`
- `registros_asistencia_automatica`
- `usuarios_sistema`

### 5. Crear usuario administrativo

Ejecutar en Supabase SQL Editor:

```sql
INSERT INTO usuarios_sistema (username, password_hash, nombre, activo)
VALUES ('admin', '$2a$10$YourHashHere', 'Administrador', true);
```

**Nota**: Por simplicidad, el sistema acepta `admin/admin123` sin necesidad de hash.

### 6. Iniciar el servidor

```bash
npm start
```

O para desarrollo con auto-reload:

```bash
npm run dev
```

El servidor estará disponible en: `http://localhost:3000`

## 📖 Uso del Sistema

### 1. Página de Inicio
- Acceder a `http://localhost:3000`
- Ver las opciones disponibles: Administración, Kiosko, Dashboard

### 2. Login Administrativo
- URL: `http://localhost:3000/login.html`
- Credenciales por defecto:
  - Usuario: `admin`
  - Contraseña: `admin123`

### 3. Registro Manual
- Requiere autenticación
- Permite registrar asistencias con estados:
  - ✅ Presente
  - 🟡 Tardanza
  - ❌ Falta
  - 📝 Permiso (requiere motivo)
- Contador en tiempo real de registros del día
- Búsqueda de empleados por nombre o DNI
- Validación de registros duplicados

### 4. Kiosko (Sin autenticación)
- URL: `http://localhost:3000/kiosko.html`
- Pantalla pública para auto-registro
- Empleados ingresan su DNI
- Botones grandes para ENTRADA/SALIDA
- Reloj en tiempo real
- Confirmación visual del registro

### 5. Dashboard
- Requiere autenticación
- Filtros por fecha y sede
- Estadísticas del período:
  - Total de registros
  - Presentes, Tardanzas, Faltas, Permisos
- Tabla detallada de registros
- Exportación a Excel con un click

## 🔌 API Endpoints

### Autenticación
```
POST /api/auth/login
Body: { username, password }
Response: { success, token, user }
```

### Empleados
```
GET /api/empleados?sede_id=1&activo=true&search=nombre
Headers: { Authorization: Bearer TOKEN }
```

### Sedes
```
GET /api/sedes
Headers: { Authorization: Bearer TOKEN }
```

### Registro Manual
```
POST /api/asistencia/manual
Headers: { Authorization: Bearer TOKEN }
Body: { dni, fecha, hora, sede_id, tipo_registro, estado, ... }

GET /api/asistencia/resumen?fecha=2025-11-05&sede_id=1
Headers: { Authorization: Bearer TOKEN }

GET /api/asistencia/verificar-registro?dni=12345678&fecha=2025-11-05&tipo=entrada
Headers: { Authorization: Bearer TOKEN }
```

### Kiosko (Sin autenticación)
```
POST /api/kiosko/registro
Body: { dni, tipo_registro, sede_id }

GET /api/kiosko/sedes
```

### Reportes
```
GET /api/reportes/lista?fecha_desde=2025-11-01&fecha_hasta=2025-11-05&sede_id=1
Headers: { Authorization: Bearer TOKEN }

GET /api/reportes/estadisticas?fecha_desde=2025-11-01&fecha_hasta=2025-11-05
Headers: { Authorization: Bearer TOKEN }
```

## 🎨 Personalización

### Colores (CSS Variables)
Editar en `public/css/style.css`:

```css
:root {
  --primary: #6366f1;      /* Indigo */
  --success: #10b981;      /* Verde - Presente */
  --warning: #f59e0b;      /* Amarillo - Tardanza */
  --danger: #ef4444;       /* Rojo - Falta */
  --info: #3b82f6;         /* Azul - Permiso */
}
```

### Puerto del Servidor
Cambiar en `.env`:
```env
PORT=3000
```

## 🔒 Seguridad

- ✅ Autenticación JWT con tokens que expiran en 8 horas
- ✅ Validación de datos en backend y frontend
- ✅ Prevención de registros duplicados
- ✅ Variables de entorno para credenciales
- ✅ Middleware de autenticación en rutas protegidas
- ⚠️ CORS habilitado (ajustar en producción)

## 📊 Base de Datos

### Tablas Principales

#### `registros_asistencia_manual`
- Registros con estados (presente/tardanza/falta/permiso)
- Incluye motivo para permisos
- Constraint de unicidad: dni + fecha + tipo_registro

#### `registros_asistencia_automatica`
- Registros automáticos del kiosko
- Sin estados, solo entrada/salida
- Guarda IP y dispositivo

#### `usuarios_sistema`
- Usuarios administrativos
- Password hash con bcrypt

## 🐛 Troubleshooting

### Error de conexión a Supabase
- Verificar credenciales en `.env`
- Confirmar que las tablas existen
- Revisar permisos en Supabase

### Token inválido o expirado
- Cerrar sesión y volver a iniciar
- Los tokens duran 8 horas

### No se cargan los empleados
- Verificar que existan empleados activos en la sede seleccionada
- Revisar que la tabla `empleados` tiene la columna `activo = true`

## 📝 Notas Importantes

- El sistema está diseñado para uso interno, mantiene simplicidad
- Un solo archivo `server.js` con todas las rutas
- JavaScript Vanilla puro, sin frameworks frontend
- Exportación a Excel usa librería SheetJS desde CDN
- Login simple con un solo usuario administrador

## 🎯 Mejoras Futuras

- [ ] Multi-usuario con roles y permisos
- [ ] Notificaciones en tiempo real
- [ ] Historial de cambios en registros
- [ ] Reportes gráficos con charts
- [ ] API REST documentada con Swagger
- [ ] Tests unitarios y de integración
- [ ] Modo offline para el kiosko
- [ ] Soporte para foto en registro

## 📄 Licencia

Este proyecto es de uso interno. Todos los derechos reservados.

## 👥 Soporte

Para reportar problemas o solicitar nuevas funcionalidades, contactar al administrador del sistema.

---

**Versión**: 1.0.0
**Última actualización**: Noviembre 2025
