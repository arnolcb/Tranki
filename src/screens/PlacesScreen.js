// src/screens/PlacesScreen.js - Versión completa y funcional
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  Platform
} from 'react-native';
import { COLORS } from '../constants/colors';

const PlacesScreen = ({ navigation }) => {
  const [selectedCategory, setSelectedCategory] = useState('restaurant');

  const categories = [
    { id: 'restaurant', name: 'Restaurantes', icon: '🍽️', color: '#FF6B6B' },
    { id: 'cafe', name: 'Cafeterías', icon: '☕', color: '#4ECDC4' },
    { id: 'park', name: 'Parques', icon: '🌳', color: '#45B7D1' },
    { id: 'gym', name: 'Gimnasios', icon: '💪', color: '#96CEB4' },
    { id: 'spa', name: 'Spas', icon: '🧘‍♀️', color: '#FECA57' },
    { id: 'library', name: 'Bibliotecas', icon: '📚', color: '#FF9FF3' }
  ];

  const placesData = {
    restaurant: [
      { name: 'Restaurante Central', address: 'Av. Larco 123, Miraflores', rating: '4.5', distance: '0.8', description: 'Ambiente acogedor para una comida relajante' },
      { name: 'La Mar Cebichería', address: 'Av. Mariscal La Mar 770, Miraflores', rating: '4.7', distance: '1.2', description: 'Delicioso ceviche en ambiente tranquilo' },
      { name: 'Astrid y Gastón', address: 'Av. Paz Soldán 290, San Isidro', rating: '4.8', distance: '2.1', description: 'Experiencia gastronómica premium' },
      { name: 'El Jardín Secreto', address: 'Calle Tarata 230, Miraflores', rating: '4.3', distance: '0.9', description: 'Terraza verde ideal para desconectar' }
    ],
    cafe: [
      { name: 'Café Tortoni', address: 'Calle Lima 456, San Isidro', rating: '4.2', distance: '1.2', description: 'Perfecto para trabajar o estudiar tranquilo' },
      { name: 'Starbucks Larco', address: 'Av. Larco 345, Miraflores', rating: '4.0', distance: '0.5', description: 'Ambiente familiar y WiFi rápido' },
      { name: 'Tostao Café', address: 'Av. Benavides 415, Miraflores', rating: '4.4', distance: '0.7', description: 'Café colombiano de especialidad' },
      { name: 'Juan Valdez', address: 'Av. Conquistadores 560, San Isidro', rating: '4.1', distance: '1.5', description: 'Espacio amplio para relajarse' }
    ],
    park: [
      { name: 'Parque Kennedy', address: 'Miraflores, Lima', rating: '4.0', distance: '0.5', description: 'Parque central con gatos y mucha vida' },
      { name: 'Malecón Miraflores', address: 'Costa Verde, Miraflores', rating: '4.6', distance: '0.8', description: 'Vista al mar perfecta para caminar' },
      { name: 'Parque El Olivar', address: 'San Isidro, Lima', rating: '4.5', distance: '1.8', description: 'Bosque de olivos centenarios' },
      { name: 'Parque de la Reserva', address: 'Lima Centro', rating: '4.3', distance: '3.2', description: 'Circuito mágico del agua' }
    ],
    gym: [
      { name: 'SportLife', address: 'Av. Larco 1232, Miraflores', rating: '4.3', distance: '0.9', description: 'Gimnasio completo con piscina' },
      { name: 'Gold\'s Gym', address: 'Av. Pardo 715, Miraflores', rating: '4.1', distance: '0.7', description: 'Equipos de alta calidad' },
      { name: 'Smart Fit', address: 'Av. Benavides 290, Miraflores', rating: '3.9', distance: '1.1', description: 'Económico y bien equipado' },
      { name: 'Bodytech', address: 'Av. Conquistadores 330, San Isidro', rating: '4.4', distance: '1.6', description: 'Clases grupales y entrenadores' }
    ],
    spa: [
      { name: 'Keme Spa', address: 'Av. La Paz 463, Miraflores', rating: '4.6', distance: '0.6', description: 'Relajación y bienestar integral' },
      { name: 'Zen Spa', address: 'Av. El Bosque 232, San Isidro', rating: '4.5', distance: '1.4', description: 'Masajes terapéuticos y faciales' },
      { name: 'Aqua Spa', address: 'Malecón Cisneros 1244, Miraflores', rating: '4.7', distance: '0.9', description: 'Spa con vista al mar' },
      { name: 'Serenity Wellness', address: 'Av. Pardo 1214, Miraflores', rating: '4.4', distance: '0.8', description: 'Centro de bienestar holístico' }
    ],
    library: [
      { name: 'Biblioteca Municipal', address: 'Av. Larco 770, Miraflores', rating: '4.2', distance: '0.4', description: 'Espacio silencioso para estudiar' },
      { name: 'Casa de la Literatura', address: 'Jr. Áncash 207, Lima Centro', rating: '4.5', distance: '4.1', description: 'Biblioteca patrimonial hermosa' },
      { name: 'Biblioteca Ricardo Palma', address: 'Av. Arequipa 4985, Miraflores', rating: '4.0', distance: '1.3', description: 'Amplia colección y salas de estudio' },
      { name: 'Centro Cultural PUCP', address: 'Av. Camino Real 1075, San Isidro', rating: '4.3', distance: '2.1', description: 'Biblioteca universitaria abierta' }
    ]
  };

  const getCurrentPlaces = () => {
    return placesData[selectedCategory] || [];
  };

  const openInMaps = (place) => {
    const query = encodeURIComponent(`${place.name} ${place.address}`);
    
    const urls = {
      android: `geo:0,0?q=${query}`,
      ios: `maps:0,0?q=${query}`,
      web: `https://www.google.com/maps/search/?api=1&query=${query}`
    };
    
    const primaryUrl = Platform.OS === 'ios' ? urls.ios : urls.android;
    
    console.log(`Intentando abrir mapa para: ${place.name}`);
    console.log(`URL: ${primaryUrl}`);
    
    Linking.canOpenURL(primaryUrl)
      .then(supported => {
        console.log(`URL soportada: ${supported}`);
        if (supported) {
          return Linking.openURL(primaryUrl);
        } else {
          console.log('Usando fallback web');
          return Linking.openURL(urls.web);
        }
      })
      .then(() => {
        console.log('Mapa abierto exitosamente');
      })
      .catch(err => {
        console.error('Error abriendo mapa:', err);
        Alert.alert(
          'Error al abrir mapa',
          'No se pudo abrir la aplicación de mapas. ¿Quieres abrir en el navegador?',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Abrir navegador', onPress: () => Linking.openURL(urls.web) }
          ]
        );
      });
  };

  const handlePlacePress = (place) => {
    Alert.alert(
      place.name,
      `${place.description}\n\n📍 ${place.address}\n⭐ ${place.rating} • 🚶‍♂️ ${place.distance} km`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: '🗺️ Abrir en mapa', onPress: () => openInMaps(place) }
      ]
    );
  };

  const selectedCategoryData = categories.find(cat => cat.id === selectedCategory);

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

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryButton,
              selectedCategory === category.id && [
                styles.categoryButtonActive,
                { backgroundColor: category.color }
              ]
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Text style={styles.categoryIcon}>{category.icon}</Text>
            <Text style={[
              styles.categoryText,
              selectedCategory === category.id && styles.categoryTextActive
            ]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={[styles.categoryDescription, { backgroundColor: selectedCategoryData?.color + '20' }]}>
        <Text style={styles.descriptionText}>
          {selectedCategoryData?.icon} Encuentra {selectedCategoryData?.name.toLowerCase()} cerca de ti
        </Text>
      </View>

      <ScrollView style={styles.placesContainer}>
        <Text style={styles.sectionTitle}>
          📍 {getCurrentPlaces().length} lugares encontrados
        </Text>

        {getCurrentPlaces().map((place, index) => (
          <TouchableOpacity
            key={index}
            style={styles.placeCard}
            onPress={() => handlePlacePress(place)}
            activeOpacity={0.7}
          >
            <View style={styles.placeHeader}>
              <View style={styles.placeInfo}>
                <Text style={styles.placeName}>{place.name}</Text>
                <Text style={styles.placeAddress}>{place.address}</Text>
                <Text style={styles.placeDescription}>{place.description}</Text>
              </View>
              <View style={styles.placeStats}>
                <Text style={styles.placeRating}>⭐ {place.rating}</Text>
                <Text style={styles.placeDistance}>🚶‍♂️ {place.distance} km</Text>
              </View>
            </View>
            
            <View style={styles.placeActions}>
              <TouchableOpacity
                style={[styles.mapButton, { backgroundColor: selectedCategoryData?.color }]}
                onPress={() => openInMaps(place)}
              >
                <Text style={styles.mapButtonText}>🗺️ Ver en mapa</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}

        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>💡 Consejos para relajarte</Text>
          <View style={styles.tipCard}>
            <Text style={styles.tipText}>
              • Elige lugares que te transmitan calma{'\n'}
              • Desconecta el teléfono por un rato{'\n'}
              • Respira profundo y disfruta el momento{'\n'}
              • Si es posible, ve acompañado/a{'\n'}
              • Tómate tu tiempo sin prisa
            </Text>
          </View>
        </View>
      </ScrollView>
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
    flexDirection: 'row',
    justifyContent: 'center',
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
    maxHeight: 70,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  categoriesContent: {
    paddingHorizontal: 15,
  },
  categoryButton: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    minWidth: 70,
    maxHeight: 55,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryButtonActive: {
    transform: [{ scale: 1.05 }],
  },
  categoryIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  categoryText: {
    fontSize: 10,
    color: COLORS.text,
    fontWeight: '500',
    textAlign: 'center',
  },
  categoryTextActive: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  categoryDescription: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: COLORS.text,
    textAlign: 'center',
    fontWeight: '500',
  },
  placesContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
    textAlign: 'center',
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 8,
  },
  placeCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
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
    marginRight: 10,
  },
  placeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 3,
  },
  placeAddress: {
    fontSize: 13,
    color: COLORS.text,
    opacity: 0.7,
    marginBottom: 5,
  },
  placeDescription: {
    fontSize: 12,
    color: COLORS.text,
    opacity: 0.8,
    fontStyle: 'italic',
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
  placeActions: {
    alignItems: 'center',
  },
  mapButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
  },
  mapButtonText: {
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