import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Crear o abrir la base de datos
const db = new Database(path.join(__dirname, 'julie.db'));

// Habilitar claves foráneas
db.pragma('foreign_keys = ON');

/**
 * Inicializar tablas de la base de datos
 * Se ejecuta al inicio del servidor
 */
export function initDatabase() {
  console.log('📊 Inicializando base de datos...');

  // Tabla de tutores (quien recibe las alertas)
  db.exec(`
    CREATE TABLE IF NOT EXISTS tutors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      relationship TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla de medicamentos
  db.exec(`
    CREATE TABLE IF NOT EXISTS medications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      dosage TEXT,
      frequency TEXT NOT NULL,
      schedule TEXT,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla de registros de tomas (historial)
  db.exec(`
    CREATE TABLE IF NOT EXISTS medication_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      medication_id INTEGER NOT NULL,
      taken_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT NOT NULL,
      notes TEXT,
      FOREIGN KEY (medication_id) REFERENCES medications(id)
    )
  `);

  // Tabla de tokens de dispositivos para notificaciones push
  db.exec(`
    CREATE TABLE IF NOT EXISTS device_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      token TEXT NOT NULL,
      platform TEXT,
      registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, token)
    )
  `);

  // Tabla de alertas enviadas
  db.exec(`
    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'sent'
    )
  `);

  // Tabla de solicitudes de medicamentos (cuando el usuario pide agregar via asistente)
  db.exec(`
    CREATE TABLE IF NOT EXISTS medication_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      dosage TEXT,
      frequency TEXT,
      schedule TEXT,
      notes TEXT,
      status TEXT DEFAULT 'pending',
      requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      processed_at DATETIME,
      processed_by TEXT,
      rejection_reason TEXT
    )
  `);

  // Tabla de recordatorios
  db.exec(`
    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      medication_id INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      reminder_time TEXT NOT NULL,
      days_of_week TEXT,
      active INTEGER DEFAULT 1,
      snoozed_until DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (medication_id) REFERENCES medications(id) ON DELETE CASCADE
    )
  `);

  // Migración: agregar columna snoozed_until si no existe
  try {
    db.exec(`ALTER TABLE reminders ADD COLUMN snoozed_until DATETIME`);
    console.log('✅ Columna snoozed_until agregada a la tabla reminders');
  } catch (error) {
    // La columna ya existe, ignorar el error
  }

  // Tabla de notificaciones enviadas (historial)
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reminder_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'sent',
      response TEXT,
      response_at DATETIME,
      FOREIGN KEY (reminder_id) REFERENCES reminders(id) ON DELETE CASCADE
    )
  `);

  // Tabla de citas médicas
  db.exec(`
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      appointment_date TEXT NOT NULL,
      appointment_time TEXT NOT NULL,
      location TEXT,
      doctor TEXT,
  reminder_time_before TEXT DEFAULT '[60]',
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('✅ Base de datos inicializada correctamente');
}

/**
 * OPERACIONES DE TUTORES
 */

// Registrar o actualizar tutor
export function registerTutor(userId, tutorData) {
  const stmt = db.prepare(`
    INSERT INTO tutors (user_id, name, phone, relationship)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      name = excluded.name,
      phone = excluded.phone,
      relationship = excluded.relationship
  `);

  const result = stmt.run(
    userId,
    tutorData.name,
    tutorData.phone,
    tutorData.relationship || 'Familiar'
  );

  return { id: result.lastInsertRowid, ...tutorData };
}

// Obtener tutor de un usuario
export function getTutor(userId) {
  const stmt = db.prepare('SELECT * FROM tutors WHERE user_id = ?');
  return stmt.get(userId);
}

/**
 * OPERACIONES DE MEDICAMENTOS
 */

