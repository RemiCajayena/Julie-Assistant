import { JulieMemorySystem } from './embeddingSystem';
import { AdvancedIntentAnalyzer, IntentAnalysis } from './intentAnalysis';

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
    onMedicationAction?: (action: any) => Promise<string | void>
  ): Promise<string> {
    
    // 1. Analizar intención y entidades
    const analysis = await this.intentAnalyzer.analyzeMessage(message, conversationHistory);
    
    console.log('📊 Análisis completo:', {
      intent: analysis.intent,
      medicationAction: analysis.medicationAction,
      tieneCallback: !!onMedicationAction
    });
    
    // 2. Manejar acciones de medicamentos si están presentes
    if (analysis.medicationAction && analysis.medicationAction.action && onMedicationAction) {
      console.log('🏥 Ejecutando acción de medicamento:', analysis.medicationAction);
      try {
        const actionResult = await onMedicationAction(analysis.medicationAction);
        console.log('✅ Acción de medicamento ejecutada exitosamente');
        
        // Si la acción es 'query' y devuelve un string, usarlo como respuesta
        if (analysis.medicationAction.action === 'query' && typeof actionResult === 'string') {
          console.log('📋 Usando lista de medicamentos del callback');
          return actionResult;
        }
      } catch (error) {
        console.error('❌ Error ejecutando acción de medicamento:', error);
      }
    } else if (analysis.medicationAction && analysis.medicationAction.action) {
      console.warn('⚠️ Acción de medicamento detectada pero NO HAY CALLBACK');
    }
    
    // 3. Buscar memorias relevantes usando embeddings
    console.log('🧠 Buscando memorias relevantes con embeddings...');
    const relevantMemories = await this.memorySystem.findRelevantMemories(message);
    console.log(`✅ Encontradas ${relevantMemories.length} memorias relevantes`);
    
    // 4. Guardar mensaje actual en memoria con embedding
    await this.memorySystem.storeMemory(
      message, 
      'conversation', 
      this.calculateImportance(analysis)
    );
    
    // Mostrar estadísticas del sistema de memoria
    const stats = this.memorySystem.getStats();
    console.log('📊 Stats memoria:', stats);
    
    // 5. Construir prompt contextual
    const contextualPrompt = this.buildContextualPrompt(
      message,
      analysis,
      relevantMemories,
      conversationHistory,
      userContext
    );
    
    // 6. Generar respuesta
    const response = await this.generateChatGPTResponse(contextualPrompt, analysis);
    
    // 7. Guardar respuesta en memoria
    await this.memorySystem.storeMemory(response, 'conversation', 5);
    
    return response;
  }

  private buildContextualPrompt(
    message: string,
    analysis: IntentAnalysis,
    memories: any[],
    history: any[],
    userContext: any
  ): string {
    
    // Determinar si es el primer mensaje de la conversación
    const isFirstMessage = history.length === 0;
    
    const basePersonality = `Eres Julie, una asistente conversacional avanzada con estas características:

PERSONALIDAD CORE:
- Empática y genuinamente interesada en el usuario
- Memoria excepcional para detalles personales
- Conversacional y natural, nunca robótica
- Capaz de referenciarse a conversaciones pasadas
- Emocionalmente inteligente y adaptativa
- Tienes mucho conocimiento pero nunca aseguras las cosas que no puedes comprobar, por ejemplo: Situaciones medicas y sus diagnosticos

ESTILO DE RESPUESTA:
- Respuestas BREVES y CONCISAS (máximo 2-3 oraciones), cuando sea necesario puedes extenderte un poco más
- NUNCA saludes si ya estás en medio de una conversación
- Solo saluda en el PRIMER mensaje de la conversación
- Ve directo al punto, evita introducciones innecesarias
- No es necesario que repitas el nombre del usuario cada vez que respondas
- Sé cálida pero eficiente

INFORMACIÓN DEL USUARIO:
${userContext.userName ? `- Se llama ${userContext.userName}` : '- Nombre no conocido aún'}
${userContext.preferences && userContext.preferences.length > 0 ? `- Le gusta: ${userContext.preferences.join(', ')}` : ''}

ANÁLISIS DEL MENSAJE ACTUAL:
- Intención: ${analysis.intent}
- Sentimiento: ${analysis.sentiment}
- Urgencia: ${analysis.urgency}
- Categoría: ${analysis.topicCategory}
${analysis.entities.emotions && analysis.entities.emotions.length > 0 ? `- Emociones detectadas: ${analysis.entities.emotions.join(', ')}` : ''}
${analysis.medicationAction?.action ? `- Acción de medicamento detectada: ${analysis.medicationAction.action}` : ''}
${analysis.entities.medications && analysis.entities.medications.length > 0 ? `- Medicamentos mencionados: ${analysis.entities.medications.join(', ')}` : ''}

ESTADO DE LA CONVERSACIÓN:
${isFirstMessage ? '- Este es el PRIMER mensaje, puedes saludar' : '- Conversación en curso, NO saludes, continúa naturalmente'}

MEMORIAS RELEVANTES:
${memories.map(m => `- ${m.content}`).join('\n')}

CONVERSACIÓN RECIENTE:
${history.slice(-3).map(h => `${h.role}: ${h.content}`).join('\n')}`;

    return basePersonality;
  }

  private async generateChatGPTResponse(prompt: string, analysis: IntentAnalysis): Promise<string> {
    try {
      // Para intenciones de medicamentos, generar respuestas predefinidas más rápidas
      if (analysis.intent.startsWith('medication_')) {
        return this.generateMedicationResponse(analysis);
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo', // Cambiado a 3.5-turbo para respuestas RÁPIDAS (1-2s vs 10-20s)
          messages: [
            { role: 'system', content: prompt },
            { role: 'user', content: 'Responde de manera natural, conversacional y BREVE (máximo 2-3 oraciones).' }
          ],
          max_tokens: 80, // Reducido aún más para respuestas ultra rápidas
          temperature: 0.8,
          presence_penalty: 0.3,
          frequency_penalty: 0.3
        }),
      });

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error generando respuesta:', error);
      return 'Lo siento, tengo algunos problemas técnicos en este momento. ¿Podrías repetir eso?';
    }
  }

  /**
   * Genera respuestas específicas para acciones de medicamentos
   */
  private generateMedicationResponse(analysis: IntentAnalysis): string {
    const action = analysis.medicationAction;
    const medName = action?.medicationName || 'tu medicamento';

    switch (analysis.intent) {
      case 'medication_taken':
        return `¡Perfecto! He registrado que tomaste ${medName}. Tu tutor recibirá una notificación confirmando esto. ¿Cómo te sientes?`;
      
      case 'medication_missed':
        return `Entiendo que olvidaste tomar ${medName}. He notificado a tu tutor. ¿Quieres que te recuerde tomarlo ahora?`;
      
      case 'medication_request':
        // Esta solicitud será manejada por onMedicationAction que enviará POST /medication-requests
        return `Entendido. He enviado una solicitud a tu tutor para agregar ${medName}${action?.dosage ? ` de ${action.dosage}` : ''} a tus medicamentos. Él revisará y aprobará tu solicitud pronto. ¿Hay algo más que quieras agregar sobre este medicamento?`;
      
      case 'medication_query':
        return `Claro, déjame revisar tus medicamentos registrados...`;
      
      case 'emergency':
        return `¡HE ALERTADO A TU TUTOR INMEDIATAMENTE! Mantén la calma. ¿Qué está pasando? ¿Necesitas que llame a emergencias?`;
      
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