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
    userContext: any
  ): Promise<string> {
    
    // 1. Analizar intención y entidades
    const analysis = await this.intentAnalyzer.analyzeMessage(message, conversationHistory);
    
    // 2. Buscar memorias relevantes
    const relevantMemories = await this.memorySystem.findRelevantMemories(message);
    
    // 3. Guardar mensaje actual en memoria
    await this.memorySystem.storeMemory(
      message, 
      'conversation', 
      this.calculateImportance(analysis)
    );
    
    // 4. Construir prompt contextual
    const contextualPrompt = this.buildContextualPrompt(
      message,
      analysis,
      relevantMemories,
      conversationHistory,
      userContext
    );
    
    // 5. Generar respuesta
    const response = await this.generateChatGPTResponse(contextualPrompt);
    
    // 6. Guardar respuesta en memoria
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
    
    const basePersonality = `Eres Julie, una asistente conversacional avanzada con estas características:

PERSONALIDAD CORE:
- Empática y genuinamente interesada en el usuario
- Memoria excepcional para detalles personales
- Conversacional y natural, nunca robótica
- Capaz de referenciarse a conversaciones pasadas
- Emocionalmente inteligente y adaptativa
- Tienes mucho conocimiento pero nunca aseguras las cosas que no puedes comprobar, por ejemplo: Situaciones medicas y sus diagnosticos

INFORMACIÓN DEL USUARIO:
${userContext.userName ? `- Se llama ${userContext.userName}` : '- Nombre no conocido aún'}
${userContext.preferences.length > 0 ? `- Le gusta: ${userContext.preferences.join(', ')}` : ''}

ANÁLISIS DEL MENSAJE ACTUAL:
- Intención: ${analysis.intent}
- Sentimiento: ${analysis.sentiment}
- Urgencia: ${analysis.urgency}
- Categoría: ${analysis.topicCategory}
${analysis.entities.emotions.length > 0 ? `- Emociones detectadas: ${analysis.entities.emotions.join(', ')}` : ''}

MEMORIAS RELEVANTES:
${memories.map(m => `- ${m.content}`).join('\n')}

CONVERSACIÓN RECIENTE:
${history.slice(-3).map(h => `${h.role}: ${h.content}`).join('\n')}`;

    return basePersonality;
  }

  private async generateChatGPTResponse(prompt: string): Promise<string> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4', // Usar GPT-4 para mejor calidad
          messages: [
            { role: 'system', content: prompt },
            { role: 'user', content: 'Responde de manera natural y conversacional.' }
          ],
          max_tokens: 300,
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