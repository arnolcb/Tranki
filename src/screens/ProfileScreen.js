// src/screens/ProfileScreen.js - Modern One-Page Design (Fixed for TabBar)
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StatusBar,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { COLORS } from '../constants/colors';
import CustomIcons from '../components/CustomIcons';
import AvatarPicker from '../components/AvatarPicker';
import FirebaseService from '../services/firebase';
import SocialService from '../services/SocialService';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

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

  // Animaciones
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('#2C3E50');
      StatusBar.setTranslucent(false);
    }
    
    const currentUser = auth().currentUser;
    setUser(currentUser);
    if (currentUser) {
      loadUserData(currentUser.uid);
      loadUserStats(currentUser.uid);
      loadSocialStats(currentUser.uid);
    }

    // Animación de entrada
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
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

  const getMoodIcon = (avgMood) => {
    const mood = parseFloat(avgMood);
    if (mood >= 2.5) return CustomIcons.Happy;
    if (mood >= 2.0) return CustomIcons.Neutral;
    return CustomIcons.Sad;
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

  const MoodIcon = getMoodIcon(stats.avgMood);
  const moodColor = getMoodColor(stats.avgMood);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2C3E50" />
      
      {/* Header con gradiente */}
      <View style={styles.headerGradient}>
        <Animated.View 
          style={[
            styles.headerContent,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <AvatarPicker
            user={userForAvatar}
            onImageUpdate={handleImageUpdate}
            size={90}
            editable={true}
            showName={false}
          />
          <Text style={styles.userName}>{userForAvatar.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </Animated.View>
      </View>

      {/* Stats Cards */}
      <Animated.View 
        style={[
          styles.statsContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIconCircle, { backgroundColor: '#EBF5FB' }]}>
              <CustomIcons.TrendingUp size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.statNumber}>{stats.totalDays}</Text>
            <Text style={styles.statLabel}>Días</Text>
          </View>

          <View style={[styles.statCard, styles.statCardHighlight]}>
            <View style={[styles.statIconCircle, { backgroundColor: moodColor + '20' }]}>
              <MoodIcon size={28} color={moodColor} />
            </View>
            <Text style={[styles.statNumber, { color: moodColor }]}>
              {stats.avgMood}
            </Text>
            <Text style={styles.statLabel}>Estado</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconCircle, { backgroundColor: '#FEF3C7' }]}>
              <CustomIcons.Fire size={24} color="#F59E0B" />
            </View>
            <Text style={[styles.statNumber, { color: '#F59E0B' }]}>{stats.streak}</Text>
            <Text style={styles.statLabel}>Racha</Text>
          </View>
        </View>

        {/* Social Stats Mini */}
        <View style={styles.socialMiniStats}>
          <View style={styles.socialMiniItem}>
            <CustomIcons.User size={14} color="#507F93" />
            <Text style={styles.socialMiniText}>{socialStats.friendsCount} amigos</Text>
          </View>
          <View style={styles.socialMiniDivider} />
          <View style={styles.socialMiniItem}>
            <CustomIcons.Heart size={14} color="#507F93" />
            <Text style={styles.socialMiniText}>{socialStats.receivedLikesCount} likes</Text>
          </View>
        </View>
      </Animated.View>

      {/* Quick Actions Grid - MÁS COMPACTO */}
      <Animated.View 
        style={[
          styles.actionsContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('History')}
          activeOpacity={0.8}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#EBF5FB' }]}>
            <CustomIcons.BarChart size={20} color={COLORS.primary} />
          </View>
          <Text style={styles.actionLabel}>Historial</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Friends')}
          activeOpacity={0.8}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#D1FAE5' }]}>
            <CustomIcons.User size={20} color="#10B981" />
          </View>
          <Text style={styles.actionLabel}>Amigos</Text>
          {socialStats.friendsCount > 0 && (
            <View style={styles.actionBadge}>
              <Text style={styles.actionBadgeText}>{socialStats.friendsCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Chat', { emotion: null })}
          activeOpacity={0.8}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#FEF3C7' }]}>
            <CustomIcons.MessageCircle size={20} color="#F59E0B" />
          </View>
          <Text style={styles.actionLabel}>Chat IA</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => Alert.alert('Configuración', 'Próximamente')}
          activeOpacity={0.8}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#E0E7FF' }]}>
            <CustomIcons.Settings size={20} color="#6366F1" />
          </View>
          <Text style={styles.actionLabel}>Ajustes</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Bottom Actions - AJUSTADO PARA TAB BAR */}
      <Animated.View 
        style={[
          styles.bottomActions,
          {
            opacity: fadeAnim,
          }
        ]}
      >
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('SocialFeed')}
          activeOpacity={0.8}
        >
          <CustomIcons.Share size={16} color="#507F93" />
          <Text style={styles.secondaryButtonText}>Ver feed</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.signOutButton} 
          onPress={handleSignOut}
          activeOpacity={0.8}
        >
          <CustomIcons.LogOut size={16} color={COLORS.white} />
          <Text style={styles.signOutButtonText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F8',
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    backgroundColor: '#2C3E50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#507F93',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '500',
    opacity: 0.8,
  },
  
  // Header - MÁS COMPACTO
  headerGradient: {
    backgroundColor: '#2C3E50',
    paddingTop: Platform.OS === 'ios' ? 20 : 50,
    paddingBottom: 30,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 12,
    letterSpacing: 0.3,
  },
  userEmail: {
    fontSize: 13,
    color: '#FFFFFF',
    opacity: 0.7,
    marginTop: 4,
  },
  
  // Stats Container - MÁS COMPACTO
  statsContainer: {
    marginTop: -20,
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
  },
  statCardHighlight: {
    transform: [{ scale: 1.05 }],
  },
  statIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  
  // Social Mini Stats
  socialMiniStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  socialMiniItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  socialMiniText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  socialMiniDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  
  // Actions Container - MÁS COMPACTO
  actionsContainer: {
    marginTop: 16,
    marginHorizontal: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionButton: {
    width: (SCREEN_WIDTH - 50) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    position: 'relative',
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 13,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  actionBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  actionBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  
  // Bottom Actions - AJUSTADO PARA NO CHOCAR CON TAB BAR
  bottomActions: {
    position: 'absolute',
    bottom: 120, // Espacio suficiente para el tab bar (70px) + margin (20px) + extra (30px)
    left: 20,
    right: 20,
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#507F93',
  },
  secondaryButtonText: {
    color: '#507F93',
    fontSize: 13,
    fontWeight: '600',
  },
  signOutButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  signOutButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});

export default ProfileScreen;