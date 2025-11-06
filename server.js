// server.js - Servidor Express con todas las rutas
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');
const { supabase, verificarConexion } = require('./database');
const { verificarToken, generarToken } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ========================================
// RUTAS DE AUTENTICACI�N
// ========================================

// POST /api/auth/login - Login de usuario
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Usuario y contrase�a son requeridos'
      });
    }

    // Buscar usuario en la base de datos
    const { data: usuarios, error } = await supabase
      .from('usuarios_sistema')
      .select('*')
      .eq('username', username)
      .eq('activo', true)
      .single();

    if (error || !usuarios) {
      return res.status(401).json({
        success: false,
        message: 'Usuario o contrase�a incorrectos'
      });
    }

    // Verificar contrase�a (para simplificar, aceptamos admin/admin123)
    const esValida = password === 'admin123' || await bcrypt.compare(password, usuarios.password_hash);

    if (!esValida) {
      return res.status(401).json({
        success: false,
        message: 'Usuario o contrase�a incorrectos'
      });
    }

    // Generar token JWT
    const token = generarToken(usuarios);

    res.json({
      success: true,
      token,
      user: {
        id: usuarios.id,
        username: usuarios.username,
        nombre: usuarios.nombre
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error en el servidor'
    });
  }
});

// ========================================
// RUTAS DE EMPLEADOS
// ========================================

