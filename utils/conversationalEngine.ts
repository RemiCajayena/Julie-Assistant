import { confirmMedicationTaken } from '../services/medicationConfirmationService';
import { JulieMemorySystem } from './embeddingSystem';
import { AdvancedIntentAnalyzer, IntentAnalysis } from './intentAnalysis';
import { responseCache } from './responseCache';

import { getLocationContext } from '../services/locationService';
import { getNewsContext } from '../services/newsService';

export class ConversationalEngine {
  private memorySystem: JulieMemorySystem;
  private intentAnalyzer: AdvancedIntentAnalyzer;

  constructor() {
    this.memorySystem = new JulieMemorySystem();
    this.intentAnalyzer = new AdvancedIntentAnalyzer();
  }

  async generateResponse(
    message: string, 
    conversationHistory: any[],
    userContext: any,
    onMedicationAction?: (action: any) => Promise<string | void>,
    userId?: string // ID del usuario para solicitudes
  ): Promise<string> {
    const startTime = Date.now();

    // 1. Cache check rápido
    if (conversationHistory.length >= 5) {
      const cachedResponse = responseCache.get(message);
      if (cachedResponse) {
        console.log(`⚡ Cache hit (${Date.now() - startTime}ms)`);
        return cachedResponse;
      }
    }
    
    // 2. Análisis de intención (sincrónico, rápido)
    const analysisStart = Date.now();
    const analysis = await this.intentAnalyzer.analyzeMessage(message, conversationHistory);
    console.log(`📊 Análisis: ${Date.now() - analysisStart}ms`, {
      intent: analysis.intent,
      medication: analysis.medicationAction?.action
    });
    
    // 3. Manejar acciones de medicamentos (prioritario)
    if (analysis.medicationAction?.action) {
      if (onMedicationAction) {
        try {
          if (analysis.medicationAction.action === 'taken') {
            await confirmMedicationTaken(); 
          }
          
          const actionResult = await onMedicationAction(analysis.medicationAction);
          
          if (analysis.medicationAction.action === 'query' && typeof actionResult === 'string') {
            console.log(`⚡ Total: ${Date.now() - startTime}ms`);
            return actionResult;
          }
        } catch (error) {
          console.error('❌ Error en acción medicamento:', error);
        }
      } else if (analysis.medicationAction.action === 'query') {
        return 'Lo siento, no puedo consultar tus medicamentos ahora.';
      }
    }
    
    // 4. Construcción de contexto SOLO si es necesario (sin embeddings pesados)
    const contextualPrompt = await this.buildContextualPrompt(
      message,
      analysis,
      conversationHistory,
      userContext
    );
    
    // 5. Generar respuesta pasando el historial completo
    const response = await this.generateChatGPTResponse(contextualPrompt, analysis, conversationHistory);

    // 6. Cache para preguntas comunes
    if (conversationHistory.length >= 3 && analysis.intent === 'question') {
      responseCache.set(message, response);
    }
    
    console.log(`⚡ Total: ${Date.now() - startTime}ms`);
    return response;
  }

  private async buildContextualPrompt(
    message: string,
    analysis: IntentAnalysis,
    history: any[],
    userContext: any
  ): Promise<string> {
    
    const isFirstMessage = history.length === 0;
    
    // Obtener contexto SOLO cuando sea relevante
    let locationContext = '';
    let newsContext = '';
    
    // Solo cargar ubicación/clima si la pregunta lo requiere
    const needsLocation = /clima|temperatura|tiempo|lluv|sol|frío|calor|grados/i.test(message);
    const needsNews = /noticia|noticias|pasando|pas[oó]|novedad/i.test(message);
    
    if (needsLocation || needsNews) {
      try {
        const promises = [];
        if (needsLocation) promises.push(getLocationContext());
        if (needsNews) promises.push(getNewsContext());
        
        const results = await Promise.all(promises);
        if (needsLocation) locationContext = results[0] || '';
        if (needsNews) newsContext = needsLocation ? results[1] || '' : results[0] || '';
      } catch (error) {
        console.warn('⚠️ Error contexto:', error);
      }
    }
    
    const basePersonality = `Eres Julie, asistente conversacional natural para adultos mayores.

PERSONALIDAD:
- Amigable, paciente y comprensiva
- Respuestas cortas y directas (máximo 2 frases)
- Lenguaje simple y cotidiano
- NO uses lenguaje técnico o robótico
- Mantén el contexto de conversaciones anteriores

USUARIO:
${userContext.userName ? `Nombre: ${userContext.userName}` : 'Nombre desconocido'}
${locationContext ? `\nCLIMA ACTUAL: ${locationContext}` : ''}
${newsContext ? `\nNOTICIAS: ${newsContext}` : ''}

ANÁLISIS ACTUAL:
Intención: ${analysis.intent}
${analysis.medicationAction?.action ? `Medicamento: ${analysis.medicationAction.action}` : ''}

INSTRUCCIONES:
- Usa el historial de mensajes para responder con contexto
- Si hay información de clima/noticias, ÚSALA directamente
- NO digas "voy a revisar" o "déjame ver"
- Responde en máximo 2 frases cortas
- Sé natural y conversacional`;

    return basePersonality;
  }

