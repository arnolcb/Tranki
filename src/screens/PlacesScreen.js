// src/screens/PlacesScreen.js - CON API REAL DE GOOGLE PLACES
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  Platform,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  Image,
} from 'react-native';
import { COLORS, Theme } from '../constants/colors';
import CustomIcons from '../components/CustomIcons';
import GooglePlacesService from '../services/GooglePlacesService';

const PlacesScreen = ({ navigation, route }) => {
  const { emotion } = route.params || {};
  
  const [selectedCategory, setSelectedCategory] = useState('restaurant');
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [apiConfigured, setApiConfigured] = useState(false);

  const categories = [
    { id: 'restaurant', name: 'Restaurantes' },
    { id: 'cafe', name: 'Cafeterías' },
    { id: 'park', name: 'Parques' },
    { id: 'gym', name: 'Gimnasios' },
    { id: 'spa', name: 'Spas' },
    { id: 'library', name: 'Bibliotecas' }
  ];

  useEffect(() => {
    initializeScreen();
  }, []);

  useEffect(() => {
    if (userLocation && selectedCategory && apiConfigured) {
      loadPlaces();
    }
  }, [userLocation, selectedCategory, apiConfigured]);

  const initializeScreen = async () => {
    setLoading(true);

    try {
      // Verificar si la API está configurada
      const configured = GooglePlacesService.isConfigured();
      setApiConfigured(configured);

      if (!configured) {
        Alert.alert(
          'Configuración requerida',
          'Para usar esta función necesitas configurar GOOGLE_MAPS_API_KEY en tu archivo .env',
          [{ text: 'Entendido' }]
        );
        setLoading(false);
        return;
      }

      // Obtener ubicación REAL del usuario
      console.log('📍 Iniciando obtención de ubicación REAL...');
      let location;
      
      try {
        // Usar método completo que prueba todos los enfoques
        location = await GooglePlacesService.getCurrentLocationComplete();
      } catch (error) {
        console.log('📍 Error total, usando ubicación por defecto');
        location = {
          latitude: -12.0931,
          longitude: -77.0465,
        };
      }
      
      setUserLocation(location);
      
      // Informar al usuario si se obtuvo ubicación real o por defecto
      if (location.latitude !== -12.0931 || location.longitude !== -77.0465) {
        console.log('📍 ✅ UBICACIÓN REAL DEL USUARIO OBTENIDA:', location);
      } else {
        console.log('📍 ⚠️ Usando ubicación por defecto:', location);
      }

      // Configurar categoría recomendada según emoción
      if (emotion) {
        const recommended = GooglePlacesService.getRecommendedCategories(emotion.label);
        if (recommended.length > 0) {
          setSelectedCategory(recommended[0]);
        }
      }

    } catch (error) {
      console.error('Error inicializando pantalla:', error);
      Alert.alert(
        'Error de inicialización',
        'Hubo un problema al inicializar la pantalla. Inténtalo de nuevo.',
        [
          { text: 'Reintentar', onPress: initializeScreen },
          { text: 'Cancelar', onPress: () => navigation.goBack() }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const loadPlaces = async () => {
    if (!userLocation || !apiConfigured) return;
    
    try {
      setLoading(true);
      
      const googleType = GooglePlacesService.getGooglePlaceType(selectedCategory);
      console.log(`🔍 Buscando ${googleType} cerca de:`, userLocation);
      
      const placesData = await GooglePlacesService.searchNearbyPlaces(
        userLocation, 
        googleType, 
        3000 // 3km radius
      );
      
      console.log(`✅ Encontrados ${placesData.length} lugares`);
      setPlaces(placesData);
      
    } catch (error) {
      console.error('❌ Error cargando lugares:', error);
      
      Alert.alert(
        'Error de conexión',
        `No se pudieron cargar los lugares: ${error.message}`,
        [
          { text: 'Reintentar', onPress: loadPlaces },
          { text: 'Cancelar', style: 'cancel' }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !userLocation || !apiConfigured) return;
    
    try {
      setLoading(true);
      console.log(`🔍 Buscando: "${searchQuery}"`);
      
      const searchResults = await GooglePlacesService.searchPlacesByKeyword(
        userLocation,
        searchQuery,
        5000 // 5km radius para búsquedas
      );
      
      console.log(`✅ Búsqueda completada: ${searchResults.length} resultados`);
      setPlaces(searchResults);
      
    } catch (error) {
      console.error('❌ Error en búsqueda:', error);
      Alert.alert('Error', `No se pudo realizar la búsqueda: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    if (userLocation && apiConfigured) {
      loadPlaces(); // Recargar lugares de la categoría actual
    }
  };

  const openInMaps = (place) => {
    const query = encodeURIComponent(`${place.name} ${place.address}`);
    
    const urls = {
      android: `geo:0,0?q=${query}`,
      ios: `maps:0,0?q=${query}`,
      web: `https://www.google.com/maps/search/?api=1&query=${query}`
    };
    
    const primaryUrl = Platform.OS === 'ios' ? urls.ios : urls.android;
    
    Linking.canOpenURL(primaryUrl)
      .then(supported => {
        if (supported) {
          return Linking.openURL(primaryUrl);
        } else {
          return Linking.openURL(urls.web);
        }
      })
      .catch(() => {
        Alert.alert('Error', 'No se pudo abrir la aplicación de mapas');
      });
  };

  const handlePlacePress = async (place) => {
    try {
      // Mostrar información básica inmediatamente
      const basicInfo = `${place.address}\n\n⭐ ${place.rating} • 📍 ${place.distance}\n💰 ${place.priceLevel}${place.isOpen !== null ? (place.isOpen ? ' • 🟢 Abierto' : ' • 🔴 Cerrado') : ''}`;
      
      Alert.alert(
        place.name,
        basicInfo,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Ver en mapa', onPress: () => openInMaps(place) },
          { 
            text: 'Más detalles', 
            onPress: () => loadPlaceDetails(place.id) 
          }
        ]
      );
    } catch (error) {
      console.error('Error mostrando lugar:', error);
    }
  };

  const loadPlaceDetails = async (placeId) => {
    try {
      setLoading(true);
      console.log('🔍 Cargando detalles del lugar:', placeId);
      
      const details = await GooglePlacesService.getPlaceDetails(placeId);
      
      const detailsText = [
        `📍 ${details.address}`,
        details.phone ? `📞 ${details.phone}` : null,
        details.website ? `🌐 ${details.website}` : null,
        details.openingHours ? `🕒 Horarios:\n${details.openingHours.slice(0, 3).join('\n')}` : null
      ].filter(Boolean).join('\n\n');
      
      Alert.alert(
        'Detalles del lugar',
        detailsText,
        [{ text: 'Cerrar' }]
      );
      
    } catch (error) {
      console.error('❌ Error cargando detalles:', error);
      Alert.alert('Error', 'No se pudieron cargar los detalles del lugar');
    } finally {
      setLoading(false);
    }
  };

  const selectedCategoryData = categories.find(cat => cat.id === selectedCategory);

  if (!apiConfigured) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        
        <View style={styles.configContainer}>
          <CustomIcons.AlertCircle size={48} color={COLORS.warning} />
          <Text style={styles.configTitle}>Configuración requerida</Text>
          <Text style={styles.configText}>
            Para usar la búsqueda de lugares necesitas:
            {'\n\n'}
            1. Obtener una API Key de Google Maps
            {'\n'}
            2. Agregar GOOGLE_MAPS_API_KEY en tu .env
            {'\n'}
            3. Habilitar Places API en Google Cloud Console
          </Text>
          <TouchableOpacity
            style={styles.configButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.configButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <CustomIcons.ArrowLeft size={20} color={COLORS.text} />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Lugares Cercanos</Text>
          <Text style={styles.headerSubtitle}>
            {emotion ? `Recomendado para ${emotion.label.toLowerCase()}` : 'Encuentra tu espacio ideal'}
          </Text>
        </View>

        <TouchableOpacity style={styles.headerAction}>
          <CustomIcons.Menu size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchWrapper}>
          <CustomIcons.Search size={16} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar lugares específicos..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={clearSearch}>
              <CustomIcons.X size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Categories */}
      <View style={styles.categoriesSection}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.categoriesContent}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryChip,
                selectedCategory === category.id && styles.categoryChipSelected
              ]}
              onPress={() => setSelectedCategory(category.id)}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.categoryText,
                selectedCategory === category.id && styles.categoryTextSelected
              ]}>
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Loading */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>
            {searchQuery ? 'Buscando...' : 'Cargando lugares...'}
          </Text>
        </View>
      )}

      {/* Places List */}
      {!loading && (
        <ScrollView
          style={styles.placesContainer}
          contentContainerStyle={styles.placesContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Results info */}
          <View style={styles.categoryInfo}>
            <Text style={styles.categoryInfoText}>
              {places.length} {searchQuery ? 'resultados' : selectedCategoryData?.name.toLowerCase()} encontrados
            </Text>
          </View>

          {places.map((place, index) => (
            <TouchableOpacity
              key={place.id}
              style={styles.placeCard}
              onPress={() => handlePlacePress(place)}
              activeOpacity={0.7}
            >
              {place.photoReference && (
                <Image
                  source={{ 
                    uri: GooglePlacesService.getPhotoUrl(place.photoReference, 300) 
                  }}
                  style={styles.placeImage}
                  onError={() => console.log('Error cargando imagen del lugar')}
                />
              )}
              
              <View style={styles.placeContent}>
                <View style={styles.placeHeader}>
                  <View style={styles.placeInfo}>
                    <Text style={styles.placeName}>{place.name}</Text>
                    <Text style={styles.placeAddress}>{place.address}</Text>
                  </View>
                  
                  <View style={styles.placeRating}>
                    <Text style={styles.ratingText}>⭐ {place.rating}</Text>
                  </View>
                </View>
                
                <View style={styles.placeDetails}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Distancia</Text>
                    <Text style={styles.detailValue}>{place.distance}</Text>
                  </View>
                  
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Precio</Text>
                    <Text style={styles.detailValue}>{place.priceLevel}</Text>
                  </View>
                  
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Estado</Text>
                    <Text style={[
                      styles.detailValue,
                      { color: place.isOpen === true ? COLORS.success : place.isOpen === false ? COLORS.error : COLORS.textMuted }
                    ]}>
                      {place.isOpen === true ? 'Abierto' : place.isOpen === false ? 'Cerrado' : 'N/A'}
                    </Text>
                  </View>
                </View>
                
                <TouchableOpacity
                  style={styles.mapButton}
                  onPress={() => openInMaps(place)}
                >
                  <CustomIcons.Location size={16} color={COLORS.white} />
                  <Text style={styles.mapButtonText}>Ver en mapa</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}

          {/* No results */}
          {places.length === 0 && (
            <View style={styles.noResultsContainer}>
              <CustomIcons.MapPin size={48} color={COLORS.textMuted} />
              <Text style={styles.noResultsText}>
                {searchQuery 
                  ? `No se encontraron resultados para "${searchQuery}"`
                  : `No se encontraron ${selectedCategoryData?.name.toLowerCase()} cerca de ti`
                }
              </Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={searchQuery ? clearSearch : loadPlaces}
              >
                <Text style={styles.retryButtonText}>
                  {searchQuery ? 'Limpiar búsqueda' : 'Reintentar'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Tips section */}
          {emotion && places.length > 0 && (
            <View style={styles.tipsSection}>
              <Text style={styles.tipsTitle}>
                Consejos para cuando te sientes {emotion.label.toLowerCase()}
              </Text>
              <View style={styles.tipsCard}>
                <Text style={styles.tipsText}>
                  {getEmotionTips(emotion.label)}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const getEmotionTips = (emotion) => {
  const tips = {
    'Estresado': '• Busca lugares tranquilos y silenciosos\n• Considera ir a un spa o parque\n• Evita lugares muy concurridos\n• Respira profundo antes de salir',
    'Triste': '• Elige lugares con ambiente cálido\n• Ve acompañado/a si es posible\n• Considera cafeterías acogedoras\n• Lugares con buena música pueden ayudar',
    'Ansioso': '• Prefiere espacios abiertos como parques\n• Evita lugares muy cerrados\n• El ejercicio puede ayudar mucho\n• Lleva agua y respira conscientemente',
    'Feliz': '• ¡Perfecto momento para explorar!\n• Prueba lugares nuevos\n• Comparte la experiencia con otros\n• Documenta estos buenos momentos',
    'Cansado': '• Busca lugares para relajarte\n• Considera spas o cafeterías tranquilas\n• Evita lugares que requieran mucha energía\n• Hidrátate bien',
    'Enojado': '• El ejercicio puede ayudar a canalizar la energía\n• Evita lugares muy concurridos\n• Considera espacios verdes para calmarte\n• Respira profundo antes de interactuar'
  };
  
  return tips[emotion] || '• Escoge lugares que te hagan sentir bien\n• Respeta tus límites\n• Disfruta el momento presente\n• Cuida tu bienestar';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Config screen
  configContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.xl,
  },
  configTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
    textAlign: 'center',
  },
  configButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: Theme.spacing.xl,
    paddingVertical: Theme.spacing.md,
    borderRadius: 8,
  },
  configButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Header
  header: {
    backgroundColor: COLORS.white,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray50,
    marginRight: Theme.spacing.md,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  headerAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray50,
  },

  // Search
  searchContainer: {
    backgroundColor: COLORS.white,
    paddingHorizontal: Theme.spacing.lg,
    paddingBottom: Theme.spacing.md,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray50,
    borderRadius: 12,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    marginLeft: Theme.spacing.sm,
  },
  
  // Categories
  categoriesSection: {
    backgroundColor: COLORS.white,
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  categoriesContent: {
    paddingHorizontal: Theme.spacing.lg,
    gap: Theme.spacing.sm,
  },
  categoryChip: {
    backgroundColor: COLORS.gray50,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryChipSelected: {
    backgroundColor: COLORS.blue50,
    borderColor: COLORS.primary,
  },
  categoryText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  categoryTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.xl,
  },
  loadingText: {
    marginTop: Theme.spacing.md,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  
  // Category info
  categoryInfo: {
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
    backgroundColor: COLORS.gray50,
    marginBottom: Theme.spacing.md,
  },
  categoryInfoText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  
  // Places
  placesContainer: {
    flex: 1,
  },
  placesContent: {
    paddingBottom: Theme.spacing.xxxl,
  },
  placeCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  placeImage: {
    width: '100%',
    height: 120,
    backgroundColor: COLORS.gray100,
  },
  placeContent: {
    padding: Theme.spacing.lg,
  },
  
  // Place header
  placeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Theme.spacing.md,
  },
  placeInfo: {
    flex: 1,
    marginRight: Theme.spacing.md,
  },
  placeName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  placeAddress: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 16,
  },
  placeRating: {
    backgroundColor: COLORS.successSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingText: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '600',
  },
  
  // Place details
  placeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.md,
    backgroundColor: COLORS.gray50,
    padding: Theme.spacing.md,
    borderRadius: 8,
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '600',
  },
  
  // Map button
  mapButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  mapButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },

  // No results
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.xl,
    marginTop: Theme.spacing.xxxl,
  },
  noResultsText: {
    fontSize: 16,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Tips
  tipsSection: {
    margin: Theme.spacing.lg,
    marginTop: Theme.spacing.xl,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: Theme.spacing.md,
  },
  tipsCard: {
    backgroundColor: COLORS.white,
    padding: Theme.spacing.lg,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  tipsText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});

export default PlacesScreen;