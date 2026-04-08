const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");

const User = require("../models/User");
const LoginAttempt = require("../models/LoginAttempt");
const { protect, getClientIP } = require("../middleware/auth");

// ── Rate Limiter: máximo 10 intentos de login cada 15 minutos por IP ────────
const loginLimiter = rateLimit({
  windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW) || 15) * 60 * 1000,
  max: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 10,
  message: {
    success: false,
    message: "Demasiados intentos de login. Intenta de nuevo en 15 minutos.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Helper: generar token JWT ────────────────────────────────────────────────
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "8h",
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// Login con correo y contraseña
// ─────────────────────────────────────────────────────────────────────────────
router.post("/login", loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  const ip = getClientIP(req);
  const userAgent = req.headers["user-agent"] || "";

  // Validar que se enviaron los campos
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Correo y contraseña son requeridos.",
    });
  }

  try {
    // Buscar usuario en la base de datos
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // ── CASO 1: Usuario no existe ────────────────────────────────────────────
    if (!user) {
      await LoginAttempt.create({
        emailIngresado: email,
        passwordIngresada: password, // guardamos lo que escribieron
        ip,
        userAgent,
        resultado: "usuario_no_existe",
        userId: null,
      });

      return res.status(401).json({
        success: false,
        message: "Credenciales incorrectas.",
      });
    }

    // ── CASO 2: Cuenta inactiva ──────────────────────────────────────────────
    if (!user.isActive) {
      await LoginAttempt.create({
        emailIngresado: email,
        passwordIngresada: password,
        ip,
        userAgent,
        resultado: "cuenta_inactiva",
        userId: user._id,
      });

      return res.status(401).json({
        success: false,
        message: "Tu cuenta ha sido desactivada. Contacta al administrador.",
      });
    }

    // ── CASO 3: Contraseña incorrecta ────────────────────────────────────────
    const isPasswordCorrect = await user.comparePassword(password);

    if (!isPasswordCorrect) {
      await LoginAttempt.create({
        emailIngresado: email,
        passwordIngresada: password,
        ip,
        userAgent,
        resultado: "contrasena_incorrecta",
        userId: user._id,
      });

      return res.status(401).json({
        success: false,
        message: "Credenciales incorrectas.",
      });
    }

    // ── CASO 4: Login exitoso ────────────────────────────────────────────────
    await LoginAttempt.create({
      emailIngresado: email,
      passwordIngresada: password,
      ip,
      userAgent,
      resultado: "login_exitoso",
      userId: user._id,
    });

    // Actualizar última sesión
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: "Login exitoso.",
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    console.error("Error en login:", error);

    // Intentar registrar el error
    try {
      await LoginAttempt.create({
        emailIngresado: email || "desconocido",
        passwordIngresada: password || "",
        ip,
        userAgent,
        resultado: "error_servidor",
      });
    } catch (_) {}

    return res.status(500).json({
      success: false,
      message: "Error interno del servidor.",
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/verify
// Verificar si el token actual es válido
// ─────────────────────────────────────────────────────────────────────────────
router.get("/verify", protect, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user._id,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

module.exports = router;