// Crear medicamento
export function createMedication(userId, medicationData) {
  const stmt = db.prepare(`
    INSERT INTO medications (user_id, name, dosage, frequency, schedule)
    VALUES (?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    userId,
    medicationData.name,
    medicationData.dosage || '',
    medicationData.frequency || 'según indicación médica',
    medicationData.schedule || ''
  );

  console.log(`💊 Medicamento creado: ${medicationData.name} para usuario ${userId}`);

  return {
    id: result.lastInsertRowid,
    user_id: userId,
    name: medicationData.name,
    dosage: medicationData.dosage || '',
    frequency: medicationData.frequency || 'según indicación médica',
    schedule: medicationData.schedule || '',
    active: 1
  };
}

// Obtener medicamentos activos de un usuario
export function getMedications(userId) {
  const stmt = db.prepare(`
    SELECT * FROM medications 
    WHERE user_id = ? AND active = 1
    ORDER BY created_at DESC
  `);
  return stmt.all(userId);
}

// Obtener un medicamento específico
export function getMedicationById(medicationId) {
  const stmt = db.prepare('SELECT * FROM medications WHERE id = ?');
  return stmt.get(medicationId);
}

// Desactivar medicamento (no se elimina, solo se marca como inactivo)
export function deactivateMedication(medicationId) {
  const stmt = db.prepare('UPDATE medications SET active = 0 WHERE id = ?');
  return stmt.run(medicationId);
}

/**
 * OPERACIONES DE LOGS (Historial de tomas)
 */

// Registrar toma de medicamento
export function logMedicationTaken(medicationId, status, notes = '') {
  const stmt = db.prepare(`
    INSERT INTO medication_logs (medication_id, status, notes)
    VALUES (?, ?, ?)
  `);

  const result = stmt.run(medicationId, status, notes);
  return { id: result.lastInsertRowid, medicationId, status, notes };
}

// Obtener historial de un medicamento
export function getMedicationLogs(medicationId, limit = 10) {
  const stmt = db.prepare(`
    SELECT ml.*, m.name as medication_name
    FROM medication_logs ml
    JOIN medications m ON ml.medication_id = m.id
    WHERE ml.medication_id = ?
    ORDER BY ml.taken_at DESC
    LIMIT ?
  `);
  return stmt.all(medicationId, limit);
}

// Obtener resumen de hoy
export function getTodayMedicationStatus(userId) {
  const stmt = db.prepare(`
    SELECT 
      m.id,
      m.name,
      m.dosage,
      m.schedule,
      COUNT(ml.id) as times_taken_today
    FROM medications m
    LEFT JOIN medication_logs ml ON m.id = ml.medication_id 
      AND DATE(ml.taken_at) = DATE('now')
      AND ml.status = 'taken'
    WHERE m.user_id = ? AND m.active = 1
    GROUP BY m.id
  `);
  return stmt.all(userId);
}

/**
 * OPERACIONES DE ALERTAS
 */

// Registrar alerta enviada
export function logAlert(userId, type, message) {
  const stmt = db.prepare(`
    INSERT INTO alerts (user_id, type, message)
    VALUES (?, ?, ?)
  `);

  const result = stmt.run(userId, type, message);
  return { id: result.lastInsertRowid, userId, type, message };
}

// Obtener alertas recientes
export function getRecentAlerts(userId, limit = 20) {
  const stmt = db.prepare(`
    SELECT * FROM alerts 
    WHERE user_id = ?
    ORDER BY sent_at DESC
    LIMIT ?
  `);
  return stmt.all(userId, limit);
}

/**
 * OPERACIONES DE SOLICITUDES DE MEDICAMENTOS
 */

// Calcular horarios automáticamente basado en frecuencia y hora inicial
export function calculateSchedule(frequency, initialTime) {
  try {
    // Validaciones iniciales
    if (!frequency) {
      console.log('⚠️ No se proporcionó frecuencia, no se puede calcular horarios');
      return initialTime || '';
    }

    // Si ya hay un horario completo, no calcular
    if (initialTime && initialTime.includes(',')) {
      console.log('ℹ️ Ya hay múltiples horarios, no se recalcula');
      return initialTime;
    }

    // Extraer número de horas de la frecuencia
    // Ejemplos: "cada 8 horas", "cada 12 horas", "8 horas", "12h"
    const hoursMatch = frequency.match(/(\d+)\s*(?:horas?|h)/i);
    
    if (!hoursMatch) {
      console.log(`⚠️ No se pudo extraer intervalo de horas de: "${frequency}"`);
      return initialTime || '';
    }

    const intervalHours = parseInt(hoursMatch[1]);
    
    // Validar intervalo razonable
    if (intervalHours <= 0 || intervalHours > 24) {
      console.log(`⚠️ Intervalo inválido: ${intervalHours} horas`);
      return initialTime || '';
    }

    // Si no hay hora inicial, usar 08:00 como default
    let startHour = 8;
    let startMinute = 0;

    if (initialTime && initialTime.trim() !== '') {
      const timeMatch = initialTime.match(/(\d{1,2}):?(\d{2})?/);
      if (timeMatch) {
        startHour = parseInt(timeMatch[1]);
        startMinute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        
        // Validar hora y minuto
        if (startHour < 0 || startHour > 23) {
          console.log(`⚠️ Hora inválida: ${startHour}, usando 08:00`);
          startHour = 8;
        }
        if (startMinute < 0 || startMinute > 59) {
          console.log(`⚠️ Minutos inválidos: ${startMinute}, usando :00`);
          startMinute = 0;
        }
      } else {
        console.log(`⚠️ Formato de hora inválido: "${initialTime}", usando 08:00`);
      }
    }

    // Calcular cuántas tomas hay en el día
    const timesPerDay = Math.floor(24 / intervalHours);

    if (timesPerDay === 0) {
      console.log(`⚠️ Intervalo demasiado largo: ${intervalHours} horas`);
      return initialTime || '';
    }

    // Generar horarios
    const schedules = [];
    for (let i = 0; i < timesPerDay; i++) {
      const hour = (startHour + (i * intervalHours)) % 24;
      const timeString = `${hour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
      schedules.push(timeString);
    }

    const result = schedules.join(', ');
    console.log(`🕐 Horarios calculados exitosamente: ${frequency} desde ${initialTime || '08:00'} = ${result}`);
    
    return result;
  } catch (error) {
    console.error('❌ Error en calculateSchedule:', error);
    return initialTime || '';
  }
}

