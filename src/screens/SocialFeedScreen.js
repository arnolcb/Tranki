// src/screens/SocialFeedScreen.js - Feed social para ver estados de amigos
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Alert,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { COLORS, Theme, getEmotionColor, getEmotionIcon, getEmotionBackground } from '../constants/colors';
import CustomIcons from '../components/CustomIcons';
import SocialService from '../services/SocialService';

const SocialFeedScreen = ({ navigation }) => {
  const [feedItems, setFeedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    StatusBar.setBarStyle('dark-content');
    StatusBar.setBackgroundColor(COLORS.white);
    
    const currentUser = auth().currentUser;
    setUser(currentUser);
    
    if (currentUser) {
      loadFeed(currentUser.uid);
    }
  }, []);

  const loadFeed = async (userId) => {
    try {
      setLoading(true);
      const feed = await SocialService.getSocialFeed(userId);
      setFeedItems(feed);
    } catch (error) {
      console.error('Error loading social feed:', error);
      Alert.alert('❌ Error', 'No se pudo cargar el feed social');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!user) return;
    
    setRefreshing(true);
    await loadFeed(user.uid);
    setRefreshing(false);
  };

  const handleLike = async (feedItem) => {
    try {
      await SocialService.likeSharedState(feedItem.id, user.uid);
      
      // Actualizar estado local
      setFeedItems(prev => 
        prev.map(item => 
          item.id === feedItem.id 
            ? {
                ...item,
                isLiked: !item.isLiked,
                likesCount: item.isLiked ? item.likesCount - 1 : item.likesCount + 1
              }
            : item
        )
      );
    } catch (error) {
      Alert.alert('❌ Error', 'No se pudo dar like');
    }
  };

  const handleComment = (feedItem) => {
    Alert.alert(
      '💬 Comentarios',
      'La función de comentarios estará disponible pronto.',
      [{ text: 'Entendido' }]
    );
  };

  const getRelativeTime = (timestamp) => {
    const now = new Date();
    const itemTime = new Date(timestamp);
    const diffMs = now.getTime() - itemTime.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 1) return 'Ahora';
    if (diffMinutes < 60) return `${diffMinutes}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    
    return itemTime.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  const renderFeedItem = ({ item }) => (
    <View style={styles.feedCard}>
      {/* Header del post */}
      <View style={styles.feedHeader}>
        <View style={styles.userInfo}>
          <View style={styles.userAvatar}>
            <Text style={styles.userInitials}>
              {item.user?.name?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>
              {item.user?.name || 'Usuario'}
            </Text>
            <Text style={styles.feedTime}>
              {getRelativeTime(item.timestamp)}
            </Text>
          </View>
        </View>
        
        <View style={[styles.emotionBadge, { backgroundColor: getEmotionBackground(item.emotion) }]}>
          <Text style={styles.emotionIcon}>{getEmotionIcon(item.emotion)}</Text>
        </View>
      </View>
      
      {/* Contenido del estado emocional */}
      <View style={styles.feedContent}>
        <Text style={styles.emotionText}>
          Se siente <Text style={[styles.emotionLabel, { color: getEmotionColor(item.emotion) }]}>
            {item.emotion}
          </Text>
        </Text>
        
        {item.message && item.message.trim() && (
          <Text style={styles.feedMessage}>{item.message}</Text>
        )}
      </View>
      
      {/* Acciones (like, comentar) */}
      <View style={styles.feedActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleLike(item)}
          activeOpacity={0.8}
        >
          <CustomIcons.Heart 
            size={18} 
            color={item.isLiked ? COLORS.error : COLORS.textMuted}
            fill={item.isLiked ? COLORS.error : 'none'}
          />
          <Text style={[styles.actionText, item.isLiked && { color: COLORS.error }]}>
            {item.likesCount || 0}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleComment(item)}
          activeOpacity={0.8}
        >
          <CustomIcons.MessageCircle size={18} color={COLORS.textMuted} />
          <Text style={styles.actionText}>{item.commentsCount || 0}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => Alert.alert('📱 Compartir', 'Función próximamente disponible')}
          activeOpacity={0.8}
        >
          <CustomIcons.Share size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyFeed = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>📱</Text>
      <Text style={styles.emptyTitle}>No hay publicaciones</Text>
      <Text style={styles.emptySubtitle}>
        Cuando tus amigos compartan su estado emocional, aparecerán aquí.
        {'\n\n'}¡Sé el primero en compartir cómo te sientes!
      </Text>
      
      <TouchableOpacity
        style={styles.shareButton}
        onPress={() => navigation.navigate('EmotionSelector')}
        activeOpacity={0.8}
      >
        <CustomIcons.Plus size={16} color={COLORS.white} />
        <Text style={styles.shareButtonText}>Compartir mi estado</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando feed social...</Text>
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
          <Text style={styles.headerTitle}>Feed Social</Text>
          <Text style={styles.headerSubtitle}>Estados de tus amigos</Text>
        </View>
        
        <TouchableOpacity
          style={styles.shareHeaderButton}
          onPress={() => navigation.navigate('EmotionSelector')}
          activeOpacity={0.7}
        >
          <CustomIcons.Plus size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Feed List */}
      <FlatList
        data={feedItems}
        renderItem={renderFeedItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.feedContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={renderEmptyFeed}
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
  shareHeaderButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.blue50,
  },
  
  // Feed
  feedContainer: {
    padding: Theme.spacing.lg,
    flexGrow: 1,
  },
  feedCard: {
    backgroundColor: COLORS.white,
    borderRadius: Theme.borderRadius.large,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Theme.shadows.small,
  },
  
  // Feed Header
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.md,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  userInitials: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: Theme.typography.body,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  feedTime: {
    fontSize: Theme.typography.small,
    color: COLORS.textMuted,
  },
  emotionBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emotionIcon: {
    fontSize: 18,
  },
  
  // Feed Content
  feedContent: {
    marginBottom: Theme.spacing.lg,
  },
  emotionText: {
    fontSize: Theme.typography.body,
    color: COLORS.text,
    marginBottom: Theme.spacing.sm,
  },
  emotionLabel: {
    fontWeight: '600',
  },
  feedMessage: {
    fontSize: Theme.typography.body,
    color: COLORS.textSecondary,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  
  // Feed Actions
  feedActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xl,
    paddingTop: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: Theme.typography.caption,
    color: COLORS.textMuted,
    fontWeight: '500',
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
  shareButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.xl,
    borderRadius: Theme.borderRadius.medium,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...Theme.shadows.blue,
  },
  shareButtonText: {
    color: COLORS.white,
    fontSize: Theme.typography.body,
    fontWeight: '600',
  },
});

export default SocialFeedScreen;