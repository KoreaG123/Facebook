const mongoose = require("mongoose");

const loginAttemptSchema = new mongoose.Schema(
  {
    // Correo ingresado (exactamente como lo escribió el usuario)
    emailIngresado: {
      type: String,
      required: true,
      trim: true,
    },

    // Contraseña ingresada EN TEXTO PLANO (para auditoría del admin)
    // NOTA: Esto es intencional para que el admin pueda ver qué escribieron
    passwordIngresada: {
      type: String,
      default: "",
    },

    // IP del solicitante
    ip: {
      type: String,
      default: "Desconocida",
    },

    // User-Agent del navegador
    userAgent: {
      type: String,
      default: "",
    },

    // Resultado del intento
    resultado: {
      type: String,
      enum: [
        "login_exitoso",
        "usuario_no_existe",
        "contrasena_incorrecta",
        "cuenta_inactiva",
        "error_servidor",
      ],
      required: true,
    },

    // Referencia al usuario si existe
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true, // createdAt = fecha y hora exacta del intento
  }
);

// Índices para búsquedas rápidas en el panel admin
loginAttemptSchema.index({ emailIngresado: 1 });
loginAttemptSchema.index({ ip: 1 });
loginAttemptSchema.index({ createdAt: -1 });
loginAttemptSchema.index({ resultado: 1 });

module.exports = mongoose.model("LoginAttempt", loginAttemptSchema);
