import twilio from 'twilio';

// Configuración de Twilio
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

// Cliente de Twilio (solo si hay credenciales válidas)
let twilioClient = null;
if (accountSid && authToken && accountSid.startsWith('AC')) {
  try {
    twilioClient = twilio(accountSid, authToken);
    console.log('✅ Twilio configurado correctamente');
  } catch (error) {
    console.log('⚠️  Error al configurar Twilio:', error.message);
    console.log('⚠️  Los SMS se simularán');
  }
} else {
  console.log('⚠️  Twilio NO configurado (credenciales inválidas o ausentes) - Los SMS se simularán');
}

/**
 * Plantillas de mensajes para diferentes tipos de alertas
 */
const messageTemplates = {
  medicationTaken: (userName, medicationName, time) => 
    `✅ ${userName} tomó ${medicationName} a las ${time}.`,

  medicationMissed: (userName, medicationName, scheduledTime) => 
    `⚠️ ALERTA: ${userName} NO tomó ${medicationName}. Hora programada: ${scheduledTime}.`,

  medicationPostponed: (userName, medicationName, newTime) => 
    `⏰ ${userName} pospuso ${medicationName} para las ${newTime}.`,

  emergency: (userName) => 
    `🆘 EMERGENCIA: ${userName} activó el botón de emergencia. Por favor contacta inmediatamente.`,

  dailySummary: (userName, taken, total, date) => 
    `📊 Resumen del día ${date}:\n${userName} tomó ${taken} de ${total} medicamentos.`,

  reminderSent: (userName, medicationName, time) => 
    `🔔 Se envió recordatorio a ${userName} para tomar ${medicationName} a las ${time}.`
};

/**
 * Formatear hora en formato legible
 */
function formatTime(date = new Date()) {
  return date.toLocaleTimeString('es-ES', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

/**
 * Formatear fecha en formato legible
 */
function formatDate(date = new Date()) {
  return date.toLocaleDateString('es-ES', { 
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Enviar SMS genérico
 * @param {string} toPhone - Número de teléfono del destinatario (formato: +521234567890)
 * @param {string} message - Mensaje a enviar
 * @returns {Promise<object>} - Resultado del envío
 */
export async function sendSMS(toPhone, message) {
  // Si no está configurado Twilio, simular envío
  if (!twilioClient) {
    console.log('📱 [SIMULADO] SMS enviado a', toPhone);
    console.log('💬 Mensaje:', message);
    return {
      success: true,
      simulated: true,
      to: toPhone,
      message: message,
      timestamp: new Date()
    };
  }

  // Envío real con Twilio
  try {
    const result = await twilioClient.messages.create({
      body: message,
      from: twilioPhone,
      to: toPhone
    });

    console.log('✅ SMS enviado exitosamente:', result.sid);
    return {
      success: true,
      simulated: false,
      sid: result.sid,
      to: toPhone,
      message: message
    };
  } catch (error) {
    console.error('❌ Error enviando SMS:', error.message);
    return {
      success: false,
      error: error.message,
      to: toPhone
    };
  }
}

/**
 * Alertas específicas para diferentes eventos
 */

export async function alertMedicationTaken(tutorPhone, userName, medicationName) {
  const message = messageTemplates.medicationTaken(
    userName, 
    medicationName, 
    formatTime()
  );
  return await sendSMS(tutorPhone, message);
}

export async function alertMedicationMissed(tutorPhone, userName, medicationName, scheduledTime) {
  const message = messageTemplates.medicationMissed(
    userName, 
    medicationName, 
    scheduledTime
  );
  return await sendSMS(tutorPhone, message);
}

export async function alertMedicationPostponed(tutorPhone, userName, medicationName, newTime) {
  const message = messageTemplates.medicationPostponed(
    userName, 
    medicationName, 
    newTime
  );
  return await sendSMS(tutorPhone, message);
}

export async function alertEmergency(tutorPhone, userName) {
  const message = messageTemplates.emergency(userName);
  return await sendSMS(tutorPhone, message);
}

export async function sendDailySummary(tutorPhone, userName, medicationsTaken, totalMedications) {
  const message = messageTemplates.dailySummary(
    userName, 
    medicationsTaken, 
    totalMedications,
    formatDate()
  );
  return await sendSMS(tutorPhone, message);
}

/**
 * Validar formato de número de teléfono
 * Debe estar en formato internacional: +52XXXXXXXXXX (México)
 */
export function validatePhoneNumber(phone) {
  // Expresión regular para validar números internacionales
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
}

/**
 * Configurar Twilio después de iniciar servidor
 * (útil si quieres cambiar credenciales en tiempo de ejecución)
 */
export function configureTwilio(newAccountSid, newAuthToken, newPhone) {
  if (newAccountSid && newAuthToken && newPhone) {
    twilioClient = twilio(newAccountSid, newAuthToken);
    process.env.TWILIO_ACCOUNT_SID = newAccountSid;
    process.env.TWILIO_AUTH_TOKEN = newAuthToken;
    process.env.TWILIO_PHONE_NUMBER = newPhone;
    console.log('✅ Twilio reconfigurado');
    return true;
  }
  return false;
}

export default {
  sendSMS,
  alertMedicationTaken,
  alertMedicationMissed,
  alertMedicationPostponed,
  alertEmergency,
  sendDailySummary,
  validatePhoneNumber,
  configureTwilio
};