// Crear solicitud de medicamento desde el asistente
export function createMedicationRequest(userId, medicationData) {
  const stmt = db.prepare(`
    INSERT INTO medication_requests (user_id, name, dosage, frequency, schedule, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    userId,
    medicationData.name,
    medicationData.dosage || null,
    medicationData.frequency || null,
    medicationData.schedule || null,
    medicationData.notes || null
  );

  console.log(`📝 Solicitud de medicamento creada: ${medicationData.name} para usuario ${userId}`);
  return { id: result.lastInsertRowid, userId, ...medicationData };
}

// Obtener todas las solicitudes de un usuario (cualquier estado)
export function getMedicationRequests(userId, status = null) {
  let query = 'SELECT * FROM medication_requests WHERE user_id = ?';
  const params = [userId];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY requested_at DESC';

  const stmt = db.prepare(query);
  return stmt.all(...params);
}

// Obtener solicitudes pendientes de un usuario
export function getPendingRequests(userId) {
  return getMedicationRequests(userId, 'pending');
}

// Actualizar solicitud pendiente (agregar más información)
export function updateMedicationRequest(requestId, updates) {
  // Verificar que existe y está pendiente
  const request = db.prepare('SELECT * FROM medication_requests WHERE id = ?').get(requestId);

  if (!request) {
    throw new Error(`Solicitud ${requestId} no encontrada`);
  }

  if (request.status !== 'pending') {
    throw new Error(`Solicitud ${requestId} ya fue procesada y no se puede editar`);
  }

  // Construir query dinámico solo con campos que se quieren actualizar
  const fields = [];
  const values = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.dosage !== undefined) {
    fields.push('dosage = ?');
    values.push(updates.dosage);
  }
  if (updates.frequency !== undefined) {
    fields.push('frequency = ?');
    values.push(updates.frequency);
  }
  if (updates.schedule !== undefined) {
    fields.push('schedule = ?');
    values.push(updates.schedule);
  }
  if (updates.notes !== undefined) {
    fields.push('notes = ?');
    values.push(updates.notes);
  }

  if (fields.length === 0) {
    return request; // No hay nada que actualizar
  }

  // Agregar ID al final
  values.push(requestId);

  const stmt = db.prepare(`
    UPDATE medication_requests 
    SET ${fields.join(', ')}
    WHERE id = ?
  `);

  stmt.run(...values);

  console.log(`📝 Solicitud ${requestId} actualizada:`, updates);

  // Retornar solicitud actualizada
  return db.prepare('SELECT * FROM medication_requests WHERE id = ?').get(requestId);
}

// Aprobar solicitud (crea medicamento automáticamente)
export function approveRequest(requestId, processedBy) {
  // 1. Obtener datos de la solicitud
  const request = db.prepare('SELECT * FROM medication_requests WHERE id = ?').get(requestId);

  if (!request) {
    throw new Error(`Solicitud ${requestId} no encontrada`);
  }

  if (request.status !== 'pending') {
    throw new Error(`Solicitud ${requestId} ya fue procesada (${request.status})`);
  }

  // 2. Crear medicamento automáticamente con valores por defecto si es necesario
  const medicationResult = createMedication(request.user_id, {
    name: request.name,
    dosage: request.dosage || '',
    frequency: request.frequency || 'según indicación médica',
    schedule: request.schedule || ''
  });

  // 3. Actualizar solicitud
  const stmt = db.prepare(`
    UPDATE medication_requests 
    SET status = 'approved', processed_at = CURRENT_TIMESTAMP, processed_by = ?
    WHERE id = ?
  `);

  stmt.run(processedBy, requestId);

  console.log(`✅ Solicitud ${requestId} aprobada por ${processedBy}. Medicamento creado: ${request.name}`);

  return { 
    success: true, 
    requestId, 
    medicationId: medicationResult.id,
    medicationName: request.name 
  };
}

// Rechazar solicitud
export function rejectRequest(requestId, processedBy, rejectionReason = '') {
  // Verificar que existe y está pendiente
  const request = db.prepare('SELECT * FROM medication_requests WHERE id = ?').get(requestId);

  if (!request) {
    throw new Error(`Solicitud ${requestId} no encontrada`);
  }

  if (request.status !== 'pending') {
    throw new Error(`Solicitud ${requestId} ya fue procesada (${request.status})`);
  }

  const stmt = db.prepare(`
    UPDATE medication_requests 
    SET status = 'rejected', processed_at = CURRENT_TIMESTAMP, processed_by = ?, rejection_reason = ?
    WHERE id = ?
  `);

  stmt.run(processedBy, rejectionReason, requestId);

  console.log(`❌ Solicitud ${requestId} rechazada por ${processedBy}. Motivo: ${rejectionReason || 'No especificado'}`);

  return { success: true, requestId, status: 'rejected' };
}

/**
 * OPERACIONES DE RECORDATORIOS
 */

// Crear recordatorio
export function createReminder(userId, reminderData) {
  const stmt = db.prepare(`
    INSERT INTO reminders (user_id, medication_id, title, description, reminder_time, days_of_week, active)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    userId,
    reminderData.medication_id || null,
    reminderData.title,
    reminderData.description || null,
    reminderData.reminder_time,
    reminderData.days_of_week || null, // JSON string: '["lunes","martes"]' o null para todos los días
    reminderData.active !== undefined ? reminderData.active : 1
  );

  console.log(`⏰ Recordatorio creado: ID=${result.lastInsertRowid}, userId=${userId}, title=${reminderData.title}, time=${reminderData.reminder_time}`);

  return { id: result.lastInsertRowid, ...reminderData };
}

