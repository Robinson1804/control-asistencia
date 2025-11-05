// login.js - Lógica de autenticación

// Verificar si ya hay sesión activa
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (token) {
    // Verificar si el token es válido
    verificarToken(token);
  }
});

// Manejar el formulario de login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const errorMessage = document.getElementById('errorMessage');

  // Limpiar mensaje de error
  errorMessage.classList.add('hidden');

  // Validaciones básicas
  if (!username || !password) {
    mostrarError('Por favor complete todos los campos');
    return;
  }

  try {
    // Deshabilitar botón durante la petición
    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Iniciando sesión...';

    // Hacer petición al servidor
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (data.success) {
      // Guardar token en localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Redirigir a registro manual
      window.location.href = '/registro-manual.html';
    } else {
      mostrarError(data.message || 'Error al iniciar sesión');
      submitButton.disabled = false;
      submitButton.textContent = 'Iniciar Sesión';
    }

  } catch (error) {
    console.error('Error en login:', error);
    mostrarError('Error de conexión con el servidor');
    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.disabled = false;
    submitButton.textContent = 'Iniciar Sesión';
  }
});

// Función para mostrar mensaje de error
function mostrarError(mensaje) {
  const errorMessage = document.getElementById('errorMessage');
  errorMessage.textContent = mensaje;
  errorMessage.classList.remove('hidden');
}

// Función para verificar si el token es válido
async function verificarToken(token) {
  try {
    const response = await fetch('/api/empleados?activo=true', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      // Token válido, redirigir
      window.location.href = '/registro-manual.html';
    } else {
      // Token inválido, limpiar localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  } catch (error) {
    console.error('Error al verificar token:', error);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
}
