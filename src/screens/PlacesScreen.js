// src/screens/PlacesScreen.js - Rediseño profesional
import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
} from 'react-native';
import { COLORS } from '../constants/colors';
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
  const [fadeAnim] = useState(new Animated.Value(0));
  const scrollY = useRef(new Animated.Value(0)).current;

  const categories = [
    { id: 'restaurant', name: 'Restaurantes', icon: 'utensils' },
    { id: 'cafe', name: 'Cafeterías', icon: 'coffee' },
    { id: 'park', name: 'Parques', icon: 'tree' },
    { id: 'gym', name: 'Gimnasios', icon: 'activity' },
    { id: 'spa', name: 'Spas', icon: 'heart' },
    { id: 'library', name: 'Bibliotecas', icon: 'book' }
  ];

  useEffect(() => {
    StatusBar.setBarStyle('dark-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('transparent');
      StatusBar.setTranslucent(true);
    }
    
    initializeScreen();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (userLocation && selectedCategory && apiConfigured) {
      loadPlaces();
    }
  }, [userLocation, selectedCategory, apiConfigured]);

  const initializeScreen = async () => {
    setLoading(true);

    try {
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

      console.log('📍 Iniciando obtención de ubicación REAL...');
      let location;
      
      try {
        location = await GooglePlacesService.getCurrentLocationComplete();
      } catch (error) {
        console.log('📍 Error total, usando ubicación por defecto');
        location = {
          latitude: -12.0931,
          longitude: -77.0465,
        };
      }
      
      setUserLocation(location);
      
      if (location.latitude !== -12.0931 || location.longitude !== -77.0465) {
        console.log('📍 ✅ UBICACIÓN REAL DEL USUARIO OBTENIDA:', location);
      } else {
        console.log('📍 ⚠️ Usando ubicación por defecto:', location);
      }

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
        3000
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
        5000
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
      loadPlaces();
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
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        
        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer}>
            <CustomIcons.AlertCircle size={48} color={COLORS.warning} />
          </View>
          
          <Text style={styles.errorTitle}>Configuración requerida</Text>
          <Text style={styles.errorText}>
            Para usar la búsqueda de lugares necesitas:{'\n\n'}
            1. Obtener una API Key de Google Maps{'\n'}
            2. Agregar GOOGLE_MAPS_API_KEY en tu .env{'\n'}
            3. Habilitar Places API en Google Cloud Console
          </Text>
          
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.errorButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [1, 0.95],
    extrapolate: 'clamp',
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <CustomIcons.ArrowLeft size={22} color={COLORS.text} />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Lugares Cercanos</Text>
          {emotion && (
            <View style={styles.emotionBadge}>
              <Text style={styles.emotionBadgeText}>{emotion.label}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.filterButton} activeOpacity={0.7}>
          <CustomIcons.Menu size={18} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </Animated.View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchWrapper}>
          <CustomIcons.Search size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar lugares específicos..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            placeholderTextColor={COLORS.textMuted}
            returnKeyType="search"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={clearSearch} activeOpacity={0.7}>
              <CustomIcons.X size={18} color={COLORS.textMuted} />
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
          <View style={styles.loadingCircle}>
            <ActivityIndicator size="large" color={COLORS.white} />
          </View>
          <Text style={styles.loadingText}>
            {searchQuery ? 'Buscando lugares...' : 'Cargando...'}
          </Text>
        </View>
      )}

      {/* Places List */}
      {!loading && (
        <Animated.ScrollView
          style={styles.placesContainer}
          contentContainerStyle={styles.placesContent}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        >
          {/* Results info */}
          {places.length > 0 && (
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsCount}>{places.length}</Text>
              <Text style={styles.resultsText}>
                {searchQuery ? 'resultados encontrados' : `${selectedCategoryData?.name.toLowerCase()} cerca de ti`}
              </Text>
            </View>
          )}

          {/* Places */}
          <Animated.View style={[styles.placesGrid, { opacity: fadeAnim }]}>
            {places.map((place, index) => (
              <TouchableOpacity
                key={place.id}
                style={styles.placeCard}
                onPress={() => handlePlacePress(place)}
                activeOpacity={0.9}
              >
                {/* Image */}
                {place.photoReference ? (
                  <Image
                    source={{ 
                      uri: GooglePlacesService.getPhotoUrl(place.photoReference, 400) 
                    }}
                    style={styles.placeImage}
                    onError={() => console.log('Error cargando imagen')}
                  />
                ) : (
                  <View style={[styles.placeImage, styles.placeholderImage]}>
                    <CustomIcons.MapPin size={32} color={COLORS.textMuted} />
                  </View>
                )}
                
                {/* Status badge */}
                {place.isOpen !== null && (
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: place.isOpen ? '#10B981' : '#EF4444' }
                  ]}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusText}>
                      {place.isOpen ? 'Abierto' : 'Cerrado'}
                    </Text>
                  </View>
                )}

                {/* Content */}
                <View style={styles.placeContent}>
                  <View style={styles.placeHeader}>
                    <View style={styles.placeMainInfo}>
                      <Text style={styles.placeName} numberOfLines={1}>
                        {place.name}
                      </Text>
                      <Text style={styles.placeAddress} numberOfLines={1}>
                        {place.address}
                      </Text>
                    </View>
                    
                    <View style={styles.ratingBadge}>
                      <CustomIcons.Star size={12} color="#F59E0B" />
                      <Text style={styles.ratingText}>{place.rating}</Text>
                    </View>
                  </View>
                  
                  {/* Details */}
                  <View style={styles.placeDetails}>
                    <View style={styles.detailItem}>
                      <CustomIcons.MapPin size={14} color={COLORS.textMuted} />
                      <Text style={styles.detailText}>{place.distance}</Text>
                    </View>
                    
                    <View style={styles.detailSeparator} />
                    
                    <View style={styles.detailItem}>
                      <CustomIcons.DollarSign size={14} color={COLORS.textMuted} />
                      <Text style={styles.detailText}>{place.priceLevel}</Text>
                    </View>
                  </View>
                  
                  {/* Action button */}
                  <TouchableOpacity
                    style={styles.mapButton}
                    onPress={() => openInMaps(place)}
                    activeOpacity={0.8}
                  >
                    <CustomIcons.Navigation size={14} color={COLORS.white} />
                    <Text style={styles.mapButtonText}>Cómo llegar</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </Animated.View>

          {/* No results */}
          {places.length === 0 && (
            <View style={styles.noResultsContainer}>
              <View style={styles.noResultsIcon}>
                <CustomIcons.MapPin size={48} color={COLORS.textMuted} />
              </View>
              
              <Text style={styles.noResultsTitle}>
                {searchQuery ? 'No se encontraron resultados' : 'No hay lugares cerca'}
              </Text>
              
              <Text style={styles.noResultsText}>
                {searchQuery 
                  ? `No encontramos lugares que coincidan con "${searchQuery}"`
                  : `No hay ${selectedCategoryData?.name.toLowerCase()} en esta zona`
                }
              </Text>
              
              <TouchableOpacity
                style={styles.retryButton}
                onPress={searchQuery ? clearSearch : loadPlaces}
                activeOpacity={0.8}
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
              <View style={styles.tipHeader}>
                <View style={styles.tipIconWrapper}>
                  <CustomIcons.Info size={16} color={COLORS.primary} />
                </View>
                <Text style={styles.tipsTitle}>
                  Consejos para ti
                </Text>
              </View>
              
              <View style={styles.tipsCard}>
                <Text style={styles.tipsText}>
                  {getEmotionTips(emotion.label)}
                </Text>
              </View>
            </View>
          )}
        </Animated.ScrollView>
      )}
    </SafeAreaView>
  );
};