// Obtener recordatorios de un usuario
export function getReminders(userId, activeOnly = false) {
  try {
    console.log(`[DEBUG getReminders] userId=${userId}, tipo=${typeof userId}, activeOnly=${activeOnly}`);
    
    let query = `
      SELECT r.id, r.user_id, r.medication_id, r.title, r.description, r.reminder_time, r.days_of_week, r.active, r.created_at, r.snoozed_until
      FROM reminders r
      WHERE r.user_id = ?
    `;

    if (activeOnly) {
      query += ' AND r.active = 1';
    }

    query += ' ORDER BY r.reminder_time ASC';

    console.log(`[DEBUG getReminders] Query: ${query}`);
    const stmt = db.prepare(query);
    const results = stmt.all(userId);
    console.log(`📋 getReminders para userId=${userId}: encontrados ${results.length} recordatorios`);
    if (results.length > 0) {
      console.log(`   Recordatorios:`, results.map(r => `ID=${r.id}, title=${r.title}, time=${r.reminder_time}`).join('; '));
    }
    return results;
  } catch (error) {
    console.error(`❌ Error en getReminders para userId=${userId}:`, error);
    throw error;
  }
}

// Obtener recordatorios que deben dispararse ahora
export function getDueReminders() {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const dayOfWeek = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][now.getDay()];

  const stmt = db.prepare(`
    SELECT r.*, m.name as medication_name, m.dosage 
    FROM reminders r
    LEFT JOIN medications m ON r.medication_id = m.id
    WHERE r.active = 1 
      AND r.reminder_time = ?
      AND (r.days_of_week IS NULL OR r.days_of_week LIKE ?)
  `);

  return stmt.all(currentTime, `%${dayOfWeek}%`);
}

