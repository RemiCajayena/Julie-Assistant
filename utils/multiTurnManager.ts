/**
 * Sistema de Conversación Multi-Turno Contextual
 * 
 * Determina si la conversación debe continuar automáticamente
 * basándose en el contexto y tipo de interacción
 */

export interface ConversationContext {
  intent: string;
  sentiment: string;
  requiresFollowUp: boolean;
  turnCount: number;
  isGreeting: boolean;
  isQuestion: boolean;
  isEmergency: boolean;
  lastUserMessage: string;
  lastAssistantMessage: string;
}

export class MultiTurnManager {
  private maxTurns: number = 3; // Máximo de turnos automáticos
  private currentTurn: number = 0;

  /**
   * Determina si la conversación debe continuar automáticamente
   */
  shouldContinueConversation(context: ConversationContext): boolean {
    // Resetear contador si es una nueva conversación
    if (this.currentTurn === 0 || context.turnCount === 1) {
      this.currentTurn = 0;
    }

    this.currentTurn++;

    // Regla 1: No continuar si alcanzamos el límite de turnos
    if (this.currentTurn >= this.maxTurns) {
      console.log(`🔚 Límite de turnos alcanzado (${this.maxTurns})`);
      return false;
    }

    // Regla 2: SIEMPRE continuar en emergencias
    if (context.isEmergency) {
      console.log('🚨 Conversación continúa: EMERGENCIA');
      return true;
    }

    // Regla 3: NO continuar si es despedida (prioridad alta)
    if (this.isFarewell(context.lastUserMessage) || this.isFarewell(context.lastAssistantMessage)) {
      console.log('👋 Conversación termina: DESPEDIDA');
      return false;
    }

    // Regla 4: NO continuar si el usuario da una respuesta corta y cerrada
    if (this.isClosedResponse(context.lastUserMessage)) {
      console.log('🔚 Conversación termina: RESPUESTA CERRADA');
      return false;
    }

    // Regla 5: Continuar si Julie hace una pregunta explícita
    if (this.assistantAskedQuestion(context.lastAssistantMessage)) {
      console.log('❓ Conversación continúa: JULIE PREGUNTÓ');
      return true;
    }

    // Regla 6: Continuar en saludos solo si es el primer turno
    if (context.isGreeting && this.currentTurn === 1) {
      console.log('👋 Conversación continúa: SALUDO INICIAL');
      return true;
    }

    // Regla 7: Continuar en conversaciones sobre medicamentos solo 1 turno
    if (context.intent.includes('medication') && this.currentTurn === 1) {
      console.log('💊 Conversación continúa: MEDICAMENTOS (1 turno)');
      return true;
    }

    // Regla 8: Continuar si es una pregunta directa del usuario
    if (context.isQuestion && this.currentTurn === 1) {
      console.log('❓ Conversación continúa: PREGUNTA DEL USUARIO');
      return true;
    }

    // Por defecto: NO continuar (ser más conservador)
    console.log('🔚 Conversación termina: NO HAY RAZÓN CLARA PARA CONTINUAR');
    return false;
  }

  /**
   * Resetea el contador de turnos
   */
  reset() {
    this.currentTurn = 0;
    console.log('🔄 Contador de turnos reseteado');
  }

  /**
   * Obtiene el turno actual
   */
  getCurrentTurn(): number {
    return this.currentTurn;
  }

  /**
   * Detecta si Julie hizo una pregunta en su última respuesta
   */
  private assistantAskedQuestion(message: string): boolean {
    const questionMarkers = [
      '?',
      '¿',
      'dime',
      'cuéntame',
      'quieres',
      'necesitas',
      'te gustaría',
      'cómo',
      'qué',
      'cuándo',
      'dónde',
      'puedo ayudarte'
    ];

    const lowerMessage = message.toLowerCase();
    return questionMarkers.some(marker => lowerMessage.includes(marker));
  }

  /**
   * Detecta si es una pregunta de seguimiento relacionada
   */
  private isFollowUpQuestion(context: ConversationContext): boolean {
    const followUpIndicators = [
      'y',
      'también',
      'además',
      'otra cosa',
      'por cierto'
    ];

    const lowerMessage = context.lastUserMessage.toLowerCase();
    return followUpIndicators.some(indicator => lowerMessage.startsWith(indicator));
  }

  /**
   * Detecta respuestas afirmativas
   */
  private isAffirmativeResponse(message: string): boolean {
    const affirmativePatterns = [
      /^s[ií]\s*$/i,
      /^ok\s*$/i,
      /^vale\s*$/i,
      /^claro\s*$/i,
      /^por supuesto\s*$/i,
      /^s[ií],?\s+/i, // "sí, quiero..."
    ];

    return affirmativePatterns.some(pattern => pattern.test(message.trim()));
  }

  /**
   * Detecta despedidas
   */
  private isFarewell(message: string): boolean {
    const farewellPatterns = [
      /adi[oó]s/i,
      /chao/i,
      /hasta luego/i,
      /nos vemos/i,
      /hasta pronto/i,
      /gracias,?\s+(adi[oó]s|chao|hasta)/i,
      /nada m[aá]s/i,
      /eso es todo/i,
      /ya est[aá]/i
    ];

    return farewellPatterns.some(pattern => pattern.test(message));
  }

  /**
   * Detecta respuestas cerradas que no invitan a continuar
   */
  private isClosedResponse(message: string): boolean {
    const closedPatterns = [
      /^no\s*$/i,
      /^nada\s*$/i,
      /^no gracias\s*$/i,
      /^est[aá] bien\s*$/i,
      /^todo bien\s*$/i,
      /^perfecto\s*$/i,
      /^listo\s*$/i,
    ];

    const trimmedMessage = message.trim();
    
    // Respuestas muy cortas (menos de 5 caracteres) suelen ser cerradas
    if (trimmedMessage.length < 5) {
      return closedPatterns.some(pattern => pattern.test(trimmedMessage));
    }

    return false;
  }

  /**
   * Genera un prompt para que Julie mantenga la conversación fluida
   */
  getContextualPrompt(context: ConversationContext): string {
    if (this.currentTurn === 1) {
      return 'Esta es tu primera respuesta. Sé cálida y pregunta algo relevante para mantener la conversación natural.';
    }

    if (this.currentTurn === 2) {
      return 'Esta es tu segunda respuesta. Responde de forma conversacional pero prepara para cerrar la conversación sutilmente.';
    }

    if (this.currentTurn >= 3) {
      return 'Esta es tu última respuesta. Cierra la conversación de forma natural y cálida. Despídete sutilmente.';
    }

    return '';
  }
}
