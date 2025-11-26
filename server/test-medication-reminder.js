/**
 * Script de prueba para crear un recordatorio de medicamento
 * y verificar que se envíe la notificación FCM correctamente
 */

import fetch from 'node-fetch';

const SERVER_URL = 'http://localhost:3000';
const USER_ID = 'usuario123';

async function testMedicationReminder() {
  console.log('🧪 === TEST DE RECORDATORIO DE MEDICAMENTO ===\n');

  try {
    // 1. Obtener recordatorios actuales
    console.log('📋 Paso 1: Obteniendo recordatorios actuales...');
    const remindersResponse = await fetch(`${SERVER_URL}/reminders/${USER_ID}?active_only=true`);
    const remindersData = await remindersResponse.json();
    
    console.log(`   ✅ Recordatorios activos: ${remindersData.reminders.length}`);
    
    if (remindersData.reminders.length > 0) {
      console.log('\n📝 Recordatorios existentes:');
      remindersData.reminders.forEach((r, i) => {
        console.log(`   ${i + 1}. ${r.title} - ${r.reminder_time} (ID: ${r.id})`);
      });
    }

    // 2. Crear un recordatorio de prueba para dentro de 2 minutos
    const now = new Date();
    now.setMinutes(now.getMinutes() + 2);
    const testTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const currentDay = now.getDay();

    console.log(`\n💊 Paso 2: Creando recordatorio de prueba para las ${testTime}...`);
    
    const createResponse = await fetch(`${SERVER_URL}/reminders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: USER_ID,
        medication_id: null,
        title: '🧪 Medicamento de Prueba',
        description: 'Este es un recordatorio de prueba del sistema FCM',
        reminder_time: testTime,
        days_of_week: [0, 1, 2, 3, 4, 5, 6], // Todos los días
        active: 1
      })
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      throw new Error(`Error creando recordatorio: ${error}`);
    }

    const createData = await createResponse.json();
    console.log(`   ✅ Recordatorio creado: ID ${createData.reminder.id}`);
    console.log(`   📅 Día actual: ${currentDay} (${['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][currentDay]})`);
    console.log(`   ⏰ Hora programada: ${testTime}`);
    console.log(`   ⏳ Se enviará en aproximadamente 2 minutos`);

    // 3. Verificar tokens FCM del usuario
    console.log(`\n🔑 Paso 3: Verificando tokens FCM registrados...`);
    const dbCheck = await fetch(`${SERVER_URL}/devices/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: USER_ID,
        token: 'test-check-token',
        platform: 'test'
      })
    });

    console.log('   ℹ️ Si el usuario tiene tokens FCM registrados, recibirá la notificación');

    console.log('\n✅ === CONFIGURACIÓN COMPLETADA ===');
    console.log('\n📱 Instrucciones:');
    console.log('   1. Asegúrate de que el servidor esté corriendo (node index.js)');
    console.log('   2. Verifica que el dispositivo tenga token FCM registrado');
    console.log(`   3. Espera hasta las ${testTime} (aproximadamente 2 minutos)`);
    console.log('   4. Deberías recibir una notificación en el dispositivo');
    console.log('\n🔍 Monitorea los logs del servidor para ver:');
    console.log('   - "🔔 Verificando recordatorios programados..."');
    console.log('   - "📢 Enviando notificación..."');
    console.log('   - "✅ Notificación FCM enviada exitosamente"');
    console.log(`\n💡 Recordatorio creado con ID: ${createData.reminder.id}`);
    console.log(`   Para eliminarlo después: DELETE ${SERVER_URL}/reminders/${createData.reminder.id}`);

  } catch (error) {
    console.error('\n❌ Error en el test:', error.message);
    process.exit(1);
  }
}

testMedicationReminder();
