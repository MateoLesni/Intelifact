// Script de prueba de conexión a Supabase
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

console.log('=== TEST DE CONEXIÓN A SUPABASE ===\n');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

console.log('1. Variables de entorno:');
console.log('   SUPABASE_URL:', supabaseUrl);
console.log('   SUPABASE_ANON_KEY presente:', !!supabaseKey);
console.log('   SUPABASE_ANON_KEY (primeros 30):', supabaseKey?.substring(0, 30) + '...\n');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERROR: Faltan credenciales en el archivo .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('2. Probando conexión...');

    const { data, error, count } = await supabase
      .from('usuarios')
      .select('*', { count: 'exact' });

    if (error) {
      console.error('❌ ERROR al conectar:');
      console.error('   Mensaje:', error.message);
      console.error('   Código:', error.code);
      console.error('   Detalles:', error.details);
      console.error('   Hint:', error.hint);
      console.error('   Error completo:', JSON.stringify(error, null, 2));
      process.exit(1);
    }

    console.log('✅ CONEXIÓN EXITOSA!');
    console.log('   Total de usuarios:', count);
    console.log('   Usuarios encontrados:');
    data.forEach(u => {
      console.log(`   - ${u.email} (${u.rol})`);
    });

    // Probar login
    console.log('\n3. Probando login...');
    const { data: usuario, error: loginError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', 'operacion@empresa.com')
      .eq('password', 'password123')
      .single();

    if (loginError) {
      console.error('❌ ERROR en login:');
      console.error('   Mensaje:', loginError.message);
      console.error('   Error completo:', JSON.stringify(loginError, null, 2));
      process.exit(1);
    }

    console.log('✅ LOGIN EXITOSO!');
    console.log('   Usuario:', usuario.nombre, '- Rol:', usuario.rol);

  } catch (error) {
    console.error('❌ ERROR GENERAL:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  }

  console.log('\n=== PRUEBA COMPLETADA ===');
}

testConnection();
