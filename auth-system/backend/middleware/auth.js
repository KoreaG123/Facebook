const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ── Middleware: verificar token JWT ─────────────────────────────────────────
const protect = async (req, res, next) => {
  let token;

  // Buscar token en header Authorization: Bearer <token>
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "No autorizado. Token requerido.",
    });
  }

  try {
    // Verificar y decodificar el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Obtener el usuario actual de la base de datos
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "El usuario de este token ya no existe.",
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Tu cuenta ha sido desactivada.",
      });
    }

    // Adjuntar usuario al request
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Token inválido o expirado.",
    });
  }
};

// ── Middleware: verificar que el usuario sea administrador ───────────────────
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: "Acceso denegado. Solo administradores.",
  });
};

// ── Helper: obtener IP real del cliente ─────────────────────────────────────
const getClientIP = (req) => {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    "Desconocida"
  );
};

module.exports = { protect, adminOnly, getClientIP };
