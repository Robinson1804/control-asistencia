// kiosko.js - Lógica del kiosko de auto-registro

let sedeSeleccionada = '';

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  // Iniciar reloj
  actualizarReloj();
  setInterval(actualizarReloj, 1000);

  // Cargar sedes
  cargarSedes();

  // Event listener para Enter en el DNI
  document.getElementById('dniInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      // Por defecto registrar entrada al presionar Enter
      registrarAsistencia('entrada');
    }
  });

  // Event listener para cambio de sede
  document.getElementById('sedeKiosko').addEventListener('change', (e) => {
    sedeSeleccionada = e.target.value;
  });
});

// Actualizar reloj en tiempo real
function actualizarReloj() {
  const ahora = new Date();
  const horas = String(ahora.getHours()).padStart(2, '0');
  const minutos = String(ahora.getMinutes()).padStart(2, '0');
  const segundos = String(ahora.getSeconds()).padStart(2, '0');

  document.getElementById('reloj').textContent = `${horas}:${minutos}:${segundos}`;
}

// Cargar sedes desde la API (sin autenticación)
async function cargarSedes() {
  try {
    const response = await fetch('/api/kiosko/sedes');
    const data = await response.json();

    if (data.success && data.sedes.length > 0) {
      const sedeSelect = document.getElementById('sedeKiosko');
      sedeSelect.innerHTML = '<option value="">Seleccione una sede...</option>';

      data.sedes.forEach(sede => {
        const option = document.createElement('option');
        option.value = sede.id;
        option.textContent = sede.nombre_sede;
        sedeSelect.appendChild(option);
      });

      // Seleccionar la primera sede por defecto
      if (data.sedes.length > 0) {
        sedeSelect.selectedIndex = 1;
        sedeSeleccionada = data.sedes[0].id;
      }
    }
  } catch (error) {
    console.error('Error al cargar sedes:', error);
    mostrarMensaje('Error al cargar sedes', 'error');
  }
}

// Registrar asistencia (entrada o salida)
async function registrarAsistencia(tipo) {
  const dni = document.getElementById('dniInput').value.trim();

  // Validar DNI
  if (!dni) {
    mostrarMensaje('❌ Por favor ingrese su DNI', 'error');
    return;
  }

  // Validar que solo sean números
  if (!/^\d+$/.test(dni)) {
    mostrarMensaje('❌ El DNI debe contener solo números', 'error');
    return;
  }

  // Validar sede
  if (!sedeSeleccionada) {
    mostrarMensaje('❌ Por favor seleccione una sede', 'error');
    return;
  }

  try {
    // Deshabilitar botones durante la petición
    const botones = document.querySelectorAll('.btn-large');
    botones.forEach(btn => btn.disabled = true);

    const response = await fetch('/api/kiosko/registro', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        dni,
        tipo_registro: tipo,
        sede_id: parseInt(sedeSeleccionada)
      })
    });

    const data = await response.json();

    if (data.success) {
      // Formatear hora
      const fechaHora = new Date(data.registro.fecha_hora);
      const hora = fechaHora.toLocaleTimeString('es-PE', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      const tipoTexto = tipo === 'entrada' ? 'ENTRADA' : 'SALIDA';
      const emoji = tipo === 'entrada' ? '⬇️' : '⬆️';

      mostrarMensaje(
        `✅ Bienvenido, ${data.empleado.apellidos_nombres}\n${emoji} ${tipoTexto} registrada: ${hora}`,
        'success'
      );

      // Limpiar input
      document.getElementById('dniInput').value = '';

      // Auto-limpiar mensaje después de 3 segundos
      setTimeout(() => {
        ocultarMensaje();
      }, 3000);

    } else {
      mostrarMensaje(`❌ ${data.message}`, 'error');

      // Limpiar input
      document.getElementById('dniInput').value = '';
    }

    // Rehabilitar botones
    botones.forEach(btn => btn.disabled = false);

    // Enfocar en el input
    document.getElementById('dniInput').focus();

  } catch (error) {
    console.error('Error al registrar asistencia:', error);
    mostrarMensaje('❌ Error de conexión con el servidor', 'error');

    // Rehabilitar botones
    const botones = document.querySelectorAll('.btn-large');
    botones.forEach(btn => btn.disabled = false);
  }
}

// Mostrar mensaje
function mostrarMensaje(texto, tipo) {
  const mensaje = document.getElementById('mensaje');
  mensaje.className = `mensaje-kiosko ${tipo}`;
  mensaje.innerHTML = texto.replace(/\n/g, '<br>');
  mensaje.classList.remove('hidden');
}

// Ocultar mensaje
function ocultarMensaje() {
  const mensaje = document.getElementById('mensaje');
  mensaje.classList.add('hidden');
}
