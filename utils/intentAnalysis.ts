export interface IntentAnalysis {
  intent: 'greeting' | 'question' | 'request' | 'personal_share' | 'emotional' | 'factual' | 'casual' | 'medication_taken' | 'medication_missed' | 'medication_query' | 'medication_request' | 'emergency';
  entities: {
    names: string[];
    locations: string[];
    dates: string[];
    preferences: string[];
    emotions: string[];
    medications: string[];
    time: string | null;
  };
  sentiment: 'positive' | 'negative' | 'neutral';
  urgency: 'low' | 'medium' | 'high';
  topicCategory: string;
  contextClues: string[];
  medicationAction?: {
    action: 'taken' | 'missed' | 'request' | 'query' | null;
    medicationName?: string;
    time?: string;
    dosage?: string;
  };
}

export class AdvancedIntentAnalyzer {
  async analyzeMessage(message: string, conversationHistory: any[]): Promise<IntentAnalysis> {
    // 1. Limpiar frases irrelevantes o marcas de agua conocidas
    const cleanedMessage = this.cleanIrrelevantPhrases(message);
    // 2. Normalización y corrección ortográfica básica para palabras clave médicas
    const normalizedMessage = this.normalizeMedicalKeywords(cleanedMessage);
    const intent = this.detectIntent(normalizedMessage);
    const medicationAction = this.detectMedicationAction(normalizedMessage, conversationHistory);
    
    // Log de depuración para entender qué se está detectando
    console.log('🔍 Análisis de mensaje:', {
      mensaje: normalizedMessage,
      intent,
      medicationAction
    });
    
    return {
      intent,
      entities: this.extractEntities(normalizedMessage, conversationHistory),
      sentiment: this.analyzeSentiment(normalizedMessage),
      urgency: this.detectUrgency(normalizedMessage),
      topicCategory: this.categorizeMessage(normalizedMessage),
      contextClues: this.extractContextClues(normalizedMessage, conversationHistory),
      medicationAction
    };
  }

  /**
   * Elimina frases irrelevantes o marcas de agua conocidas del mensaje
   */
  private cleanIrrelevantPhrases(message: string): string {
    // Elimina solo frases exactas de marca de agua de Amara
    const amaraPhrases = [
      'Subtitulos realizados por la comunidad de Amara.org',
      'Subtítulos realizados por la comunidad de Amara.org',
      'Subtitulado por la comunidad de Amara.org',
      'Subtítulos por la comunidad de Amara.org',
      'Subtitulos por la comunidad de Amara.org',
      'Subtitulos realizados por la comunidad dee Amara.org',
      'Subtítulos realizados por la comunidad dee Amara.org',
    ];
    let result = message;
    for (const phrase of amaraPhrases) {
      // Elimina la frase si aparece sola o al inicio/fin de línea
      const regex = new RegExp(`(^|\n)${phrase}(\n|$)`, 'gi');
      result = result.replace(regex, '').trim();
    }
    return result;
  }


  private normalizeMedicalKeywords(message: string): string {
    const corrections: Record<string, string> = {
      // Errores comunes de reconocimiento de voz
      'recitaron': 'recetaron',
      'resetaron': 'recetaron',
      'resetar': 'recetar',
      'recetaronme': 'recetaron me',
      'recetaronle': 'recetaron le',
      'aspirinaa': 'aspirina',
      'ibuprofenoa': 'ibuprofeno',
      'paracetamola': 'paracetamol',
      'amoxicilinaa': 'amoxicilina',

    };
    let result = message;
    for (const [wrong, correct] of Object.entries(corrections)) {
      // Reemplazo insensible a mayúsculas/minúsculas
      const regex = new RegExp(wrong, 'gi');
      result = result.replace(regex, correct);
    }
    return result;
  }

