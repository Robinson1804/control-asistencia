// middleware/auth.js - Middleware de autenticación JWT
const jwt = require('jsonwebtoken');

// Middleware para verificar token JWT
function verificarToken(req, res, next) {
  // Obtener token del header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Formato: "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token no proporcionado'
    });
  }

  try {
    // Verificar y decodificar el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Token inválido o expirado'
    });
  }
}

// Función para generar un token JWT
function generarToken(usuario) {
  return jwt.sign(
    {
      id: usuario.id,
      username: usuario.username,
      nombre: usuario.nombre
    },
    process.env.JWT_SECRET,
    { expiresIn: '8h' } // Token válido por 8 horas
  );
}

module.exports = {
  verificarToken,
  generarToken
};
