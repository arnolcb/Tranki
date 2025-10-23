// src/screens/ProfileScreen.js - Rediseño limpio y optimizado
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
  Animated,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { COLORS } from '../constants/colors';
import CustomIcons from '../components/CustomIcons';
import AvatarPicker from '../components/AvatarPicker';
import FirebaseService from '../services/firebase';
import SocialService from '../services/SocialService';

const ProfileScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [stats, setStats] = useState({ totalDays: 0, avgMood: 0, streak: 0 });
  const [socialStats, setSocialStats] = useState({ 
    friendsCount: 0, 
    sharedStatesCount: 0, 
    receivedLikesCount: 0 
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'social', 'settings'
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
      loadUserData(currentUser.uid);
      loadUserStats(currentUser.uid);
      loadSocialStats(currentUser.uid);
    }

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadUserData = async (userId) => {
    try {
      const profile = await FirebaseService.getUserProfile(userId);
      setUserData(profile);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserStats = async (userId) => {
    try {
      const [history, insights] = await Promise.all([
        FirebaseService.getEmotionHistory(userId, 30),
        FirebaseService.getEmotionInsights(userId, 7)
      ]);

      const totalDays = history.length;
      const avgMood = history.length > 0 
        ? (history.reduce((sum, record) => sum + record.value, 0) / history.length)
        : 0;

      // Calcular racha
      const sortedHistory = history.sort((a, b) => new Date(b.date) - new Date(a.date));
      let streak = 0;
      const today = new Date();
      
      for (let i = 0; i < sortedHistory.length; i++) {
        const recordDate = new Date(sortedHistory[i].date);
        const expectedDate = new Date(today);
        expectedDate.setDate(today.getDate() - i);
        
        if (recordDate.toDateString() === expectedDate.toDateString()) {
          streak++;
        } else {
          break;
        }
      }

      setStats({
        totalDays,
        avgMood: avgMood.toFixed(1),
        streak,
        insights
      });
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const loadSocialStats = async (userId) => {
    try {
      const socialData = await SocialService.getUserSocialStats(userId);
      setSocialStats(socialData);
    } catch (error) {
      console.error('Error loading social stats:', error);
    }
  };

  const handleImageUpdate = async (imageData) => {
    try {
      if (!user?.uid) return;
      await SocialService.updateProfilePicture(user.uid, imageData);
      setUserData(prev => ({ ...prev, profilePicture: imageData }));
    } catch (error) {
      console.error('Error actualizando foto:', error);
      Alert.alert('Error', 'No se pudo actualizar la foto de perfil');
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro que quieres salir?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Salir',
          style: 'destructive',
          onPress: () => auth().signOut()
        }
      ]
    );
  };

  const handleShareEmotion = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const todayEmotions = await FirebaseService.getTodayEmotions(user.uid, today);
      
      if (todayEmotions.length === 0) {
        Alert.alert(
          'Sin registro',
          'Primero registra tu estado emocional del día.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Registrar', onPress: () => navigation.navigate('EmotionSelector') }
          ]
        );
        return;
      }

      const latestEmotion = todayEmotions[todayEmotions.length - 1];
      
      Alert.alert(
        'Compartir estado',
        `¿Compartir que te sientes ${latestEmotion.emotion}?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Compartir',
            onPress: async () => {
              try {
                await SocialService.shareEmotionalState(user.uid, {
                  emotion: latestEmotion.emotion,
                  value: latestEmotion.value,
                  message: `Me siento ${latestEmotion.emotion} hoy`
                });
                
                Alert.alert('✓ Compartido', 'Estado compartido con tus amigos');
                loadSocialStats(user.uid);
              } catch (error) {
                Alert.alert('Error', 'No se pudo compartir');
              }
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'No se pudo obtener tu estado');
    }
  };

  const getMoodIcon = (avgMood) => {
    const mood = parseFloat(avgMood);
    if (mood >= 2.5) return '😊';
    if (mood >= 2.0) return '😐';
    return '😰';
  };

  const getMoodColor = (avgMood) => {
    const mood = parseFloat(avgMood);
    if (mood >= 2.5) return '#10B981';
    if (mood >= 2.0) return '#F59E0B';
    return '#EF4444';
  };

  const userForAvatar = {
    id: user?.uid,
    name: userData?.name || user?.displayName || 'Usuario',
    email: user?.email,
    role: userData?.role,
    profilePicture: userData?.profilePicture,
    isOnline: true,
    isVerified: userData?.isVerified || false
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <View style={styles.loadingCircle}>
            <CustomIcons.User size={32} color={COLORS.white} />
          </View>
          <Text style={styles.loadingText}>Cargando perfil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderOverviewTab = () => (
    <Animated.View style={{ opacity: fadeAnim }}>
      {/* Stats compactos */}
      <View style={styles.statsSection}>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalDays}</Text>
            <Text style={styles.statLabel}>Días</Text>
          </View>
          
          <View style={[styles.statCard, styles.statCardHighlight]}>
            <Text style={[styles.statNumber, { color: getMoodColor(stats.avgMood) }]}>
              {getMoodIcon(stats.avgMood)}
            </Text>
            <Text style={styles.statLabel}>Estado</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#F59E0B' }]}>{stats.streak}</Text>
            <Text style={styles.statLabel}>Racha</Text>
          </View>
        </View>
      </View>

      {/* Navegación rápida */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Acceso rápido</Text>
        
        <View style={styles.quickGrid}>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => navigation.navigate('History')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIcon, { backgroundColor: '#EBF5FB' }]}>
              <CustomIcons.BarChart size={22} color={COLORS.primary} />
            </View>
            <Text style={styles.quickLabel}>Historial</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => navigation.navigate('Chat', { emotion: null })}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIcon, { backgroundColor: '#D1FAE5' }]}>
              <CustomIcons.MessageCircle size={22} color="#10B981" />
            </View>
            <Text style={styles.quickLabel}>Chat IA</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => navigation.navigate('Places')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIcon, { backgroundColor: '#FEF3C7' }]}>
              <CustomIcons.MapPin size={22} color="#F59E0B" />
            </View>
            <Text style={styles.quickLabel}>Lugares</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => navigation.navigate('Schedule')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIcon, { backgroundColor: '#FEE2E2' }]}>
              <CustomIcons.Calendar size={22} color="#EF4444" />
            </View>
            <Text style={styles.quickLabel}>Agenda</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Badges si existen */}
      {(stats.streak >= 7 || stats.totalDays >= 30 || socialStats.friendsCount >= 5) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Logros</Text>
          <View style={styles.badgesGrid}>
            {stats.streak >= 7 && (
              <View style={styles.badgeCard}>
                <Text style={styles.badgeEmoji}>🔥</Text>
                <Text style={styles.badgeLabel}>Constante</Text>
              </View>
            )}
            {stats.totalDays >= 30 && (
              <View style={styles.badgeCard}>
                <Text style={styles.badgeEmoji}>⭐</Text>
                <Text style={styles.badgeLabel}>Veterano</Text>
              </View>
            )}
            {socialStats.friendsCount >= 5 && (
              <View style={styles.badgeCard}>
                <Text style={styles.badgeEmoji}>👥</Text>
                <Text style={styles.badgeLabel}>Social</Text>
              </View>
            )}
          </View>
        </View>
      )}
    </Animated.View>
  );

  const renderSocialTab = () => (
    <Animated.View style={{ opacity: fadeAnim }}>
      {/* Stats sociales destacados */}
      <View style={styles.socialStatsSection}>
        <View style={styles.socialStatsGrid}>
          <TouchableOpacity 
            style={styles.socialStatCard}
            onPress={() => navigation.navigate('Friends')}
            activeOpacity={0.8}
          >
            <Text style={styles.socialStatNumber}>{socialStats.friendsCount}</Text>
            <Text style={styles.socialStatLabel}>Amigos</Text>
            <CustomIcons.ChevronRight size={14} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.socialStatCard}>
            <Text style={styles.socialStatNumber}>{socialStats.sharedStatesCount}</Text>
            <Text style={styles.socialStatLabel}>Compartidos</Text>
          </View>

          <View style={styles.socialStatCard}>
            <Text style={styles.socialStatNumber}>{socialStats.receivedLikesCount}</Text>
            <Text style={styles.socialStatLabel}>Likes</Text>
          </View>
        </View>
      </View>

      {/* Acciones sociales */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Friends')}
          activeOpacity={0.8}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#EBF5FB' }]}>
            <CustomIcons.User size={20} color={COLORS.primary} />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Mis amigos</Text>
            <Text style={styles.actionSubtitle}>
              {socialStats.friendsCount} amigos conectados
            </Text>
          </View>
          <CustomIcons.ChevronRight size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('SocialFeed')}
          activeOpacity={0.8}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#D1FAE5' }]}>
            <CustomIcons.Heart size={20} color="#10B981" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Feed social</Text>
            <Text style={styles.actionSubtitle}>Ver estados de amigos</Text>
          </View>
          <CustomIcons.ChevronRight size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={handleShareEmotion}
          activeOpacity={0.8}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#FEF3C7' }]}>
            <CustomIcons.Share size={20} color="#F59E0B" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Compartir estado</Text>
            <Text style={styles.actionSubtitle}>Comparte cómo te sientes</Text>
          </View>
          <CustomIcons.ChevronRight size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('SearchFriends')}
          activeOpacity={0.8}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#FEE2E2' }]}>
            <CustomIcons.UserPlus size={20} color="#EF4444" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Agregar amigos</Text>
            <Text style={styles.actionSubtitle}>Buscar nuevos contactos</Text>
          </View>
          <CustomIcons.ChevronRight size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderSettingsTab = () => (
    <Animated.View style={{ opacity: fadeAnim }}>
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => Alert.alert('Notificaciones', 'Próximamente')}
          activeOpacity={0.8}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#EBF5FB' }]}>
            <CustomIcons.Bell size={20} color={COLORS.primary} />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Notificaciones</Text>
            <Text style={styles.actionSubtitle}>Recordatorios y alertas</Text>
          </View>
          <CustomIcons.ChevronRight size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => Alert.alert('Privacidad', 'Próximamente')}
          activeOpacity={0.8}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#FEF3C7' }]}>
            <CustomIcons.Shield size={20} color="#F59E0B" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Privacidad</Text>
            <Text style={styles.actionSubtitle}>Control de datos</Text>
          </View>
          <CustomIcons.ChevronRight size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => Alert.alert('Ayuda', 'Próximamente')}
          activeOpacity={0.8}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#E0E7FF' }]}>
            <CustomIcons.HelpCircle size={20} color="#6366F1" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Ayuda y soporte</Text>
            <Text style={styles.actionSubtitle}>Centro de ayuda</Text>
          </View>
          <CustomIcons.ChevronRight size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View style={styles.section}>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Versión</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Cuenta desde</Text>
            <Text style={styles.infoValue}>
              {user?.metadata?.creationTime 
                ? new Date(user.metadata.creationTime).toLocaleDateString('es-ES', {
                    month: 'short',
                    year: 'numeric'
                  })
                : 'Reciente'
              }
            </Text>
          </View>
        </View>
      </View>

      {/* Sign out */}
      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.signOutButton} 
          onPress={handleSignOut}
          activeOpacity={0.8}
        >
          <CustomIcons.LogOut size={18} color={COLORS.white} />
          <Text style={styles.signOutButtonText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Header con foto */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <AvatarPicker
            user={userForAvatar}
            onImageUpdate={handleImageUpdate}
            size={80}
            editable={true}
            showName={false}
          />
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>{userForAvatar.name}</Text>
            <Text style={styles.headerEmail}>{user?.email}</Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
          onPress={() => setActiveTab('overview')}
          activeOpacity={0.8}
        >
          <CustomIcons.Home size={18} color={activeTab === 'overview' ? COLORS.primary : '#9CA3AF'} />
          <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
            General
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'social' && styles.tabActive]}
          onPress={() => setActiveTab('social')}
          activeOpacity={0.8}
        >
          <CustomIcons.User size={18} color={activeTab === 'social' ? COLORS.primary : '#9CA3AF'} />
          <Text style={[styles.tabText, activeTab === 'social' && styles.tabTextActive]}>
            Social
          </Text>
          {socialStats.friendsCount > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{socialStats.friendsCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'settings' && styles.tabActive]}
          onPress={() => setActiveTab('settings')}
          activeOpacity={0.8}
        >
          <CustomIcons.Settings size={18} color={activeTab === 'settings' ? COLORS.primary : '#9CA3AF'} />
          <Text style={[styles.tabText, activeTab === 'settings' && styles.tabTextActive]}>
            Ajustes
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'social' && renderSocialTab()}
        {activeTab === 'settings' && renderSettingsTab()}
      </ScrollView>
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
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  headerEmail: {
    fontSize: 13,
    color: '#6B7280',
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
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 6,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  tabActive: {
    backgroundColor: '#EBF5FB',
  },
  tabText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  tabBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
  },
  
  // Content
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  
  // Section
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  // Stats
  statsSection: {
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statCardHighlight: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  
  // Quick grid
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickCard: {
    width: '48%',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quickIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickLabel: {
    fontSize: 13,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  
  // Badges
  badgesGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  badgeCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  badgeEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  badgeLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  
  // Social stats
  socialStatsSection: {
    marginBottom: 24,
  },
  socialStatsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  socialStatCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  socialStatNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  socialStatLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  
  // Action card
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  
  // Info card
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  
  // Sign out
  signOutButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  signOutButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
});

export default ProfileScreen;