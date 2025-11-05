// registro-manual.js - Lógica del registro manual de asistencia con sistema de caché

let token = '';
let empleadosData = [];
let registrosCache = []; // Registros pendientes de guardar
let sedeActual = '';
let fechaActual = '';
let tipoActual = '';

// Variables para el modal de permiso
let dniPermisoTemp = '';

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
  document.getElementById('registrador').value = user.nombre || '';

  // Configurar fecha y hora actual
  const ahora = new Date();
  document.getElementById('fecha').valueAsDate = ahora;
  document.getElementById('hora').value = ahora.toTimeString().slice(0, 5);

  // Actualizar hora cada minuto
  setInterval(() => {
    const ahora = new Date();
    document.getElementById('hora').value = ahora.toTimeString().slice(0, 5);
  }, 60000);

  // Cargar sedes
  await cargarSedes();

  // Event listeners
  document.getElementById('sede').addEventListener('change', handleSedeChange);
  document.getElementById('fecha').addEventListener('change', handleFechaChange);
  document.getElementById('tipoRegistro').addEventListener('change', handleTipoChange);
  document.getElementById('buscarEmpleado').addEventListener('input', filtrarEmpleados);
  document.getElementById('logoutBtn').addEventListener('click', cerrarSesion);

  // Actualizar contador de registros en caché
  actualizarContadorCache();
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
      const sedeSelect = document.getElementById('sede');
      sedeSelect.innerHTML = '<option value="">Seleccione una sede...</option>';

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

// Manejar cambio de sede
async function handleSedeChange() {
  const nuevoSedeId = document.getElementById('sede').value;

  if (!nuevoSedeId) {
    empleadosData = [];
    renderizarEmpleados();
    return;
  }

  // Limpiar datos previos
  sedeActual = nuevoSedeId;
  fechaActual = document.getElementById('fecha').value;
  tipoActual = document.getElementById('tipoRegistro').value;

  // Limpiar búsqueda
  document.getElementById('buscarEmpleado').value = '';

  // Cargar nuevos empleados
  await cargarEmpleados();
  await actualizarResumen();
}

// Manejar cambio de fecha
async function handleFechaChange() {
  fechaActual = document.getElementById('fecha').value;
  if (sedeActual) {
    await actualizarResumen();
  }
}

// Manejar cambio de tipo
async function handleTipoChange() {
  tipoActual = document.getElementById('tipoRegistro').value;
}

