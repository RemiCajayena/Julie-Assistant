import { MedicationReminders } from '@/components/elder/MedicationReminders';
import { useMode } from '@/contexts/ModeContext';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

/**
 * Pantalla de recordatorios de medicamentos para el adulto mayor
 * Muestra los próximos medicamentos a tomar con interfaz simplificada
 */
export default function ElderRemindersScreen() {
  const router = useRouter();
  const { userId } = useMode();

  const handleTakeMedication = async (medicationId: number, medicationName: string) => {
    try {
      const API_URL = 'http://192.168.1.207:3000'; // TODO: Import from config
      
      const response = await fetch(`${API_URL}/medication-taken`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          medicationId,
          status: 'taken',
          notes: `Confirmado por el usuario el ${new Date().toLocaleString('es-ES')}`,
        }),
      });

      if (response.ok) {
        console.log('✅ Medicamento registrado como tomado');
        // La lista se actualizará automáticamente cada minuto
      } else {
        console.error('❌ Error registrando medicamento');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header simple */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Mis Medicamentos</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Componente de recordatorios */}
      <MedicationReminders 
        userId={userId || 'usuario123'}
        onTakeMedication={handleTakeMedication}
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
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    fontSize: 18,
    color: '#2196F3',
    width: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    flex: 1,
  },
});
