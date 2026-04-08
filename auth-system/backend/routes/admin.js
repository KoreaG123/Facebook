const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const LoginAttempt = require("../models/LoginAttempt");
const { protect, adminOnly } = require("../middleware/auth");

// Todos los endpoints de admin requieren token válido + rol admin
router.use(protect, adminOnly);

// ─────────────────────────────────────────────────────────────────────────────
// GESTIÓN DE USUARIOS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/users — Listar todos los usuarios
router.get("/users", async (req, res) => {
  try {
    const users = await User.find({})
      .select("-password")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error obteniendo usuarios." });
  }
});

// POST /api/admin/users — Crear nuevo usuario
router.post("/users", async (req, res) => {
  const { email, password, role = "user" } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Correo y contraseña son requeridos.",
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: "La contraseña debe tener al menos 6 caracteres.",
    });
  }

  try {
    // Verificar si ya existe
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Ya existe un usuario con ese correo.",
      });
    }

    const newUser = await User.create({
      email: email.toLowerCase().trim(),
      password, // el modelo lo hasheará automáticamente
      role: role === "admin" ? "admin" : "user",
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Usuario creado correctamente.",
      data: newUser,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error creando usuario." });
  }
});

// PATCH /api/admin/users/:id/reset-password — Resetear contraseña
router.patch("/users/:id/reset-password", async (req, res) => {
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: "La nueva contraseña debe tener al menos 6 caracteres.",
    });
  }

  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "Usuario no encontrado." });
    }

    user.password = newPassword; // el pre-save hook la hasheará
    await user.save();

    res.json({
      success: true,
      message: `Contraseña de ${user.email} reseteada correctamente.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error reseteando contraseña." });
  }
});

// PATCH /api/admin/users/:id/toggle-status — Activar / desactivar usuario
router.patch("/users/:id/toggle-status", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "Usuario no encontrado." });
    }

    // No puede desactivarse a sí mismo
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "No puedes desactivar tu propia cuenta.",
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      success: true,
      message: `Usuario ${user.isActive ? "activado" : "desactivado"} correctamente.`,
      data: { isActive: user.isActive },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error actualizando usuario." });
  }
});

// DELETE /api/admin/users/:id — Eliminar usuario
router.delete("/users/:id", async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "No puedes eliminar tu propia cuenta.",
      });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "Usuario no encontrado." });
    }

    res.json({ success: true, message: "Usuario eliminado correctamente." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error eliminando usuario." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// LOGS DE INTENTOS DE ACCESO
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/logs — Obtener todos los intentos de login
router.get("/logs", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      resultado,
      email,
    } = req.query;

    const filter = {};
    if (resultado) filter.resultado = resultado;
    if (email) filter.emailIngresado = { $regex: email, $options: "i" };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      LoginAttempt.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      LoginAttempt.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error obteniendo logs." });
  }
});

// GET /api/admin/logs/stats — Estadísticas de intentos por correo
router.get("/logs/stats", async (req, res) => {
  try {
    const stats = await LoginAttempt.aggregate([
      {
        $group: {
          _id: "$emailIngresado",
          total: { $sum: 1 },
          exitosos: {
            $sum: { $cond: [{ $eq: ["$resultado", "login_exitoso"] }, 1, 0] },
          },
          fallidos: {
            $sum: { $cond: [{ $ne: ["$resultado", "login_exitoso"] }, 1, 0] },
          },
          ultimoIntento: { $max: "$createdAt" },
          ips: { $addToSet: "$ip" },
        },
      },
      { $sort: { fallidos: -1, total: -1 } },
      { $limit: 100 },
    ]);

    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error obteniendo estadísticas." });
  }
});

// DELETE /api/admin/logs — Limpiar logs (opcional)
router.delete("/logs", async (req, res) => {
  try {
    const result = await LoginAttempt.deleteMany({});
    res.json({
      success: true,
      message: `${result.deletedCount} registros eliminados.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error limpiando logs." });
  }
});

module.exports = router;
