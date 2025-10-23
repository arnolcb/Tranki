// src/screens/SocialFeedScreen.js - Rediseño moderno tipo Instagram
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
  Platform,
  Animated,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { COLORS } from '../constants/colors';
import CustomIcons from '../components/CustomIcons';
import SocialService from '../services/SocialService';

const SocialFeedScreen = ({ navigation }) => {
  const [feedItems, setFeedItems] = useState([]);
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
      loadFeed(currentUser.uid);
    }

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadFeed = async (userId) => {
    try {
      setLoading(true);
      const feed = await SocialService.getSocialFeed(userId);
      setFeedItems(feed);
    } catch (error) {
      console.error('Error loading social feed:', error);
      Alert.alert('Error', 'No se pudo cargar el feed');
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
      // Animación optimista
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

      await SocialService.likeSharedState(feedItem.id, user.uid);
    } catch (error) {
      // Revertir si falla
      setFeedItems(prev => 
        prev.map(item => 
          item.id === feedItem.id 
            ? {
                ...item,
                isLiked: feedItem.isLiked,
                likesCount: feedItem.likesCount
              }
            : item
        )
      );
      Alert.alert('Error', 'No se pudo dar like');
    }
  };

  const handleComment = (feedItem) => {
    Alert.alert(
      'Comentarios',
      'Función próximamente disponible.',
      [{ text: 'OK' }]
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
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `${diffDays}d`;
    
    return itemTime.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'short' 
    });
  };

  const getEmotionData = (emotion) => {
    const emotions = {
      stressed: { label: 'Estresado', color: '#EF4444', bg: '#FEE2E2', emoji: '😰' },
      neutral: { label: 'Neutral', color: '#F59E0B', bg: '#FEF3C7', emoji: '😐' },
      tranki: { label: 'Tranki', color: '#10B981', bg: '#D1FAE5', emoji: '😊' },
    };
    return emotions[emotion] || emotions.neutral;
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

  const renderFeedItem = ({ item }) => {
    const emotionData = getEmotionData(item.emotion);
    
    return (
      <Animated.View style={[styles.feedCard, { opacity: fadeAnim }]}>
        {/* Header del post */}
        <View style={styles.feedHeader}>
          <View style={styles.userSection}>
            <View style={[
              styles.userAvatar,
              { backgroundColor: getAvatarColor(item.user?.name) }
            ]}>
              <Text style={styles.userInitials}>
                {getInitials(item.user?.name)}
              </Text>
            </View>
            
            <View style={styles.userInfo}>
              <View style={styles.userNameRow}>
                <Text style={styles.userName}>
                  {item.user?.name || 'Usuario'}
                </Text>
                {item.user?.isVerified && (
                  <View style={styles.verifiedBadge}>
                    <CustomIcons.Check size={10} color={COLORS.white} />
                  </View>
                )}
              </View>
              <Text style={styles.feedTime}>
                {getRelativeTime(item.timestamp)}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.moreButton} activeOpacity={0.7}>
            <CustomIcons.Menu size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
        
        {/* Emotion Badge destacado */}
        <View style={[styles.emotionCard, { backgroundColor: emotionData.bg }]}>
          <View style={styles.emotionLeft}>
            <Text style={styles.emotionEmoji}>{emotionData.emoji}</Text>
            <View>
              <Text style={styles.emotionStatus}>Se siente</Text>
              <Text style={[styles.emotionLabel, { color: emotionData.color }]}>
                {emotionData.label}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Mensaje si existe */}
        {item.message && item.message.trim() && (
          <Text style={styles.feedMessage}>"{item.message}"</Text>
        )}
        
        {/* Acciones */}
        <View style={styles.feedActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleLike(item)}
            activeOpacity={0.7}
          >
            <CustomIcons.Heart 
              size={22} 
              color={item.isLiked ? '#EF4444' : '#6B7280'}
              fill={item.isLiked ? '#EF4444' : 'none'}
            />
            {item.likesCount > 0 && (
              <Text style={[styles.actionCount, item.isLiked && styles.actionCountActive]}>
                {item.likesCount}
              </Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleComment(item)}
            activeOpacity={0.7}
          >
            <CustomIcons.MessageCircle size={22} color="#6B7280" />
            {item.commentsCount > 0 && (
              <Text style={styles.actionCount}>{item.commentsCount}</Text>
            )}
          </TouchableOpacity>
          
          <View style={styles.actionSpacer} />
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => Alert.alert('Compartir', 'Próximamente')}
            activeOpacity={0.7}
          >
            <CustomIcons.Share size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  const renderEmptyFeed = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <CustomIcons.Heart size={48} color="#D1D5DB" />
      </View>
      
      <Text style={styles.emptyTitle}>Tu feed está vacío</Text>
      <Text style={styles.emptySubtitle}>
        Cuando tus amigos compartan su estado emocional, aparecerán aquí.
        {'\n\n'}
        ¡Sé el primero en compartir!
      </Text>
      
      <TouchableOpacity
        style={styles.shareButton}
        onPress={() => navigation.navigate('Main', { screen: 'EmotionSelector' })}
        activeOpacity={0.8}
      >
        <CustomIcons.Plus size={18} color={COLORS.white} />
        <Text style={styles.shareButtonText}>Compartir mi estado</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <View style={styles.loadingCircle}>
            <CustomIcons.Heart size={32} color={COLORS.white} />
          </View>
          <Text style={styles.loadingText}>Cargando feed...</Text>
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
          <Text style={styles.headerTitle}>Feed Social</Text>
          <Text style={styles.headerSubtitle}>
            {feedItems.length} {feedItems.length === 1 ? 'publicación' : 'publicaciones'}
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.addButton}
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
            tintColor={COLORS.primary}
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
  
  // Feed
  feedContainer: {
    padding: 16,
    paddingBottom: 100,
    flexGrow: 1,
  },
  feedCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  
  // Feed Header
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    fontSize: 16,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    gap: 6,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
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
  feedTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  moreButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Emotion Card
  emotionCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  emotionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emotionEmoji: {
    fontSize: 36,
  },
  emotionStatus: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  emotionLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  
  // Feed Message
  feedMessage: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  
  // Feed Actions
  feedActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionCount: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  actionCountActive: {
    color: '#EF4444',
  },
  actionSpacer: {
    flex: 1,
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
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  shareButton: {
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
  shareButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
});

export default SocialFeedScreen;