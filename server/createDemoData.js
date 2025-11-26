/**
 * 🧪 Datos de Prueba para Demostración
 * Ejecutar este script para poblar la base de datos con datos realistas
 * 
 * Uso: node createDemoData.js
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module equivalents for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Conectar a la base de datos
const dbPath = path.join(__dirname, 'julie.db');
const db = new Database(dbPath);

console.log('🧪 Creando datos de prueba para demostración...\n');

// IDs de prueba (estos deben coincidir con los registrados en la app)
const ELDER_USER_ID = 'elder_demo_001';  // UUID del adulto mayor
const TUTOR_USER_ID = 'tutor_demo_001';  // UUID del tutor

try {
  // 1. Crear tutor
  console.log('👤 Creando tutor...');
  const insertTutor = db.prepare(`
    INSERT OR REPLACE INTO tutors (user_id, name, phone, relationship)
    VALUES (?, ?, ?, ?)
  `);
  
  insertTutor.run(TUTOR_USER_ID, 'Carlos González', '+56912345678', 'Hijo');
  console.log('✅ Tutor: Carlos González\n');

  // 2. Crear medicamentos con schedule JSON
  console.log('💊 Creando medicamentos...');
  
  const medications = [
    {
      name: 'Losartán',
      dosage: '50mg',
      frequency: 'Cada 12 horas',
      schedule: JSON.stringify(['08:00', '20:00'])
    },
    {
      name: 'Metformina',
      dosage: '850mg',
      frequency: 'Tres veces al día',
      schedule: JSON.stringify(['09:00', '14:00', '21:00'])
    },
    {
      name: 'Omeprazol',
      dosage: '20mg',
      frequency: 'Una vez al día',
      schedule: JSON.stringify(['07:30'])
    },
    {
      name: 'Atorvastatina',
      dosage: '20mg',
      frequency: 'Una vez al día',
      schedule: JSON.stringify(['22:00'])
    },
    {
      name: 'Aspirina',
      dosage: '100mg',
      frequency: 'Una vez al día',
      schedule: JSON.stringify(['08:30'])
    }
  ];

  const insertMedication = db.prepare(`
    INSERT OR REPLACE INTO medications (user_id, name, dosage, frequency, schedule, active)
    VALUES (?, ?, ?, ?, ?, 1)
  `);

  medications.forEach(med => {
    insertMedication.run(ELDER_USER_ID, med.name, med.dosage, med.frequency, med.schedule);
    console.log(`✅ ${med.name} ${med.dosage}`);
  });
  console.log('');

  // 3. Crear recordatorios para cada medicamento
  console.log('⏰ Creando recordatorios...');
  
  // Get the medication IDs we just created
  const getMeds = db.prepare('SELECT id, name, schedule FROM medications WHERE user_id = ?');
  const createdMeds = getMeds.all(ELDER_USER_ID);

  const insertReminder = db.prepare(`
    INSERT OR REPLACE INTO reminders (user_id, medication_id, title, description, reminder_time, days_of_week, active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `);

  createdMeds.forEach(med => {
    const times = JSON.parse(med.schedule);
    times.forEach(time => {
      insertReminder.run(
        ELDER_USER_ID,
        med.id,
        `Tomar ${med.name}`,
        `Es hora de tomar tu medicamento`,
        time,
        'L,M,X,J,V,S,D' // Todos los días
      );
      console.log(`✅ Recordatorio: ${med.name} a las ${time}`);
    });
  });
  console.log('');

  // 4. Crear citas médicas
  console.log('📅 Creando citas médicas...');
  
  // Calcular fechas futuras
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  
  const twoWeeks = new Date();
  twoWeeks.setDate(twoWeeks.getDate() + 14);

  const appointments = [
    {
      title: 'Control Cardiólogo',
      description: 'Dr. Roberto González - Control de presión arterial',
      date: nextWeek.toISOString().split('T')[0],
      time: '10:00',
      location: 'Hospital Clínico - Piso 3, Consulta 305',
      doctor: 'Dr. Roberto González'
    },
    {
      title: 'Control Endocrinóloga',
      description: 'Dra. Patricia Muñoz - Control de diabetes',
      date: twoWeeks.toISOString().split('T')[0],
      time: '15:30',
      location: 'Clínica Santa María - Torre B, Piso 7',
      doctor: 'Dra. Patricia Muñoz'
    },
    {
      title: 'Chequeo General',
      description: 'Dr. Andrés Silva - Chequeo y renovación de recetas',
      date: tomorrow.toISOString().split('T')[0],
      time: '11:00',
      location: 'Centro Médico Familiar - Consulta 12',
      doctor: 'Dr. Andrés Silva'
    }
  ];

  const insertAppointment = db.prepare(`
    INSERT INTO appointments (user_id, title, description, appointment_date, appointment_time, location, doctor)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  appointments.forEach(apt => {
    insertAppointment.run(
      ELDER_USER_ID,
      apt.title,
      apt.description,
      apt.date,
      apt.time,
      apt.location,
      apt.doctor
    );
    console.log(`✅ ${apt.date} ${apt.time} - ${apt.doctor}`);
  });
  console.log('');

  // 5. Crear logs de medicamentos tomados hoy
  console.log('📋 Creando registros de medicamentos...');
  
  const today = new Date();
  const logs = [
    { medName: 'Omeprazol', time: '07:30', status: 'taken' },
    { medName: 'Losartán', time: '08:00', status: 'taken' },
    { medName: 'Aspirina', time: '08:30', status: 'taken' },
    { medName: 'Metformina', time: '09:00', status: 'missed' }
  ];

  const insertLog = db.prepare(`
    INSERT INTO medication_logs (medication_id, status, notes)
    VALUES (?, ?, ?)
  `);

  logs.forEach(log => {
    const med = createdMeds.find(m => m.name === log.medName);
    if (med) {
      const statusText = log.status === 'taken' ? '✅ Tomado' : '⏳ Pendiente';
      insertLog.run(med.id, log.status, `Demo data - ${log.time}`);
      console.log(`${statusText} - ${log.medName} ${log.time}`);
    }
  });
  console.log('');

  // Resumen final
  console.log('================================');
  console.log('✅ DATOS DE PRUEBA CREADOS');
  console.log('================================\n');
  console.log('📊 Resumen:');
  console.log('- 1 tutor (Carlos González)');
  console.log('- 5 medicamentos con múltiples tomas diarias');
  console.log('- Recordatorios automáticos creados');
  console.log('- 3 citas médicas programadas');
  console.log('- Registros de medicamentos del día\n');
  console.log('🎬 La base de datos está lista para la demo\n');
  console.log('📝 IDs para usar en la app:');
  console.log(`   Elder (Paciente): ${ELDER_USER_ID}`);
  console.log(`   Tutor: ${TUTOR_USER_ID}\n`);
  console.log('💡 Tip: Usa estos IDs al registrarte en la app para ver los datos de demo\n');

} catch (error) {
  console.error('❌ Error creando datos:', error);
  process.exit(1);
} finally {
  db.close();
  console.log('✅ Conexión a base de datos cerrada\n');
}