  private detectIntent(message: string): IntentAnalysis['intent'] {
    const lowerMessage = message.toLowerCase();
    
    // Emergencia/SOS (más alta prioridad)
    if (/emergencia|ayuda urgente|socorro|sos|me ca[ií]|me duele mucho|no puedo respirar/i.test(message)) {
      return 'emergency';
    }
    
    // Medicamentos - Tomado
    if (/ya tom[eé]|acabo de tomar|tom[eé] (mi|la|el)|me (tom[eé]|la tom[eé])/i.test(message)) {
      return 'medication_taken';
    }
    
    // Medicamentos - Olvidado
    if (/olvid[eé] tomar|no (tom[eé]|he tomado)|me salt[eé]|se me olvid[oó]/i.test(message)) {
      return 'medication_missed';
    }
    
    // Medicamentos - Consultar (prioritario antes de request)
    if (/qu[eé] (medicamentos|pastillas|remedios)|cu[aá]les son mis|lista de medicamentos|mis medicamentos|tengo que tomar/i.test(message)) {
      return 'medication_query';
    }
    
    // Medicamentos - Solicitar registro
    if (
      /(?:necesito|quiero|debo|tengo que|puedo|podr[ií]as?|me gustaria)\s+(?:agregar|a[ñn]adir|registrar|ingresar|crear)/i.test(message) ||
      /(?:agregar|a[ñn]adir|registrar|ingresar|crear)\s+(?:un|una|el|la)?\s*(?:medicamento|pastilla|remedio|medicina)/i.test(message) ||
      /(?:nuevo|nueva)\s+(?:medicamento|pastilla|remedio|medicina)/i.test(message) ||
      /me\s+(?:recetaron|dieron|indicaron|prescribieron)/i.test(message)
    ) {
      return 'medication_request';
    }
    
    // Saludos
    if (/^(hola|hi|hey|buenos d[ií]as|buenas tardes|buenas noches|qu[eé] tal)/i.test(message)) {
      return 'greeting';
    }
    
    // Preguntas (más amplio)
    if (message.includes('?') || /^(qué|c[oó]mo|cu[aá]l|cu[aá]ndo|d[oó]nde|por qu[eé]|qui[eé]n|cu[aá]nto)/i.test(message)) {
      return 'question';
    }
    
    // Información personal
    if (/me llamo|mi nombre|soy |me gusta|me encanta/i.test(message)) {
      return 'personal_share';
    }
    
    // Emocional
    if (/me siento|estoy (triste|feliz|enojado|preocupado|nervioso)/i.test(message)) {
      return 'emotional';
    }
    
    // Solicitudes
    if (/puedes|podrías|me ayudas|necesito|quiero que/i.test(message)) {
      return 'request';
    }
    
    return 'casual';
  }

  private extractEntities(message: string, conversationHistory?: any[]) {
    return {
      names: this.extractNames(message),
      locations: [],
      dates: [],
      preferences: this.extractPreferences(message),
      emotions: this.extractEmotions(message),
      medications: this.extractMedications(message, conversationHistory),
      time: this.extractTime(message)
    };
  }

  private extractNames(message: string): string[] {
    const namePatterns = [
      /me llamo ([A-Za-záéíóúñ]+)/gi,
      /mi nombre es ([A-Za-záéíóúñ]+)/gi,
      /soy ([A-Za-záéíóúñ]+)/gi
    ];
    
    const names: string[] = [];
    namePatterns.forEach(pattern => {
      const matches = message.matchAll(pattern);
      for (const match of matches) {
        names.push(match[1]);
      }
    });
    
    return names;
  }

  private extractPreferences(message: string): string[] {
    const prefPatterns = [
      /me gusta ([^.!?]+)/gi,
      /me encanta ([^.!?]+)/gi,
      /odio ([^.!?]+)/gi,
      /no me gusta ([^.!?]+)/gi
    ];
    
    const preferences: string[] = [];
    prefPatterns.forEach(pattern => {
      const matches = message.matchAll(pattern);
      for (const match of matches) {
        preferences.push(match[1].trim());
      }
    });
    
    return preferences;
  }

  private extractEmotions(message: string): string[] {
    const emotionWords = {
      happy: ['feliz', 'contento', 'alegre', 'genial', 'excelente'],
      sad: ['triste', 'deprimido', 'mal', 'horrible'],
      angry: ['enojado', 'molesto', 'furioso', 'irritado'],
      excited: ['emocionado', 'ansioso', 'expectante'],
      worried: ['preocupado', 'nervioso', 'estresado']
    };

    const detected: string[] = [];
    const lowerMessage = message.toLowerCase();
    
    Object.entries(emotionWords).forEach(([emotion, words]) => {
      if (words.some(word => lowerMessage.includes(word))) {
        detected.push(emotion);
      }
    });
    
    return detected;
  }

