// src/screens/SearchFriendsScreen.js - Buscar y agregar amigos
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
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { COLORS, Theme } from '../constants/colors';
import CustomIcons from '../components/CustomIcons';
import SocialService from '../services/SocialService';

const SearchFriendsScreen = ({ navigation }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    StatusBar.setBarStyle('dark-content');
    StatusBar.setBackgroundColor(COLORS.white);
    
    const currentUser = auth().currentUser;
    setUser(currentUser);
    
    if (currentUser) {
      loadSuggestions(currentUser.uid);
    }
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
          '🔍 Sin resultados', 
          'No se encontraron usuarios con ese email o nombre.'
        );
      }
    } catch (error) {
      Alert.alert('❌ Error', 'Error al buscar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleSendFriendRequest = async (targetUser) => {
    try {
      // Verificar estado de amistad primero
      const friendshipStatus = await SocialService.checkFriendshipStatus(user.uid, targetUser.id);
      
      if (friendshipStatus.status === 'friends') {
        Alert.alert('👥 Ya son amigos', 'Ya eres amigo de esta persona');
        return;
      }
      
      if (friendshipStatus.status === 'pending') {
        Alert.alert(
          '⏳ Solicitud pendiente', 
          friendshipStatus.direction === 'sent' 
            ? 'Ya enviaste una solicitud a esta persona'
            : 'Esta persona ya te envió una solicitud. Revisa tus solicitudes pendientes.'
        );
        return;
      }
      
      await SocialService.sendFriendRequest(user.uid, targetUser.id);
      
      Alert.alert(
        '✅ Solicitud enviada',
        `Se envió la solicitud de amistad a ${targetUser.name}`
      );
      
      // Actualizar resultados para mostrar el estado
      setSearchResults(prev => 
        prev.map(u => 
          u.id === targetUser.id 
            ? { ...u, requestSent: true }
            : u
        )
      );
      
    } catch (error) {
      Alert.alert('❌ Error', error.message || 'No se pudo enviar la solicitud');
    }
  };

  const renderUserItem = ({ item: user, showSuggestion = false }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <View style={styles.userAvatar}>
          <Text style={styles.userInitials}>
            {user.name?.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
        <View style={styles.userDetails}>
          <Text style={styles.userName}>{user.name || 'Usuario'}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          {showSuggestion && (
            <Text style={styles.suggestionText}>Sugerencia</Text>
          )}
          {user.requestSent && (
            <Text style={styles.requestSentText}>✅ Solicitud enviada</Text>
          )}
        </View>
      </View>
      
      {!user.requestSent && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => handleSendFriendRequest(user)}
          activeOpacity={0.8}
        >
          <CustomIcons.Plus size={16} color={COLORS.white} />
          <Text style={styles.addButtonText}>Agregar</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderEmptySearch = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🔍</Text>
      <Text style={styles.emptyTitle}>Busca amigos</Text>
      <Text style={styles.emptySubtitle}>
        Ingresa el email o nombre de la persona que quieres agregar como amigo
      </Text>
    </View>
  );

  const renderSuggestions = () => {
    if (suggestions.length === 0) return null;
    
    return (
      <View style={styles.suggestionsSection}>
        <Text style={styles.sectionTitle}>💡 Sugerencias para ti</Text>
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
          <Text style={styles.headerTitle}>Agregar amigos</Text>
          <Text style={styles.headerSubtitle}>Busca por email o nombre</Text>
        </View>
      </View>

      {/* Search Section */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <CustomIcons.Search size={20} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por email o nombre..."
              value={searchTerm}
              onChangeText={setSearchTerm}
              onSubmitEditing={handleSearch}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchTerm('');
                  setSearchResults([]);
                }}
                activeOpacity={0.7}
              >
                <CustomIcons.X size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          
          <TouchableOpacity
            style={[styles.searchButton, (!searchTerm.trim() || loading) && styles.searchButtonDisabled]}
            onPress={handleSearch}
            disabled={!searchTerm.trim() || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <Text style={styles.searchButtonText}>...</Text>
            ) : (
              <CustomIcons.Search size={16} color={COLORS.white} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {searchResults.length > 0 ? (
          <View style={styles.resultsSection}>
            <Text style={styles.sectionTitle}>
              🎯 Resultados ({searchResults.length})
            </Text>
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

      {/* Help Section */}
      <View style={styles.helpSection}>
        <View style={styles.helpCard}>
          <Text style={styles.helpTitle}>💡 Consejos para encontrar amigos</Text>
          <Text style={styles.helpText}>
            • Busca por email exacto para mejores resultados{'\n'}
            • También puedes buscar por nombre completo{'\n'}
            • Pide a tus amigos que se registren en Tranki
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    ...Theme.shadows.small,
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
  
  // Search
  searchSection: {
    backgroundColor: COLORS.white,
    padding: Theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  searchContainer: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray50,
    borderRadius: Theme.borderRadius.medium,
    paddingHorizontal: Theme.spacing.md,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Theme.spacing.md,
    fontSize: Theme.typography.body,
    color: COLORS.text,
  },
  searchButton: {
    backgroundColor: COLORS.primary,
    width: 48,
    height: 48,
    borderRadius: Theme.borderRadius.medium,
    justifyContent: 'center',
    alignItems: 'center',
    ...Theme.shadows.blue,
  },
  searchButtonDisabled: {
    backgroundColor: COLORS.gray400,
    ...Theme.shadows.none,
  },
  searchButtonText: {
    color: COLORS.white,
    fontSize: Theme.typography.body,
    fontWeight: '600',
  },
  
  // Content
  content: {
    flex: 1,
    padding: Theme.spacing.lg,
  },
  
  // Sections
  sectionTitle: {
    fontSize: Theme.typography.h5,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: Theme.spacing.lg,
  },
  
  // Results
  resultsSection: {
    flex: 1,
  },
  suggestionsSection: {
    flex: 1,
  },
  listContainer: {
    flexGrow: 1,
  },
  
  // User Card
  userCard: {
    backgroundColor: COLORS.white,
    borderRadius: Theme.borderRadius.large,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Theme.shadows.small,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  userInitials: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: Theme.typography.h5,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: Theme.typography.caption,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  suggestionText: {
    fontSize: Theme.typography.small,
    color: COLORS.warning,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  requestSentText: {
    fontSize: Theme.typography.small,
    color: COLORS.success,
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.borderRadius.medium,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: Theme.typography.caption,
    fontWeight: '600',
  },
  
  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: Theme.spacing.lg,
  },
  emptyTitle: {
    fontSize: Theme.typography.h3,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: Theme.spacing.sm,
  },
  emptySubtitle: {
    fontSize: Theme.typography.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Help Section
  helpSection: {
    padding: Theme.spacing.lg,
  },
  helpCard: {
    backgroundColor: COLORS.blue50,
    padding: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.large,
    borderWidth: 1,
    borderColor: COLORS.blue200,
  },
  helpTitle: {
    fontSize: Theme.typography.body,
    fontWeight: '600',
    color: COLORS.blue600,
    marginBottom: Theme.spacing.sm,
  },
  helpText: {
    fontSize: Theme.typography.caption,
    color: COLORS.blue600,
    lineHeight: 16,
  },
});

export default SearchFriendsScreen;