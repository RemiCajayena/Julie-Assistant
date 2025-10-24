import { API_URL } from '@/config/api';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Reminder {
  medicationId: number;
  name: string;
  dosage?: string;
  scheduledTime: string;
  minutesUntil: number;
}

interface MedicationRemindersProps {
  userId: string;
  onTakeMedication?: (medicationId: number, medicationName: string) => void;
}

/**
 * Componente para mostrar próximos recordatorios de medicamentos
 * Interfaz simplificada para adultos mayores
 */
export function MedicationReminders({ userId, onTakeMedication }: MedicationRemindersProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReminders = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/reminders/${userId}`);
      
      if (!response.ok) {
        throw new Error('No se pudieron cargar los recordatorios');
      }

      const data = await response.json();
      setReminders(data.reminders || []);
    } catch (err: any) {
      console.error('Error cargando recordatorios:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
    
    // Actualizar cada minuto
    const interval = setInterval(fetchReminders, 60000);
    
    return () => clearInterval(interval);
  }, [userId]);

  const handleTakeMedication = (medicationId: number, medicationName: string) => {
    if (onTakeMedication) {
      onTakeMedication(medicationId, medicationName);
    }
  };

  const formatTime = (timeString: string) => {
    // Formato: "HH:MM"
    return timeString;
  };

  const getTimeDescription = (minutesUntil: number) => {
    if (minutesUntil <= 0) {
      return '¡Ahora!';
    } else if (minutesUntil < 60) {
      return `En ${minutesUntil} min`;
    } else {
      const hours = Math.floor(minutesUntil / 60);
      const mins = minutesUntil % 60;
      if (mins === 0) {
        return `En ${hours}h`;
      }
      return `En ${hours}h ${mins}min`;
    }
  };

  const getUrgencyStyle = (minutesUntil: number) => {
    if (minutesUntil <= 0) {
      return styles.urgentNow;
    } else if (minutesUntil <= 15) {
      return styles.urgentSoon;
    }
    return styles.urgentLater;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Cargando recordatorios...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorEmoji}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchReminders}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (reminders.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>✅</Text>
        <Text style={styles.emptyText}>No tienes medicamentos pendientes</Text>
        <Text style={styles.emptySubtext}>¡Buen trabajo!</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💊 Tus Medicamentos</Text>
        <TouchableOpacity onPress={fetchReminders}>
          <Text style={styles.refreshButton}>🔄</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.remindersList} showsVerticalScrollIndicator={false}>
        {reminders.map((reminder, index) => (
          <View 
            key={`${reminder.medicationId}-${reminder.scheduledTime}`}
            style={[styles.reminderCard, getUrgencyStyle(reminder.minutesUntil)]}
          >
            <View style={styles.reminderHeader}>
              <Text style={styles.medicationName}>{reminder.name}</Text>
              <Text style={styles.timeIndicator}>
                {getTimeDescription(reminder.minutesUntil)}
              </Text>
            </View>

            <View style={styles.reminderDetails}>
              <Text style={styles.detailText}>⏰ {formatTime(reminder.scheduledTime)}</Text>
              {reminder.dosage && (
                <Text style={styles.detailText}>💊 {reminder.dosage}</Text>
              )}
            </View>

            {reminder.minutesUntil <= 15 && (
              <TouchableOpacity
                style={styles.takeButton}
                onPress={() => handleTakeMedication(reminder.medicationId, reminder.name)}
              >
                <Text style={styles.takeButtonText}>✅ Ya lo tomé</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyEmoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 22,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 18,
    color: '#999',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  refreshButton: {
    fontSize: 24,
  },
  remindersList: {
    flex: 1,
    padding: 16,
  },
  reminderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 6,
  },
  urgentNow: {
    borderLeftColor: '#F44336',
    backgroundColor: '#FFEBEE',
  },
  urgentSoon: {
    borderLeftColor: '#FF9800',
    backgroundColor: '#FFF3E0',
  },
  urgentLater: {
    borderLeftColor: '#4CAF50',
    backgroundColor: '#FFFFFF',
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  medicationName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  timeIndicator: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginLeft: 12,
  },
  reminderDetails: {
    marginBottom: 12,
  },
  detailText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 6,
  },
  takeButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  takeButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
});
