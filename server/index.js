import cors from "cors";
import "dotenv/config";
import express from "express";
import fs from "fs";
import multer from "multer";
import { OpenAI } from "openai";
import * as appointmentSystem from './appointmentSystem.js';
import * as db from './database.js';
import * as firebase from './firebaseAdmin.js';
import * as reminderSystem from './reminderSystem.js';
import * as sms from './smsService.js';

const app = express();

// Configuración avanzada de CORS y seguridad para desarrollo
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true
}));

// Configurar cabeceras de seguridad para desarrollo
app.use((req, res, next) => {
  // Permitir conexiones no seguras en desarrollo
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  res.setHeader('Access-Control-Allow-Credentials', true);
  next();
});

app.use(express.json());

// Middleware de logging para todas las requests
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`\n📥 [${timestamp}] ${req.method} ${req.path}`);
  console.log(`   Origin: ${req.headers.origin || 'unknown'}`);
  console.log(`   User-Agent: ${req.headers['user-agent'] || 'unknown'}`);
  next();
});

const upload = multer({ dest: "uploads/" });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Google Cloud TTS API Key
const GOOGLE_CLOUD_API_KEY = process.env.GOOGLE_CLOUD_API_KEY;

db.initDatabase();

// Inicializar Firebase Admin SDK
console.log('\n🚀 Iniciando Julie Assistant Server...');
firebase.initializeFirebase();

// Iniciar sistemas de notificaciones
reminderSystem.startReminderSystem();
appointmentSystem.startAppointmentSystem();

// Endpoint raíz
app.get("/", (req, res) => {
  res.json({
    message: "Julie Assistant API",
    version: "1.0.0",
    status: "running",
    endpoints: {
      ping: "/ping",
      health: "/health",
      serverInfo: "/server-info"
    }
  });
});

// Endpoint de prueba de conectividad mejorado
app.get("/ping", (req, res) => {
  const response = {
    status: "ok",
    message: "Servidor funcionando correctamente",
    timestamp: new Date().toISOString(),
    server: {
      uptime: process.uptime(),
      platform: process.platform,
      nodeVersion: process.version
    }
  };
  console.log("✅ PING recibido - servidor activo");
  res.json(response);
});

// Health check más detallado
app.get("/health", (req, res) => {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    server: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      platform: process.platform
    },
    database: {
      initialized: true // db ya está inicializada
    },
    endpoints: {
      transcribe: true,
      medications: true,
      tutor: true,
      alerts: true
    }
  };
  console.log("✅ HEALTH CHECK - Sistema saludable");
  res.json(health);
});