  private async generateChatGPTResponse(
    prompt: string, 
    analysis: IntentAnalysis,
    conversationHistory: any[] = []
  ): Promise<string> {
    try {
      // Respuestas rápidas para medicamentos (sin llamar a API)
      if (analysis.intent.startsWith('medication_') && analysis.intent !== 'medication_query') {
        return this.generateMedicationResponse(analysis);
      }

      // Construir mensajes con historial completo para mantener contexto
      const messages: any[] = [
        { role: 'system', content: prompt }
      ];

      // Tomar los últimos 6 mensajes pero asegurarnos de mantener pares user-assistant
      let recentHistory = conversationHistory.slice(-6);
      
      // Si el historial empieza con assistant, quitarlo para mantener la secuencia correcta
      if (recentHistory.length > 0 && recentHistory[0].role === 'assistant') {
        recentHistory = recentHistory.slice(1);
      }
      
      messages.push(...recentHistory);

      // Log de depuración para verificar el historial
      console.log('🔍 DEBUG - Mensajes enviados a OpenAI:');
      console.log(`   Total de mensajes: ${messages.length}`);
      console.log(`   Sistema: ${messages[0].role}`);
      for (let i = 1; i < messages.length; i++) {
        console.log(`   ${messages[i].role}: "${messages[i].content.substring(0, 50)}..."`);
      }

      // Configuración optimizada para respuestas rápidas
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: messages,
          max_tokens: 80, // Reducido para respuestas más rápidas
          temperature: 0.7, // Reducido para más consistencia
          presence_penalty: 0.3,
          frequency_penalty: 0.3
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.choices?.[0]?.message?.content) {
        throw new Error('Invalid OpenAI response');
      }
      
      return data.choices[0].message.content.trim();
    } catch (error: any) {
      console.error('❌ Error OpenAI:', error.message);
      return 'Disculpa, tuve un problemita. ¿Me repites eso?';
    }
  }

  /**
   * Genera respuestas específicas para acciones de medicamentos
   */
  private generateMedicationResponse(analysis: IntentAnalysis): string {
    const action = analysis.medicationAction;
    const medName = action?.medicationName || 'tu medicamento';

    // Variantes para hacer la conversación más natural
    const confirmationVariants = [
      `¡Excelente! Ya lo tengo anotado. ¿Todo bien con ${medName}?`,
      `¡Perfecto! Ya está. ¿Te cayó bien hoy?`,
      `¡Muy bien! Listo, ya quedó registrado. ¿Cómo te sientes?`,
      `¡Genial! Ya lo marqué. ¿Alguna molestia o todo tranquilo?`,
      `¡Listo! Ya está anotado. ¿Necesitas algo más?`
    ];

    switch (analysis.intent) {
      case 'medication_taken':
        const randomResponse = confirmationVariants[Math.floor(Math.random() * confirmationVariants.length)];
        return randomResponse;
      
      case 'medication_missed':
        return `Entiendo que olvidaste tomar ${medName}. He notificado a tu tutor. ¿Te sientes bien?`;
      
      case 'medication_request':
        return `Entendido. He enviado una solicitud a tu tutor para agregar ${medName}${action?.dosage ? ` de ${action.dosage}` : ''} a tus medicamentos registrados.`;
      
      case 'medication_query':
        // Esta respuesta no debería usarse porque medication_query debe obtener datos reales
        return `Voy a revisar tus medicamentos...`;
      
      case 'emergency':
        return `¡HE ALERTADO A TU TUTOR INMEDIATAMENTE! Mantén la calma. ¿Qué está pasando?`;
      
      default:
        return `Entendido. ¿Hay algo más en lo que pueda ayudarte?`;
    }
  }

  private calculateImportance(analysis: IntentAnalysis): number {
    let importance = 5; // Base
    
    if (analysis.intent === 'personal_share') importance += 3;
    if (analysis.entities.names.length > 0) importance += 2;
    if (analysis.entities.preferences.length > 0) importance += 2;
    if (analysis.sentiment === 'positive') importance += 1;
    if (analysis.sentiment === 'negative') importance += 2; // Más importante recordar problemas
    if (analysis.urgency === 'high') importance += 2;
    
    return Math.min(importance, 10);
  }
}