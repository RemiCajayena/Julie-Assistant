/**
 * Script para registrar manualmente un token FCM
 * Uso: node register-fcm-token.js <userId> <token>
 */

const userId = process.argv[2] || 'usuario123';
const token = process.argv[3];

if (!token) {
  console.log('\n❌ Error: Debes proporcionar un token FCM\n');
  console.log('Uso: node register-fcm-token.js <userId> <token>\n');
  console.log('Ejemplo:');
  console.log('node register-fcm-token.js usuario123 cRRfIrT9Toqw-LzxBaZQMo:APA91b...\n');
  process.exit(1);
}

console.log('\n📱 Registrando Token FCM');
console.log('========================\n');

async function registerToken() {
  try {
    const response = await fetch('http://192.168.1.207:3000/devices/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        token,
        platform: 'android',
        tokenType: 'fcm'
      }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Token registrado exitosamente\n');
      console.log('Detalles:');
      console.log(`  - Usuario: ${userId}`);
      console.log(`  - Token: ${token.substring(0, 50)}...`);
      console.log(`  - Plataforma: android`);
      console.log(`  - Tipo: FCM\n`);
      console.log('📊 Respuesta del servidor:', JSON.stringify(data, null, 2));
      console.log('\n🎉 ¡Ahora puedes enviar notificaciones de prueba!\n');
    } else {
      console.log('❌ Error del servidor:', data);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Asegúrate de que:');
    console.log('   1. El servidor esté ejecutándose (node server/index.js)');
    console.log('   2. La IP 192.168.1.207:3000 sea correcta');
  }
}

registerToken();
