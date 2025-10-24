import { testServerConnection } from '@/utils/connectionTest';
import { useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ConnectionStatusProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Componente para mostrar el estado de conexión con el servidor
 */
export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ visible, onClose }) => {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const runTest = async () => {
    setTesting(true);
    setResult(null);
    
    const testResult = await testServerConnection();
    setResult(testResult);
    setTesting(false);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>🔍 Estado del Servidor</Text>

          {!result && !testing && (
            <View>
              <Text style={styles.description}>
                Prueba la conexión con el servidor para diagnosticar problemas
              </Text>
              <TouchableOpacity style={styles.testButton} onPress={runTest}>
                <Text style={styles.testButtonText}>Probar Conexión</Text>
              </TouchableOpacity>
            </View>
          )}

          {testing && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4CAF50" />
              <Text style={styles.loadingText}>Probando conexión...</Text>
            </View>
          )}

          {result && (
            <View>
              <View style={[styles.resultCard, result.success ? styles.success : styles.error]}>
                <Text style={styles.resultIcon}>{result.success ? '✅' : '❌'}</Text>
                <Text style={styles.resultTitle}>
                  {result.success ? 'Conexión Exitosa' : 'Error de Conexión'}
                </Text>
                <Text style={styles.resultMessage}>{result.message}</Text>
                
                {result.url && (
                  <Text style={styles.resultDetail}>URL: {result.url}</Text>
                )}
                
                {result.responseTime && (
                  <Text style={styles.resultDetail}>
                    Tiempo de respuesta: {result.responseTime}ms
                  </Text>
                )}
                
                {result.error && (
                  <Text style={styles.errorCode}>Error: {result.error}</Text>
                )}
              </View>

              {!result.success && (
                <View style={styles.helpCard}>
                  <Text style={styles.helpTitle}>💡 Soluciones:</Text>
                  <Text style={styles.helpText}>
                    1. Verifica que el servidor esté corriendo:{'\n'}
                       cd server && npm start
                  </Text>
                  <Text style={styles.helpText}>
                    2. Ejecuta adb reverse:{'\n'}
                       adb reverse tcp:3000 tcp:3000
                  </Text>
                  <Text style={styles.helpText}>
                    3. Verifica el firewall de Windows
                  </Text>
                </View>
              )}

              <TouchableOpacity style={styles.retryButton} onPress={runTest}>
                <Text style={styles.retryButtonText}>🔄 Probar de Nuevo</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  testButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  resultCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 2,
  },
  success: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  error: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
  },
  resultIcon: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
    marginBottom: 8,
  },
  resultMessage: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 12,
  },
  resultDetail: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
  errorCode: {
    fontSize: 12,
    color: '#F44336',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '600',
  },
  helpCard: {
    backgroundColor: '#FFF3CD',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFC107',
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#2196F3',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: '#F5F5F5',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
});
