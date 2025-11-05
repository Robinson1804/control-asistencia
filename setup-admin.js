// setup-admin.js - Script para crear usuario administrador
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { supabase } = require('./database');

async function crearUsuarioAdmin() {
  try {
    console.log('🔄 Verificando si existe usuario admin...');

    // Verificar si ya existe el usuario admin
    const { data: existente } = await supabase
      .from('usuarios_sistema')
      .select('id')
      .eq('username', 'admin')
      .single();

    if (existente) {
      console.log('✅ El usuario admin ya existe');
      process.exit(0);
    }

    console.log('📝 Creando usuario admin...');

    // Generar hash de la contraseña
    const passwordHash = await bcrypt.hash('admin123', 10);

    // Insertar usuario
    const { data, error } = await supabase
      .from('usuarios_sistema')
      .insert({
        username: 'admin',
        password_hash: passwordHash,
        nombre: 'Administrador',
        activo: true
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log('✅ Usuario admin creado exitosamente');
    console.log('📋 Credenciales:');
    console.log('   Usuario: admin');
    console.log('   Contraseña: admin123');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error al crear usuario admin:', error.message);
    process.exit(1);
  }
}

crearUsuarioAdmin();
