// src/screens/FriendsScreen.js - Rediseño moderno
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Platform,
  Animated,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { COLORS } from '../constants/colors';
import CustomIcons from '../components/CustomIcons';
import SocialService from '../services/SocialService';

const FriendsScreen = ({ navigation }) => {
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('friends');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
      loadData(currentUser.uid);
    }

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadData = async (userId) => {
    try {
      setLoading(true);
      const [friendsList, requestsList] = await Promise.all([
        SocialService.getFriends(userId),
        SocialService.getFriendRequests(userId)
      ]);
      
      setFriends(friendsList);
      setFriendRequests(requestsList);
    } catch (error) {
      console.error('Error loading friends data:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!user) return;
    
    setRefreshing(true);
    await loadData(user.uid);
    setRefreshing(false);
  };

  const handleAcceptRequest = async (request) => {
    try {
      await SocialService.acceptFriendRequest(
        request.id,
        request.fromUserId,
        user.uid
      );
      
      Alert.alert('¡Genial!', `Ahora eres amigo de ${request.fromUser.name}`);
      await loadData(user.uid);
    } catch (error) {
      Alert.alert('Error', 'No se pudo aceptar la solicitud');
    }
  };

  const handleDeclineRequest = async (requestId) => {
    try {
      await SocialService.declineFriendRequest(requestId);
      await loadData(user.uid);
    } catch (error) {
      Alert.alert('Error', 'No se pudo rechazar la solicitud');
    }
  };

  const handleRemoveFriend = (friend) => {
    Alert.alert(
      'Eliminar amigo',
      `¿Eliminar a ${friend.name} de tus amigos?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await SocialService.removeFriend(user.uid, friend.id);
              Alert.alert('Eliminado', 'Amigo eliminado correctamente');
              await loadData(user.uid);
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el amigo');
            }
          }
        }
      ]
    );
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

  const renderFriendItem = ({ item: friend }) => (
    <Animated.View style={[styles.friendCard, { opacity: fadeAnim }]}>
      <View style={styles.friendLeft}>
        <View style={[
          styles.friendAvatar,
          { backgroundColor: getAvatarColor(friend.name) }
        ]}>
          <Text style={styles.friendInitials}>
            {getInitials(friend.name)}
          </Text>
        </View>
        
        <View style={styles.friendInfo}>
          <View style={styles.friendNameRow}>
            <Text style={styles.friendName}>{friend.name}</Text>
            {friend.isOnline && (
              <View style={styles.onlineBadge}>
                <View style={styles.onlineDot} />
              </View>
            )}
          </View>
          <Text style={styles.friendEmail} numberOfLines={1}>
            {friend.email}
          </Text>
        </View>
      </View>
      
      <TouchableOpacity
        style={styles.friendAction}
        onPress={() => handleRemoveFriend(friend)}
        activeOpacity={0.7}
      >
        <CustomIcons.UserMinus size={18} color="#EF4444" />
      </TouchableOpacity>
    </Animated.View>
  );

  const renderRequestItem = ({ item: request }) => (
    <Animated.View style={[styles.requestCard, { opacity: fadeAnim }]}>
      <View style={styles.requestLeft}>
        <View style={[
          styles.friendAvatar,
          { backgroundColor: getAvatarColor(request.fromUser?.name) }
        ]}>
          <Text style={styles.friendInitials}>
            {getInitials(request.fromUser?.name)}
          </Text>
        </View>
        
        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>
            {request.fromUser?.name || 'Usuario'}
          </Text>
          <Text style={styles.friendEmail} numberOfLines={1}>
            {request.fromUser?.email}
          </Text>
          <Text style={styles.requestTime}>
            {new Date(request.createdAt?.seconds * 1000).toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'short'
            })}
          </Text>
        </View>
      </View>
      
      <View style={styles.requestActions}>
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => handleAcceptRequest(request)}
          activeOpacity={0.8}
        >
          <CustomIcons.Check size={16} color={COLORS.white} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.declineButton}
          onPress={() => handleDeclineRequest(request.id)}
          activeOpacity={0.8}
        >
          <CustomIcons.X size={16} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <CustomIcons.User size={48} color="#D1D5DB" />
      </View>
      
      <Text style={styles.emptyTitle}>
        {activeTab === 'friends' 
          ? 'No tienes amigos aún' 
          : 'No tienes solicitudes'
        }
      </Text>
      
      <Text style={styles.emptySubtitle}>
        {activeTab === 'friends'
          ? 'Conecta con amigos para compartir tu estado emocional'
          : 'Las solicitudes de amistad aparecerán aquí'
        }
      </Text>
      
      {activeTab === 'friends' && (
        <TouchableOpacity
          style={styles.addFriendButton}
          onPress={() => navigation.navigate('SearchFriends')}
          activeOpacity={0.8}
        >
          <CustomIcons.UserPlus size={18} color={COLORS.white} />
          <Text style={styles.addFriendText}>Buscar amigos</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <View style={styles.loadingCircle}>
            <CustomIcons.User size={32} color={COLORS.white} />
          </View>
          <Text style={styles.loadingText}>Cargando amigos...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
          <Text style={styles.headerTitle}>Mis Amigos</Text>
          <Text style={styles.headerSubtitle}>
            {friends.length} amigos conectados
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('SearchFriends')}
          activeOpacity={0.7}
        >
          <CustomIcons.UserPlus size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
          onPress={() => setActiveTab('friends')}
          activeOpacity={0.8}
        >
          <CustomIcons.User size={18} color={activeTab === 'friends' ? COLORS.primary : '#9CA3AF'} />
          <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
            Amigos
          </Text>
          {friends.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{friends.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
          onPress={() => setActiveTab('requests')}
          activeOpacity={0.8}
        >
          <CustomIcons.Bell size={18} color={activeTab === 'requests' ? COLORS.primary : '#9CA3AF'} />
          <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
            Solicitudes
          </Text>
          {friendRequests.length > 0 && (
            <View style={[styles.tabBadge, styles.tabBadgeAlert]}>
              <Text style={styles.tabBadgeText}>{friendRequests.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      <FlatList
        data={activeTab === 'friends' ? friends : friendRequests}
        renderItem={activeTab === 'friends' ? renderFriendItem : renderRequestItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={renderEmptyState}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EBF5FB',
  },
  
  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    position: 'relative',
  },
  activeTab: {
    backgroundColor: '#EBF5FB',
  },
  tabText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  tabBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  tabBadgeAlert: {
    backgroundColor: '#EF4444',
  },
  tabBadgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
  },
  
  // List
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  
  // Friend Card
  friendCard: {
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
  friendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  friendAvatar: {
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
  friendInitials: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
  },
  friendInfo: {
    flex: 1,
  },
  friendNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  friendName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  onlineBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  friendEmail: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  friendAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
  },
  
  // Request Card
  requestCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#EBF5FB',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  requestLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  requestTime: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  declineButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
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
    marginBottom: 32,
  },
  addFriendButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  addFriendText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
});

export default FriendsScreen;