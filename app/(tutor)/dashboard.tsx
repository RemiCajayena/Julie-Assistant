import { ConnectionStatus } from '@/components/ConnectionStatus';
import { API_URL } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import { useMedications } from '@/hooks/useMedications';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert as RNAlert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Alert {
  id: number;
  type: string;
  message: string;
  created_at: string;
}

/**
 * Dashboard principal del tutor
 * Vista general con acceso a todos los módulos
 */
export default function TutorDashboardScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const { userName, userId, setMode } = useMode();
  const medications = useMedications(userId || 'usuario123');
  
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [todayStatus, setTodayStatus] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [showConnectionTest, setShowConnectionTest] = useState(false);

  // Cargar estadísticas del día
  useEffect(() => {
    const loadDashboardData = async () => {
      setLoadingStats(true);
      try {
        // Cargar estado de medicamentos de hoy
        const status = await medications.getTodayStatus();
        setTodayStatus(status || []);

        // Cargar alertas desde el servidor
        try {
          const alertsResponse = await axios.get(`${API_URL}/alerts/${userId || 'usuario123'}?limit=5`);
          setAlerts(alertsResponse.data.alerts || []);
        } catch (alertError) {
          console.log('No se pudieron cargar alertas:', alertError);
          setAlerts([]);
        }
      } catch (error) {
        console.error('Error cargando datos del dashboard:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    loadDashboardData();
    
    // Recargar cada 30 segundos
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  // Calcular estadísticas
  const takenToday = todayStatus.filter(s => s.status === 'taken').length;
  const missedToday = todayStatus.filter(s => s.status === 'missed').length;
  const pendingToday = medications.medications.filter(m => m.active).length - takenToday - missedToday;
  const totalActive = medications.medications.filter(m => m.active).length;

  const handleLogout = async () => {
    RNAlert.alert(
      'Salir del Modo Tutor',
      '¿Quieres volver al modo Usuario?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, volver',
          onPress: async () => {
            await logout();
            await setMode('elder');
            // @ts-ignore - Expo Router type issue
            router.replace('/(elder)/home');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.subtitle}>Gestionando a {userName || 'Usuario'}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.connectionButton} 
            onPress={() => setShowConnectionTest(true)}
          >
            <Text style={styles.connectionButtonText}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Resumen del día */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Resumen de Hoy</Text>
          {loadingStats ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4CAF50" />
            </View>
          ) : (
            <View style={styles.statsContainer}>
              <View style={[styles.statCard, styles.statSuccess]}>
                <Text style={styles.statNumber}>{takenToday}</Text>
                <Text style={styles.statLabel}>Tomados</Text>
              </View>
              <View style={[styles.statCard, styles.statPending]}>
                <Text style={styles.statNumber}>{pendingToday >= 0 ? pendingToday : 0}</Text>
                <Text style={styles.statLabel}>Pendientes</Text>
              </View>
              <View style={[styles.statCard, styles.statWarning]}>
                <Text style={styles.statNumber}>{missedToday}</Text>
                <Text style={styles.statLabel}>Olvidados</Text>
              </View>
            </View>
          )}
          
          {/* Información adicional */}
          <View style={styles.infoRow}>
            <Text style={styles.infoText}>
              💊 Total de medicamentos activos: <Text style={styles.infoBold}>{totalActive}</Text>
            </Text>
          </View>
        </View>

        {/* Módulos principales */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Módulos</Text>
          
          <TouchableOpacity 
            style={styles.moduleCard}
            onPress={() => {
              // @ts-ignore - Expo Router type issue
              router.push('/(tutor)/medications');
            }}
          >
            <Text style={styles.moduleEmoji}>💊</Text>
            <View style={styles.moduleInfo}>
              <Text style={styles.moduleTitle}>Medicamentos</Text>
              <Text style={styles.moduleDesc}>Gestionar medicamentos y horarios</Text>
            </View>
            <Text style={styles.moduleArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.moduleCard}
            onPress={() => {
              // @ts-ignore - Expo Router type issue
              router.push('/(tutor)/reminders');
            }}
          >
            <Text style={styles.moduleEmoji}>⏰</Text>
            <View style={styles.moduleInfo}>
              <Text style={styles.moduleTitle}>Recordatorios</Text>
              <Text style={styles.moduleDesc}>Programar recordatorios de medicamentos</Text>
            </View>
            <Text style={styles.moduleArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.moduleCard}
            onPress={() => {
              // @ts-ignore - Expo Router type issue
              router.push('/(tutor)/appointments');
            }}
          >
            <Text style={styles.moduleEmoji}>🏥</Text>
            <View style={styles.moduleInfo}>
              <Text style={styles.moduleTitle}>Citas Médicas</Text>
              <Text style={styles.moduleDesc}>Agendar y gestionar citas médicas</Text>
            </View>
            <Text style={styles.moduleArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.moduleCard}
            onPress={() => {
              // @ts-ignore - Expo Router type issue
              router.push('/(tutor)/medication-requests');
            }}
          >
            <Text style={styles.moduleEmoji}>📋</Text>
            <View style={styles.moduleInfo}>
              <Text style={styles.moduleTitle}>Solicitudes</Text>
              <Text style={styles.moduleDesc}>Aprobar o rechazar solicitudes de medicamentos</Text>
            </View>
            <Text style={styles.moduleArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.moduleCard}>
            <Text style={styles.moduleEmoji}>🔔</Text>
            <View style={styles.moduleInfo}>
              <Text style={styles.moduleTitle}>Alertas</Text>
              <Text style={styles.moduleDesc}>Ver historial de alertas</Text>
            </View>
            <Text style={styles.moduleArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.moduleCard}>
            <Text style={styles.moduleEmoji}>⚙️</Text>
            <View style={styles.moduleInfo}>
              <Text style={styles.moduleTitle}>Configuración</Text>
              <Text style={styles.moduleDesc}>Ajustes generales</Text>
            </View>
            <Text style={styles.moduleArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Solicitudes pendientes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚠️ Alertas Recientes</Text>
          {alerts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No hay alertas recientes</Text>
            </View>
          ) : (
            <View>
              {alerts.slice(0, 3).map((alert) => (
                <View key={alert.id} style={styles.alertCard}>
                  <Text style={styles.alertType}>{alert.type}</Text>
                  <Text style={styles.alertMessage}>{alert.message}</Text>
                  <Text style={styles.alertTime}>
                    {new Date(alert.created_at).toLocaleString('es-ES')}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal de diagnóstico de conexión */}
      <ConnectionStatus
        visible={showConnectionTest}
        onClose={() => setShowConnectionTest(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    paddingTop: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  connectionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectionButtonText: {
    fontSize: 20,
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  logoutText: {
    color: '#F44336',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statSuccess: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  statPending: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  statWarning: {
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  infoRow: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#2E7D32',
  },
  infoBold: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  moduleCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  moduleEmoji: {
    fontSize: 36,
    marginRight: 16,
  },
  moduleInfo: {
    flex: 1,
  },
  moduleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  moduleDesc: {
    fontSize: 14,
    color: '#666',
  },
  moduleArrow: {
    fontSize: 32,
    color: '#BDBDBD',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
  alertCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  alertType: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF9800',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  alertMessage: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  alertTime: {
    fontSize: 12,
    color: '#999',
  },
});
