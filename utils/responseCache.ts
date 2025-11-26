 /**
 * Sistema de Cache para Respuestas del Asistente
 * Acelera respuestas comunes y reduce llamadas a la API
 */

interface CacheEntry {
  response: string;
  timestamp: number;
  hitCount: number;
}

class ResponseCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_DURATION = 1000 * 60 * 30; // 30 minutos
  private readonly MAX_CACHE_SIZE = 100;

  /**
   * Normalizar mensaje para cache (ignorar mayúsculas, espacios extra, etc.)
   */
  private normalizeMessage(message: string): string {
    return message
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[¿?¡!.,;:]/g, '');
  }

  /**
   * Verificar si un mensaje tiene una respuesta en cache válida
   */
  get(message: string): string | null {
    const key = this.normalizeMessage(message);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Verificar si el cache expiró
    if (Date.now() - entry.timestamp > this.CACHE_DURATION) {
      this.cache.delete(key);
      return null;
    }

    // Incrementar contador de hits
    entry.hitCount++;
    console.log(`💨 Cache HIT para: "${message}" (${entry.hitCount} hits)`);
    
    return entry.response;
  }

  /**
   * Guardar respuesta en cache
   */
  set(message: string, response: string): void {
    const key = this.normalizeMessage(message);

    // Limpiar cache si está muy grande
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictOldest();
    }

    this.cache.set(key, {
      response,
      timestamp: Date.now(),
      hitCount: 0,
    });

    console.log(`💾 Cache GUARDADO para: "${message}"`);
  }

  /**
   * Eliminar entradas más antiguas
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log('🗑️ Cache evicted: entrada más antigua eliminada');
    }
  }

  /**
   * Limpiar todo el cache
   */
  clear(): void {
    this.cache.clear();
    console.log('🧹 Cache completamente limpiado');
  }

  /**
   * Obtener estadísticas del cache
   */
  getStats(): { size: number; totalHits: number } {
    let totalHits = 0;
    for (const entry of this.cache.values()) {
      totalHits += entry.hitCount;
    }

    return {
      size: this.cache.size,
      totalHits,
    };
  }

  /**
   * Pre-cargar respuestas comunes
   * NOTA: El cache solo se usa para el PRIMER saludo de la conversación
   * Las respuestas subsecuentes usan IA para mantener naturalidad
   */
  preloadCommonResponses(): void {
    // Eliminamos el cache de respuestas predefinidas
    // Solo cacheamos respuestas generadas por IA después de la primera vez
    // Esto mantiene la naturalidad mientras acelera respuestas repetitivas del mismo usuario
    
    console.log('✅ Sistema de cache listo (sin respuestas predefinidas)');
    console.log('💡 El cache solo guardará respuestas IA generadas para acelerar consultas repetidas');
  }
}

// Exportar instancia singleton
export const responseCache = new ResponseCache();

// Pre-cargar respuestas comunes al importar
responseCache.preloadCommonResponses();
