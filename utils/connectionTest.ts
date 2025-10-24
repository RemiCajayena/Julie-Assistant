/**
 * Utilidad para diagnosticar problemas de conexión con el servidor
 */

import { API_URL } from '@/config/api';
import axios from 'axios';

export interface ConnectionTestResult {
  success: boolean;
  url: string;
  message: string;
  responseTime?: number;
  serverInfo?: any;
  error?: string;
}

/**
 * Test de conectividad al servidor
 */
export async function testServerConnection(): Promise<ConnectionTestResult> {
  const startTime = Date.now();
  
  try {
    console.log('🔍 Probando conexión al servidor:', API_URL);
    
    const response = await axios.get(`${API_URL}/ping`, {
      timeout: 5000, // 5 segundos de timeout
    });
    
    const responseTime = Date.now() - startTime;
    
    console.log('✅ Servidor respondió:', response.data);
    
    return {
      success: true,
      url: API_URL,
      message: 'Conexión exitosa',
      responseTime,
      serverInfo: response.data,
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    console.error('❌ Error de conexión:', error);
    
    let errorMessage = 'Error desconocido';
    
    if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Servidor no responde. ¿Está corriendo?';
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      errorMessage = 'Timeout: El servidor tardó demasiado en responder';
    } else if (error.code === 'ENETUNREACH') {
      errorMessage = 'Red no accesible. Verifica tu conexión';
    } else if (error.response) {
      errorMessage = `Error HTTP ${error.response.status}: ${error.response.statusText}`;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return {
      success: false,
      url: API_URL,
      message: errorMessage,
      responseTime,
      error: error.code || 'UNKNOWN',
    };
  }
}

/**
 * Test completo de salud del servidor
 */
export async function testServerHealth(): Promise<ConnectionTestResult> {
  try {
    console.log('🔍 Probando health check del servidor');
    
    const response = await axios.get(`${API_URL}/health`, {
      timeout: 5000,
    });
    
    console.log('✅ Health check exitoso:', response.data);
    
    return {
      success: true,
      url: API_URL,
      message: 'Servidor saludable',
      serverInfo: response.data,
    };
  } catch (error: any) {
    console.error('❌ Health check falló:', error);
    
    return {
      success: false,
      url: API_URL,
      message: 'Health check falló',
      error: error.message,
    };
  }
}

/**
 * Diagnóstico completo con múltiples URLs
 */
export async function diagnoseConnection(): Promise<{
  results: ConnectionTestResult[];
  recommendation: string;
}> {
  const testUrls = [
    'http://localhost:3000',
    'http://10.0.2.2:3000',
    'http://127.0.0.1:3000',
  ];
  
  console.log('🔍 Iniciando diagnóstico completo de conexión...');
  
  const results: ConnectionTestResult[] = [];
  
  for (const url of testUrls) {
    try {
      const startTime = Date.now();
      const response = await axios.get(`${url}/ping`, { timeout: 3000 });
      const responseTime = Date.now() - startTime;
      
      results.push({
        success: true,
        url,
        message: 'Conectado',
        responseTime,
        serverInfo: response.data,
      });
    } catch (error: any) {
      results.push({
        success: false,
        url,
        message: error.message || 'Falló',
        error: error.code,
      });
    }
  }
  
  // Generar recomendación
  let recommendation = '';
  const successfulConnections = results.filter(r => r.success);
  
  if (successfulConnections.length === 0) {
    recommendation = '❌ NINGUNA URL FUNCIONA:\n' +
      '1. Verifica que el servidor esté corriendo (npm start en /server)\n' +
      '2. Verifica el firewall de Windows\n' +
      '3. Ejecuta: adb reverse tcp:3000 tcp:3000';
  } else if (successfulConnections.some(r => r.url.includes('localhost'))) {
    recommendation = '✅ localhost funciona: adb reverse está configurado correctamente';
  } else if (successfulConnections.some(r => r.url.includes('10.0.2.2'))) {
    recommendation = '✅ 10.0.2.2 funciona: conexión directa al host desde emulador';
  }
  
  console.log('📊 Diagnóstico completo:', results);
  console.log('💡 Recomendación:', recommendation);
  
  return { results, recommendation };
}