// Cargar empleados de la sede
async function cargarEmpleados() {
  if (!sedeActual) return;

  try {
    const response = await fetch(`/api/empleados?sede_id=${sedeActual}&activo=true`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (data.success) {
      empleadosData = data.empleados || [];
      console.log('Empleados cargados:', empleadosData.length);

      // Verificar registros existentes en BD
      await verificarRegistrosExistentes();

      renderizarEmpleados();
    } else {
      console.error('Error en la respuesta:', data);
      mostrarToast('Error al cargar empleados', 'error');
    }
  } catch (error) {
    console.error('Error al cargar empleados:', error);
    mostrarToast('Error al cargar empleados', 'error');
  }
}

// Verificar qué empleados ya tienen registro en la BD
async function verificarRegistrosExistentes() {
  const fecha = document.getElementById('fecha').value;
  const tipo = document.getElementById('tipoRegistro').value;

  if (!fecha || !tipo) return;

  for (const empleado of empleadosData) {
    try {
      const response = await fetch(
        `/api/asistencia/verificar-registro?dni=${empleado.dni}&fecha=${fecha}&tipo=${tipo}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (data.existe && data.registro) {
        // Guardar el estado ya registrado en el objeto del empleado
        empleado.registroExistente = {
          estado: data.registro.estado,
          hora: data.registro.hora,
          registrador: data.registro.registrador
        };
      } else {
        empleado.registroExistente = null;
      }
    } catch (error) {
      empleado.registroExistente = null;
    }
  }
}

// Filtrar empleados por búsqueda
function filtrarEmpleados() {
  const busqueda = document.getElementById('buscarEmpleado').value.toLowerCase();

  if (!busqueda) {
    renderizarEmpleados(empleadosData);
    return;
  }

  const empleadosFiltrados = empleadosData.filter(emp => {
    const nombre = emp.apellidos_nombres.toLowerCase();
    const dni = emp.dni.toLowerCase();
    return nombre.includes(busqueda) || dni.includes(busqueda);
  });

  renderizarEmpleados(empleadosFiltrados);
}

// Renderizar lista de empleados con tooltips y botones al costado
function renderizarEmpleados(empleados = empleadosData) {
  const container = document.getElementById('empleadosList');

  if (empleados.length === 0) {
    container.innerHTML = `
      <p style="text-align: center; color: var(--text-secondary); padding: 40px;">
        ${sedeActual ? 'No hay empleados en esta sede' : 'Seleccione una sede para ver los empleados'}
      </p>
    `;
    return;
  }

  container.innerHTML = empleados.map(emp => {
    // Verificar si ya está registrado en caché
    const yaRegistradoCache = registrosCache.some(r => r.dni === emp.dni);
    const registroCache = registrosCache.find(r => r.dni === emp.dni);

    // Verificar si ya está guardado en BD
    const yaGuardadoBD = emp.registroExistente !== null && emp.registroExistente !== undefined;

    // Construir tooltip con información completa
    const tooltipHTML = crearTooltip(emp);

    const sedeNombre = emp.sedes?.nombre_sede || 'Sin sede';
    const proyectoNombre = emp.proyectos?.nombre_proyecto || 'Sin proyecto';

    // Determinar el estado a mostrar y el color
    let estadoMostrar = '';
    let colorEstado = '';
    let claseFondo = '';

    if (yaGuardadoBD) {
      // Ya está guardado en BD - mostrar ese estado
      const estado = emp.registroExistente.estado;
      estadoMostrar = `✔️ GUARDADO: ${estado.toUpperCase()} (${emp.registroExistente.hora})`;

      switch(estado) {
        case 'presente': colorEstado = 'var(--success)'; claseFondo = 'guardado-bd'; break;
        case 'tardanza': colorEstado = 'var(--warning)'; claseFondo = 'guardado-bd'; break;
        case 'falta': colorEstado = 'var(--danger)'; claseFondo = 'guardado-bd'; break;
        case 'permiso': colorEstado = 'var(--info)'; claseFondo = 'guardado-bd'; break;
      }
    } else if (yaRegistradoCache) {
      // Está en caché - mostrar ese estado
      estadoMostrar = `📝 EN CACHÉ: ${registroCache.estado.toUpperCase()}`;
      colorEstado = 'var(--primary)';
      claseFondo = 'registrado';
    }

    return `
      <div class="empleado-item ${claseFondo}">
        <div class="empleado-info-container">
          <div class="empleado-info">
            <div class="empleado-nombre">
              ${emp.dni} - ${emp.apellidos_nombres}
              <span class="info-icon">
                ℹ
                <div class="tooltip">${tooltipHTML}</div>
              </span>
              ${estadoMostrar ? `<span style="color: ${colorEstado}; font-size: 14px; margin-left: 8px; font-weight: 600;">${estadoMostrar}</span>` : ''}
            </div>
            <div class="empleado-detalles">${sedeNombre} - ${proyectoNombre}</div>
          </div>
        </div>
        <div class="estado-buttons-inline">
          ${yaGuardadoBD ? `
            <!-- Ya está guardado en BD - botones deshabilitados -->
            <button class="btn btn-success" disabled>✅ Presente</button>
            <button class="btn btn-warning" disabled>🟡 Tardanza</button>
            <button class="btn btn-danger" disabled>❌ Falta</button>
            <button class="btn btn-info" disabled>📝 Permiso</button>
          ` : yaRegistradoCache ? `
            <!-- Está en caché - permitir cambiar -->
            <button
              class="btn btn-success ${registroCache.estado === 'presente' ? 'active' : ''}"
              onclick="marcarAsistencia('${emp.dni}', 'presente')"
            >
              ✅ Presente
            </button>
            <button
              class="btn btn-warning ${registroCache.estado === 'tardanza' ? 'active' : ''}"
              onclick="marcarAsistencia('${emp.dni}', 'tardanza')"
            >
              🟡 Tardanza
            </button>
            <button
              class="btn btn-danger ${registroCache.estado === 'falta' ? 'active' : ''}"
              onclick="marcarAsistencia('${emp.dni}', 'falta')"
            >
              ❌ Falta
            </button>
            <button
              class="btn btn-info ${registroCache.estado === 'permiso' ? 'active' : ''}"
              onclick="abrirModalPermiso('${emp.dni}')"
            >
              📝 Permiso
            </button>
            <button
              class="btn"
              onclick="quitarDeCache('${emp.dni}')"
              style="background: var(--danger); color: white;"
            >
              🗑️ Quitar
            </button>
          ` : `
            <!-- Sin registrar - botones normales -->
            <button
              class="btn btn-success"
              onclick="marcarAsistencia('${emp.dni}', 'presente')"
            >
              ✅ Presente
            </button>
            <button
              class="btn btn-warning"
              onclick="marcarAsistencia('${emp.dni}', 'tardanza')"
            >
              🟡 Tardanza
            </button>
            <button
              class="btn btn-danger"
              onclick="marcarAsistencia('${emp.dni}', 'falta')"
            >
              ❌ Falta
            </button>
            <button
              class="btn btn-info"
              onclick="abrirModalPermiso('${emp.dni}')"
            >
              📝 Permiso
            </button>
          `}
        </div>
      </div>
    `;
  }).join('');
}

// Crear HTML del tooltip con información completa
function crearTooltip(emp) {
  const rows = [
    { label: 'DNI:', value: emp.dni },
    { label: 'Nombre:', value: emp.apellidos_nombres },
    { label: 'Email:', value: emp.email || 'No registrado' },
    { label: 'Teléfono:', value: emp.telefono || 'No registrado' },
    { label: 'Sede:', value: emp.sedes?.nombre_sede || 'Sin sede' },
    { label: 'DTT:', value: emp.dtt?.nombre_dtt || 'Sin DTT' },
    { label: 'Proyecto:', value: emp.proyectos?.nombre_proyecto || 'Sin proyecto' },
    { label: 'Modalidad:', value: emp.modalidades?.nombre_modalidad || 'Sin modalidad' },
    { label: 'Tipo Contrato:', value: emp.tipos_contrato?.tipo_contrato || 'Sin contrato' },
    { label: 'División:', value: emp.relaciones_division?.divisiones?.nombre_division || 'Sin división' },
    { label: 'Coordinador:', value: emp.relaciones_division?.coordinadores_division?.nombre_coordinador || 'Sin coordinador' },
    { label: 'Scrum Master:', value: emp.relaciones_division?.scrum_masters?.nombre_scrum_master || 'Sin Scrum Master' }
  ];

  return rows.map(row => `
    <div class="tooltip-row">
      <span class="tooltip-label">${row.label}</span>
      <span class="tooltip-value">${row.value}</span>
    </div>
  `).join('');
}

// Marcar asistencia en caché (no envía a BD todavía)
function marcarAsistencia(dni, estado) {
  // Validaciones
  const fecha = document.getElementById('fecha').value;
  const hora = document.getElementById('hora').value;
  const sede_id = document.getElementById('sede').value;
  const tipo_registro = document.getElementById('tipoRegistro').value;
  const registrador = document.getElementById('registrador').value;

  if (!fecha || !hora || !sede_id || !registrador) {
    mostrarToast('Complete todos los campos de configuración', 'error');
    return;
  }

  // Verificar si ya existe en caché
  const indiceExistente = registrosCache.findIndex(r => r.dni === dni);

  const nuevoRegistro = {
    dni,
    fecha,
    hora,
    sede_id: parseInt(sede_id),
    tipo_registro,
    estado,
    registrador
  };

  if (indiceExistente !== -1) {
    // Ya existe - reemplazar (cambiar estado)
    registrosCache[indiceExistente] = nuevoRegistro;
    mostrarToast(`Cambiado a ${estado.toUpperCase()}`, 'info');
  } else {
    // No existe - agregar nuevo
    registrosCache.push(nuevoRegistro);
    mostrarToast(`Marcado como ${estado.toUpperCase()} - Presiona "Guardar" para enviar a BD`, 'info');
  }

  // Actualizar vista
  renderizarEmpleados();
  actualizarContadorCache();
}

// Quitar empleado del caché
function quitarDeCache(dni) {
  const indice = registrosCache.findIndex(r => r.dni === dni);

  if (indice !== -1) {
    registrosCache.splice(indice, 1);
    mostrarToast('Registro eliminado del caché', 'success');

    // Actualizar vista
    renderizarEmpleados();
    actualizarContadorCache();
  }
}

// Abrir modal de permiso
function abrirModalPermiso(dni) {
  dniPermisoTemp = dni;
  document.getElementById('motivoPermiso').value = '';
  document.getElementById('permisoModal').classList.remove('hidden');
}

// Cerrar modal de permiso
function cerrarModalPermiso() {
  dniPermisoTemp = '';
  document.getElementById('permisoModal').classList.add('hidden');
}

// Confirmar permiso y agregar a caché
function confirmarPermiso() {
  const motivo = document.getElementById('motivoPermiso').value.trim();

  if (!motivo) {
    mostrarToast('Debe ingresar un motivo para el permiso', 'warning');
    return;
  }

  const fecha = document.getElementById('fecha').value;
  const hora = document.getElementById('hora').value;
  const sede_id = document.getElementById('sede').value;
  const tipo_registro = document.getElementById('tipoRegistro').value;
  const registrador = document.getElementById('registrador').value;

  if (!fecha || !hora || !sede_id || !registrador) {
    mostrarToast('Complete todos los campos de configuración', 'error');
    return;
  }

  // Verificar si ya existe en caché
  const indiceExistente = registrosCache.findIndex(r => r.dni === dniPermisoTemp);

  const nuevoRegistro = {
    dni: dniPermisoTemp,
    fecha,
    hora,
    sede_id: parseInt(sede_id),
    tipo_registro,
    estado: 'permiso',
    motivo_permiso: motivo,
    registrador
  };

  if (indiceExistente !== -1) {
    // Ya existe - reemplazar
    registrosCache[indiceExistente] = nuevoRegistro;
    mostrarToast('Cambiado a PERMISO', 'info');
  } else {
    // No existe - agregar nuevo
    registrosCache.push(nuevoRegistro);
    mostrarToast('Permiso marcado - Presiona "Guardar" para enviar a BD', 'info');
  }

  cerrarModalPermiso();
  renderizarEmpleados();
  actualizarContadorCache();
}

// Actualizar contador de registros en caché
function actualizarContadorCache() {
  const count = registrosCache.length;

  // Remover botón existente si hay
  const btnExistente = document.getElementById('btnGuardarTodos');
  if (btnExistente) {
    btnExistente.remove();
  }

  if (count > 0) {
    // Crear botón flotante
    const btn = document.createElement('button');
    btn.id = 'btnGuardarTodos';
    btn.className = 'btn btn-primary btn-guardar-todos';
    btn.innerHTML = `
      💾 Guardar Todos los Registros
      <span class="badge">${count}</span>
    `;
    btn.onclick = guardarTodosLosRegistros;
    document.body.appendChild(btn);
  }
}

// Guardar todos los registros en la base de datos
async function guardarTodosLosRegistros() {
  if (registrosCache.length === 0) {
    mostrarToast('No hay registros para guardar', 'warning');
    return;
  }

  const btn = document.getElementById('btnGuardarTodos');
  btn.disabled = true;
  btn.textContent = 'Guardando...';

  let exitosos = 0;
  let errores = 0;

  for (const registro of registrosCache) {
    try {
      const response = await fetch('/api/asistencia/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(registro)
      });

      const data = await response.json();

      if (data.success) {
        exitosos++;
      } else {
        errores++;
        console.error('Error al guardar registro:', data.message);
      }
    } catch (error) {
      errores++;
      console.error('Error de red:', error);
    }
  }

  // Limpiar caché
  registrosCache = [];
  actualizarContadorCache();

  // Actualizar vista y resumen
  await actualizarResumen();
  await cargarEmpleados();

  // Mostrar resultado
  if (errores === 0) {
    mostrarToast(`✅ ${exitosos} registros guardados exitosamente`, 'success');
  } else {
    mostrarToast(`⚠️ ${exitosos} exitosos, ${errores} con errores`, 'warning');
  }
}

// Actualizar resumen del día
async function actualizarResumen() {
  const fecha = document.getElementById('fecha').value;
  const sede_id = document.getElementById('sede').value;

  if (!fecha || !sede_id) return;

  try {
    const response = await fetch(`/api/asistencia/resumen?fecha=${fecha}&sede_id=${sede_id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (data.success) {
      document.getElementById('totalRegistrados').textContent = data.total_registrados;
      document.getElementById('totalPresentes').textContent = data.total_presentes;
      document.getElementById('totalTardanzas').textContent = data.total_tardanzas;
      document.getElementById('totalFaltas').textContent = data.total_faltas;
      document.getElementById('totalPermisos').textContent = data.total_permisos;
    }
  } catch (error) {
    console.error('Error al actualizar resumen:', error);
  }
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

  if (registrosCache.length > 0) {
    if (!confirm(`Tienes ${registrosCache.length} registros sin guardar. ¿Estás seguro de salir?`)) {
      return;
    }
  }

  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login.html';
}
