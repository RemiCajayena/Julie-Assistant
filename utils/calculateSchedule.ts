// utils/calculateSchedule.ts

/**
 * Calcula los horarios de toma de medicamento a partir de la frecuencia y hora inicial.
 * @param frequency Ejemplo: "cada 8 horas", "cada 12 horas", "8h"
 * @param initialTime Ejemplo: "08:00"
 * @returns string con los horarios separados por coma, o vacío si no se puede calcular
 */
export function calculateSchedule(frequency: string, initialTime?: string): string {
  try {
    if (!frequency) return initialTime || '';
    if (initialTime && initialTime.includes(',')) return initialTime;
    const hoursMatch = frequency.match(/(\d+)\s*(?:horas?|h)/i);
    if (!hoursMatch) return initialTime || '';
    const intervalHours = parseInt(hoursMatch[1]);
    if (intervalHours <= 0 || intervalHours > 24) return initialTime || '';
    let startHour = 8;
    let startMinute = 0;
    if (initialTime && initialTime.trim() !== '') {
      const timeMatch = initialTime.match(/(\d{1,2}):?(\d{2})?/);
      if (timeMatch) {
        startHour = parseInt(timeMatch[1]);
        startMinute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        if (startHour < 0 || startHour > 23) startHour = 8;
        if (startMinute < 0 || startMinute > 59) startMinute = 0;
      }
    }
    const timesPerDay = Math.floor(24 / intervalHours);
    if (timesPerDay === 0) return initialTime || '';
    const schedules = [];
    for (let i = 0; i < timesPerDay; i++) {
      const hour = (startHour + (i * intervalHours)) % 24;
      const timeString = `${hour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
      schedules.push(timeString);
    }
    return schedules.join(', ');
  } catch {
    return initialTime || '';
  }
}
