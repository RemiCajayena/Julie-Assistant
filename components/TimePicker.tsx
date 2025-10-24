/**
 * Time Picker simple compatible con Expo Go
 * Alternativa a @react-native-community/datetimepicker
 */

import { theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

interface TimePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  visible: boolean;
  onClose: () => void;
}

export function TimePicker({ value, onChange, visible, onClose }: TimePickerProps) {
  const [selectedHour, setSelectedHour] = useState(value.getHours());
  const [selectedMinute, setSelectedMinute] = useState(value.getMinutes());

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const handleConfirm = () => {
    const newDate = new Date(value);
    newDate.setHours(selectedHour);
    newDate.setMinutes(selectedMinute);
    onChange(newDate);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.container} onStartShouldSetResponder={() => true}>
          <View style={styles.header}>
            <Text style={styles.title}>Seleccionar Hora</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </Pressable>
          </View>

          <View style={styles.pickerContainer}>
            {/* Hours */}
            <View style={styles.column}>
              <Text style={styles.label}>Hora</Text>
              <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {hours.map((hour) => (
                  <Pressable
                    key={hour}
                    style={[
                      styles.option,
                      selectedHour === hour && styles.selectedOption,
                    ]}
                    onPress={() => setSelectedHour(hour)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        selectedHour === hour && styles.selectedOptionText,
                      ]}
                    >
                      {String(hour).padStart(2, '0')}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <Text style={styles.separator}>:</Text>

            {/* Minutes */}
            <View style={styles.column}>
              <Text style={styles.label}>Minutos</Text>
              <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {minutes.map((minute) => (
                  <Pressable
                    key={minute}
                    style={[
                      styles.option,
                      selectedMinute === minute && styles.selectedOption,
                    ]}
                    onPress={() => setSelectedMinute(minute)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        selectedMinute === minute && styles.selectedOptionText,
                      ]}
                    >
                      {String(minute).padStart(2, '0')}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>
            <Pressable style={styles.confirmButton} onPress={handleConfirm}>
              <Text style={styles.confirmButtonText}>Confirmar</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  column: {
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    color: theme.colors.textLight,
    marginBottom: 8,
    fontWeight: '600',
  },
  scrollView: {
    height: 200,
    width: 80,
  },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 2,
  },
  selectedOption: {
    backgroundColor: theme.colors.primary,
  },
  optionText: {
    fontSize: 18,
    color: theme.colors.text,
  },
  selectedOptionText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  separator: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginHorizontal: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
