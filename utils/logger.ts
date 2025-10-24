/**
 * Configuración de Logs
 * Controla qué logs se muestran en desarrollo vs producción
 */

// Modo debug - cambiar a false para producción
export const DEBUG_MODE = true;

// Categorías de logs
export const LOG_CATEGORIES = {
  TTS: true,              // Text-to-Speech logs
  STT: true,              // Speech-to-Text logs
  CONVERSATION: false,    // Logs de conversación (DESACTIVADO para reducir ruido)
  INTENT: false,          // Análisis de intenciones (DESACTIVADO)
  API: false,             // Llamadas API (DESACTIVADO)
  AUDIO: true,            // Configuración de audio
  UI: false,              // Eventos UI (DESACTIVADO)
  ERROR: true,            // Errores (siempre activo)
  MEDICATION: true,       // Logs de medicamentos
  REMINDER: true,         // Logs de recordatorios
};

/**
 * Logger condicional según categoría
 */
export const logger = {
  tts: (message: string, ...args: any[]) => {
    if (DEBUG_MODE && LOG_CATEGORIES.TTS) {
      console.log(`🔊 [TTS] ${message}`, ...args);
    }
  },
  
  stt: (message: string, ...args: any[]) => {
    if (DEBUG_MODE && LOG_CATEGORIES.STT) {
      console.log(`🎤 [STT] ${message}`, ...args);
    }
  },
  
  conversation: (message: string, ...args: any[]) => {
    if (DEBUG_MODE && LOG_CATEGORIES.CONVERSATION) {
      console.log(`💬 [CONV] ${message}`, ...args);
    }
  },
  
  intent: (message: string, ...args: any[]) => {
    if (DEBUG_MODE && LOG_CATEGORIES.INTENT) {
      console.log(`🎯 [INTENT] ${message}`, ...args);
    }
  },
  
  api: (message: string, ...args: any[]) => {
    if (DEBUG_MODE && LOG_CATEGORIES.API) {
      console.log(`🌐 [API] ${message}`, ...args);
    }
  },
  
  audio: (message: string, ...args: any[]) => {
    if (DEBUG_MODE && LOG_CATEGORIES.AUDIO) {
      console.log(`🔉 [AUDIO] ${message}`, ...args);
    }
  },
  
  ui: (message: string, ...args: any[]) => {
    if (DEBUG_MODE && LOG_CATEGORIES.UI) {
      console.log(`🖼️ [UI] ${message}`, ...args);
    }
  },
  
  error: (message: string, ...args: any[]) => {
    if (DEBUG_MODE && LOG_CATEGORIES.ERROR) {
      console.error(`❌ [ERROR] ${message}`, ...args);
    }
  },
  
  medication: (message: string, ...args: any[]) => {
    if (DEBUG_MODE && LOG_CATEGORIES.MEDICATION) {
      console.log(`💊 [MED] ${message}`, ...args);
    }
  },
  
  reminder: (message: string, ...args: any[]) => {
    if (DEBUG_MODE && LOG_CATEGORIES.REMINDER) {
      console.log(`⏰ [REMINDER] ${message}`, ...args);
    }
  },
  
  success: (message: string, ...args: any[]) => {
    if (DEBUG_MODE) {
      console.log(`✅ ${message}`, ...args);
    }
  },
  
  warn: (message: string, ...args: any[]) => {
    if (DEBUG_MODE) {
      console.warn(`⚠️ ${message}`, ...args);
    }
  },
  
  info: (message: string, ...args: any[]) => {
    if (DEBUG_MODE) {
      console.log(`ℹ️ ${message}`, ...args);
    }
  },
};

/**
 * Configurar todas las categorías a la vez
 */
export const setLogLevel = (level: 'all' | 'minimal' | 'none') => {
  if (level === 'all') {
    Object.keys(LOG_CATEGORIES).forEach(key => {
      LOG_CATEGORIES[key as keyof typeof LOG_CATEGORIES] = true;
    });
  } else if (level === 'minimal') {
    Object.keys(LOG_CATEGORIES).forEach(key => {
      LOG_CATEGORIES[key as keyof typeof LOG_CATEGORIES] = false;
    });
    LOG_CATEGORIES.ERROR = true;
    LOG_CATEGORIES.TTS = true;
    LOG_CATEGORIES.STT = true;
  } else if (level === 'none') {
    Object.keys(LOG_CATEGORIES).forEach(key => {
      LOG_CATEGORIES[key as keyof typeof LOG_CATEGORIES] = false;
    });
  }
};
