// database.js - Conexión a Supabase
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('L ERROR: Faltan variables de entorno de Supabase');
  process.exit(1);
}

// Crear cliente de Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// Función para verificar la conexión
async function verificarConexion() {
  try {
    const { data, error } = await supabase
      .from('empleados')
      .select('count', { count: 'exact', head: true });

    if (error) {
      console.error('L Error al conectar con Supabase:', error.message);
      return false;
    }

    console.log(' Conexión exitosa a Supabase');
    return true;
  } catch (error) {
    console.error('L Error de conexión:', error.message);
    return false;
  }
}

module.exports = {
  supabase,
  verificarConexion
};
