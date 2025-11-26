/**
 * Script de prueba para enviar notificaciones FCM desde el servidor
 * Uso: node send-test-fcm.js <userId> [mensaje]
 */

const userId = process.argv[2] || 'usuario123';
const customMessage = process.argv.slice(3).join(' ');

const title = 'Prueba de Notificación';
const body = customMessage || '¡Firebase Admin SDK funcionando correctamente! 🎉';

console.log('\n🧪 ENVIANDO NOTIFICACIÓN FCM DE PRUEBA');
console.log('======================================\n');
console.log(`Usuario: ${userId}`);
console.log(`Título: ${title}`);
console.log(`Mensaje: ${body}\n`);

async function sendTestNotification() {
  try {
    const response = await fetch('http://192.168.1.207:3000/notifications/send-fcm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        title,
        body,
        data: {
          type: 'test',
          timestamp: new Date().toISOString(),
        },
      }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Notificación enviada exitosamente!\n');
      console.log('Respuesta del servidor:');
      console.log(JSON.stringify(data, null, 2));
      console.log('\n📱 Revisa tu dispositivo para ver la notificación!\n');
    } else {
      console.log('❌ Error al enviar notificación:\n');
      console.log(JSON.stringify(data, null, 2));
      
      if (data.error?.includes('Firebase Admin SDK no está inicializado')) {
        console.log('\n💡 Solución:');
        console.log('   1. Verifica que firebase-service-account.json exista en server/');
        console.log('   2. Reinicia el servidor: node index.js\n');
      } else if (data.error?.includes('No device tokens found')) {
        console.log('\n💡 Solución:');
        console.log('   1. Abre la app en tu dispositivo');
        console.log('   2. Registra el tutor para guardar el token FCM');
        console.log('   3. O ejecuta: node register-fcm-token.js usuario123 TU_TOKEN\n');
      }
    }
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
    console.log('\n💡 Asegúrate de que:');
    console.log('   1. El servidor esté ejecutándose (node index.js)');
    console.log('   2. La IP 192.168.1.207:3000 sea correcta\n');
  }
}

sendTestNotification();
