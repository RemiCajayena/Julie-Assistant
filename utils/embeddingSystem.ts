interface MemoryChunk {
  id: string;
  content: string;
  embedding: number[];
  timestamp: Date;
  type: 'conversation' | 'fact' | 'preference' | 'context';
  importance: number;
}

export class JulieMemorySystem {
  private memories: MemoryChunk[] = [];
  private readonly maxMemories = 1000;
  private readonly OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  private readonly USE_EMBEDDINGS = false; // DESACTIVADO para velocidad

  /**
   * Genera embeddings usando OpenAI
   */
  private async generateEmbedding(text: string): Promise<number[]> {

    if (!this.USE_EMBEDDINGS) return [];
    
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small', 
          input: text,
        }),
      });

      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.error('Error generando embedding:', error);
      return []; // Fallback a búsqueda simple
    }
  }


  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length === 0 || b.length === 0) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async storeMemory(content: string, type: MemoryChunk['type'], importance: number = 5) {

    const embedding = await this.generateEmbedding(content);
    
    const memory: MemoryChunk = {
      id: Date.now().toString(),
      content,
      embedding,
      timestamp: new Date(),
      type,
      importance
    };

    this.memories.push(memory);
    
    if (this.memories.length > this.maxMemories) {
      this.cleanupMemories();
    }
  }

  async findRelevantMemories(query: string, limit: number = 5): Promise<MemoryChunk[]> {
    // Si no hay memorias, retornar array vacío
    if (this.memories.length === 0) return [];
    
    // Generar embedding para la query
    const queryEmbedding = await this.generateEmbedding(query);
    
    // Si no se pudo generar embedding, usar búsqueda simple
    if (queryEmbedding.length === 0) {
      return this.findRelevantMemoriesSimple(query, limit);
    }
    
    // Calcular similitud con todas las memorias
    return this.memories
      .map(memory => ({
        ...memory,
        similarity: this.cosineSimilarity(queryEmbedding, memory.embedding)
      }))
      .sort((a, b) => {
        // Ordenar por similitud + importancia + recencia
        const scoreA = a.similarity * 0.7 + (a.importance / 10) * 0.2 + 
                       (1 - (Date.now() - a.timestamp.getTime()) / (1000 * 60 * 60 * 24 * 30)) * 0.1;
        const scoreB = b.similarity * 0.7 + (b.importance / 10) * 0.2 + 
                       (1 - (Date.now() - b.timestamp.getTime()) / (1000 * 60 * 60 * 24 * 30)) * 0.1;
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  /**
   * Búsqueda simple sin embeddings (fallback)
   */
  private findRelevantMemoriesSimple(query: string, limit: number = 5): MemoryChunk[] {
    const queryWords = query.toLowerCase().split(' ');
    
    return this.memories
      .map(memory => ({
        ...memory,
        similarity: this.calculateSimpleRelevance(queryWords, memory.content)
      }))
      .sort((a, b) => (b.similarity + b.importance) - (a.similarity + a.importance))
      .slice(0, limit);
  }

  private calculateSimpleRelevance(queryWords: string[], content: string): number {
    const contentWords = content.toLowerCase().split(' ');
    let matches = 0;
    
    queryWords.forEach(word => {
      if (contentWords.some(cWord => cWord.includes(word) || word.includes(cWord))) {
        matches++;
      }
    });
    
    return matches / queryWords.length;
  }

  private cleanupMemories() {
    this.memories = this.memories
      .sort((a, b) => {
        const scoreA = a.importance + (Date.now() - a.timestamp.getTime()) / (1000 * 60 * 60 * 24);
        const scoreB = b.importance + (Date.now() - b.timestamp.getTime()) / (1000 * 60 * 60 * 24);
        return scoreB - scoreA;
      })
      .slice(0, Math.floor(this.maxMemories * 0.8));
  }

  /**
   * Obtener estadísticas del sistema de memoria
   */
  getStats() {
    return {
      totalMemories: this.memories.length,
      withEmbeddings: this.memories.filter(m => m.embedding.length > 0).length,
      byType: {
        conversation: this.memories.filter(m => m.type === 'conversation').length,
        fact: this.memories.filter(m => m.type === 'fact').length,
        preference: this.memories.filter(m => m.type === 'preference').length,
        context: this.memories.filter(m => m.type === 'context').length,
      }
    };
  }
}