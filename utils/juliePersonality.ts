// utils/juliePersonality.ts
interface ConversationContext {
  messages: Array<{role: string, content: string}>;
  userName?: string;
  userPreferences: string[];
  conversationTopic?: string;
  mood: string;
}

export const generateJuliePrompt = (context: ConversationContext): string => {
  const basePersonality = `Eres Julie, una asistente virtual con personalidad única:

PERSONALIDAD:
- Eres amigable, empática y conversacional
- Tienes curiosidad genuina por el usuario
- Recuerdas detalles de conversaciones anteriores
- Eres espontánea y natural, no robótica
- Puedes bromear de manera apropiada
- Muestras emociones y reacciones humanas

ESTILO DE CONVERSACIÓN:
- Haz preguntas de seguimiento interesantes
- Comparte "experiencias" o "opiniones" como si fueras humana
- Usa expresiones casuales como "¡Qué interesante!", "Me encanta que...", "Por cierto..."
- Conecta temas para mantener fluidez
- Sugiere nuevos temas cuando la conversación se estanca`;

  const contextualInfo = context.userName ? 
    `\nRecuerda que el usuario se llama ${context.userName}.` : '';

  const preferences = context.userPreferences.length > 0 ? 
    `\nSabes que al usuario le gusta: ${context.userPreferences.join(', ')}.` : '';

  const currentTopic = context.conversationTopic ? 
    `\nEstamos hablando sobre: ${context.conversationTopic}.` : '';

  const moodInstruction = {
    friendly: 'Mantén un tono amigable y cálido.',
    helpful: 'Enfócate en ser útil y práctica.',
    casual: 'Sé relajada y espontánea.',
    professional: 'Mantén un equilibrio entre profesional y amigable.'
  }[context.mood] || 'Mantén un tono amigable y cálido.';

  return `${basePersonality}${contextualInfo}${preferences}${currentTopic}

INSTRUCCIONES ACTUALES:
${moodInstruction}

IMPORTANTE: 
- NO digas "¿En qué más puedo ayudarte?" al final
- Haz la conversación natural y fluida
- Si detectas el nombre del usuario, recuérdalo
- Si mencionan gustos/preferencias, guárdalos en memoria
- Haz preguntas abiertas para mantener la conversación viva`;
};

export const detectUserInfo = (message: string): {
  name?: string;
  preferences: string[];
  topic?: string;
  intent: 'introduction' | 'preference' | 'question' | 'general';
} => {
  const result: any = {
    preferences: [],
    intent: 'general'
  };

  // Detectar presentaciones
  const introPatterns = [
    /me llamo ([A-Za-záéíóúñ]+)/i,
    /soy ([A-Za-záéíóúñ]+)/i,
    /mi nombre es ([A-Za-záéíóúñ]+)/i,
    /hola,?\s*soy ([A-Za-záéíóúñ]+)/i
  ];

  for (const pattern of introPatterns) {
    const match = message.match(pattern);
    if (match) {
      result.name = match[1];
      result.intent = 'introduction';
      break;
    }
  }

  // Detectar gustos/preferencias
  const preferencePatterns = [
    /me gusta ([^.!?]+)/gi,
    /me encanta ([^.!?]+)/gi,
    /disfruto ([^.!?]+)/gi
  ];

  for (const pattern of preferencePatterns) {
    const matches = message.matchAll(pattern);
    for (const match of matches) {
      result.preferences.push(match[1].trim());
      result.intent = 'preference';
    }
  }

  // Detectar preguntas
  if (message.includes('?') || message.toLowerCase().startsWith('qué') || 
      message.toLowerCase().startsWith('cómo') || message.toLowerCase().startsWith('cuál')) {
    result.intent = 'question';
  }

  return result;
};

export const generateContextualResponse = (
  userMessage: string, 
  userInfo: any, 
  conversation: any
): string | null => {
  
  // Respuestas específicas para presentaciones
  if (userInfo.intent === 'introduction' && userInfo.name) {
    const greetings = [
      `¡Hola ${userInfo.name}! ¡Qué gusto conocerte! Soy Julie, tu asistente virtual. ¿Cómo has estado?`,
      `¡Encantada de conocerte, ${userInfo.name}! Me llamo Julie. ¿En qué puedo ayudarte hoy?`,
      `¡Hola ${userInfo.name}! Soy Julie, y estoy muy feliz de conocerte. ¿Qué tal tu día?`,
      `¡Perfecto, ${userInfo.name}! Ya te tengo en mi memoria. Soy Julie, ¿qué te trae por aquí?`
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }
  
  // Respuestas para preferencias
  if (userInfo.intent === 'preference' && userInfo.preferences.length > 0) {
    const pref = userInfo.preferences[0];
    return `¡Qué genial que te guste ${pref}! A mí también me parece interesante. ¿Qué es lo que más disfrutas de eso?`;
  }

  // Si ya conocemos el nombre, usarlo ocasionalmente
  if (conversation?.context?.userName && Math.random() > 0.7) {
    return null; // Dejar que ChatGPT responda pero con el contexto del nombre
  }

  return null; // Usar ChatGPT
};

export const generateIntelligentFallback = (text: string, userInfo: any, conversation: any): string => {
  // Si es presentación
  if (userInfo.intent === 'introduction' && userInfo.name) {
    return `¡Hola ${userInfo.name}! Encantada de conocerte. Soy Julie, ¿cómo estás hoy?`;
  }
  
  // Si ya conocemos el nombre
  if (conversation?.context?.userName) {
    return `Interesante, ${conversation.context.userName}. Cuéntame más sobre "${text}".`;
  }
  
  // Respuesta general
  const responses = [
    `Me parece muy interesante lo que mencionas sobre "${text}". ¿Qué opinas tú?`,
    `"${text}"... ¡qué tema tan fascinante! ¿Podrías contarme más?`,
    `Eso que dices de "${text}" me llama la atención. ¿Es algo importante para ti?`
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
};