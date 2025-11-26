/**
 * Servicio de Noticias
 * Obtiene noticias actuales para contexto del asistente
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

interface NewsItem {
  title: string;
  description: string;
  source: string;
  publishedAt: string;
  url?: string;
}

interface NewsCache {
  news: NewsItem[];
  timestamp: number;
}

const NEWS_CACHE_KEY = 'current_news';
const NEWS_CACHE_DURATION = 1000 * 60 * 60 * 2; // 2 horas
const NEWS_API_KEY = process.env.EXPO_PUBLIC_NEWS_API_KEY || '';

/**
 * Obtener noticias actuales (con cache)
 */
export async function getCurrentNews(country: string = 'cl', category: string = 'general'): Promise<NewsItem[]> {
  try {
    // Verificar cache primero
    const cachedNews = await getCachedNews();
    if (cachedNews) {
      console.log('💨 Usando noticias desde cache');
      return cachedNews;
    }

    console.log('📰 Obteniendo noticias actuales...');

    // Si no hay API key, retornar noticias de ejemplo
    if (!NEWS_API_KEY) {
      console.warn('⚠️ No hay NEWS_API_KEY configurada, usando noticias de ejemplo');
      return getExampleNews();
    }

    // Llamar a News API
    const response = await fetch(
      `https://newsapi.org/v2/top-headlines?country=${country}&category=${category}&pageSize=5&apiKey=${NEWS_API_KEY}`,
      { timeout: 5000 } as any
    );

    if (!response.ok) {
      throw new Error(`Error obteniendo noticias: ${response.status}`);
    }

    const data = await response.json();
    const news: NewsItem[] = data.articles?.slice(0, 5).map((article: any) => ({
      title: article.title,
      description: article.description,
      source: article.source.name,
      publishedAt: article.publishedAt,
      url: article.url,
    })) || [];

    // Guardar en cache
    await cacheNews(news);

    console.log(`✅ ${news.length} noticias obtenidas`);
    return news;
  } catch (error) {
    console.error('❌ Error obteniendo noticias:', error);
    
    // Retornar noticias de ejemplo en caso de error
    return getExampleNews();
  }
}

/**
 * Obtener resumen de noticias para el prompt
 */
export async function getNewsContext(): Promise<string> {
  const news = await getCurrentNews();
  
  if (news.length === 0) {
    return 'No hay noticias disponibles';
  }

  // Tomar las 3 noticias más importantes
  const topNews = news.slice(0, 3);
  const newsText = topNews
    .map((item, index) => `${index + 1}. ${item.title} (${item.source})`)
    .join('\n');

  return `NOTICIAS RECIENTES:\n${newsText}`;
}

/**
 * Guardar noticias en cache
 */
async function cacheNews(news: NewsItem[]): Promise<void> {
  try {
    const cache: NewsCache = {
      news,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(NEWS_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('❌ Error guardando noticias en cache:', error);
  }
}

/**
 * Obtener noticias desde cache
 */
async function getCachedNews(): Promise<NewsItem[] | null> {
  try {
    const cached = await AsyncStorage.getItem(NEWS_CACHE_KEY);
    if (!cached) return null;

    const cache: NewsCache = JSON.parse(cached);

    // Verificar si el cache expiró
    if (Date.now() - cache.timestamp > NEWS_CACHE_DURATION) {
      console.log('⏰ Cache de noticias expirado');
      return null;
    }

    return cache.news;
  } catch (error) {
    console.error('❌ Error leyendo noticias desde cache:', error);
    return null;
  }
}

/**
 * Noticias de ejemplo (fallback)
 */
function getExampleNews(): NewsItem[] {
  const today = new Date().toISOString();
  
  return [
    {
      title: 'Avances en tecnología médica mejoran tratamientos para adultos mayores',
      description: 'Nuevos dispositivos facilitan el seguimiento de medicamentos y salud',
      source: 'Salud Tech',
      publishedAt: today,
    },
    {
      title: 'Clima favorable esperado para esta semana',
      description: 'Temperaturas moderadas y condiciones agradables',
      source: 'Meteorología',
      publishedAt: today,
    },
    {
      title: 'Recomendaciones para una vida saludable después de los 60',
      description: 'Expertos comparten consejos de ejercicio y alimentación',
      source: 'Bienestar',
      publishedAt: today,
    },
  ];
}

/**
 * Limpiar cache de noticias
 */
export async function clearNewsCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(NEWS_CACHE_KEY);
    console.log('🧹 Cache de noticias limpiado');
  } catch (error) {
    console.error('❌ Error limpiando cache de noticias:', error);
  }
}
