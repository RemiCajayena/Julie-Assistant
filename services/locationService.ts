/**
 * Servicio de Ubicación
 * Obtiene ubicación del dispositivo para contexto del asistente
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
  timestamp: number;
}

const LOCATION_CACHE_KEY = 'user_location';
const LOCATION_CACHE_DURATION = 1000 * 60 * 60; // 1 hora

/**
 * Solicitar permisos de ubicación
 */
export async function requestLocationPermissions(): Promise<boolean> {
  try {
    
    console.log('📍 Solicitando permisos de ubicación...');
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      console.warn('⚠️ Permisos de ubicación denegados');
      return false;
    }

    console.log('✅ Permisos de ubicación concedidos');
    return true;
  } catch (error) {
    console.error('❌ Error solicitando permisos de ubicación:', error);
    return false;
  }
}

/**
 * Obtener ubicación actual del dispositivo
 */
export async function getCurrentLocation(): Promise<LocationData | null> {
  try {
    // Verificar si hay ubicación en cache
    const cachedLocation = await getCachedLocation();
    if (cachedLocation) {
      console.log('💨 Usando ubicación desde cache');
      return cachedLocation;
    }

    // Verificar permisos
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('⚠️ Sin permisos de ubicación');
      return null;
    }

    console.log('📍 Obteniendo ubicación actual...');
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const locationData: LocationData = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      timestamp: Date.now(),
    };

    // Obtener nombre de ciudad (geocoding inverso)
    try {
      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (address) {
        locationData.city = address.city || address.district || address.subregion || undefined;
        locationData.country = address.country || undefined;
        console.log(`✅ Ubicación obtenida: ${locationData.city}, ${locationData.country}`);
      }
    } catch (geocodeError) {
      console.warn('⚠️ No se pudo obtener nombre de ciudad:', geocodeError);
    }

    // Guardar en cache
    await cacheLocation(locationData);

    return locationData;
  } catch (error) {
    console.error('❌ Error obteniendo ubicación:', error);
    return null;
  }
}

/**
 * Guardar ubicación en cache
 */
async function cacheLocation(location: LocationData): Promise<void> {
  try {
    await AsyncStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(location));
  } catch (error) {
    console.error('❌ Error guardando ubicación en cache:', error);
  }
}

/**
 * Obtener ubicación desde cache
 */
async function getCachedLocation(): Promise<LocationData | null> {
  try {
    const cached = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
    if (!cached) return null;

    const location: LocationData = JSON.parse(cached);

    // Verificar si el cache expiró
    if (Date.now() - location.timestamp > LOCATION_CACHE_DURATION) {
      console.log('⏰ Cache de ubicación expirado');
      return null;
    }

    return location;
  } catch (error) {
    console.error('❌ Error leyendo ubicación desde cache:', error);
    return null;
  }
}

/**
 * Obtener string descriptivo de ubicación con clima para el prompt
 */
export async function getLocationContext(): Promise<string> {
  const location = await getCurrentLocation();
  
  if (!location) {
    return 'Ubicación desconocida';
  }

  let baseLocation = '';
  if (location.city && location.country) {
    baseLocation = `${location.city}, ${location.country}`;
  } else {
    baseLocation = `Coordenadas: ${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}`;
  }

  // Intentar obtener clima actual
  try {
    const weatherResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current_weather=true&timezone=auto`
    );
    
    if (weatherResponse.ok) {
      const weatherData = await weatherResponse.json();
      const current = weatherData.current_weather;
      
      if (current) {
        const temp = Math.round(current.temperature);
        const weatherCode = current.weathercode;
        
        // Interpretar código de clima
        let condition = '';
        if (weatherCode === 0) condition = 'despejado';
        else if (weatherCode <= 3) condition = 'parcialmente nublado';
        else if (weatherCode <= 48) condition = 'nublado';
        else if (weatherCode <= 67) condition = 'lluvioso';
        else if (weatherCode <= 77) condition = 'nevando';
        else condition = 'tormentoso';
        
        return `${baseLocation}. Clima actual: ${temp}°C, ${condition}`;
      }
    }
  } catch (error) {
    console.log('⚠️ No se pudo obtener clima:', error);
  }

  return baseLocation;
}

/**
 * Limpiar cache de ubicación
 */
export async function clearLocationCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(LOCATION_CACHE_KEY);
    console.log('🧹 Cache de ubicación limpiado');
  } catch (error) {
    console.error('❌ Error limpiando cache de ubicación:', error);
  }
}