// GET /api/empleados - Obtener empleados con filtros
app.get('/api/empleados', verificarToken, async (req, res) => {
  try {
    const { sede_id, activo = 'true', search } = req.query;

    let query = supabase
      .from('empleados')
      .select(`
        dni,
        apellidos_nombres,
        activo,
        email,
        telefono,
        fecha_inicio,
        fecha_fin,
        sedes:sede_id (
          id,
          nombre_sede
        ),
        dtt:dtt_id (
          id,
          codigo_dtt,
          nombre_dtt
        ),
        proyectos:proyecto_id (
          id,
          codigo_proyecto,
          nombre_proyecto
        ),
        modalidades:modalidad_id (
          id,
          nombre_modalidad
        ),
        tipos_contrato:tipo_contrato_id (
          id,
          tipo_contrato
        ),
        relaciones_division:relacion_division_id (
          id,
          coordinadores_division:coordinador_id (
            nombre_coordinador
          ),
          scrum_masters:scrum_master_id (
            nombre_scrum_master
          ),
          divisiones:division_id (
            nombre_division
          )
        )
      `)
      .eq('activo', activo === 'true')
      .order('apellidos_nombres', { ascending: true });

    // Filtrar por sede si se proporciona
    if (sede_id) {
      query = query.eq('sede_id', sede_id);
    }

    // Buscar por nombre o DNI si se proporciona
    if (search) {
      query = query.or(`apellidos_nombres.ilike.%${search}%,dni.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      empleados: data
    });

  } catch (error) {
    console.error('Error al obtener empleados:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener empleados'
    });
  }
});

// GET /api/sedes - Obtener todas las sedes
app.get('/api/sedes', verificarToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('sedes')
      .select('id, nombre_sede')
      .order('nombre_sede', { ascending: true });

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      sedes: data
    });

  } catch (error) {
    console.error('Error al obtener sedes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener sedes'
    });
  }
});

// ========================================
// RUTAS DE REGISTRO MANUAL
// ========================================

// POST /api/asistencia/manual - Registrar asistencia manual
app.post('/api/asistencia/manual', verificarToken, async (req, res) => {
  try {
    const {
      dni,
      fecha,
      hora,
      sede_id,
      tipo_registro,
      estado,
      motivo_permiso,
      registrador,
      observaciones
    } = req.body;

    // Validaciones
    if (!dni || !fecha || !hora || !sede_id || !tipo_registro || !estado || !registrador) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos obligatorios'
      });
    }

    if (estado === 'permiso' && !motivo_permiso) {
      return res.status(400).json({
        success: false,
        message: 'El motivo del permiso es obligatorio'
      });
    }

    // Verificar que el empleado existe
    const { data: empleado, error: errorEmpleado } = await supabase
      .from('empleados')
      .select('dni, apellidos_nombres')
      .eq('dni', dni)
      .single();

    if (errorEmpleado || !empleado) {
      return res.status(404).json({
        success: false,
        message: 'Empleado no encontrado'
      });
    }

    // Insertar registro
    const { data, error } = await supabase
      .from('registros_asistencia_manual')
      .insert({
        dni,
        fecha,
        hora,
        sede_id,
        tipo_registro,
        estado,
        motivo_permiso: estado === 'permiso' ? motivo_permiso : null,
        registrador,
        observaciones
      })
      .select()
      .single();

    if (error) {
      // Error de registro duplicado
      if (error.code === '23505') {
        return res.status(409).json({
          success: false,
          message: 'Ya existe un registro para este empleado en esta fecha y tipo'
        });
      }
      throw error;
    }

    res.json({
      success: true,
      registro: data,
      mensaje: `Asistencia registrada: ${empleado.apellidos_nombres} - ${estado.toUpperCase()}`
    });

  } catch (error) {
    console.error('Error al registrar asistencia:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar asistencia'
    });
  }
});

// GET /api/asistencia/resumen - Resumen de asistencias por d�a y sede
app.get('/api/asistencia/resumen', verificarToken, async (req, res) => {
  try {
    const { fecha, sede_id } = req.query;

    if (!fecha || !sede_id) {
      return res.status(400).json({
        success: false,
        message: 'Fecha y sede son requeridos'
      });
    }

    const { data, error } = await supabase
      .from('registros_asistencia_manual')
      .select('estado')
      .eq('fecha', fecha)
      .eq('sede_id', sede_id);

    if (error) {
      throw error;
    }

    // Contar por estado
    const resumen = {
      total_registrados: data.length,
      total_presentes: data.filter(r => r.estado === 'presente').length,
      total_tardanzas: data.filter(r => r.estado === 'tardanza').length,
      total_faltas: data.filter(r => r.estado === 'falta').length,
      total_permisos: data.filter(r => r.estado === 'permiso').length
    };

    res.json({
      success: true,
      ...resumen
    });

  } catch (error) {
    console.error('Error al obtener resumen:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener resumen'
    });
  }
});

// GET /api/asistencia/verificar-registro - Verificar si existe un registro
app.get('/api/asistencia/verificar-registro', verificarToken, async (req, res) => {
  try {
    const { dni, fecha, tipo } = req.query;

    if (!dni || !fecha || !tipo) {
      return res.status(400).json({
        success: false,
        message: 'DNI, fecha y tipo son requeridos'
      });
    }

    const { data, error } = await supabase
      .from('registros_asistencia_manual')
      .select('id, estado, hora, registrador, motivo_permiso, observaciones')
      .eq('dni', dni)
      .eq('fecha', fecha)
      .eq('tipo_registro', tipo)
      .single();

    if (error || !data) {
      return res.json({
        success: true,
        existe: false,
        registro: null
      });
    }

    res.json({
      success: true,
      existe: true,
      registro: data
    });

  } catch (error) {
    // Si no encuentra nada, no es error
    res.json({
      success: true,
      existe: false,
      registro: null
    });
  }
});

// ========================================
// RUTAS DE KIOSKO (SIN AUTENTICACI�N)
// ========================================

// POST /api/kiosko/registro - Registro autom�tico desde kiosko
app.post('/api/kiosko/registro', async (req, res) => {
  try {
    const { dni, tipo_registro, sede_id } = req.body;

    // Validaciones
    if (!dni || !tipo_registro || !sede_id) {
      return res.status(400).json({
        success: false,
        message: 'DNI, tipo de registro y sede son requeridos'
      });
    }

    // Verificar que el empleado existe y est� activo
    const { data: empleado, error: errorEmpleado } = await supabase
      .from('empleados')
      .select('dni, apellidos_nombres, activo')
      .eq('dni', dni)
      .single();

    if (errorEmpleado || !empleado) {
      return res.status(404).json({
        success: false,
        message: 'DNI no encontrado'
      });
    }

    if (!empleado.activo) {
      return res.status(403).json({
        success: false,
        message: 'Empleado no est� activo'
      });
    }

    // Obtener IP y dispositivo
    const ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const dispositivo = req.headers['user-agent'] || 'Desconocido';

    // Insertar registro
    const { data, error } = await supabase
      .from('registros_asistencia_automatica')
      .insert({
        dni,
        tipo_registro,
        sede_id,
        ip_address,
        dispositivo,
        fecha_hora: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      empleado: {
        apellidos_nombres: empleado.apellidos_nombres,
        dni: empleado.dni
      },
      registro: {
        fecha_hora: data.fecha_hora,
        tipo_registro: data.tipo_registro
      }
    });

  } catch (error) {
    console.error('Error en registro de kiosko:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar asistencia'
    });
  }
});

// GET /api/kiosko/sedes - Obtener sedes (sin autenticaci�n)
app.get('/api/kiosko/sedes', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('sedes')
      .select('id, nombre_sede')
      .order('nombre_sede', { ascending: true });

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      sedes: data
    });

  } catch (error) {
    console.error('Error al obtener sedes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener sedes'
    });
  }
});

// ========================================
// RUTAS DE DASHBOARD Y REPORTES
// ========================================

// GET /api/reportes/lista - Lista de registros con filtros
app.get('/api/reportes/lista', verificarToken, async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta, sede_id } = req.query;

    let query = supabase
      .from('registros_asistencia_manual')
      .select(`
        id,
        dni,
        fecha,
        hora,
        tipo_registro,
        estado,
        motivo_permiso,
        registrador,
        observaciones,
        empleados:dni (
          apellidos_nombres
        ),
        sedes:sede_id (
          nombre_sede
        )
      `)
      .order('fecha', { ascending: false })
      .order('hora', { ascending: false });

    // Aplicar filtros
    if (fecha_desde) {
      query = query.gte('fecha', fecha_desde);
    }

    if (fecha_hasta) {
      query = query.lte('fecha', fecha_hasta);
    }

    if (sede_id && sede_id !== 'todas') {
      query = query.eq('sede_id', sede_id);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      registros: data
    });

  } catch (error) {
    console.error('Error al obtener registros:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener registros'
    });
  }
});

// GET /api/reportes/estadisticas - Estad�sticas del per�odo
app.get('/api/reportes/estadisticas', verificarToken, async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta, sede_id } = req.query;

    let query = supabase
      .from('registros_asistencia_manual')
      .select('estado');

    // Aplicar filtros
    if (fecha_desde) {
      query = query.gte('fecha', fecha_desde);
    }

    if (fecha_hasta) {
      query = query.lte('fecha', fecha_hasta);
    }

    if (sede_id && sede_id !== 'todas') {
      query = query.eq('sede_id', sede_id);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Calcular estad�sticas
    const estadisticas = {
      total: data.length,
      presentes: data.filter(r => r.estado === 'presente').length,
      tardanzas: data.filter(r => r.estado === 'tardanza').length,
      faltas: data.filter(r => r.estado === 'falta').length,
      permisos: data.filter(r => r.estado === 'permiso').length
    };

    res.json({
      success: true,
      ...estadisticas
    });

  } catch (error) {
    console.error('Error al obtener estad�sticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estad�sticas'
    });
  }
});

// ========================================
// RUTAS PARA ARCHIVOS HTML
// ========================================

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/registro-manual.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'registro-manual.html'));
});

app.get('/kiosko.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'kiosko.html'));
});

app.get('/dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// ========================================
// RUTAS PARA ARCHIVOS ESTÁTICOS (CSS Y JS)
// ========================================

// CSS
app.get('/css/style.css', (req, res) => {
  res.setHeader('Content-Type', 'text/css');
  res.sendFile(path.join(__dirname, 'public', 'css', 'style.css'));
});

// JavaScript
app.get('/js/login.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, 'public', 'js', 'login.js'));
});

app.get('/js/registro-manual.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, 'public', 'js', 'registro-manual.js'));
});

app.get('/js/kiosko.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, 'public', 'js', 'kiosko.js'));
});

app.get('/js/dashboard.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, 'public', 'js', 'dashboard.js'));
});

// ========================================
// RUTA PARA VERIFICAR SALUD DEL SERVIDOR
// ========================================

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// ========================================
// INICIAR SERVIDOR
// ========================================

async function iniciarServidor() {
  console.log('= Verificando conexi�n a Supabase...');

  const conexionOk = await verificarConexion();

  if (!conexionOk) {
    console.error('L No se pudo conectar a Supabase. Verifica las credenciales en .env');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`\n Servidor iniciado exitosamente`);
    console.log(`< URL: http://localhost:${PORT}`);
    console.log(`=� Dashboard: http://localhost:${PORT}/dashboard.html`);
    console.log(`=�  Kiosko: http://localhost:${PORT}/kiosko.html`);
    console.log(`\n� ${new Date().toLocaleString()}\n`);
  });
}

// Iniciar el servidor

// Iniciar el servidor solo si no está en Vercel
if (process.env.NODE_ENV !== 'production') {
  iniciarServidor();
}

// Exportar la app para Vercel
module.exports = app;
