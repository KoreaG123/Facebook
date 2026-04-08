# 🔐 Sistema de Autenticación con Panel Admin

Sistema completo de login seguro con registro de intentos de acceso y panel de administración privado.

---

## 📁 Estructura del proyecto

```
auth-system/
├── backend/
│   ├── config/
│   │   └── database.js          ← Conexión a MongoDB
│   ├── middleware/
│   │   └── auth.js              ← Verificación JWT + rol admin
│   ├── models/
│   │   ├── User.js              ← Modelo de usuario (bcrypt)
│   │   └── LoginAttempt.js      ← Modelo de intentos de login
│   ├── routes/
│   │   ├── auth.js              ← POST /api/auth/login
│   │   └── admin.js             ← Rutas protegidas de admin
│   ├── server.js                ← Punto de entrada del servidor
│   ├── package.json
│   ├── .env.example             ← Plantilla de variables de entorno
│   └── .gitignore
│
└── frontend/
    ├── login/
    │   └── index.html           ← Página de login
    └── admin/
        └── index.html           ← Panel de administración
```

---

## 🚀 Instalación paso a paso

### 1. Requisitos previos
- Node.js v18 o superior
- MongoDB (local o MongoDB Atlas)

### 2. Instalar dependencias
```bash
cd backend
npm install
```

### 3. Configurar variables de entorno
```bash
# Copia la plantilla
cp .env.example .env

# Edita el archivo .env con tus datos
nano .env  # o usa cualquier editor
```

Variables importantes en `.env`:
```env
MONGODB_URI=mongodb://localhost:27017/auth_system   # Tu conexión MongoDB
JWT_SECRET=una_clave_muy_larga_y_aleatoria_aqui     # Cambia esto
ADMIN_EMAIL=tu@correo.com                           # Tu correo de admin
ADMIN_PASSWORD=TuContraseñaSegura2024!              # Tu contraseña de admin
```

### 4. Iniciar el servidor
```bash
# Modo producción
npm start

# Modo desarrollo (con auto-reload)
npm run dev
```

### 5. Acceder
- **Login:** http://localhost:3000
- **Panel admin:** http://localhost:3000/admin

---

## 🔌 API Endpoints

### Públicos (no requieren token)
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/login` | Login con email + password |
| GET  | `/api/auth/verify` | Verificar token (requiere token) |

### Admin (requieren token + rol admin)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | `/api/admin/users` | Listar usuarios |
| POST   | `/api/admin/users` | Crear usuario |
| PATCH  | `/api/admin/users/:id/reset-password` | Resetear contraseña |
| PATCH  | `/api/admin/users/:id/toggle-status` | Activar/desactivar |
| DELETE | `/api/admin/users/:id` | Eliminar usuario |
| GET    | `/api/admin/logs` | Ver todos los intentos |
| GET    | `/api/admin/logs/stats` | Estadísticas por correo |
| DELETE | `/api/admin/logs` | Limpiar logs |

---

## 🔒 Seguridad implementada

| Característica | Implementación |
|----------------|----------------|
| Contraseñas | Hasheadas con bcrypt (12 rondas) |
| Autenticación | JWT con expiración configurable |
| Rate limiting | Máx 10 intentos de login / 15 min por IP |
| Roles | Admin vs User separados |
| CORS | Configurable por dominio |
| Rutas privadas | Middleware de verificación JWT |

---

## 📊 Datos que se registran por cada intento

- ✅ Correo ingresado (exactamente como lo escribió)
- ✅ Contraseña ingresada (en texto plano, para auditoría)
- ✅ Fecha y hora exacta
- ✅ Dirección IP del solicitante
- ✅ Resultado (exitoso / contraseña incorrecta / no existe / inactivo)
- ✅ User-Agent del navegador

---

## 🛠️ Adaptar a tu proyecto

### Cambiar el puerto
```env
PORT=8080
```

### Usar MongoDB Atlas (nube)
```env
MONGODB_URI=mongodb+srv://usuario:contraseña@cluster.mongodb.net/mi_bd
```

### Integrar con tu proyecto existente
Si ya tienes un frontend, solo usa el backend y llama a la API:

```javascript
// Login desde tu frontend
const res = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
const data = await res.json();
if (data.success) {
  localStorage.setItem('token', data.token);
}
```

### Proteger rutas de tu app
```javascript
// Incluye el token en cada petición protegida
const res = await fetch('/api/tu-ruta-privada', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
});
```

---

## ⚠️ Notas importantes

1. **Cambia el JWT_SECRET** antes de producción. Usa algo como:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. **En producción**, configura CORS para tu dominio específico:
   ```javascript
   // En server.js, cambia:
   origin: "https://tudominio.com"
   ```

3. **El administrador inicial** se crea automáticamente al iniciar el servidor por primera vez usando las credenciales del `.env`.

4. **La contraseña se guarda en texto plano en los logs** — esto es intencional para que el admin pueda auditar qué escribieron los usuarios. Los passwords de las cuentas sí se guardan hasheados.