// Actualizar recordatorio
export function updateReminder(reminderId, updates) {
  const allowedFields = ['title', 'description', 'reminder_time', 'days_of_week', 'active'];
  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (fields.length === 0) {
    throw new Error('No hay campos válidos para actualizar');
  }

  values.push(reminderId);

  const stmt = db.prepare(`
    UPDATE reminders SET ${fields.join(', ')} WHERE id = ?
  `);

  stmt.run(...values);

  console.log(`📝 Recordatorio ${reminderId} actualizado`);

  return db.prepare('SELECT * FROM reminders WHERE id = ?').get(reminderId);
}

// Eliminar recordatorio
export function deleteReminder(reminderId) {
  const stmt = db.prepare('DELETE FROM reminders WHERE id = ?');
  const result = stmt.run(reminderId);

  console.log(`🗑️ Recordatorio ${reminderId} eliminado`);

  return { success: result.changes > 0 };
}

// Posponer (snooze) un recordatorio
export function snoozeReminder(reminderId, durationMinutes) {
  const snoozedUntil = new Date();
  snoozedUntil.setMinutes(snoozedUntil.getMinutes() + durationMinutes);
  
  const stmt = db.prepare(`
    UPDATE reminders 
    SET snoozed_until = ? 
    WHERE id = ?
  `);

  stmt.run(snoozedUntil.toISOString(), reminderId);

  console.log(`⏰ Recordatorio ${reminderId} pospuesto hasta ${snoozedUntil.toLocaleString('es-ES')}`);

  return { 
    id: reminderId, 
    snoozed_until: snoozedUntil.toISOString(),
    duration_minutes: durationMinutes
  };
}

// Obtener recordatorios activos que no estén en snooze
export function getDueRemindersNotSnoozed() {
  const now = new Date().toISOString();
  
  const stmt = db.prepare(`
    SELECT * FROM reminders 
    WHERE active = 1 
    AND (snoozed_until IS NULL OR snoozed_until <= ?)
  `);

  return stmt.all(now);
}

// Registrar notificación enviada
export function logNotification(reminderId, userId, status = 'sent') {
  const stmt = db.prepare(`
    INSERT INTO notifications (reminder_id, user_id, status)
    VALUES (?, ?, ?)
  `);

  const result = stmt.run(reminderId, userId, status);

  console.log(`📨 Notificación registrada para recordatorio ${reminderId}`);

  return { id: result.lastInsertRowid };
}

// Registrar respuesta del usuario a una notificación
export function logNotificationResponse(notificationId, response) {
  const stmt = db.prepare(`
    UPDATE notifications 
    SET response = ?, response_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `);

  stmt.run(response, notificationId);

  console.log(`✅ Respuesta registrada para notificación ${notificationId}: ${response}`);
}

// Obtener historial de notificaciones
export function getNotificationHistory(userId, limit = 50) {
  const stmt = db.prepare(`
    SELECT n.*, r.title, r.reminder_time
    FROM notifications n
    JOIN reminders r ON n.reminder_id = r.id
    WHERE n.user_id = ?
    ORDER BY n.sent_at DESC
    LIMIT ?
  `);

  return stmt.all(userId, limit);
}

// Cerrar base de datos al apagar servidor
export function closeDatabase() {
  db.close();
  console.log('📊 Base de datos cerrada');
}

/**
 * OPERACIONES DE CITAS MÉDICAS
 */

