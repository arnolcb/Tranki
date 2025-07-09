// src/screens/FriendsScreen.js - Pantalla de gestión de amigos
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
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { COLORS, Theme } from '../constants/colors';
import CustomIcons from '../components/CustomIcons';
import SocialService from '../services/SocialService';

const FriendsScreen = ({ navigation }) => {
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('friends'); // 'friends' | 'requests'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    StatusBar.setBarStyle('dark-content');
    StatusBar.setBackgroundColor(COLORS.white);
    
    const currentUser = auth().currentUser;
    setUser(currentUser);
    
    if (currentUser) {
      loadData(currentUser.uid);
    }
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
      Alert.alert('❌ Error', 'No se pudieron cargar los datos de amigos');
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
      
      Alert.alert('✅ ¡Genial!', `Ahora eres amigo de ${request.fromUser.name}`);
      await loadData(user.uid);
    } catch (error) {
      Alert.alert('❌ Error', 'No se pudo aceptar la solicitud');
    }
  };

  const handleDeclineRequest = async (requestId) => {
    try {
      await SocialService.declineFriendRequest(requestId);
      await loadData(user.uid);
    } catch (error) {
      Alert.alert('❌ Error', 'No se pudo rechazar la solicitud');
    }
  };

  const handleRemoveFriend = (friend) => {
    Alert.alert(
      '🚫 Eliminar amigo',
      `¿Estás seguro que quieres eliminar a ${friend.name} de tus amigos?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await SocialService.removeFriend(user.uid, friend.id);
              Alert.alert('✅ Eliminado', 'Amigo eliminado correctamente');
              await loadData(user.uid);
            } catch (error) {
              Alert.alert('❌ Error', 'No se pudo eliminar el amigo');
            }
          }
        }
      ]
    );
  };

  const renderFriendItem = ({ item: friend }) => (
    <View style={styles.friendCard}>
      <View style={styles.friendInfo}>
        <View style={styles.friendAvatar}>
          <Text style={styles.friendInitials}>
            {friend.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.friendDetails}>
          <Text style={styles.friendName}>{friend.name}</Text>
          <Text style={styles.friendEmail}>{friend.email}</Text>
          <View style={styles.friendStatus}>
            <View style={[
              styles.statusDot, 
              { backgroundColor: friend.isOnline ? COLORS.success : COLORS.gray400 }
            ]} />
            <Text style={styles.statusText}>
              {friend.isOnline ? 'En línea' : 'Desconectado'}
            </Text>
          </View>
        </View>
      </View>
      
      <TouchableOpacity
        style={styles.friendAction}
        onPress={() => handleRemoveFriend(friend)}
        activeOpacity={0.8}
      >
        <CustomIcons.UserMinus size={16} color={COLORS.error} />
      </TouchableOpacity>
    </View>
  );

  const renderRequestItem = ({ item: request }) => (
    <View style={styles.requestCard}>
      <View style={styles.friendInfo}>
        <View style={styles.friendAvatar}>
          <Text style={styles.friendInitials}>
            {request.fromUser?.name?.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
        <View style={styles.friendDetails}>
          <Text style={styles.friendName}>{request.fromUser?.name || 'Usuario'}</Text>
          <Text style={styles.friendEmail}>{request.fromUser?.email}</Text>
          <Text style={styles.requestTime}>
            {new Date(request.createdAt?.seconds * 1000).toLocaleDateString()}
          </Text>
        </View>
      </View>
      
      <View style={styles.requestActions}>
        <TouchableOpacity
          style={[styles.requestButton, styles.acceptButton]}
          onPress={() => handleAcceptRequest(request)}
          activeOpacity={0.8}
        >
          <CustomIcons.Check size={14} color={COLORS.white} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.requestButton, styles.declineButton]}
          onPress={() => handleDeclineRequest(request.id)}
          activeOpacity={0.8}
        >
          <CustomIcons.X size={14} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>
        {activeTab === 'friends' ? '👥' : '📬'}
      </Text>
      <Text style={styles.emptyTitle}>
        {activeTab === 'friends' 
          ? 'No tienes amigos aún' 
          : 'No tienes solicitudes'
        }
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === 'friends'
          ? 'Agrega amigos para compartir tu estado emocional'
          : 'Las solicitudes de amistad aparecerán aquí'
        }
      </Text>
      
      {activeTab === 'friends' && (
        <TouchableOpacity
          style={styles.addFriendButton}
          onPress={() => navigation.navigate('SearchFriends')}
          activeOpacity={0.8}
        >
          <CustomIcons.Plus size={16} color={COLORS.white} />
          <Text style={styles.addFriendText}>Agregar amigo</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando amigos...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
          <Text style={styles.headerTitle}>Amigos</Text>
          <Text style={styles.headerSubtitle}>
            {friends.length} amigos • {friendRequests.length} solicitudes
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('SearchFriends')}
          activeOpacity={0.7}
        >
          <CustomIcons.Plus size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
          onPress={() => setActiveTab('friends')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
            Amigos ({friends.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
          onPress={() => setActiveTab('requests')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
            Solicitudes ({friendRequests.length})
          </Text>
          {friendRequests.length > 0 && (
            <View style={styles.requestsBadge}>
              <Text style={styles.requestsBadgeText}>{friendRequests.length}</Text>
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
    backgroundColor: COLORS.background,
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: Theme.typography.body,
    color: COLORS.textSecondary,
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
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.blue50,
  },
  
  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  tab: {
    flex: 1,
    paddingVertical: Theme.spacing.lg,
    alignItems: 'center',
    position: 'relative',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: Theme.typography.body,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  requestsBadge: {
    position: 'absolute',
    top: 8,
    right: 40,
    backgroundColor: COLORS.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestsBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '600',
  },
  
  // List
  listContainer: {
    padding: Theme.spacing.lg,
    flexGrow: 1,
  },
  
  // Friend Card
  friendCard: {
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
  requestCard: {
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
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  friendAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  friendInitials: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
  },
  friendDetails: {
    flex: 1,
  },
  friendName: {
    fontSize: Theme.typography.h5,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  friendEmail: {
    fontSize: Theme.typography.caption,
    color: COLORS.textMuted,
    marginBottom: Theme.spacing.xs,
  },
  friendStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: Theme.typography.small,
    color: COLORS.textSecondary,
  },
  requestTime: {
    fontSize: Theme.typography.small,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  friendAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.errorSoft,
  },
  
  // Request Actions
  requestActions: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
  },
  requestButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: COLORS.success,
  },
  declineButton: {
    backgroundColor: COLORS.error,
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
    marginBottom: Theme.spacing.xl,
  },
  addFriendButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.xl,
    borderRadius: Theme.borderRadius.medium,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...Theme.shadows.blue,
  },
  addFriendText: {
    color: COLORS.white,
    fontSize: Theme.typography.body,
    fontWeight: '600',
  },
});

export default FriendsScreen;