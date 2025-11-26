/**
 * Script de diagnóstico para el sistema de notificaciones de citas
 */

import * as db from './database.js';
import * as firebase from './firebaseAdmin.js';

console.log('🔍 DIAGNÓSTICO DEL SISTEMA DE CITAS MÉDICAS\n');

// 1. Verificar Firebase
console.log('1️⃣ Verificando Firebase Admin SDK...');
if (firebase.isFirebaseInitialized()) {
  console.log('   ✅ Firebase inicializado correctamente');
} else {
  console.log('   ❌ Firebase NO inicializado');
}

// 2. Verificar tokens FCM
console.log('\n2️⃣ Verificando tokens FCM en base de datos...');
const tokens = db.getDeviceTokens('usuario123');
console.log(`   📱 Tokens encontrados: ${tokens.length}`);
tokens.forEach((token, index) => {
  console.log(`   ${index + 1}. ${token.token.substring(0, 30)}...`);
});

// 3. Verificar citas próximas
console.log('\n3️⃣ Verificando citas próximas...');
const upcoming = db.getUpcomingAppointments('usuario123');
console.log(`   📅 Citas próximas: ${upcoming.length}`);

if (upcoming.length > 0) {
  upcoming.forEach((apt, index) => {
    console.log(`\n   Cita ${index + 1}:`);
    console.log(`   - ID: ${apt.id}`);
    console.log(`   - Título: ${apt.title}`);
    console.log(`   - Fecha: ${apt.appointment_date}`);
    console.log(`   - Hora: ${apt.appointment_time}`);
    console.log(`   - Recordatorios: ${apt.reminder_time_before}`);
    
    // Calcular tiempo restante
    const appointmentDateTime = new Date(`${apt.appointment_date}T${apt.appointment_time}`);
    const now = new Date();
    const diffMinutes = Math.floor((appointmentDateTime - now) / (1000 * 60));
    console.log(`   - Tiempo restante: ${diffMinutes} minutos`);
  });
} else {
  console.log('   ℹ️ No hay citas próximas');
}

// 4. Verificar todas las citas (últimas 5)
console.log('\n4️⃣ Últimas 5 citas en la base de datos...');
const allAppointments = db.db.prepare(`
  SELECT * FROM appointments 
  ORDER BY appointment_date DESC, appointment_time DESC 
  LIMIT 5
`).all();

console.log(`   Total encontradas: ${allAppointments.length}`);
allAppointments.forEach((apt, index) => {
  const isPast = new Date(`${apt.appointment_date}T${apt.appointment_time}`) < new Date();
  const status = isPast ? '🕐 PASADA' : '⏰ PRÓXIMA';
  console.log(`   ${index + 1}. ${status} - ${apt.title} (${apt.appointment_date} ${apt.appointment_time})`);
  console.log(`      Recordatorios: ${apt.reminder_time_before}`);
});

// 5. Sugerencias
console.log('\n5️⃣ Recomendaciones:');
if (tokens.length === 0) {
  console.log('   ⚠️ No hay tokens FCM. Registra el dispositivo primero.');
}
if (upcoming.length === 0) {
  console.log('   💡 Crea una cita de prueba: node test-appointment-notification.js');
}
if (!firebase.isFirebaseInitialized()) {
  console.log('   ⚠️ Inicia el servidor para inicializar Firebase: npm start');
}

console.log('\n✅ Diagnóstico completo');