  private analyzeSentiment(message: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = ['bueno', 'genial', 'excelente', 'feliz', 'contento', 'me gusta'];
    const negativeWords = ['malo', 'horrible', 'triste', 'odio', 'no me gusta'];
    
    const lowerMessage = message.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerMessage.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerMessage.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private detectUrgency(message: string): 'low' | 'medium' | 'high' {
    const urgentWords = ['urgente', 'rápido', 'ya', 'ahora', 'inmediatamente'];
    const lowerMessage = message.toLowerCase();
    
    if (urgentWords.some(word => lowerMessage.includes(word))) {
      return 'high';
    }
    
    if (message.includes('!') || message.includes('??')) {
      return 'medium';
    }
    
    return 'low';
  }

  private categorizeMessage(message: string): string {
    const categories = {
      'tecnología': ['programar', 'código', 'computadora', 'software', 'app'],
      'deportes': ['fútbol', 'correr', 'ejercicio', 'gym', 'deporte'],
      'comida': ['pizza', 'comida', 'cocinar', 'receta', 'comer'],
      'trabajo': ['trabajo', 'oficina', 'jefe', 'proyecto', 'reunión'],
      'personal': ['familia', 'amigos', 'pareja', 'casa', 'vida']
    };
    
    const lowerMessage = message.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        return category;
      }
    }
    
