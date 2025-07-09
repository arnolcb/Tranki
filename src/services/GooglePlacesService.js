// src/services/GooglePlacesService.js - GEOLOCALIZACIÓN REAL ARREGLADA
import Config from 'react-native-config';
import Geolocation from 'react-native-geolocation-service';
import { PermissionsAndroid, Platform, Alert } from 'react-native';

class GooglePlacesService {
  constructor() {
    this.apiKey = Config.GOOGLE_MAPS_API_KEY;
    this.baseUrl = 'https://maps.googleapis.com/maps/api/place';
    
    console.log('🔑 Google Places Service inicializado');
    console.log('🔑 API Key configurada:', !!this.apiKey);
    
    // Configurar Geolocation al inicializar
    this.configureGeolocation();
  }

  configureGeolocation() {
    try {
      // Configuración recomendada para evitar crashes
      Geolocation.setRNConfiguration({
        skipPermissionRequests: false,
        authorizationLevel: 'whenInUse',
        enableBackgroundLocationUpdates: false,
        locationProvider: 'auto', // Importante: usar 'auto' en lugar de 'playServices'
      });
      console.log('📍 ✅ Geolocation configurado correctamente');
    } catch (error) {
      console.log('📍 ⚠️ Error configurando geolocation:', error);
    }
  }