const getEmotionTips = (emotion) => {
  const tips = {
    'Estresado': 'Busca lugares tranquilos y silenciosos. Considera ir a un spa o parque. Evita lugares muy concurridos y respira profundo antes de salir.',
    'Triste': 'Elige lugares con ambiente cálido. Ve acompañado/a si es posible. Considera cafeterías acogedoras con buena música.',
    'Ansioso': 'Prefiere espacios abiertos como parques. Evita lugares muy cerrados. El ejercicio puede ayudar mucho.',
    'Tranki': '¡Perfecto momento para explorar! Prueba lugares nuevos y comparte la experiencia con otros.',
    'Cansado': 'Busca lugares para relajarte. Considera spas o cafeterías tranquilas. Evita lugares que requieran mucha energía.',
    'Enojado': 'El ejercicio puede ayudar a canalizar la energía. Evita lugares muy concurridos y considera espacios verdes para calmarte.'
  };
  
  return tips[emotion] || 'Escoge lugares que te hagan sentir bien. Respeta tus límites y disfruta el momento presente.';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },

  // Error state
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  errorButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  errorButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  
  // Header
  header: {
    backgroundColor: COLORS.white,
    paddingTop: Platform.OS === 'ios' ? 10 : 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  emotionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EBF5FB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  emotionBadgeText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },

  // Search
  searchSection: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A1A',
    marginLeft: 10,
  },
  
  // Categories
  categoriesSection: {
    backgroundColor: COLORS.white,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  categoriesContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  categoryChip: {
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryChipSelected: {
    backgroundColor: '#EBF5FB',
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  categoryText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  categoryTextSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  
  // Results header
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    gap: 8,
  },
  resultsCount: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary,
  },
  resultsText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  
  // Places
  placesContainer: {
    flex: 1,
  },
  placesContent: {
    paddingBottom: 32,
  },
  placesGrid: {
    paddingHorizontal: 16,
    gap: 16,
  },
  placeCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  placeImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#F3F4F6',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.white,
  },
  statusText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
  },
  
  // Place content
  placeContent: {
    padding: 16,
  },
  placeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  placeMainInfo: {
    flex: 1,
    marginRight: 12,
  },
  placeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  placeAddress: {
    fontSize: 13,
    color: '#6B7280',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '700',
  },
  
  // Place details
  placeDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailSeparator: {
    width: 1,
    height: 12,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 12,
  },
  detailText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  
  // Map button
  mapButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  mapButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },

  // No results
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 60,
  },
  noResultsIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  
  // Tips section
  tipsSection: {
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 16,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  tipIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EBF5FB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  tipsCard: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tipsText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
});

export default PlacesScreen;