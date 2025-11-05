// dashboard.js - Lógica del dashboard y reportes

let token = '';
let registrosActuales = [];

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
  // Verificar autenticación
  token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/login.html';
    return;
  }

  // Mostrar info del usuario
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  document.getElementById('userInfo').textContent = `Hola, ${user.nombre || 'Usuario'}`;

  // Configurar fechas por defecto (últimos 7 días)
  const hoy = new Date();
  const hace7Dias = new Date();
  hace7Dias.setDate(hoy.getDate() - 7);

  document.getElementById('fechaDesde').valueAsDate = hace7Dias;
  document.getElementById('fechaHasta').valueAsDate = hoy;

  // Cargar sedes
  await cargarSedes();

  // Cargar datos iniciales
  await aplicarFiltros();

  // Event listeners
  document.getElementById('logoutBtn').addEventListener('click', cerrarSesion);
});

// Cargar sedes desde la API
async function cargarSedes() {
  try {
    const response = await fetch('/api/sedes', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (data.success) {
      const sedeSelect = document.getElementById('sedeFilter');

      data.sedes.forEach(sede => {
        const option = document.createElement('option');
        option.value = sede.id;
        option.textContent = sede.nombre_sede;
        sedeSelect.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error al cargar sedes:', error);
    mostrarToast('Error al cargar sedes', 'error');
  }
}

// Aplicar filtros y cargar datos
async function aplicarFiltros() {
  const fechaDesde = document.getElementById('fechaDesde').value;
  const fechaHasta = document.getElementById('fechaHasta').value;
  const sedeId = document.getElementById('sedeFilter').value;

  if (!fechaDesde || !fechaHasta) {
    mostrarToast('Seleccione ambas fechas', 'warning');
    return;
  }

  // Validar que fecha_desde no sea mayor que fecha_hasta
  if (new Date(fechaDesde) > new Date(fechaHasta)) {
    mostrarToast('La fecha desde no puede ser mayor que la fecha hasta', 'error');
    return;
  }

  try {
    // Cargar estadísticas y registros en paralelo
    await Promise.all([
      cargarEstadisticas(fechaDesde, fechaHasta, sedeId),
      cargarRegistros(fechaDesde, fechaHasta, sedeId)
    ]);

    mostrarToast('Datos actualizados correctamente', 'success');
  } catch (error) {
    console.error('Error al aplicar filtros:', error);
    mostrarToast('Error al cargar datos', 'error');
  }
}

// Cargar estadísticas
async function cargarEstadisticas(fechaDesde, fechaHasta, sedeId) {
  try {
    const params = new URLSearchParams({
      fecha_desde: fechaDesde,
      fecha_hasta: fechaHasta
    });

    if (sedeId !== 'todas') {
      params.append('sede_id', sedeId);
    }

    const response = await fetch(`/api/reportes/estadisticas?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (data.success) {
      document.getElementById('statTotal').textContent = data.total;
      document.getElementById('statPresentes').textContent = data.presentes;
      document.getElementById('statTardanzas').textContent = data.tardanzas;
      document.getElementById('statFaltas').textContent = data.faltas;
      document.getElementById('statPermisos').textContent = data.permisos;
    }
  } catch (error) {
    console.error('Error al cargar estadísticas:', error);
    throw error;
  }
}

// Cargar registros
async function cargarRegistros(fechaDesde, fechaHasta, sedeId) {
  try {
    const params = new URLSearchParams({
      fecha_desde: fechaDesde,
      fecha_hasta: fechaHasta
    });

    if (sedeId !== 'todas') {
      params.append('sede_id', sedeId);
    }

    const response = await fetch(`/api/reportes/lista?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (data.success) {
      registrosActuales = data.registros;
      renderizarRegistros(data.registros);
    }
  } catch (error) {
    console.error('Error al cargar registros:', error);
    throw error;
  }
}

// Renderizar tabla de registros
function renderizarRegistros(registros) {
  const tbody = document.getElementById('registrosBody');

  if (registros.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; padding: 40px; color: var(--text-secondary);">
          No hay registros para mostrar con los filtros seleccionados
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = registros.map(reg => {
    const estadoClass = getEstadoClass(reg.estado);
    const estadoEmoji = getEstadoEmoji(reg.estado);
    const tipoEmoji = reg.tipo_registro === 'entrada' ? '⬇️' : '⬆️';
    const nombreEmpleado = reg.empleados?.apellidos_nombres || 'N/A';
    const nombreSede = reg.sedes?.nombre_sede || 'N/A';
    const observaciones = reg.motivo_permiso || reg.observaciones || '-';

    return `
      <tr>
        <td>${formatearFecha(reg.fecha)}</td>
        <td>${reg.hora}</td>
        <td>${reg.dni}</td>
        <td>${nombreEmpleado}</td>
        <td>${nombreSede}</td>
        <td>${tipoEmoji} ${capitalize(reg.tipo_registro)}</td>
        <td>
          <span style="color: var(--${estadoClass});">
            ${estadoEmoji} ${capitalize(reg.estado)}
          </span>
        </td>
        <td>${reg.registrador}</td>
        <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
            title="${observaciones}">
          ${observaciones}
        </td>
      </tr>
    `;
  }).join('');
}

// Exportar a Excel
function exportarExcel() {
  if (registrosActuales.length === 0) {
    mostrarToast('No hay datos para exportar', 'warning');
    return;
  }

  try {
    // Preparar datos para Excel
    const datosExcel = registrosActuales.map(reg => ({
      'Fecha': formatearFecha(reg.fecha),
      'Hora': reg.hora,
      'DNI': reg.dni,
      'Nombre Completo': reg.empleados?.apellidos_nombres || 'N/A',
      'Sede': reg.sedes?.nombre_sede || 'N/A',
      'Tipo': capitalize(reg.tipo_registro),
      'Estado': capitalize(reg.estado),
      'Registrador': reg.registrador,
      'Motivo/Observaciones': reg.motivo_permiso || reg.observaciones || '-'
    }));

    // Crear libro de Excel
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(datosExcel);

    // Ajustar ancho de columnas
    const columnWidths = [
      { wch: 12 }, // Fecha
      { wch: 8 },  // Hora
      { wch: 10 }, // DNI
      { wch: 35 }, // Nombre
      { wch: 20 }, // Sede
      { wch: 10 }, // Tipo
      { wch: 10 }, // Estado
      { wch: 20 }, // Registrador
      { wch: 30 }  // Observaciones
    ];
    ws['!cols'] = columnWidths;

    // Agregar hoja al libro
    XLSX.utils.book_append_sheet(wb, ws, 'Asistencias');

    // Generar nombre del archivo
    const fechaDesde = document.getElementById('fechaDesde').value.replace(/-/g, '');
    const fechaHasta = document.getElementById('fechaHasta').value.replace(/-/g, '');
    const nombreArchivo = `asistencias_${fechaDesde}_${fechaHasta}.xlsx`;

    // Descargar archivo
    XLSX.writeFile(wb, nombreArchivo);

    mostrarToast('Archivo Excel descargado correctamente', 'success');
  } catch (error) {
    console.error('Error al exportar Excel:', error);
    mostrarToast('Error al exportar archivo Excel', 'error');
  }
}

// Utilidades

function formatearFecha(fecha) {
  const [year, month, day] = fecha.split('-');
  return `${day}/${month}/${year}`;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getEstadoClass(estado) {
  const clases = {
    'presente': 'success',
    'tardanza': 'warning',
    'falta': 'danger',
    'permiso': 'info'
  };
  return clases[estado] || 'text';
}

function getEstadoEmoji(estado) {
  const emojis = {
    'presente': '✅',
    'tardanza': '🟡',
    'falta': '❌',
    'permiso': '📝'
  };
  return emojis[estado] || '';
}

// Mostrar notificación toast
function mostrarToast(mensaje, tipo = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${tipo}`;
  toast.textContent = mensaje;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// Cerrar sesión
function cerrarSesion(e) {
  e.preventDefault();
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login.html';
}
