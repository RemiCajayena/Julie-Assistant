/**
 * Script de prueba para notificaciones de citas médicas
 * Crea una cita para 2 minutos en el futuro
 */

import * as db from './database.js';

// Crear una cita de prueba para 2 minutos en el futuro
const now = new Date();
const appointmentTime = new Date(now.getTime() + 2 * 60 * 1000); // +2 minutos

// Asegurar que usamos la fecha correcta (HOY)
const appointment_date = appointmentTime.getFullYear() + '-' + 
  String(appointmentTime.getMonth() + 1).padStart(2, '0') + '-' + 
  String(appointmentTime.getDate()).padStart(2, '0');

const appointment_time = String(appointmentTime.getHours()).padStart(2, '0') + ':' + 
  String(appointmentTime.getMinutes()).padStart(2, '0');

console.log('📅 Creando cita de prueba...');
console.log(`   Fecha: ${appointment_date}`);
console.log(`   Hora: ${appointment_time}`);
console.log(`   Recordatorios: a la hora exacta (0 min), 1h antes, 24h antes`);

try {
  const appointment = db.createAppointment('usuario123', {
    title: '🧪 Prueba de Notificación',
    description: 'Cita de prueba para verificar notificaciones',
    appointment_date,
    appointment_time,
    location: 'Consultorio de Prueba',
    doctor: 'Dr. Test',
    reminder_time_before: [0, 60, 1440] // A la hora exacta, 1h antes, 24h antes
  });

  console.log('\n✅ Cita de prueba creada:', appointment);
  console.log('\n⏰ La notificación debería llegar en aproximadamente 2 minutos');
  console.log('💡 Asegúrate de que el servidor esté corriendo: npm start');
} catch (error) {
  console.error('❌ Error creando cita de prueba:', error);
  process.exit(1);
}
