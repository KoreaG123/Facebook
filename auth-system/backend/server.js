require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const connectDB = require("./config/database");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 3000;

// ── Conectar a MongoDB ───────────────────────────────────────────────────────
connectDB();

// ── Middlewares globales ─────────────────────────────────────────────────────
app.use(cors({
  origin: "*", // En producción, cambia esto a tu dominio específico
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Servir archivos estáticos del frontend ───────────────────────────────────
app.use(express.static(path.join(__dirname, "../frontend")));

// ── Rutas API ────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

// ── Ruta raíz → login ────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/login/index.html"));
});

// ── Ruta admin → panel ───────────────────────────────────────────────────────
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/admin/index.html"));
});

// ── Health check ─────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Manejo de rutas no encontradas ───────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Ruta no encontrada." });
});

// ── Manejo global de errores ─────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Error no manejado:", err);
  res.status(500).json({ success: false, message: "Error interno del servidor." });
});

// ── Iniciar servidor ─────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`\n🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📋 Panel admin en  http://localhost:${PORT}/admin`);
  console.log(`🔗 API en          http://localhost:${PORT}/api\n`);

  // Crear el administrador inicial si no existe
  await createInitialAdmin();
});

// ─────────────────────────────────────────────────────────────────────────────
// Crear administrador inicial automáticamente al arrancar
// ─────────────────────────────────────────────────────────────────────────────
async function createInitialAdmin() {
  try {
    const User = require("./models/User");
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.warn("⚠️  ADMIN_EMAIL o ADMIN_PASSWORD no configurados en .env");
      return;
    }

    const existingAdmin = await User.findOne({ email: adminEmail });

    if (!existingAdmin) {
      await User.create({
        email: adminEmail,
        password: adminPassword,
        role: "admin",
        isActive: true,
      });
      console.log(`✅ Administrador creado: ${adminEmail}`);
    } else {
      console.log(`ℹ️  Administrador ya existe: ${adminEmail}`);
    }
  } catch (error) {
    console.error("❌ Error creando administrador inicial:", error.message);
  }
}
