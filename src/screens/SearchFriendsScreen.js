// src/screens/SearchFriendsScreen.js - Rediseño moderno
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  SafeAreaView,
  StatusBar,
  Keyboard,
  Platform,
  Animated,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { COLORS } from '../constants/colors';
import CustomIcons from '../components/CustomIcons';
import SocialService from '../services/SocialService';

const SearchFriendsScreen = ({ navigation }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    StatusBar.setBarStyle('dark-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('transparent');
      StatusBar.setTranslucent(true);
    }
    
    const currentUser = auth().currentUser;
    setUser(currentUser);
    
    if (currentUser) {
      loadSuggestions(currentUser.uid);
    }

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadSuggestions = async (userId) => {
    try {
      const friendSuggestions = await SocialService.getFriendSuggestions(userId, 5);
      setSuggestions(friendSuggestions);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim() || !user) return;
    
    try {
      setLoading(true);
      Keyboard.dismiss();
      
      const results = await SocialService.searchUsers(searchTerm.trim(), user.uid);
      setSearchResults(results);
      
      if (results.length === 0) {
        Alert.alert(
          'Sin resultados', 
          'No se encontraron usuarios con ese email o nombre.'
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Error al buscar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleSendFriendRequest = async (targetUser) => {
    try {
      const friendshipStatus = await SocialService.checkFriendshipStatus(
        user.uid, 
        targetUser.id
      );
      
      if (friendshipStatus.status === 'friends') {
        Alert.alert('Ya son amigos', 'Ya eres amigo de esta persona');
        return;
      }
      
      if (friendshipStatus.status === 'pending') {
        Alert.alert(
          'Solicitud pendiente', 
          friendshipStatus.direction === 'sent' 
            ? 'Ya enviaste una solicitud a esta persona'
            : 'Esta persona ya te envió una solicitud.'
        );
        return;
      }
      
      await SocialService.sendFriendRequest(user.uid, targetUser.id);
      
      Alert.alert(
        '¡Enviado!',
        `Solicitud enviada a ${targetUser.name}`
      );
      
      setSearchResults(prev => 
        prev.map(u => 
          u.id === targetUser.id 
            ? { ...u, requestSent: true }
            : u
        )
      );
      
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo enviar la solicitud');
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (name) => {
    const colors = [
      '#7DB9DE', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'
    ];
    const index = name ? name.charCodeAt(0) % colors.length : 0;
    return colors[index];
  };

  const renderUserItem = ({ item: targetUser, showSuggestion = false }) => (
    <Animated.View style={[styles.userCard, { opacity: fadeAnim }]}>
      <View style={styles.userLeft}>
        <View style={[
          styles.userAvatar,
          { backgroundColor: getAvatarColor(targetUser.name) }
        ]}>
          <Text style={styles.userInitials}>
            {getInitials(targetUser.name)}
          </Text>
        </View>
        
        <View style={styles.userInfo}>
          <View style={styles.userNameRow}>
            <Text style={styles.userName}>{targetUser.name || 'Usuario'}</Text>
            {targetUser.isVerified && (
              <View style={styles.verifiedBadge}>
                <CustomIcons.Check size={10} color={COLORS.white} />
              </View>
            )}
          </View>
          <Text style={styles.userEmail} numberOfLines={1}>
            {targetUser.email}
          </Text>
          {showSuggestion && (
            <View style={styles.suggestionBadge}>
              <Text style={styles.suggestionText}>💡 Sugerencia</Text>
            </View>
          )}
        </View>
      </View>
      
      {targetUser.requestSent ? (
        <View style={styles.sentBadge}>
          <CustomIcons.Check size={14} color="#10B981" />
          <Text style={styles.sentText}>Enviado</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => handleSendFriendRequest(targetUser)}
          activeOpacity={0.8}
        >
          <CustomIcons.UserPlus size={18} color={COLORS.white} />
        </TouchableOpacity>
      )}
    </Animated.View>
  );

  const renderEmptySearch = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <CustomIcons.Search size={48} color="#D1D5DB" />
      </View>
      <Text style={styles.emptyTitle}>Sin resultados</Text>
      <Text style={styles.emptySubtitle}>
        No se encontraron usuarios con "{searchTerm}"
      </Text>
      <TouchableOpacity
        style={styles.clearButton}
        onPress={() => {
          setSearchTerm('');
          setSearchResults([]);
        }}
        activeOpacity={0.8}
      >
        <Text style={styles.clearButtonText}>Limpiar búsqueda</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSuggestions = () => {
    if (suggestions.length === 0) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <CustomIcons.User size={48} color="#D1D5DB" />
          </View>
          <Text style={styles.emptyTitle}>Sin sugerencias</Text>
          <Text style={styles.emptySubtitle}>
            Por ahora no hay sugerencias de amigos disponibles
          </Text>
        </View>
      );
    }
    
    return (
      <View style={styles.suggestionsSection}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIconWrapper}>
            <CustomIcons.Star size={16} color="#F59E0B" />
          </View>
          <Text style={styles.sectionTitle}>Sugerencias para ti</Text>
        </View>
        <FlatList
          data={suggestions}
          renderItem={({ item }) => renderUserItem({ item, showSuggestion: true })}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <CustomIcons.ArrowLeft size={22} color={COLORS.text} />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Buscar Amigos</Text>
          <Text style={styles.headerSubtitle}>
            {searchResults.length > 0 
              ? `${searchResults.length} resultado${searchResults.length > 1 ? 's' : ''}`
              : 'Email o nombre'
            }
          </Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchWrapper}>
          <CustomIcons.Search size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por email o nombre..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            onSubmitEditing={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            placeholderTextColor="#9CA3AF"
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchTerm('');
                setSearchResults([]);
              }}
              activeOpacity={0.7}
              style={styles.clearIcon}
            >
              <CustomIcons.X size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity
          style={[
            styles.searchButton, 
            (!searchTerm.trim() || loading) && styles.searchButtonDisabled
          ]}
          onPress={handleSearch}
          disabled={!searchTerm.trim() || loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <CustomIcons.Loading size={18} color={COLORS.white} />
          ) : (
            <CustomIcons.Search size={18} color={COLORS.white} />
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {searchResults.length > 0 ? (
          <View style={styles.resultsSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconWrapper}>
                <CustomIcons.User size={16} color={COLORS.primary} />
              </View>
              <Text style={styles.sectionTitle}>
                Resultados ({searchResults.length})
              </Text>
            </View>
            <FlatList
              data={searchResults}
              renderItem={renderUserItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContainer}
            />
          </View>
        ) : searchTerm.length > 0 && !loading ? (
          renderEmptySearch()
        ) : (
          renderSuggestions()
        )}
      </View>

      {/* Tips Card */}
      <View style={styles.tipsSection}>
        <View style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <View style={styles.tipsIconWrapper}>
              <CustomIcons.Info size={16} color={COLORS.primary} />
            </View>
            <Text style={styles.tipsTitle}>Consejos para buscar</Text>
          </View>
          <Text style={styles.tipsText}>
            • Busca por email exacto{'\n'}
            • También funciona con nombre completo{'\n'}
            • Invita amigos a registrarse en Tranki
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  
  // Search
  searchSection: {
    backgroundColor: COLORS.white,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A1A',
  },
  clearIcon: {
    padding: 4,
  },
  searchButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  searchButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  
  // Content
  content: {
    flex: 1,
    padding: 16,
  },
  
  // Section
  resultsSection: {
    flex: 1,
  },
  suggestionsSection: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EBF5FB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  listContainer: {
    flexGrow: 1,
  },
  
  // User Card
  userCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  userLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  userInitials: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  verifiedBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userEmail: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  suggestionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  suggestionText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '600',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  sentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  sentText: {
    fontSize: 12,
    color: '#065F46',
    fontWeight: '600',
  },
  
  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  clearButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  clearButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Tips
  tipsSection: {
    padding: 16,
  },
  tipsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  tipsIconWrapper: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EBF5FB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  tipsText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
  },
});

export default SearchFriendsScreen;