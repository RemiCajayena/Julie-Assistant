/**
 * Pruebas de la función calculateSchedule
 * Ejecutar: node test-calculate-schedule.js
 */

// Función calculateSchedule copiada para pruebas
function calculateSchedule(frequency, initialTime) {
  try {
    // Validaciones iniciales
    if (!frequency) {
      console.log('⚠️ No se proporcionó frecuencia, no se puede calcular horarios');
      return initialTime || '';
    }

    // Si ya hay un horario completo, no calcular
    if (initialTime && initialTime.includes(',')) {
      console.log('ℹ️ Ya hay múltiples horarios, no se recalcula');
      return initialTime;
    }

    // Extraer número de horas de la frecuencia
    const hoursMatch = frequency.match(/(\d+)\s*(?:horas?|h)/i);
    
    if (!hoursMatch) {
      console.log(`⚠️ No se pudo extraer intervalo de horas de: "${frequency}"`);
      return initialTime || '';
    }

    const intervalHours = parseInt(hoursMatch[1]);
    
    // Validar intervalo razonable
    if (intervalHours <= 0 || intervalHours > 24) {
      console.log(`⚠️ Intervalo inválido: ${intervalHours} horas`);
      return initialTime || '';
    }

    // Si no hay hora inicial, usar 08:00 como default
    let startHour = 8;
    let startMinute = 0;

    if (initialTime && initialTime.trim() !== '') {
      const timeMatch = initialTime.match(/(\d{1,2}):?(\d{2})?/);
      if (timeMatch) {
        startHour = parseInt(timeMatch[1]);
        startMinute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        
        // Validar hora y minuto
        if (startHour < 0 || startHour > 23) {
          console.log(`⚠️ Hora inválida: ${startHour}, usando 08:00`);
          startHour = 8;
        }
        if (startMinute < 0 || startMinute > 59) {
          console.log(`⚠️ Minutos inválidos: ${startMinute}, usando :00`);
          startMinute = 0;
        }
      } else {
        console.log(`⚠️ Formato de hora inválido: "${initialTime}", usando 08:00`);
      }
    }

    // Calcular cuántas tomas hay en el día
    const timesPerDay = Math.floor(24 / intervalHours);

    if (timesPerDay === 0) {
      console.log(`⚠️ Intervalo demasiado largo: ${intervalHours} horas`);
      return initialTime || '';
    }

    // Generar horarios
    const schedules = [];
    for (let i = 0; i < timesPerDay; i++) {
      const hour = (startHour + (i * intervalHours)) % 24;
      const timeString = `${hour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
      schedules.push(timeString);
    }

    const result = schedules.join(', ');
    console.log(`🕐 Horarios calculados exitosamente: ${frequency} desde ${initialTime || '08:00'} = ${result}`);
    
    return result;
  } catch (error) {
    console.error('❌ Error en calculateSchedule:', error);
    return initialTime || '';
  }
}

// Casos de prueba
console.log('='.repeat(70));
console.log('PRUEBAS DE calculateSchedule()');
console.log('='.repeat(70));

const tests = [
  // Casos normales
  { frequency: 'cada 8 horas', initialTime: '08:00', expected: '08:00, 16:00, 00:00' },
  { frequency: 'cada 12 horas', initialTime: '09:00', expected: '09:00, 21:00' },
  { frequency: 'cada 6 horas', initialTime: '06:00', expected: '06:00, 12:00, 18:00, 00:00' },
  { frequency: 'cada 24 horas', initialTime: '20:00', expected: '20:00' },
  
  // Variaciones de formato
  { frequency: '8 horas', initialTime: '10:00', expected: '10:00, 18:00, 02:00' },
  { frequency: 'cada 8h', initialTime: '07:00', expected: '07:00, 15:00, 23:00' },
  { frequency: 'CADA 12 HORAS', initialTime: '08:30', expected: '08:30, 20:30' },
  
  // Sin hora inicial (debe usar 08:00)
  { frequency: 'cada 8 horas', initialTime: null, expected: '08:00, 16:00, 00:00' },
  { frequency: 'cada 12 horas', initialTime: '', expected: '08:00, 20:00' },
  
  // Formato de hora sin dos puntos
  { frequency: 'cada 8 horas', initialTime: '0900', expected: '09:00, 17:00, 01:00' },
  { frequency: 'cada 6 horas', initialTime: '8', expected: '08:00, 14:00, 20:00, 02:00' },
  
  // Ya tiene múltiples horarios (no debe recalcular)
  { frequency: 'cada 8 horas', initialTime: '10:00, 18:00', expected: '10:00, 18:00' },
  
  // Casos edge
  { frequency: null, initialTime: '08:00', expected: '08:00' },
  { frequency: 'sin número', initialTime: '08:00', expected: '08:00' },
  { frequency: 'cada 0 horas', initialTime: '08:00', expected: '08:00' },
  { frequency: 'cada 48 horas', initialTime: '08:00', expected: '08:00' },
  { frequency: 'cada 8 horas', initialTime: '25:00', expected: '08:00, 16:00, 00:00' },
];

let passed = 0;
let failed = 0;

tests.forEach((test, index) => {
  console.log(`\n--- Test ${index + 1} ---`);
  console.log(`Input: frequency="${test.frequency}", initialTime="${test.initialTime}"`);
  console.log(`Expected: "${test.expected}"`);
  
  const result = calculateSchedule(test.frequency, test.initialTime);
  console.log(`Got:      "${result}"`);
  
  if (result === test.expected) {
    console.log('✅ PASS');
    passed++;
  } else {
    console.log('❌ FAIL');
    failed++;
  }
});

console.log('\n' + '='.repeat(70));
console.log(`RESUMEN: ${passed} passed, ${failed} failed (${tests.length} total)`);
console.log('='.repeat(70));
