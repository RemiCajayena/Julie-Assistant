/**
 * Script para registrar medicamentos de prueba
 */

import * as db from './database.js';

// Inicializar base de datos
db.initDatabase();

const userId = 'usuario123'; // El userId por defecto de la app

console.log(`\n📋 Registrando medicamentos de prueba para ${userId}...\n`);

// Medicamento 1: Paracetamol
const med1 = db.createMedication(userId, {
  name: 'Paracetamol',
  dosage: '500mg',
  frequency: '3 veces al día',
  schedule: '08:00,14:00,20:00'
});
console.log('✅ Medicamento creado:', med1);

// Crear recordatorios para el medicamento 1
const reminder1 = db.createReminder(userId, {
  medication_id: med1.id,
  title: 'Tomar Paracetamol',
  description: '500mg - Desayuno',
  reminder_time: '08:00',
  days_of_week: JSON.stringify([0,1,2,3,4,5,6]), // Todos los días
  active: 1
});
console.log('✅ Recordatorio creado:', reminder1);

const reminder2 = db.createReminder(userId, {
  medication_id: med1.id,
  title: 'Tomar Paracetamol',
  description: '500mg - Almuerzo',
  reminder_time: '14:00',
  days_of_week: JSON.stringify([0,1,2,3,4,5,6]),
  active: 1
});
console.log('✅ Recordatorio creado:', reminder2);

const reminder3 = db.createReminder(userId, {
  medication_id: med1.id,
  title: 'Tomar Paracetamol',
  description: '500mg - Cena',
  reminder_time: '20:00',
  days_of_week: JSON.stringify([0,1,2,3,4,5,6]),
  active: 1
});
console.log('✅ Recordatorio creado:', reminder3);

// Medicamento 2: Omeprazol
const med2 = db.createMedication(userId, {
  name: 'Omeprazol',
  dosage: '20mg',
  frequency: '1 vez al día',
  schedule: '07:30'
});
console.log('✅ Medicamento creado:', med2);

const reminder4 = db.createReminder(userId, {
  medication_id: med2.id,
  title: 'Tomar Omeprazol',
  description: '20mg - En ayunas',
  reminder_time: '07:30',
  days_of_week: JSON.stringify([0,1,2,3,4,5,6]),
  active: 1
});
console.log('✅ Recordatorio creado:', reminder4);

// Crear un recordatorio de prueba para dentro de 2 minutos
const now = new Date();
const testTime = new Date(now.getTime() + 2 * 60000); // 2 minutos
const testTimeStr = `${testTime.getHours().toString().padStart(2, '0')}:${testTime.getMinutes().toString().padStart(2, '0')}`;

const testReminder = db.createReminder(userId, {
  medication_id: med1.id,
  title: 'TEST - Paracetamol',
  description: 'Prueba de notificación (2 min)',
  reminder_time: testTimeStr,
  days_of_week: JSON.stringify([0,1,2,3,4,5,6]),
  active: 1
});
console.log(`\n🧪 Recordatorio de PRUEBA para ${testTimeStr}:`, testReminder);

console.log('\n✅ Medicamentos registrados exitosamente!\n');
console.log('📱 Ahora en la app:');
console.log('   1. Ve a Medicamentos');
console.log('   2. Deberías ver tus medicamentos');
console.log('   3. En ~2 minutos recibirás una notificación de prueba\n');

// Cerrar base de datos
db.closeDatabase();
