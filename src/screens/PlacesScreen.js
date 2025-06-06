// src/screens/PlacesScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  PermissionsAndroid,
  Platform
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { COLORS } from '../constants/colors';

const PlacesScreen = ({ navigation }) => {
  const [location, setLocation] = useState(null);
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('restaurant');

  const categories = {
    restaurant: {
      name: 'Restaurantes',
      icon: '🍽️',
      types: 'restaurant|cafe',
      description: 'Lugares tranquilos para comer y relajarte'
    },
    park: {
      name: 'Parques',
      icon: '🌳',
      types: 'park',
      description: 'Espacios verdes para desconectarte'
    },
    gym: {
      name: 'Gimnasios',
      icon: '💪',
      types: 'gym',
      description: 'Centros de ejercicio para liberar estrés'
    },
    spa: {
      name: 'Spas',
      icon: '🧘‍♀️',
      types: 'spa|beauty_salon',
      description: 'Lugares de relajación y bienestar'
    },
    library: {
      name: 'Bibliotecas',
      icon: '📚',
      types: 'library',
      description: 'Espacios silenciosos para concentrarte'
    }
  };

  useEffect(() => {
    requestLocationPermission();
  }, []);

  useEffect(() => {
    if (location) {
      searchNearbyPlaces();
    }
  }, [location, selectedCategory]);

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Permisos de Ubicación',
            message: 'Tranki necesita acceso a tu ubicación para encontrar lugares cercanos',
            buttonNeutral: 'Preguntarme luego',
            buttonNegative: 'Cancelar',
            buttonPositive: 'OK',
          },
        );
        
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          getCurrentLocation();
        } else {
          Alert.alert(
            'Permisos requeridos',
            'Necesitamos permisos de ubicación para mostrarte lugares cercanos',
            [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Configurar', onPress: () => Linking.openSettings() }
            ]
          );
          setLoading(false);
        }
      } catch (err) {
        console.warn(err);
        setLoading(false);
      }
    } else {
      getCurrentLocation();
    }
  };

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        console.log('Error getting location:', error);
        Alert.alert(
          'Error de ubicación',
          'No se pudo obtener tu ubicación. Verifica que el GPS esté activado.',
          [{ text: 'OK' }]
        );
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  const searchNearbyPlaces = async () => {
    if (!location) return;

    setLoading(true);
    const category = categories[selectedCategory];
    
    try {
      // Simular búsqueda de lugares (en producción usar Google Places API)
      // const response = await fetch(
      //   `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location.latitude},${location.longitude}&radius=2000&type=${category.types}&key=YOUR_API_KEY`
      // );
      
      // Para el MVP, usar datos simulados
      const simulatedPlaces = generateSimulatedPlaces(category);
      setPlaces(simulatedPlaces);
    } catch (error) {
      console.error('Error searching places:', error);
      Alert.alert('Error', 'No se pudieron cargar los lugares cercanos');
    } finally {
      setLoading(false);
    }
  };

  const generateSimulatedPlaces = (category) => {
    const baseNames = {
      restaurant: ['Café Tranquilo', 'Restaurante Zen', 'Bistró Relax', 'Café Serenity', 'La Pausa'],
      park: ['Parque Central', 'Jardines de la Paz', 'Parque Natural', 'Plaza Verde', 'Bosque Urbano'],
      gym: ['Gimnasio Vital', 'Fitness Zone', 'Centro Deportivo', 'Gym Wellness', 'Studio Fit'],
      spa: ['Spa Relajación', 'Centro de Bienestar', 'Masajes Zen', 'Spa Tranquilidad', 'Wellness Center'],
      library: ['Biblioteca Central', 'Sala de Lectura', 'Biblioteca Pública', 'Centro Cultural', 'Espacio Estudio']
    };

    return baseNames[selectedCategory]?.map((name, index) => ({
      id: `${selectedCategory}_${index}`,
      name,
      rating: (Math.random() * 2 + 3).toFixed(1), // Rating entre 3.0 y 5.0
      distance: (Math.random() * 1.5 + 0.2).toFixed(1), // Distancia entre 0.2 y 1.7 km
      address: `Calle ${index + 1} #${(index + 1) * 100}, Lima`,
      isOpen: Math.random() > 0.2, // 80% probabilidad de estar abierto
      priceLevel: Math.floor(Math.random() * 4) + 1, // Nivel de precio 1-4
      photo: null
    })) || [];
  };

  const openInMaps = (place) => {
    if (!location) return;
    
    const url = Platform.select({
      ios: `maps:0,0?q=${place.name}@${location.latitude},${location.longitude}`,
      android: `geo:0,0?q=${place.name}@${location.latitude},${location.longitude}`
    });
    
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        // Fallback a Google Maps web
        const webUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&center=${location.latitude},${location.longitude}`;
        Linking.openURL(webUrl);
      }
    });
  };

  const renderPriceLevel = (level) => {
    return '$'.repeat(level) + '·'.repeat(4 - level);
  };

  const renderPlace = (place) => (
    <TouchableOpacity
      key={place.id}
      style={styles.placeCard}
      onPress={() => openInMaps(place)}
    >
      <View style={styles.placeHeader}>
        <View style={styles.placeInfo}>
          <Text style={styles.placeName}>{place.name}</Text>
          <Text style={styles.placeAddress}>{place.address}</Text>
        </View>
        <View style={styles.placeStats}>
          <Text style={styles.placeRating}>⭐ {place.rating}</Text>
          <Text style={styles.placeDistance}>📍 {place.distance} km</Text>
        </View>
      </View>
      
      <View style={styles.placeDetails}>
        <View style={styles.placeStatus}>
          <Text style={[
            styles.statusText,
            { color: place.isOpen ? COLORS.secondary : '#F44336' }
          ]}>
            {place.isOpen ? '✅ Abierto' : '❌ Cerrado'}
          </Text>
          <Text style={styles.priceText}>
            {renderPriceLevel(place.priceLevel)}
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.directionsButton}
          onPress={() => openInMaps(place)}
        >
          <Text style={styles.directionsButtonText}>Ir 🗺️</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lugares Cercanos</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
        {Object.entries(categories).map(([key, category]) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.categoryButton,
              selectedCategory === key && styles.categoryButtonActive
            ]}
            onPress={() => setSelectedCategory(key)}
          >
            <Text style={styles.categoryIcon}>{category.icon}</Text>
            <Text style={[
              styles.categoryText,
              selectedCategory === key && styles.categoryTextActive
            ]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.categoryDescription}>
        <Text style={styles.descriptionText}>
          {categories[selectedCategory].description}
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Buscando lugares cercanos...</Text>
        </View>
      ) : (
        <ScrollView style={styles.placesContainer}>
          {places.length > 0 ? (
            places.map(renderPlace)
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateEmoji}>🔍</Text>
              <Text style={styles.emptyStateTitle}>No se encontraron lugares</Text>
              <Text style={styles.emptyStateText}>
                No pudimos encontrar {categories[selectedCategory].name.toLowerCase()} cerca de tu ubicación.
                Intenta con otra categoría o verifica tu conexión.
              </Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => searchNearbyPlaces()}
              >
                <Text style={styles.retryButtonText}>Buscar de nuevo</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.helpSection}>
            <Text style={styles.helpTitle}>💡 Consejos para relajarte</Text>
            <View style={styles.tipCard}>
              <Text style={styles.tipText}>
                • Elige lugares que te transmitan calma{'\n'}
                • Desconecta tu teléfono por un rato{'\n'}
                • Respira profundo y disfruta el momento{'\n'}
                • Si es posible, ve acompañado/a
              </Text>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 55,
  },
  backButtonText: {
    color: COLORS.white,
    fontSize: 16,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  categoriesContainer: {
    paddingVertical: 15,
    paddingHorizontal: 10,
  },
  categoryButton: {
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    minWidth: 80,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryButtonActive: {
    backgroundColor: COLORS.primary,
  },
  categoryIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  categoryText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '500',
  },
  categoryTextActive: {
    color: COLORS.white,
  },
  categoryDescription: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 14,
    color: COLORS.text,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 15,
    color: COLORS.text,
    fontSize: 16,
  },
  placesContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  placeCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  placeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  placeInfo: {
    flex: 1,
  },
  placeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 3,
  },
  placeAddress: {
    fontSize: 14,
    color: COLORS.text,
    opacity: 0.7,
  },
  placeStats: {
    alignItems: 'flex-end',
  },
  placeRating: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 2,
  },
  placeDistance: {
    fontSize: 12,
    color: COLORS.text,
    opacity: 0.7,
  },
  placeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  placeStatus: {
    flex: 1,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 3,
  },
  priceText: {
    fontSize: 14,
    color: COLORS.text,
    opacity: 0.7,
  },
  directionsButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  directionsButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateEmoji: {
    fontSize: 48,
    marginBottom: 15,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 20,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  helpSection: {
    marginTop: 20,
    marginBottom: 30,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 10,
  },
  tipCard: {
    backgroundColor: COLORS.white,
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.secondary,
  },
  tipText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
});

export default PlacesScreen;