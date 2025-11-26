import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface TimePickerListProps {
  times: string[]; // Array de horarios en formato "HH:MM"
  onTimesChange: (newTimes: string[]) => void;
  suggestedTimes?: string[]; // Horarios sugeridos calculados
  onUseSuggested?: () => void;
}

/**
 * Componente para seleccionar y editar múltiples horarios
 * Permite:
 * - Ver horarios sugeridos calculados por frecuencia
 * - Agregar horarios manualmente
 * - Editar horarios existentes
 * - Eliminar horarios
 */
export function TimePickerList({ 
  times, 
  onTimesChange, 
  suggestedTimes = [],
  onUseSuggested
}: TimePickerListProps) {
  const [newTime, setNewTime] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  // Validar formato HH:MM
  const isValidTime = (time: string): boolean => {
    return /^([0-1]?\d|2[0-3]):[0-5]\d$/.test(time);
  };

  // Agregar nuevo horario
  const handleAddTime = () => {
    const trimmed = newTime.trim();
    if (!trimmed) return;

    // Intentar corregir formato automáticamente
    let formatted = trimmed;
    
    // Si es solo número (ej: "8" o "14"), agregar :00
    if (/^\d{1,2}$/.test(trimmed)) {
      const hour = parseInt(trimmed);
      if (hour >= 0 && hour <= 23) {
        formatted = `${hour.toString().padStart(2, '0')}:00`;
      }
    }
    // Si es HH:M o H:MM, completar formato
    else if (/^\d{1,2}:\d{1,2}$/.test(trimmed)) {
      const [h, m] = trimmed.split(':');
      const hour = parseInt(h);
      const minute = parseInt(m);
      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
        formatted = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      }
    }

    if (isValidTime(formatted) && !times.includes(formatted)) {
      // Agregar y ordenar por hora
      const newTimes = [...times, formatted].sort();
      onTimesChange(newTimes);
      setNewTime('');
    }
  };

  // Eliminar horario
  const handleRemoveTime = (index: number) => {
    const newTimes = times.filter((_, i) => i !== index);
    onTimesChange(newTimes);
  };

  // Empezar a editar
  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditValue(times[index]);
  };

  // Guardar edición
  const handleSaveEdit = () => {
    if (editingIndex === null) return;

    const formatted = editValue.trim();
    if (isValidTime(formatted)) {
      const newTimes = [...times];
      newTimes[editingIndex] = formatted;
      onTimesChange(newTimes.sort());
      setEditingIndex(null);
      setEditValue('');
    }
  };

  // Cancelar edición
  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditValue('');
  };

  // Usar horarios sugeridos
  const handleUseSuggested = () => {
    if (suggestedTimes.length > 0) {
      onTimesChange([...suggestedTimes]);
      if (onUseSuggested) onUseSuggested();
    }
  };

  return (
    <View style={styles.container}>
      {/* Horarios sugeridos */}
      {suggestedTimes.length > 0 && times.length === 0 && (
        <View style={styles.suggestedContainer}>
          <Text style={styles.suggestedTitle}>⏰ Horarios sugeridos:</Text>
          <View style={styles.suggestedList}>
            {suggestedTimes.map((time, index) => (
              <View key={index} style={styles.suggestedChip}>
                <Text style={styles.suggestedTime}>{time}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity 
            style={styles.useSuggestedButton}
            onPress={handleUseSuggested}
          >
            <Text style={styles.useSuggestedText}>✓ Usar estos horarios</Text>
          </TouchableOpacity>
          <Text style={styles.orText}>o agrega horarios personalizados:</Text>
        </View>
      )}

      {/* Lista de horarios actuales */}
      {times.length > 0 && (
        <View style={styles.timesContainer}>
          <Text style={styles.label}>Horarios configurados:</Text>
          <View style={styles.timesListContent}>
            {times.map((time, index) => (
              <View key={index} style={styles.timeItem}>
                {editingIndex === index ? (
                  <View style={styles.editRow}>
                    <TextInput
                      style={styles.editInput}
                      value={editValue}
                      onChangeText={setEditValue}
                      placeholder="HH:MM"
                      keyboardType="numbers-and-punctuation"
                      maxLength={5}
                      autoFocus
                    />
                    <TouchableOpacity 
                      style={styles.saveButton}
                      onPress={handleSaveEdit}
                    >
                      <Text style={styles.saveButtonText}>✓</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.cancelButton}
                      onPress={handleCancelEdit}
                    >
                      <Text style={styles.cancelButtonText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.timeRow}>
                    <Text style={styles.timeText}>🕐 {time}</Text>
                    <View style={styles.timeActions}>
                      <TouchableOpacity 
                        style={styles.editIconButton}
                        onPress={() => handleStartEdit(index)}
                      >
                        <Text style={styles.editIcon}>✎</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.removeButton}
                        onPress={() => handleRemoveTime(index)}
                      >
                        <Text style={styles.removeButtonText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Agregar nuevo horario */}
      <View style={styles.addContainer}>
        <Text style={styles.label}>
          {times.length === 0 ? 'Agregar primer horario:' : 'Agregar otro horario:'}
        </Text>
        <View style={styles.addRow}>
          <TextInput
            style={styles.addInput}
            value={newTime}
            onChangeText={setNewTime}
            placeholder="Ej: 08:00 o 14:30"
            keyboardType="numbers-and-punctuation"
            maxLength={5}
            onSubmitEditing={handleAddTime}
          />
          <TouchableOpacity 
            style={[styles.addButton, !newTime.trim() && styles.addButtonDisabled]}
            onPress={handleAddTime}
            disabled={!newTime.trim()}
          >
            <Text style={styles.addButtonText}>+ Agregar</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.hint}>
          💡 Formato: HH:MM (ej: 08:00, 14:30, 20:00)
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  suggestedContainer: {
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#d0e8ff',
  },
  suggestedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  suggestedList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  suggestedChip: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  suggestedTime: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '500',
  },
  useSuggestedButton: {
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  useSuggestedText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  orText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  timesContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  timesListContent: {
    gap: 8,
  },
  timeItem: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    overflow: 'hidden',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  timeText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  timeActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editIconButton: {
    backgroundColor: '#2196F3',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIcon: {
    color: '#fff',
    fontSize: 16,
  },
  removeButton: {
    backgroundColor: '#F44336',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  editRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    alignItems: 'center',
  },
  editInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#2196F3',
    borderRadius: 8,
    padding: 8,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#9E9E9E',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  addContainer: {
    marginTop: 8,
  },
  addRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  addInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FAFAFA',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#ccc',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
});