// Crear cita médica
export function createAppointment(userId, appointmentData) {
  const stmt = db.prepare(`
    INSERT INTO appointments (user_id, title, description, appointment_date, appointment_time, location, doctor, reminder_time_before)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Serializar array de recordatorios como JSON
  const reminderJson = JSON.stringify(appointmentData.reminder_time_before || [60]);

  const result = stmt.run(
    userId,
    appointmentData.title,
    appointmentData.description || null,
    appointmentData.appointment_date,
    appointmentData.appointment_time,
    appointmentData.location || null,
    appointmentData.doctor || null,
    reminderJson
  );

  console.log(`✅ Cita médica creada: ${appointmentData.title} para ${appointmentData.appointment_date} ${appointmentData.appointment_time}`);
  return { id: result.lastInsertRowid, ...appointmentData };
}

// Obtener citas médicas de un usuario
export function getAppointments(userId, activeOnly = false) {
  let query = 'SELECT * FROM appointments WHERE user_id = ?';
  
  if (activeOnly) {
    query += ' AND active = 1';
  }
  
  query += ' ORDER BY appointment_date DESC, appointment_time DESC';
  
  const stmt = db.prepare(query);
  const rows = stmt.all(userId);
  // Deserializar el campo reminder_time_before
  return rows.map(row => ({
    ...row,
    reminder_time_before: row.reminder_time_before ? JSON.parse(row.reminder_time_before) : [60]
  }));
}

// Obtener citas médicas próximas (próximos 7 días)
export function getUpcomingAppointments(userId) {
  const stmt = db.prepare(`
    SELECT * FROM appointments 
    WHERE user_id = ? 
    AND active = 1 
    AND date(appointment_date) >= date('now')
    AND date(appointment_date) <= date('now', '+7 days')
    ORDER BY appointment_date ASC, appointment_time ASC
  `);

  return stmt.all(userId);
}

// Obtener citas que necesitan recordatorio ahora
export function getDueAppointments() {
  const stmt = db.prepare(`
    SELECT * FROM appointments 
    WHERE active = 1 
    AND datetime(appointment_date || ' ' || appointment_time, '-' || reminder_time_before || ' minutes') <= datetime('now')
    AND datetime(appointment_date || ' ' || appointment_time) > datetime('now')
  `);

  return stmt.all();
}

// Actualizar cita médica
export function updateAppointment(appointmentId, appointmentData) {
  const fields = [];
  const values = [];

  if (appointmentData.title !== undefined) {
    fields.push('title = ?');
    values.push(appointmentData.title);
  }
  if (appointmentData.description !== undefined) {
    fields.push('description = ?');
    values.push(appointmentData.description);
  }
  if (appointmentData.appointment_date !== undefined) {
    fields.push('appointment_date = ?');
    values.push(appointmentData.appointment_date);
  }
  if (appointmentData.appointment_time !== undefined) {
    fields.push('appointment_time = ?');
    values.push(appointmentData.appointment_time);
  }
  if (appointmentData.location !== undefined) {
    fields.push('location = ?');
    values.push(appointmentData.location);
  }
  if (appointmentData.doctor !== undefined) {
    fields.push('doctor = ?');
    values.push(appointmentData.doctor);
  }
  if (appointmentData.reminder_time_before !== undefined) {
    fields.push('reminder_time_before = ?');
    values.push(appointmentData.reminder_time_before);
  }
  if (appointmentData.active !== undefined) {
    fields.push('active = ?');
    values.push(appointmentData.active);
  }

  if (fields.length === 0) {
    return null;
  }

  values.push(appointmentId);
  const stmt = db.prepare(`UPDATE appointments SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...values);

  console.log(`✅ Cita médica ${appointmentId} actualizada`);
  return { id: appointmentId, ...appointmentData };
}

// Eliminar cita médica
export function deleteAppointment(appointmentId) {
  const stmt = db.prepare('DELETE FROM appointments WHERE id = ?');
  const result = stmt.run(appointmentId);

  console.log(`✅ Cita médica ${appointmentId} eliminada`);
  return result.changes > 0;
}

// Exportar instancia de base de datos para uso directo
/**
 * OPERACIONES DE TOKENS DE DISPOSITIVO
 */

// Guardar o actualizar token de dispositivo
export function saveDeviceToken(userId, token, platform) {
  // Forzar userId y token como string
  const stmt = db.prepare(`
    INSERT INTO device_tokens (user_id, token, platform, registered_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id, token) DO UPDATE SET
      platform = excluded.platform,
      registered_at = excluded.registered_at
  `);
  stmt.run(String(userId), String(token), platform || null);
}

// Obtener todos los tokens de un usuario
export function getDeviceTokens(userId) {
  const stmt = db.prepare('SELECT * FROM device_tokens WHERE user_id = ?');
  return stmt.all(userId);
}

// Obtener un token específico (por userId y token)
export function getDeviceToken(userId, token) {
  const stmt = db.prepare('SELECT * FROM device_tokens WHERE user_id = ? AND token = ?');
  return stmt.get(userId, token);
}

// Eliminar token de dispositivo (por userId y token)
export function deleteDeviceToken(userId, token) {
  const stmt = db.prepare('DELETE FROM device_tokens WHERE user_id = ? AND token = ?');
  return stmt.run(userId, token);
}

// Eliminar todos los tokens de un usuario
export function deleteAllDeviceTokens(userId) {
  const stmt = db.prepare('DELETE FROM device_tokens WHERE user_id = ?');
  return stmt.run(userId);
}
export { db };

export default db;
