import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface PINInputProps {
  length?: number;
  onComplete: (pin: string) => void;
  title?: string;
  error?: string;
  onErrorClear?: () => void; // Callback para limpiar el error
}

/**
 * Componente de teclado numérico para ingresar PIN
 */
export const PINInput: React.FC<PINInputProps> = ({
  length = 4,
  onComplete,
  title = 'Ingresa tu PIN',
  error,
  onErrorClear,
}) => {
  const [pin, setPin] = useState('');

  // Limpiar PIN y error cuando hay error
  useEffect(() => {
    if (error) {
      // Esperar un momento para que el usuario vea el error
      const timer = setTimeout(() => {
        setPin('');
        // Notificar al padre que limpie el error también
        if (onErrorClear) {
          onErrorClear();
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [error, onErrorClear]);

  const handlePress = (digit: string) => {
    if (pin.length < length) {
      const newPin = pin + digit;
      setPin(newPin);

      if (newPin.length === length) {
        onComplete(newPin);
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      {/* Indicadores de PIN */}
      <View style={styles.dotsContainer}>
        {Array.from({ length }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              pin.length > index && styles.dotFilled,
              error && styles.dotError,
            ]}
          />
        ))}
      </View>

      {/* Mensaje de error */}
      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Teclado numérico */}
      <View style={styles.keyboard}>
        {/* Fila 1 */}
        <View style={styles.row}>
          {[1, 2, 3].map((num) => (
            <TouchableOpacity
              key={num}
              style={styles.key}
              onPress={() => handlePress(num.toString())}
            >
              <Text style={styles.keyText}>{num}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Fila 2 */}
        <View style={styles.row}>
          {[4, 5, 6].map((num) => (
            <TouchableOpacity
              key={num}
              style={styles.key}
              onPress={() => handlePress(num.toString())}
            >
              <Text style={styles.keyText}>{num}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Fila 3 */}
        <View style={styles.row}>
          {[7, 8, 9].map((num) => (
            <TouchableOpacity
              key={num}
              style={styles.key}
              onPress={() => handlePress(num.toString())}
            >
              <Text style={styles.keyText}>{num}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Fila 4 */}
        <View style={styles.row}>
          <TouchableOpacity style={styles.key} onPress={handleClear}>
            <Text style={styles.keyTextSecondary}>C</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.key} onPress={() => handlePress('0')}>
            <Text style={styles.keyText}>0</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.key} onPress={handleDelete}>
            <Text style={styles.keyTextSecondary}>←</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 30,
    color: '#333',
  },
  dotsContainer: {
    flexDirection: 'row',
    marginBottom: 40,
    gap: 12,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
    borderWidth: 2,
    borderColor: '#BDBDBD',
  },
  dotFilled: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  dotError: {
    backgroundColor: '#F44336',
    borderColor: '#F44336',
  },
  errorText: {
    color: '#F44336',
    fontSize: 14,
    marginBottom: 20,
  },
  keyboard: {
    width: '100%',
    maxWidth: 300,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  key: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  keyText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#333',
  },
  keyTextSecondary: {
    fontSize: 24,
    fontWeight: '600',
    color: '#666',
  },
});
