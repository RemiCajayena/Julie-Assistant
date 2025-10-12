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

  async storeMemory(content: string, type: MemoryChunk['type'], importance: number = 5) {
    // Por ahora sin embeddings - versión simple
    const memory: MemoryChunk = {
      id: Date.now().toString(),
      content,
      embedding: [], // Vacío por ahora
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
    // Versión simple: buscar por palabras clave
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
}