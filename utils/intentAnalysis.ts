export interface IntentAnalysis {
  intent: 'greeting' | 'question' | 'request' | 'personal_share' | 'emotional' | 'factual' | 'casual';
  entities: {
    names: string[];
    locations: string[];
    dates: string[];
    preferences: string[];
    emotions: string[];
  };
  sentiment: 'positive' | 'negative' | 'neutral';
  urgency: 'low' | 'medium' | 'high';
  topicCategory: string;
  contextClues: string[];
}

export class AdvancedIntentAnalyzer {
  async analyzeMessage(message: string, conversationHistory: any[]): Promise<IntentAnalysis> {
    return {
      intent: this.detectIntent(message),
      entities: this.extractEntities(message),
      sentiment: this.analyzeSentiment(message),
      urgency: this.detectUrgency(message),
      topicCategory: this.categorizeMessage(message),
      contextClues: this.extractContextClues(message, conversationHistory)
    };
  }

  private detectIntent(message: string): IntentAnalysis['intent'] {
    const lowerMessage = message.toLowerCase();
    
    // Saludos
    if (/^(hola|hi|hey|buenos días|buenas tardes|buenas noches)/i.test(message)) {
      return 'greeting';
    }
    
    // Preguntas
    if (message.includes('?') || /^(qué|cómo|cuál|cuándo|dónde|por qué)/i.test(message)) {
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

  private extractEntities(message: string) {
    return {
      names: this.extractNames(message),
      locations: [],
      dates: [],
      preferences: this.extractPreferences(message),
      emotions: this.extractEmotions(message)
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
}