    return 'general';
  }

  private extractContextClues(message: string, history: any[]): string[] {
    const clues: string[] = [];
    
    if (message.includes('dijiste') || message.includes('mencionaste')) {
      clues.push('reference_to_previous');
    }
    
    if (message.includes('pero') || message.includes('sin embargo')) {
      clues.push('contradiction_or_clarification');
    }
    
    return clues;
  }

  // =====================================
  // DETECCIÓN DE MEDICAMENTOS
  // =====================================

  /**
   * Detecta intenciones relacionadas con medicamentos
   */
  private detectMedicationAction(message: string, conversationHistory?: any[]): IntentAnalysis['medicationAction'] {
    const lowerMessage = message.toLowerCase();
    
    // AMPLIADO: Detectar confirmación de toma (más patrones)
    const takenPatterns = [
      /ya tom[eé]/i,
      /acabo de tomar/i,
      /tom[eé] (mi|la|el|mis|las|los)/i,
      /me tom[eé]/i,
      /lo tom[eé]/i,
      /la tom[eé]/i,
      /s[ií],?\s*(ya\s*)?tom[eé]/i,
      /s[ií],?\s*lo\s*tom[eé]/i,
      /listo,?\s*tom[eé]/i,
      /tom[eé]\s*(la|el|mi)\s*(pastilla|medicina|medicamento)/i,
      /ingier[oó]\s*(la|el|mi)/i,
      /consum[ií]\s*(la|el|mi)/i
    ];
    
    if (takenPatterns.some(pattern => pattern.test(message))) {
      return {
        action: 'taken',
        medicationName: this.extractMedicationName(message, conversationHistory),
        time: this.extractTime(message) || 'ahora'
      };
    }
    
    // Detectar: "Olvidé tomar" / "No tomé"
    if (/olvid[eé] tomar|no (tom[eé]|he tomado)|me salt[eé]|no\s*lo\s*tom[eé]/i.test(message)) {
      return {
        action: 'missed',
        medicationName: this.extractMedicationName(message, conversationHistory),
        time: this.extractTime(message) || undefined
      };
    }
    
    // Detectar: "Necesito agregar" / "Quiero registrar" / "Me recetaron" (solicitud al tutor)
    // Usa los MISMOS patrones que detectIntent para consistencia
    if (
      /(?:necesito|quiero|debo|tengo que|puedo|podr[ií]as?|me gustaria)\s+(?:agregar|a[ñn]adir|registrar|ingresar|crear)/i.test(message) ||
      /(?:agregar|a[ñn]adir|registrar|ingresar|crear)\s+(?:un|una|el|la)?\s*(?:medicamento|pastilla|remedio|medicina)/i.test(message) ||
      /(?:nuevo|nueva)\s+(?:medicamento|pastilla|remedio|medicina)/i.test(message) ||
      /me\s+(?:recetaron|dieron|indicaron|prescribieron)/i.test(message) ||
      /(?:necesito|quiero|busco|dame|dime)\s+(?:información|info|datos)\s+(?:sobre|acerca\s+de|del?)\s+(?:el|la)?\s*\w+/i.test(message) ||
      /(?:debo|tengo\s+que|voy\s+a|puedo)\s+(?:tomar|usar)\s+(?:el|la)?\s*\w+/i.test(message)
    ) {
      const medicationInfo = this.extractMedicationDetails(message, conversationHistory);
      console.log('🔍 Solicitud de medicamento detectada:', medicationInfo);
      return {
        action: 'request',
        medicationName: medicationInfo.name,
        dosage: medicationInfo.dosage
      };
    }
    
    // Detectar consultas: "Qué medicamentos tengo" / "Cuáles son mis pastillas"
    if (/qu[eé] (medicamentos|pastillas|remedios)|cu[aá]les son mis|lista de medicamentos/i.test(message)) {
      return {
        action: 'query',
        medicationName: undefined
      };
    }
    
    return { action: null };
  }

  /**
   * Extrae información detallada de un medicamento del mensaje
   */
  private extractMedicationDetails(message: string, conversationHistory?: any[]): { name?: string; dosage?: string } {
    const name = this.extractMedicationName(message, conversationHistory);
    const dosage = this.extractDosage(message);
    
    return { name, dosage };
  }

  /**
   * Extrae nombres de medicamentos del mensaje
   */
  private extractMedications(message: string, conversationHistory?: any[]): string[] {
    const medications: string[] = [];
    const medicationName = this.extractMedicationName(message, conversationHistory);
    
    if (medicationName) {
      medications.push(medicationName);
    }
    
    return medications;
  }

  /**
   * Extrae el nombre específico de un medicamento con mejor precisión
   * Si el usuario usa pronombres como "ese", "eso", "este", busca en el historial
   */
  private extractMedicationName(message: string, conversationHistory?: any[]): string | undefined {
    const lowerMessage = message.toLowerCase();
    
    // PRIMERO: Detectar si usa pronombres de referencia
    const pronounPatterns = [
      /(?:ese|esa|eso|este|esta|esto)\s+(?:medicamento|pastilla|remedio|medicina)/i,
      /me\s+(?:recetaron|dieron|indicaron|prescribieron)\s+(?:ese|esa|eso|este|esta|esto)/i,
      /(?:agregar|registrar|a[ñn]adir)\s+(?:ese|esa|eso|este|esta|esto)/i,
    ];
    
    const usesPronoun = pronounPatterns.some(pattern => pattern.test(message));
    
    if (usesPronoun && conversationHistory && conversationHistory.length > 0) {
      console.log('🔍 Detectado pronombre de referencia, buscando en historial...');
      
      // Buscar medicamentos mencionados en los últimos 10 mensajes
      const recentHistory = conversationHistory.slice(-10).reverse();
      
      for (const historyItem of recentHistory) {
        const content = historyItem.content || '';
        const medicationFromHistory = this.extractMedicationNameDirect(content);
        
        if (medicationFromHistory) {
          console.log(`✅ Medicamento encontrado en historial: "${medicationFromHistory}"`);
          return medicationFromHistory;
        }
      }
      
      console.log('⚠️ No se encontró medicamento en el historial');
    }
    
    // SEGUNDO: Extracción directa del mensaje actual
    return this.extractMedicationNameDirect(message);
  }

  /**
   * Extrae el nombre del medicamento directamente del mensaje (sin buscar en historial)
   */
  private extractMedicationNameDirect(message: string): string | undefined {
    // Lista de palabras que NO son medicamentos (extendida)
    const excludeWords = [
      'pastilla', 'medicamento', 'remedio', 'medicina', 'dosis', 'toma', 'tomar',
      'nuevo', 'nueva', 'un', 'una', 'el', 'la', 'llamado', 'llamada',
      'ese', 'esa', 'eso', 'este', 'esta', 'esto', 'necesito', 'quiero',
      'agregar', 'registrar', 'añadir', 'anadir', 'recetaron', 'dieron',
      'indicaron', 'prescribieron', 'exceder', 'reducir', 'aliviar', 'usar',
      'común', 'comun', 'horas', 'día', 'dia', 'tomes', 'debe', 'debo',
      'puedo', 'puede', 'para', 'por', 'sin', 'con', 'cada', 'dolor',
      'cabeza', 'fiebre', 'gripe', 'tos', 'resfriado', 'malestar',
      'mejor', 'bueno', 'buena', 'malo', 'mala', 'ayuda', 'sirve',
      'gastritis', 'diabetes', 'hipertensión', 'hipertension', 'presión', 'presion',
      'colesterol', 'azúcar', 'azucar', 'corazón', 'corazon', 'constancia',
      'sobre', 'acerca', 'información', 'informacion', 'info', 'datos'
    ];
    
    // Diccionario de medicamentos comunes (para validación)
    const commonMedications = [
      'paracetamol', 'acetaminofen', 'aspirina', 'ibuprofeno', 'naproxeno',
      'omeprazol', 'losartan', 'metformina', 'atorvastatina', 'insulina',
      'enalapril', 'captopril', 'amoxicilina', 'azitromicina', 'diclofenaco',
      'tramadol', 'clonazepam', 'zopiclona', 'loratadina', 'cetirizina',
      'ranitidina', 'salbutamol', 'levotiroxina', 'insulina', 'warfarina'
    ];
    
    // Patrones para detectar nombres de medicamentos
    const patterns = [
      
      /\b([a-záéíóúñ]{4,})\s+(?:de\s+)?\d+\s*(?:mg|gr|ml|g|mcg)\b/i,
      
      // "me dieron omeprazol para" - Prioridad a lo que sigue a "dieron/recetaron"
      /(?:me\s+(?:dieron|recetaron|indicaron|prescribieron))\s+(?:el\s+|la\s+)?([a-záéíóúñ]{4,})/i,
      
      /(?:tomar|tom[eé]|tomo)\s+(?:el\s+|la\s+|mi\s+)?([a-záéíóúñ]{4,})/i,
      
      /(?:sobre|acerca\s+de|informaci[oó]n\s+sobre)\s+(?:el|la)\s+([a-záéíóúñ]{4,})/i,
      
      /(?:debo|deb[oía]|puedo|puede)\s+(?:tomar|usar)\s+(?:el\s+|la\s+)?([a-záéíóúñ]{4,})/i,

      /(?:mi|tu|su|la|el)\s+([a-záéíóúñ]{4,})(?:\s|$|,|\.|!|\?)/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const word = match[1].toLowerCase().trim();
        
 
        if (!excludeWords.includes(word) && word.length >= 4) {
          if (commonMedications.includes(word)) {
            console.log(`✅ Medicamento común detectado: "${word}"`);
            return word.charAt(0).toUpperCase() + word.slice(1);
          }
          

          return word.charAt(0).toUpperCase() + word.slice(1);
        }
      }
    }

    return undefined;
  }


  private extractDosage(message: string): string | undefined {

    // Patrones mejorados para detectar dosificación
    const patterns = [

      /(\d+(?:\.\d+)?\s*(?:mg|gr|g|ml|cc))/i,
      
      /de\s+(\d+)\s*(miligramos?|gramos?|mililitros|emeele|emege?)/i,
      
      /(\d+)\s*(comprimidos?|pastillas?|c[áa]psulas?|tabletas?)/i,
      
      /(\d+)\s*(gotas?)/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        if (match[2]) {

          const amount = match[1];
          let unit = match[2].toLowerCase();
          

          if (unit.includes('miligram')) unit = 'mg';
          else if (unit.includes('gram')) unit = 'g';
          else if (unit.includes('mililitr')) unit = 'ml';
          else if (unit.includes('comprimido') || unit.includes('pastilla') || unit.includes('tableta')) unit = 'comprimidos';
          else if (unit.includes('c')) unit = 'cápsulas';
          else if (unit.includes('gota')) unit = 'gotas';
          
          return `${amount}${unit}`;
        } else {

          return match[1];
        }
      }
    }

    return undefined;
  }


  private extractTime(message: string): string | null {

    const timePatterns = [
      /a las (\d{1,2}(?::\d{2})?(?:\s*(?:am|pm))?)/i,
      /(\d{1,2}(?::\d{2})?(?:\s*(?:am|pm))?)/i,
    ];

    for (const pattern of timePatterns) {
      const match = message.match(pattern);
      if (match) {
        return match[1];
      }
    }

    // Patrones de tiempo relativo
    const relativePatterns = {
      'ahora': /ahora|ahorita|en este momento|justo ahora/i,
      'hace un momento': /hace un momento|hace poco|recién/i,
      'en la mañana': /en la ma[ñn]ana|por la ma[ñn]ana/i,
      'en la tarde': /en la tarde|por la tarde/i,
      'en la noche': /en la noche|por la noche/i,
    };

    for (const [time, pattern] of Object.entries(relativePatterns)) {
      if (pattern.test(message)) {
        return time;
      }
    }

    return null;
  }
}