  async requestLocationPermission() {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Permiso de ubicación requerido',
            message: 'Tranki necesita acceso a tu ubicación para encontrar lugares cercanos',
            buttonNeutral: 'Preguntar después',
            buttonNegative: 'Denegar',
            buttonPositive: 'Permitir',
          }
        );
        
        console.log('📍 Resultado del permiso:', granted);
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('📍 Error pidiendo permisos:', err);
        return false;
      }
    }
    return true; // iOS maneja permisos automáticamente
  }

  async getCurrentLocation() {
    try {
      console.log('📍 🚀 Iniciando proceso de geolocalización REAL...');
      
      // Verificar permisos
      const hasPermission = await this.requestLocationPermission();
      if (!hasPermission) {
        console.log('📍 ⚠️ Sin permisos, usando ubicación por defecto');
        Alert.alert(
          'Ubicación requerida',
          'Para obtener lugares más precisos cerca de ti, permite el acceso a la ubicación en Configuración.',
          [{ text: 'Entendido' }]
        );
        return this.getDefaultLocation();
      }

      return new Promise((resolve, reject) => {
        console.log('📍 🎯 Solicitando posición actual...');
        
        // Timeout de seguridad
        const timeoutId = setTimeout(() => {
          console.log('📍 ⏰ Timeout, usando ubicación por defecto');
          resolve(this.getDefaultLocation());
        }, 12000);

        Geolocation.getCurrentPosition(
          (position) => {
            clearTimeout(timeoutId);
            console.log('📍 ✅ ¡UBICACIÓN REAL OBTENIDA!', {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: new Date(position.timestamp).toLocaleString()
            });
            
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          (error) => {
            clearTimeout(timeoutId);
            console.log('📍 ❌ Error de geolocalización:', {
              code: error.code,
              message: error.message
            });
            
            // Intentar método alternativo antes de usar ubicación por defecto
            console.log('📍 🔄 Intentando método alternativo...');
            this.getCurrentLocationAlternative()
              .then(resolve)
              .catch(() => resolve(this.getDefaultLocation()));
          },
          {
            // Configuración optimizada basada en la investigación
            enableHighAccuracy: false, // Cambiar a false para evitar crashes
            timeout: 10000, // 10 segundos
            maximumAge: 30000, // 30 segundos de cache
            distanceFilter: 0,
            forceRequestLocation: true,
            forceLocationManager: false,
            showLocationDialog: true,
          }
        );
      });
    } catch (error) {
      console.error('📍 💥 Error crítico obteniendo ubicación:', error);
      return this.getDefaultLocation();
    }
  }

  // Método alternativo con diferentes configuraciones
  async getCurrentLocationAlternative() {
    return new Promise((resolve, reject) => {
      console.log('📍 🔄 Método alternativo con configuración básica...');
      
      const timeoutId = setTimeout(() => {
        reject(new Error('Timeout alternativo'));
      }, 8000);

      Geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeoutId);
          console.log('📍 ✅ Ubicación alternativa obtenida');
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          clearTimeout(timeoutId);
          console.log('📍 ❌ Método alternativo también falló');
          reject(error);
        },
        {
          // Configuración mínima para máxima compatibilidad
          enableHighAccuracy: false,
          timeout: 6000,
          maximumAge: 60000,
        }
      );
    });
  }

  // Método usando watchPosition como último recurso
  async getCurrentLocationWatch() {
    return new Promise((resolve, reject) => {
      console.log('📍 👀 Usando watchPosition como último recurso...');
      
      let resolved = false;
      
      const watchId = Geolocation.watchPosition(
        (position) => {
          if (!resolved) {
            resolved = true;
            console.log('📍 ✅ WatchPosition exitoso');
            Geolocation.clearWatch(watchId);
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          }
        },
        (error) => {
          if (!resolved) {
            resolved = true;
            console.log('📍 ❌ WatchPosition falló');
            Geolocation.clearWatch(watchId);
            reject(error);
          }
        },
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 60000,
          distanceFilter: 100,
        }
      );

      // Timeout de seguridad
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          Geolocation.clearWatch(watchId);
          reject(new Error('WatchPosition timeout'));
        }
      }, 10000);
    });
  }

  getDefaultLocation() {
    console.log('📍 🏠 Usando ubicación por defecto: Lima, San Isidro');
    return {
      latitude: -12.0931,
      longitude: -77.0465,
    };
  }

  // Método principal que prueba todos los enfoques
  async getCurrentLocationComplete() {
    try {
      console.log('📍 🎯 MÉTODO COMPLETO - Probando todos los enfoques...');
      
      // Enfoque 1: Método normal
      try {
        const location1 = await this.getCurrentLocation();
        if (location1.latitude !== -12.0931 || location1.longitude !== -77.0465) {
          console.log('📍 ✅ Enfoque 1 exitoso - ubicación real obtenida');
          return location1;
        }
      } catch (error) {
        console.log('📍 ❌ Enfoque 1 falló');
      }

      // Enfoque 2: WatchPosition
      try {
        const location2 = await this.getCurrentLocationWatch();
        console.log('📍 ✅ Enfoque 2 exitoso - watchPosition funcionó');
        return location2;
      } catch (error) {
        console.log('📍 ❌ Enfoque 2 falló');
      }

      // Enfoque 3: Ubicación por defecto
      console.log('📍 🏠 Todos los enfoques fallaron, usando ubicación por defecto');
      return this.getDefaultLocation();
      
    } catch (error) {
      console.log('📍 💥 Error en método completo');
      return this.getDefaultLocation();
    }
  }

  async searchNearbyPlaces(location, type, radius = 2000) {
    if (!this.apiKey) {
      throw new Error('API Key no configurada');
    }

    try {
      const { latitude, longitude } = location;
      
      const url = `${this.baseUrl}/nearbysearch/json?` +
        `location=${latitude},${longitude}&` +
        `radius=${radius}&` +
        `type=${type}&` +
        `key=${this.apiKey}&` +
        `language=es`;

      console.log('🔍 Buscando lugares:', { type, latitude, longitude, radius });

      const response = await fetch(url);
      const data = await response.json();

      console.log('📍 Google Places API response:', data.status);
      console.log('📍 Lugares encontrados:', data.results?.length || 0);

      if (data.status === 'REQUEST_DENIED') {
        console.error('❌ REQUEST_DENIED:', data.error_message);
        throw new Error(`API Key inválida: ${data.error_message}`);
      }

      if (data.status === 'OVER_QUERY_LIMIT') {
        throw new Error('Límite de consultas excedido');
      }

      if (data.status === 'OK') {
        return this.formatPlacesData(data.results, location);
      } else if (data.status === 'ZERO_RESULTS') {
        console.log('📍 No se encontraron resultados');
        return [];
      } else {
        throw new Error(`Google Places API Error: ${data.status} - ${data.error_message || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('❌ Error en searchNearbyPlaces:', error);
      throw error;
    }
  }

  async searchPlacesByKeyword(location, keyword, radius = 5000) {
    if (!this.apiKey) {
      throw new Error('API Key no configurada');
    }

    try {
      const { latitude, longitude } = location;
      
      const url = `${this.baseUrl}/nearbysearch/json?` +
        `location=${latitude},${longitude}&` +
        `radius=${radius}&` +
        `keyword=${encodeURIComponent(keyword)}&` +
        `key=${this.apiKey}&` +
        `language=es`;

      console.log('🔍 Buscando por keyword:', keyword);

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK') {
        return this.formatPlacesData(data.results, location);
      } else if (data.status === 'ZERO_RESULTS') {
        return [];
      } else {
        throw new Error(`Google Places API Error: ${data.status}`);
      }
    } catch (error) {
      console.error('❌ Error en searchPlacesByKeyword:', error);
      throw error;
    }
  }

  async getPlaceDetails(placeId) {
    if (!this.apiKey) {
      throw new Error('API Key no configurada');
    }

    try {
      const fields = 'name,formatted_address,formatted_phone_number,website,rating,reviews,opening_hours,photos,geometry';
      
      const url = `${this.baseUrl}/details/json?` +
        `place_id=${placeId}&` +
        `fields=${fields}&` +
        `key=${this.apiKey}&` +
        `language=es`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK') {
        return this.formatPlaceDetails(data.result);
      } else {
        throw new Error(`Google Places API Error: ${data.status}`);
      }
    } catch (error) {
      console.error('❌ Error en getPlaceDetails:', error);
      throw error;
    }
  }

  formatPlacesData(places, userLocation) {
    return places.map(place => ({
      id: place.place_id,
      name: place.name,
      address: place.vicinity || place.formatted_address,
      rating: place.rating ? place.rating.toFixed(1) : 'N/A',
      priceLevel: this.formatPriceLevel(place.price_level),
      types: place.types,
      isOpen: place.opening_hours?.open_now ?? null,
      location: {
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
      },
      distance: this.calculateDistance(
        place.geometry.location.lat,
        place.geometry.location.lng,
        userLocation.latitude,
        userLocation.longitude
      ),
      photoReference: place.photos?.[0]?.photo_reference,
    }));
  }

  formatPlaceDetails(place) {
    return {
      id: place.place_id,
      name: place.name,
      address: place.formatted_address,
      phone: place.formatted_phone_number,
      website: place.website,
      rating: place.rating ? place.rating.toFixed(1) : 'N/A',
      reviews: place.reviews?.slice(0, 3),
      openingHours: place.opening_hours?.weekday_text,
      isOpen: place.opening_hours?.open_now,
      location: {
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
      },
      photos: place.photos?.map(photo => ({
        reference: photo.photo_reference,
        url: this.getPhotoUrl(photo.photo_reference),
      })) || [],
    };
  }

  formatPriceLevel(priceLevel) {
    const priceLevels = {
      0: 'Gratis',
      1: '$',
      2: '$$',
      3: '$$$',
      4: '$$$$',
    };
    return priceLevels[priceLevel] || 'N/A';
  }

  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.deg2rad(lat1 - lat2);
    const dLng = this.deg2rad(lng1 - lng2);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat2)) * Math.cos(this.deg2rad(lat1)) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return distance < 1 ? 
      `${Math.round(distance * 1000)}m` : 
      `${distance.toFixed(1)}km`;
  }

  deg2rad(deg) {
    return deg * (Math.PI/180);
  }

  getPhotoUrl(photoReference, maxWidth = 400) {
    if (!this.apiKey || !photoReference) return null;
    
    return `https://maps.googleapis.com/maps/api/place/photo?` +
      `maxwidth=${maxWidth}&` +
      `photo_reference=${photoReference}&` +
      `key=${this.apiKey}`;
  }

  getGooglePlaceType(category) {
    const typeMapping = {
      restaurant: 'restaurant',
      cafe: 'cafe',
      park: 'park',
      gym: 'gym',
      spa: 'spa',
      library: 'library',
      hospital: 'hospital',
      pharmacy: 'pharmacy',
      bank: 'bank',
      gas_station: 'gas_station',
    };
    
    return typeMapping[category] || category;
  }

  getRecommendedCategories(emotion) {
    const recommendations = {
      'Estresado': ['spa', 'park', 'cafe', 'library'],
      'Triste': ['cafe', 'park', 'restaurant', 'spa'],
      'Ansioso': ['park', 'spa', 'gym', 'library'],
      'Feliz': ['restaurant', 'cafe', 'park'],
      'Cansado': ['spa', 'cafe', 'park'],
      'Enojado': ['gym', 'park', 'spa'],
    };
    
    return recommendations[emotion?.toLowerCase()] || ['restaurant', 'cafe', 'park'];
  }

  isConfigured() {
    return !!this.apiKey;
  }

  async testConnection() {
    if (!this.apiKey) {
      return { success: false, error: 'API Key no configurada' };
    }

    try {
      const testLocation = { latitude: -12.0931, longitude: -77.0465 };
      await this.searchNearbyPlaces(testLocation, 'restaurant', 1000);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default new GooglePlacesService();