app.post("/transcribe", upload.single("audio"), async (req, res) => {
  try {
    console.log("📥 Recibiendo solicitud de transcripción...");
    
    if (!req.file) {
      return res.status(400).json({ error: "No se recibió archivo de audio" });
    }
    
    const originalPath = req.file.path;
    const newPath = originalPath + '.m4a'; // Forzar extensión .m4a
    
    console.log("📁 Archivo original:", originalPath);
    console.log("📁 Renombrando a:", newPath);
    
    // Renombrar archivo para que tenga extensión .m4a
    fs.renameSync(originalPath, newPath);
    
    const resp = await openai.audio.transcriptions.create({
      file: fs.createReadStream(newPath),
      model: "whisper-1", 
      language: "es", 
    });
    
    console.log("✅ Transcripción exitosa:", resp.text);
    fs.unlink(newPath, () => {});
    res.json({ text: resp.text });
  } catch (e) {
    console.error("❌ Error en transcripción:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// =====================================
// ENDPOINTS DE TUTOR
// =====================================

/**
 * Registrar o actualizar información del tutor
 */
app.post("/register-tutor", async (req, res) => {
  try {
    const { userId, name, phone, relationship } = req.body;

    // Validar campos requeridos
    if (!userId || !name || !phone) {
      return res.status(400).json({ 
        error: 'Faltan campos requeridos: userId, name, phone' 
      });
    }

    // Validar formato de teléfono
    if (!sms.validatePhoneNumber(phone)) {
      return res.status(400).json({ 
        error: 'Formato de teléfono inválido: +56XXXXXXXXXX' 
      });
    }

    // Registrar tutor
    const tutor = db.registerTutor(userId, { name, phone, relationship });
    
    console.log('✅ Tutor registrado:', tutor);
    res.json({ success: true, tutor });
  } catch (error) {
    console.error('❌ Error registrando tutor:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /tutor/:userId
 * Obtener información del tutor registrado
 */
app.get("/tutor/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const tutor = db.getTutor(userId);

    if (!tutor) {
      return res.status(404).json({ error: 'Tutor no encontrado' });
    }

    res.json({ tutor });
  } catch (error) {
    console.error('❌ Error obteniendo tutor:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================
// ENDPOINTS DE MEDICAMENTOS
// =====================================

/**
 * POST /medication-request
 * Notificar al tutor sobre solicitud de registro de medicamento
 * Body: { userId, medicationName, dosage, frequency }
 */
app.post("/medication-request", async (req, res) => {
  try {
    const { userId, medicationName, dosage, frequency } = req.body;

    if (!userId || !medicationName) {
      return res.status(400).json({ 
        error: 'Faltan campos requeridos: userId, medicationName' 
      });
    }

    const tutor = db.getTutor(userId);

    if (!tutor) {
      return res.status(404).json({ 
        error: 'No hay tutor registrado para este usuario' 
      });
    }

    // Construir mensaje de solicitud
    let message = `⚠️ SOLICITUD DE MEDICAMENTO\n\n${userId} solicita registrar:\n- Medicamento: ${medicationName}`;
    if (dosage) message += `\n- Dosis: ${dosage}`;
    if (frequency) message += `\n- Frecuencia: ${frequency}`;
    message += '\n\nPor favor, abre la app para aprobar o rechazar esta solicitud.';

    // Enviar SMS al tutor
    const smsResult = await sms.sendSMS(tutor.phone, message);

    // Registrar alerta
    if (smsResult.success) {
      db.logAlert(userId, 'medication_request', message);
    }

    console.log('📱 Solicitud enviada al tutor:', smsResult);
    res.json({ 
      success: smsResult.success, 
      message: 'Notificación enviada al tutor',
      result: smsResult 
    });
  } catch (error) {
    console.error('❌ Error enviando solicitud:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /medications
 * Crear nuevo medicamento (SOLO desde app del tutor)
 * Body: { userId, name, dosage, frequency, schedule }
 */
app.post("/medications", async (req, res) => {
  try {
    const { userId, name, dosage, frequency, schedule } = req.body;

    if (!userId || !name) {
      return res.status(400).json({ 
        error: 'Faltan campos requeridos: userId, name' 
      });
    }

    // Buscar si ya existe un medicamento con ese nombre para el usuario
    let medication = db.findMedicationByName ? db.findMedicationByName(userId, name) : null;
    if (medication) {
      // Actualizar medicamento existente
      medication = db.updateMedication ? db.updateMedication(medication.id, { dosage, frequency, schedule }) : medication;
      console.log('✅ Medicamento actualizado:', medication);
    } else {
      // Crear medicamento nuevo
      medication = db.createMedication(userId, {
        name,
        dosage,
        frequency,
        schedule
      });
      console.log('✅ Medicamento creado:', medication);
    }
    res.json({ success: true, medication });
  } catch (error) {
    console.error('❌ Error creando medicamento:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /medications/:userId
 * Obtener todos los medicamentos activos de un usuario
 */
app.get("/medications/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const medications = db.getMedications(userId);

    res.json({ medications });
  } catch (error) {
    console.error('❌ Error obteniendo medicamentos:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /medications/:medicationId
 * Eliminar permanentemente un medicamento de la base de datos
 */
app.delete("/medications/:medicationId", async (req, res) => {
  try {
    const { medicationId } = req.params;
    
    // Eliminar permanentemente el medicamento
    db.deleteMedication(medicationId);

    res.json({ success: true, message: 'Medicamento eliminado permanentemente' });
  } catch (error) {
    console.error('❌ Error eliminando medicamento:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================
// ENDPOINTS DE REGISTRO DE TOMAS
// =====================================

/**
 * POST /medication-taken
 * Registrar que el usuario tomó un medicamento
 * Body: { userId, medicationId, status, notes }
 * Status puede ser: 'taken', 'missed', 'postponed'
 */
app.post("/medication-taken", async (req, res) => {
  try {
    const { userId, medicationId, status, notes } = req.body;

    if (!userId || !medicationId || !status) {
      return res.status(400).json({ 
        error: 'Faltan campos requeridos: userId, medicationId, status' 
      });
    }

    // Registrar en BD
    const log = db.logMedicationTaken(medicationId, status, notes || '');

    // Obtener info del medicamento y tutor
    const medication = db.getMedicationById(medicationId);
    const tutor = db.getTutor(userId);

    // Enviar alerta al tutor si está registrado
    if (tutor && medication) {
      let smsResult;
      const userName = userId; 

      if (status === 'taken') {
        smsResult = await sms.alertMedicationTaken(
          tutor.phone,
          userName,
          medication.name
        );
      } else if (status === 'missed') {
        smsResult = await sms.alertMedicationMissed(
          tutor.phone,
          userName,
          medication.name,
          medication.schedule || 'hora programada'
        );
      }

      // Guardar registro de alerta
      if (smsResult && smsResult.success) {
        db.logAlert(userId, status, smsResult.message);
      }

      console.log('📱 Alerta enviada al tutor:', smsResult);
    }

    res.json({ 
      success: true, 
      log,
      alertSent: !!tutor 
    });
  } catch (error) {
    console.error('❌ Error registrando toma:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /medication-status/:userId
 * Obtener resumen de medicamentos tomados hoy
 */
app.get("/medication-status/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const status = db.getTodayMedicationStatus(userId);

    res.json({ status });
  } catch (error) {
    console.error('❌ Error obteniendo estado:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /medication-logs/:medicationId
 * Obtener historial de tomas de un medicamento específico
 */
app.get("/medication-logs/:medicationId", async (req, res) => {
  try {
    const { medicationId } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    
    const logs = db.getMedicationLogs(medicationId, limit);

    res.json({ logs });
  } catch (error) {
    console.error('❌ Error obteniendo logs:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================
// ENDPOINTS DE ALERTAS
// =====================================

/**
 * POST /medications/taken
 * Registrar múltiples medicamentos tomados (confirmación)
 */
app.post("/medications/taken", async (req, res) => {
  try {
    const { userId, medicationIds, reminderIds, timestamp } = req.body;

    if (!userId || !medicationIds || !Array.isArray(medicationIds)) {
      return res.status(400).json({ 
        error: 'Faltan campos requeridos: userId, medicationIds (array)' 
      });
    }

    console.log(`✅ Confirmación de medicamentos tomados: ${medicationIds.join(', ')}`);

    // Registrar cada medicamento como tomado
    const logs = medicationIds.map(medId => 
      db.logMedicationTaken(medId, 'taken', `Confirmado vía asistente a las ${timestamp || new Date().toISOString()}`)
    );

    res.json({ 
      success: true, 
      logs,
      message: 'Medicamentos registrados como tomados'
    });
  } catch (error) {
    console.error('❌ Error registrando medicamentos tomados:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /alerts/missed-medication
 * Enviar alerta al tutor sobre medicamento no tomado
 */
app.post("/alerts/missed-medication", async (req, res) => {
  try {
    const { userId, medicationIds, medicationNames, reminderIds, timestamp } = req.body;

    if (!userId || !medicationNames || !Array.isArray(medicationNames)) {
      return res.status(400).json({ 
        error: 'Faltan campos requeridos: userId, medicationNames (array)' 
      });
    }

    const tutor = db.getTutor(userId);

    if (!tutor) {
      return res.status(404).json({ 
        error: 'No hay tutor registrado para este usuario' 
      });
    }

    const medicationText = medicationNames.join(' y ');
    const message = `⚠️ ALERTA: Tu familiar no ha confirmado tomar ${medicationText}. Verifica que lo haya tomado.`;

    console.log(`⚠️ Enviando alerta de medicamento no tomado: ${medicationText}`);

    // Enviar notificación FCM al tutor
    if (firebase.isFirebaseInitialized()) {
      const notificationData = {
        type: 'missed_medication_alert',
        medicationIds: medicationIds?.join(',') || '',
        medicationNames: medicationText,
        timestamp: timestamp || new Date().toISOString(),
        screen: 'medications',
        priority: 'urgent'
      };

      await firebase.sendNotificationToUser(
        userId,
        {
          title: '⚠️ Medicamento No Confirmado',
          body: message
        },
        notificationData,
        db.getDeviceTokens,
        {
          color: '#EF4444',
          priority: 'max',
          sound: 'default',
          badge: 1
        }
      );
    }

    // Enviar SMS al tutor
    const smsResult = await sms.sendSMS(tutor.phone, message);

    // Registrar alerta
    if (smsResult.success) {
      db.logAlert(userId, 'missed_medication', message);
    }

    res.json({ 
      success: true, 
      alertSent: smsResult.success,
      message: 'Alerta enviada al tutor'
    });
  } catch (error) {
    console.error('❌ Error enviando alerta:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /alert-tutor
 * Enviar alerta manual al tutor (ej: emergencia)
 */
app.post("/alert-tutor", async (req, res) => {
  try {
    const { userId, type, message } = req.body;

    if (!userId || !type || !message) {
      return res.status(400).json({ 
        error: 'Faltan campos requeridos: userId, type, message' 
      });
    }

    const tutor = db.getTutor(userId);

    if (!tutor) {
      return res.status(404).json({ 
        error: 'No hay tutor registrado para este usuario' 
      });
    }

    // Enviar SMS
    const smsResult = await sms.sendSMS(tutor.phone, message);

    // Registrar alerta
    if (smsResult.success) {
      db.logAlert(userId, type, message);
    }

    res.json({ 
      success: smsResult.success, 
      result: smsResult 
    });
  } catch (error) {
    console.error('❌ Error enviando alerta:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /alerts/:userId
 * Obtener historial de alertas enviadas
 */
app.get("/alerts/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    
    const alerts = db.getRecentAlerts(userId, limit);

    res.json({ alerts });
  } catch (error) {
    console.error('❌ Error obteniendo alertas:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================
// SISTEMA DE RECORDATORIOS
// =====================================

/**
 * GET /reminders/:userId
 * Obtener próximos recordatorios programados
 */
app.get("/reminders/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const upcoming = reminderSystem.getUpcomingReminders(userId);
    
    res.json({ 
      reminders: upcoming,
      count: upcoming.length
    });
  } catch (error) {
    console.error('❌ Error obteniendo recordatorios:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================
// SOLICITUDES DE MEDICAMENTOS
// =====================================

/**
 * POST /medication-requests
 * Crear solicitud de medicamento desde el asistente
 */
app.post("/medication-requests", async (req, res) => {
  try {
    const { userId, name, dosage, frequency, schedule, notes } = req.body;
    
    if (!userId || !name) {
      return res.status(400).json({ error: 'Faltan datos requeridos: userId, name' });
    }
    
    // Crear solicitud
    const request = db.createMedicationRequest(userId, {
      name,
      dosage,
      frequency,
      schedule,
      notes
    });
    
    // Enviar alerta al tutor
    try {
      const tutor = db.getTutor(userId);
      if (tutor && tutor.phone) {
        const message = `🔔 Nueva solicitud de medicamento de ${userId}: ${name}${dosage ? ' ' + dosage : ''}`;
        await sms.sendSMS(tutor.phone, message);
        db.logAlert(userId, 'medication_request', message);
      }
    } catch (alertError) {
      console.error('⚠️ Error enviando alerta de solicitud:', alertError);
      // No fallar la solicitud si el SMS falla
    }
    
    res.json({ 
      success: true,
      request
    });
  } catch (error) {
    console.error('❌ Error creando solicitud de medicamento:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /medication-requests/:userId
 * Obtener solicitudes de medicamentos de un usuario
 * Query params: ?status=pending|approved|rejected
 */
app.get("/medication-requests/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;
    
    const requests = db.getMedicationRequests(userId, status);
    
    res.json({ 
      requests,
      count: requests.length
    });
  } catch (error) {
    console.error('❌ Error obteniendo solicitudes:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /medication-requests/:id
 * Actualizar solicitud pendiente (agregar más información)
 */
app.put("/medication-requests/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    console.log(`📝 Actualizando solicitud ${id}:`, JSON.stringify(updates, null, 2));
    
    // Si se proporciona frequency y schedule inicial, calcular horarios completos
    if (updates.frequency && updates.schedule) {
      console.log(`🕐 Intentando calcular horarios: frequency="${updates.frequency}", schedule="${updates.schedule}"`);
      try {
        const calculatedSchedule = db.calculateSchedule(updates.frequency, updates.schedule);
        if (calculatedSchedule && calculatedSchedule !== updates.schedule) {
          updates.schedule = calculatedSchedule;
          console.log(`✅ Horarios calculados automáticamente: ${calculatedSchedule}`);
        } else {
          console.log(`ℹ️ Horarios no modificados: ${updates.schedule}`);
        }
      } catch (calcError) {
        console.error('❌ Error calculando horarios:', calcError);
        // Continuar con el schedule original sin calcular
      }
    }
    
    const updatedRequest = db.updateMedicationRequest(parseInt(id), updates);
    
    res.json({ 
      success: true,
      request: updatedRequest
    });
  } catch (error) {
    console.error('❌ Error actualizando solicitud:', error);
    console.error('Stack:', error.stack);
    res.status(400).json({ 
      error: error.message,
      details: error.stack 
    });
  }
});

/**
 * GET /calculate-schedule
 * Calcula horarios sugeridos a partir de frequency e initialTime
 * Query: frequency, initialTime (opcional)
 */
app.get("/calculate-schedule", (req, res) => {
  try {
    const { frequency, initialTime } = req.query;
    if (!frequency) {
      return res.status(400).json({ error: 'Parámetro frequency es requerido' });
    }
    const schedule = db.calculateSchedule(String(frequency), initialTime ? String(initialTime) : undefined);
    res.json({ success: true, schedule });
  } catch (error) {
    console.error('❌ Error en calculate-schedule:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /debug/reminders/:userId
 * Endpoint de debug para verificar recordatorios
 */
app.get("/debug/reminders/:userId", (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`[DEBUG ENDPOINT] Llamando a getReminders para userId=${userId}`);
    // Llamar a la función getReminders para ver qué devuelve
    const reminders = db.getReminders(userId, false);
    console.log(`[DEBUG ENDPOINT] getReminders devolvió ${reminders.length} recordatorios`);
    res.json({
      debug: true,
      userId,
      count: reminders.length,
      reminders
    });
  } catch (error) {
    console.error(`[DEBUG ENDPOINT] Error:`, error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

/**
 * PUT /medication-requests/:id/approve
 * Aprobar solicitud de medicamento (crea el medicamento automáticamente)
 */
app.put("/medication-requests/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;
    const { processedBy } = req.body;
    
    console.log(`📋 Aprobando solicitud ${id} por ${processedBy}`);
    
    if (!processedBy) {
      return res.status(400).json({ error: 'Falta processedBy (nombre del tutor)' });
    }
    
    const result = db.approveRequest(parseInt(id), processedBy);
    
    console.log(`✅ Solicitud ${id} aprobada exitosamente`);
    res.json(result);
  } catch (error) {
    console.error('❌ Error aprobando solicitud:', error);
    console.error('Stack trace:', error.stack);
    res.status(400).json({ 
      error: error.message,
      details: error.stack 
    });
  }
});

/**
 * PUT /medication-requests/:id/reject
 * Rechazar solicitud de medicamento
 */
app.put("/medication-requests/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;
    const { processedBy, rejectionReason } = req.body;
    
    if (!processedBy) {
      return res.status(400).json({ error: 'Falta processedBy (nombre del tutor)' });
    }
    
    const result = db.rejectRequest(parseInt(id), processedBy, rejectionReason);
    
    res.json(result);
  } catch (error) {
    console.error('❌ Error rechazando solicitud:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * ====================================
 * ENDPOINTS DE RECORDATORIOS
 * ====================================
 */

/**
 * POST /reminders
 * Crear un nuevo recordatorio
 */
app.post("/reminders", async (req, res) => {
  try {
    const { userId, medication_id, title, description, reminder_time, days_of_week, active } = req.body;
    
    if (!userId || !title || !reminder_time) {
      return res.status(400).json({ error: 'Faltan datos requeridos: userId, title, reminder_time' });
    }

    // Validar formato de hora (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(reminder_time)) {
      return res.status(400).json({ error: 'reminder_time debe estar en formato HH:MM' });
    }

    // Convertir active de boolean a número si es necesario
    let activeValue = active;
    if (typeof active === 'boolean') {
      activeValue = active ? 1 : 0;
    }

    const reminder = db.createReminder(userId, {
      medication_id,
      title,
      description,
      reminder_time,
      days_of_week: days_of_week ? JSON.stringify(days_of_week) : null,
      active: activeValue
    });

    res.json({
      success: true,
      reminder
    });
  } catch (error) {
    console.error('❌ Error creando recordatorio:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /reminders/:userId
 * Obtener recordatorios de un usuario
 */
app.get("/reminders/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { active_only } = req.query;
    
    console.log(`📋 [ENDPOINT] Obteniendo recordatorios para userId: ${userId}, tipo: ${typeof userId}`);
    console.log(`📋 [ENDPOINT] active_only=${active_only}`);
    const reminders = db.getReminders(userId, active_only === 'true');
    console.log(`✅ [ENDPOINT] Recordatorios encontrados: ${reminders.length}`);
    console.log(`✅ [ENDPOINT] Enviando respuesta:`, JSON.stringify({ success: true, reminders }, null, 2).substring(0, 200));
    
    res.json({
      success: true,
      reminders
    });
  } catch (error) {
    console.error('❌ Error obteniendo recordatorios:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /reminders/:id
 * Actualizar un recordatorio
 */
app.put("/reminders/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Asegurarnos de que days_of_week sea un array antes de guardarlo
    if (updates.days_of_week) {
      if (Array.isArray(updates.days_of_week)) {
        updates.days_of_week = JSON.stringify(updates.days_of_week);
      } else if (typeof updates.days_of_week === 'string' && !updates.days_of_week.startsWith('[')) {
        // Si es string pero no es JSON, convertirlo a array
        updates.days_of_week = JSON.stringify(updates.days_of_week.split(',').map(Number).filter(n => !isNaN(n)));
      }
    }
    
    const reminder = db.updateReminder(parseInt(id), updates);
    
    res.json({
      success: true,
      reminder
    });
  } catch (error) {
    console.error('❌ Error actualizando recordatorio:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /reminders/:id
 * Eliminar un recordatorio
 */
app.delete("/reminders/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = db.deleteReminder(parseInt(id));
    
    res.json(result);
  } catch (error) {
    console.error('❌ Error eliminando recordatorio:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /reminders/:id/snooze
 * Posponer un recordatorio por X minutos
 */
app.post("/reminders/:id/snooze", async (req, res) => {
  try {
    const { id } = req.params;
    const { duration } = req.body; // duración en minutos (5, 15, 30, 60)
    
    if (!duration || duration <= 0) {
      return res.status(400).json({ error: 'Duración (duration) en minutos es requerida' });
    }

    const result = db.snoozeReminder(parseInt(id), duration);
    
    res.json({
      success: true,
      reminder: result,
      message: `Recordatorio pospuesto por ${duration} minutos`
    });
  } catch (error) {
    console.error('❌ Error posponiendo recordatorio:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /reminders/:userId/history
 * Obtener historial de notificaciones
 */
app.get("/reminders/:userId/history", async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    
    const history = db.getNotificationHistory(userId, limit);
    
    res.json({
      success: true,
      history
    });
  } catch (error) {
    console.error('❌ Error obteniendo historial:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * ====================================
 * ENDPOINTS DE CITAS MÉDICAS
 * ====================================
 */

/**
 * POST /appointments
 * Crear una nueva cita médica
 */
app.post("/appointments", async (req, res) => {
  try {
    let { userId, title, description, appointment_date, appointment_time, location, doctor, reminder_time_before } = req.body;

    // Asegurar que reminder_time_before sea array con valores por defecto
    if (!reminder_time_before || reminder_time_before.length === 0) {
      // Default: a la hora exacta, 1 hora antes, 24 horas antes
      reminder_time_before = [0, 60, 1440];
    } else if (!Array.isArray(reminder_time_before)) {
      reminder_time_before = [reminder_time_before];
    }
    
    if (!userId || !title || !appointment_date || !appointment_time) {
      return res.status(400).json({ error: 'Faltan datos requeridos: userId, title, appointment_date, appointment_time' });
    }

    // Validar formato de fecha (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(appointment_date)) {
      return res.status(400).json({ error: 'appointment_date debe estar en formato YYYY-MM-DD' });
    }

    // Validar formato de hora (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(appointment_time)) {
      return res.status(400).json({ error: 'appointment_time debe estar en formato HH:MM' });
    }

    const appointment = db.createAppointment(userId, {
      title,
      description,
      appointment_date,
      appointment_time,
      location,
      doctor,
      reminder_time_before
    });

    res.json({
      success: true,
      appointment
    });
  } catch (error) {
    console.error('❌ Error creando cita médica:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /appointments/:userId
 * Obtener citas médicas de un usuario
 */
app.get("/appointments/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { active_only } = req.query;
    
    const appointments = db.getAppointments(userId, active_only === 'true');
    
    res.json({
      success: true,
      appointments
    });
  } catch (error) {
    console.error('❌ Error obteniendo citas médicas:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /appointments/:userId/upcoming
 * Obtener citas médicas próximas (próximos 7 días)
 */
app.get("/appointments/:userId/upcoming", async (req, res) => {
  try {
    const { userId } = req.params;
    
    const appointments = db.getUpcomingAppointments(userId);
    
    res.json({
      success: true,
      appointments,
      count: appointments.length
    });
  } catch (error) {
    console.error('❌ Error obteniendo citas próximas:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /appointments/:id
 * Actualizar una cita médica
 */
app.put("/appointments/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Validaciones opcionales si se actualizan estos campos
    if (updates.appointment_date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(updates.appointment_date)) {
        return res.status(400).json({ error: 'appointment_date debe estar en formato YYYY-MM-DD' });
      }
    }
    
    if (updates.appointment_time) {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(updates.appointment_time)) {
        return res.status(400).json({ error: 'appointment_time debe estar en formato HH:MM' });
      }
    }
    
    const appointment = db.updateAppointment(parseInt(id), updates);
    
    res.json({
      success: true,
      appointment
    });
  } catch (error) {
    console.error('❌ Error actualizando cita médica:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /appointments/:id
 * Eliminar una cita médica
 */
app.delete("/appointments/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const success = db.deleteAppointment(parseInt(id));
    
    res.json({
      success,
      message: success ? 'Cita médica eliminada correctamente' : 'No se pudo eliminar la cita'
    });
  } catch (error) {
    console.error('❌ Error eliminando cita médica:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * ====================================
 * ENDPOINTS DE TUTORES
 * ====================================
 */

/**
 * POST /tutor
 * Registrar o actualizar tutor de un usuario
 */
app.post("/tutor", async (req, res) => {
  try {
    console.log('📥 POST /tutor - Request recibido');
    const { userId, name, phone, relationship } = req.body;
    console.log('📝 Datos recibidos:', { userId, name, phone, relationship });
    
    if (!userId || !name || !phone) {
      console.log('❌ Faltan datos requeridos');
      return res.status(400).json({ error: 'Faltan datos requeridos: userId, name, phone' });
    }
    
    console.log('💾 Llamando a db.registerTutor...');
    const tutor = db.registerTutor(userId, { name, phone, relationship });
    console.log('✅ Tutor registrado:', tutor);
    
    res.json({ 
      success: true,
      tutor
    });
  } catch (error) {
    console.error('❌ Error registrando tutor:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * ====================================
 * ENDPOINTS DE NOTIFICACIONES PUSH
 * ====================================
 */

// Almacenamiento en memoria de tokens de dispositivos (en producción usar DB)
const deviceTokens = new Map(); // userId -> { token, platform, registeredAt }

/**
 * POST /devices/register
 * Registrar token de dispositivo para notificaciones push
 */
app.post("/devices/register", async (req, res) => {
  try {
    // Permitir userId o user_id
    let { userId, user_id, token, platform } = req.body;
    userId = userId || user_id;
    console.log('[POST /devices/register] Recibido:', { userId, token, platform });
    if (!userId || !token) {
      console.log('[POST /devices/register] ERROR: userId o token faltante');
      return res.status(400).json({ error: 'userId (o user_id) y token son requeridos' });
    }
    // Guardar en base de datos
    db.saveDeviceToken(userId, token, platform);
    // Verificar registro en base de datos
    const tokens = db.getDeviceTokens(userId);
    console.log('[POST /devices/register] Tokens en BDD tras guardar:', tokens);
    if (tokens && tokens.length > 0) {
      // Por compatibilidad, solo dejamos el último token en el Map (puedes adaptar a multi-dispositivo si lo deseas)
      const last = tokens[tokens.length - 1];
      deviceTokens.set(userId, {
        token: last.token,
        platform: last.platform,
        registeredAt: last.registered_at
      });
    }
    console.log(`📱 Token de dispositivo registrado para usuario ${userId}`);
    res.json({
      success: true,
      message: 'Token registrado correctamente',
      tokens
    });
  } catch (error) {
    console.error('❌ Error registrando token:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /notifications/send
 * Enviar notificación push a un usuario
 */
app.post("/notifications/send", async (req, res) => {
  try {
    // Permitir userId o user_id
    let { userId, user_id, title, body, data } = req.body;
    userId = userId || user_id;
    if (!userId || !title || !body) {
      return res.status(400).json({ error: 'userId (o user_id), title y body son requeridos' });
    }
    let tokens = [];
    // Primero intentamos obtener del Map en memoria
    const deviceInfo = deviceTokens.get(userId);
    if (deviceInfo) {
      tokens.push(deviceInfo.token);
    } else {
      // Si no está en memoria, buscamos en la base de datos
      const dbTokens = db.getDeviceTokens(userId);
      if (dbTokens && dbTokens.length > 0) {
        tokens = dbTokens.map(t => t.token);
        // Opcional: sincronizar el Map con el último token
        const last = dbTokens[dbTokens.length - 1];
        deviceTokens.set(userId, {
          token: last.token,
          platform: last.platform,
          registeredAt: last.registered_at
        });
      }
    }
    if (tokens.length === 0) {
      return res.status(404).json({ 
        error: 'No hay dispositivo registrado para este usuario' 
      });
    }
    // Enviar notificación a todos los tokens registrados para el usuario
    let results = [];
    for (const token of tokens) {
      const notification = {
        to: token,
        sound: 'default',
        title,
        body,
        data: data || {},
      };
      console.log(`📤 Enviando notificación push a usuario ${userId} (token: ${token}):`, notification);
      const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notification)
      });
      const expoResult = await expoResponse.json();
      results.push({ token, expoResult });
    }
    res.json({
      success: true,
      message: 'Notificación enviada',
      results
    });
  } catch (error) {
    console.error('❌ Error enviando notificación:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /notifications/send-fcm
 * Enviar notificación push FCM a un usuario
 */
app.post("/notifications/send-fcm", async (req, res) => {
  try {
    if (!firebase.isFirebaseInitialized()) {
      return res.status(503).json({ 
        error: 'Firebase Admin SDK no está inicializado',
        message: 'Verifica que firebase-service-account.json exista en la carpeta server/'
      });
    }

    // Permitir userId o user_id
    let { userId, user_id, title, body, data } = req.body;
    userId = userId || user_id;

    if (!userId || !title || !body) {
      return res.status(400).json({ 
        error: 'userId (o user_id), title y body son requeridos' 
      });
    }

    console.log(`📤 Enviando notificación FCM a usuario ${userId}`);
    console.log(`   Título: ${title}`);
    console.log(`   Mensaje: ${body}`);

    // Enviar notificación usando Firebase Admin SDK
    const result = await firebase.sendNotificationToUser(
      userId,
      { title, body },
      data || {},
      db.getDeviceTokens
    );

    if (result.success) {
      res.json({
        success: true,
        message: 'Notificación FCM enviada',
        successCount: result.successCount,
        failureCount: result.failureCount,
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.error || 'No se pudo enviar la notificación'
      });
    }
  } catch (error) {
    console.error('❌ Error enviando notificación FCM:', error);
    res.status(500).json({ 
      error: error.message,
      code: error.code 
    });
  }
});

/**
 * POST /test-notification
 * Enviar notificación de prueba inmediata
 * 
 * Body: {
 *   userId: string (requerido),
 *   title?: string,
 *   body?: string,
 *   imageUrl?: string (URL de imagen grande),
 *   icon?: string (nombre del icono),
 *   sound?: string ('default', 'custom_sound'),
 *   color?: string (ej: '#FF5722'),
 *   priority?: string ('high', 'normal', 'low'),
 *   vibrate?: number[] (ej: [300, 200, 300]),
 *   badge?: number (número en el icono de la app),
 *   data?: Object (datos personalizados)
 * }
 */
app.post("/test-notification", async (req, res) => {
  try {
    const { 
      userId, 
      title, 
      body, 
      imageUrl, 
      icon,
      sound, 
      color, 
      priority, 
      vibrate, 
      badge,
      data: customData 
    } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId es requerido' });
    }

    const notificationTitle = title || '🧪 Notificación de Prueba';
    const notificationBody = body || 'Esta es una prueba del sistema de notificaciones de Julie Assistant';

    console.log(`\n🧪 [TEST] Enviando notificación de prueba a userId=${userId}`);
    console.log(`   Título: ${notificationTitle}`);
    console.log(`   Cuerpo: ${notificationBody}`);
    if (imageUrl) console.log(`   Imagen: ${imageUrl}`);
    if (color) console.log(`   Color: ${color}`);
    if (sound) console.log(`   Sonido: ${sound}`);

    const result = await firebase.sendNotificationToUser(
      userId,
      { 
        title: notificationTitle, 
        body: notificationBody,
        imageUrl,
        icon,
      },
      { 
        type: 'test', 
        timestamp: new Date().toISOString(),
        ...customData,
      },
      db.getDeviceTokens,
      {
        sound,
        color,
        priority,
        vibrate,
        badge,
      }
    );

    if (result.success) {
      console.log('✅ Notificación de prueba enviada exitosamente');
      res.json({
        success: true,
        message: 'Notificación enviada',
        sentTo: result.sentTo,
      });
    } else {
      console.log('⚠️  No se pudo enviar notificación de prueba:', result.error);
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('❌ Error en /test-notification:', error);
    res.status(500).json({
      error: 'Error enviando notificación de prueba',
      details: error.message,
    });
  }
});

/**
 * POST /notifications/:notificationId/response
 * Registrar respuesta del usuario a una notificación
 */
app.post("/notifications/:notificationId/response", async (req, res) => {
  try {
    const { notificationId } = req.params;
    const { response } = req.body;
    
    if (!response) {
      return res.status(400).json({ error: 'response es requerido' });
    }
    
    db.logNotificationResponse(parseInt(notificationId), response);
    
    console.log(`✅ Respuesta registrada para notificación ${notificationId}: ${response}`);
    
    res.json({
      success: true,
      message: 'Respuesta registrada'
    });
  } catch (error) {
    console.error('❌ Error registrando respuesta:', error);
    res.status(500).json({ error: error.message });
  }
});

// NOTA: El callback legacy de Expo Push ya no es necesario
// El sistema de recordatorios ahora usa Firebase Admin SDK directamente
// Ver reminderSystem.js -> sendNotification()

/**
 * GET /tutor/:userId
 * Obtener información del tutor
 */
app.get("/tutor/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const tutor = db.getTutor(userId);
    
    res.json({ tutor });
  } catch (error) {
    console.error('❌ Error obteniendo tutor:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================
// TEXT-TO-SPEECH
// =====================================

/**
 * Endpoint para Text-to-Speech con Google Cloud (voz nativa en español)
 * Fallback a OpenAI si Google Cloud falla
 */
app.post("/tts", express.json(), async (req, res) => {
  console.log("🔊 === INICIANDO TTS ===");
  
  try {
    const { text, voice = 'es-US-Neural2-A' } = req.body;
    
    if (!text) {
      console.log("❌ Error: Texto no proporcionado");
      return res.status(400).json({ error: "Se requiere el campo 'text'" });
    }

    console.log(`📝 Texto a sintetizar: "${text.substring(0, 50)}..."`);
    console.log(`🎤 Voz seleccionada: ${voice}`);
    
    // Intentar con Google Cloud TTS primero (voz nativa en español)
    if (GOOGLE_CLOUD_API_KEY) {
      try {
        console.log('🎯 Usando Google Cloud TTS (voz nativa español)...');
        
        const googleResponse = await fetch(
          `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_CLOUD_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              input: { text },
              voice: {
                languageCode: voice.startsWith('es-ES') ? 'es-ES' : 'es-US',
                name: voice
              },
              audioConfig: {
                audioEncoding: 'MP3',  // MP3 para máxima compatibilidad
                speakingRate: 1.05,  // Velocidad ligeramente aumentada
                pitch: 0.0,
                volumeGainDb: 0.0,  // Volumen normal
                sampleRateHertz: 24000,
                effectsProfileId: ['headphone-class-device']  // Optimizado para auriculares
              }
            })
          }
        );

        if (googleResponse.ok) {
          const data = await googleResponse.json();
          const audioBuffer = Buffer.from(data.audioContent, 'base64');
          
          console.log("✅ Audio generado con Google Cloud (MP3)");
          console.log(`📦 Tamaño: ${(audioBuffer.length / 1024).toFixed(2)} KB`);
          
          res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Length': audioBuffer.length,
          });
          res.send(audioBuffer);
          console.log("🎵 Audio enviado al cliente (formato MP3)");
          return;
        } else {
          const errorData = await googleResponse.json();
          console.log("⚠️ Error con Google Cloud:", errorData.error?.message || 'Unknown error');
          console.log("⚠️ Usando fallback a OpenAI...");
        }
      } catch (googleError) {
        console.log("⚠️ Error con Google Cloud:", googleError.message);
        console.log("⚠️ Usando fallback a OpenAI...");
      }
    } else {
      console.log("⚠️ Google Cloud API Key no configurada, usando OpenAI...");
    }
    
    // Fallback a OpenAI TTS
    console.log('🎯 Usando OpenAI TTS...');
    const mp3 = await openai.audio.speech.create({
      model: "tts-1-hd",
      voice: "alloy",
      input: text,
      speed: 0.85,
    });
    
    const buffer = Buffer.from(await mp3.arrayBuffer());
    console.log("✅ Audio generado con OpenAI");
    console.log(`📦 Tamaño: ${(buffer.length / 1024).toFixed(2)} KB`);
    
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': buffer.length,
    });
    res.send(buffer);
    console.log("🎵 Audio enviado al cliente");
    
  } catch (error) {
    console.error("❌ Error generando audio:", error.message);
    res.status(500).json({ 
      error: "Error generando audio",
      details: error.message 
    });
  }
});

// ============================================
// 🎬 ENDPOINTS PARA DEMO
// ============================================

/**
 * Listar todos los medicamentos para fácil selección en demo
 * GET /demo/medications/:userId
 */
app.get('/demo/medications/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`📋 [DEMO] Obteniendo medicamentos para usuario: ${userId}`);
    
    const medications = db.getMedications(userId);
    console.log(`✅ Encontrados ${medications.length} medicamentos`);
    
    res.json({ medications: medications || [] });
  } catch (error) {
    console.error('❌ Error obteniendo medicamentos:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Forzar un recordatorio de medicamento para demostración
 * POST /demo/trigger-reminder
 * Body: { userId, medicationName }
 */
app.post('/demo/trigger-reminder', async (req, res) => {
  try {
    console.log('🎬 [DEMO] Forzando recordatorio de medicamento...');
    const { userId, medicationName } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId es requerido' });
    }

    // Obtener medicamento específico
    const medications = db.getMedications(userId);
    let medication;
    
    if (medicationName) {
      medication = medications.find(m => m.name === medicationName);
    } else {
      medication = medications[0];
    }

    if (!medication) {
      return res.status(404).json({ error: 'No se encontró medicamento' });
    }

    // Obtener token FCM del usuario usando device_tokens table
    const tokens = db.getDeviceTokens(userId);
    
    if (!tokens || tokens.length === 0) {
      return res.status(400).json({ error: 'Usuario no tiene token FCM registrado' });
    }

    const fcmToken = tokens[0].token;

    // Enviar notificación de recordatorio
    const message = {
      token: fcmToken,
      notification: {
        title: `💊 Recordatorio: ${medication.name}`,
        body: `Es hora de tomar tu ${medication.name} ${medication.dosage}`,
      },
      data: {
        type: 'medication_reminder',
        medicationId: medication.id.toString(),
        medicationName: medication.name,
        dosage: medication.dosage || '',
        action: 'reminder'
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'medication_reminders',
          priority: 'high',
          defaultSound: true,
          defaultVibrateTimings: true,
        }
      }
    };

    await firebase.getMessaging().send(message);

    console.log(`✅ [DEMO] Recordatorio enviado: ${medication.name}`);
    res.json({
      success: true,
      message: 'Recordatorio enviado',
      medication: {
        name: medication.name,
        dosage: medication.dosage
      }
    });

  } catch (error) {
    console.error('❌ [DEMO] Error forzando recordatorio:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================
// MANEJADOR DE ERRORES GLOBAL
// =====================================

// Manejar rutas no encontradas
app.use((req, res) => {
  console.log(`❌ Ruta no encontrada: ${req.method} ${req.path}`);
  res.status(404).json({ 
    error: 'Endpoint no encontrado',
    path: req.path,
    method: req.method
  });
});

// Manejador de errores global
app.use((err, req, res, next) => {
  console.error('💥 Error no manejado:', err);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    message: err.message 
  });
});

// =====================================
// ENDPOINTS DE CONFIGURACIÓN
// =====================================

/**
 * GET /api/server-info
 * Obtener información del servidor incluyendo su IP
 */
app.get("/api/server-info", (req, res) => {
  const serverInfo = {
    ip: getLocalIP(),
    port: PORT,
    timestamp: new Date().toISOString()
  };
  res.json(serverInfo);
});

// =====================================
// CONFIGURACIÓN DEL SERVIDOR
// =====================================

// Función para obtener la IP local del servidor
function getServerIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Solo IPv4 y no localhost
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Endpoint para obtener información del servidor
app.get('/server-info', (req, res) => {
  res.json({
    ip: getServerIP(),
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Variable para mantener referencia al sistema de recordatorios
let reminderIntervalId = null;

// Cerrar BD y sistemas de notificaciones al apagar servidor
process.on('SIGINT', () => {
  console.log('\n⏹️  Cerrando servidor...');
  reminderSystem.stopReminderSystem();
  appointmentSystem.stopAppointmentSystem();
  db.closeDatabase();
  process.exit(0);
});

// Función para obtener IP local
import os from 'os';

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Ignorar interfaces internas y no IPv4
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const PORT = 3000;
const localIP = getLocalIP();

// Escuchar en todas las interfaces de red (0.0.0.0)
// Esto permite conexiones desde el emulador, dispositivos físicos, etc.
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log("\n" + "=".repeat(60));
  console.log("🚀 SERVIDOR JULIE ASSISTANT INICIADO");
  console.log("=".repeat(60));
  console.log(`\n📡 Servidor escuchando en el puerto ${PORT}`);
  console.log(`⏰ Iniciado: ${new Date().toLocaleString('es-ES')}`);
  console.log("\n📱 URLs de acceso:");
  console.log(`   ✅ Localhost:           http://localhost:${PORT}`);
  console.log(`   ✅ Emulador Android:    http://10.0.2.2:${PORT}`);
  console.log(`   ✅ Red local:           http://${localIP}:${PORT}`);
  console.log("\n📋 Endpoints disponibles:");
  console.log(`   • GET  /ping               - Test de conectividad`);
  console.log(`   • GET  /health             - Estado del servidor`);
  console.log(`   • POST /transcribe         - Transcripción de audio`);
  console.log(`   • POST /tts                - Text-to-Speech`);
  console.log(`   • GET  /medications/:id    - Obtener medicamentos`);
  console.log(`   • POST /medications        - Crear medicamento`);
  console.log(`   • POST /medication-taken   - Registrar toma`);
  console.log(`   • GET  /reminders/:id      - Listar recordatorios`);
  console.log(`   • POST /reminders          - Crear recordatorio`);
  console.log(`   • PUT  /reminders/:id      - Actualizar recordatorio`);
  console.log(`   • DELETE /reminders/:id    - Eliminar recordatorio`);
  console.log(`   • GET  /appointments/:id   - Listar citas médicas`);
  console.log(`   • POST /appointments       - Crear cita médica`);
  console.log(`   • PUT  /appointments/:id   - Actualizar cita`);
  console.log(`   • DELETE /appointments/:id - Eliminar cita`);
  console.log(`   • GET  /tutor/:id          - Obtener tutor`);
  console.log(`   • POST /tutor              - Registrar tutor`);
  console.log(`   • GET  /alerts/:id         - Obtener alertas`);
  console.log(`   • POST /medication-requests       - Crear solicitud`);
  console.log(`   • GET  /medication-requests/:id   - Listar solicitudes`);
  console.log(`   • PUT  /medication-requests/:id   - Actualizar solicitud`);
  console.log(`   • PUT  /medication-requests/:id/approve  - Aprobar`);
  console.log(`   • PUT  /medication-requests/:id/reject   - Rechazar`);
  console.log(`   • POST /demo/trigger-reminder    - [DEMO] Forzar recordatorio`);
  console.log("\n💡 Tip: Para Android Emulator ejecuta:");
  console.log(`   adb reverse tcp:${PORT} tcp:${PORT}`);
  console.log("\n" + "=".repeat(60) + "\n");
});

// Manejar errores del servidor
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\n❌ ERROR: El puerto ${PORT} ya está en uso`);
    console.error('   Soluciones:');
    console.error('   1. Cierra el proceso que está usando el puerto');
    console.error('   2. O cambia el puerto en el código');
  } else {
    console.error('\n❌ ERROR del servidor:', error);
  }
  process.exit(1);
});
