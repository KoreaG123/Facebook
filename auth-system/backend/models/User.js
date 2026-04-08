const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "El correo es requerido"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Formato de correo inválido"],
    },
    password: {
      type: String,
      required: [true, "La contraseña es requerida"],
      minlength: [6, "La contraseña debe tener al menos 6 caracteres"],
    },
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // crea createdAt y updatedAt automáticamente
  }
);

// ── MIDDLEWARE: hashear contraseña antes de guardar ──────────────────────────
userSchema.pre("save", async function (next) {
  // Solo hashea si la contraseña fue modificada
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(12); // 12 rondas = muy seguro
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── MÉTODO: comparar contraseña ingresada con el hash ───────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// ── Ocultar contraseña en respuestas JSON ────────────────────────────────────
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
