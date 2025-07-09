// src/screens/ProfileScreen.js - FUNCIONES SOCIALES FUNCIONANDO
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
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { COLORS, Theme, getEmotionColor, getEmotionIcon } from '../constants/colors';
import CustomIcons from '../components/CustomIcons';
import AvatarPicker from '../components/AvatarPicker';
import FirebaseService from '../services/firebase';
import SocialService from '../services/SocialService';

const ProfileScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [stats, setStats] = useState({ totalDays: 0, avgMood: 0, streak: 0 });
  const [socialStats, setSocialStats] = useState({ friendsCount: 0, sharedStatesCount: 0, receivedLikesCount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    StatusBar.setBarStyle('dark-content');
    StatusBar.setBackgroundColor(COLORS.white);
    
    const currentUser = auth().currentUser;
    setUser(currentUser);
    if (currentUser) {
      loadUserData(currentUser.uid);
      loadUserStats(currentUser.uid);
      loadSocialStats(currentUser.uid);
    }
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

      // Calcular racha actual
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
      setStats({
        totalDays: 0,
        avgMood: 0,
        streak: 0
      });
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

  // Manejar actualización de foto de perfil
  const handleImageUpdate = async (imageData) => {
    try {
      if (!user?.uid) return;

      // Actualizar en Firestore
      await SocialService.updateProfilePicture(user.uid, imageData);
      
      // Actualizar estado local
      setUserData(prev => ({
        ...prev,
        profilePicture: imageData
      }));
      
      console.log('✅ Foto de perfil actualizada en el estado');
    } catch (error) {
      console.error('Error actualizando foto en Firestore:', error);
      Alert.alert(
        '⚠️ Advertencia',
        'La foto se subió pero hubo un problema actualizando tu perfil. Intenta reiniciar la app.',
        [{ text: 'Entendido' }]
      );
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      '🚪 Cerrar sesión',
      '¿Estás seguro que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: () => auth().signOut()
        }
      ]
    );
  };

  const handleExportData = async () => {
    try {
      Alert.alert(
        '📤 Exportar datos',
        'Preparando tus datos para exportar...',
        [{ text: 'Entendido' }]
      );
      
      const exportData = await FirebaseService.exportUserData(user.uid);
      console.log('Data exported:', exportData);
      
      Alert.alert(
        '✅ Datos preparados',
        'Tus datos han sido preparados. Esta función se completará pronto.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('❌ Error', 'No se pudieron exportar los datos');
    }
  };

  // ========== FUNCIONES SOCIALES FUNCIONANDO ==========
  
  const handleFriendsScreen = () => {
    navigation.navigate('Friends');
  };

  const handleSocialFeed = () => {
    navigation.navigate('SocialFeed');
  };

  const handleAddFriend = () => {
    Alert.alert(
      '👥 Agregar amigo',
      'Ingresa el email del amigo que quieres agregar:',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Buscar',
          onPress: () => {
            // Por ahora navegamos a la pantalla de buscar amigos
            navigation.navigate('SearchFriends');
          }
        }
      ]
    );
  };

  const handleShareEmotion = async () => {
    try {
      // Obtener la emoción más reciente del usuario
      const today = new Date().toISOString().split('T')[0];
      const todayEmotions = await FirebaseService.getTodayEmotions(user.uid, today);
      
      if (todayEmotions.length === 0) {
        Alert.alert(
          '📱 Compartir estado',
          'Primero registra tu estado emocional del día para poder compartirlo.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Registrar estado', onPress: () => navigation.navigate('EmotionSelector') }
          ]
        );
        return;
      }

      const latestEmotion = todayEmotions[todayEmotions.length - 1];
      
      Alert.alert(
        '📱 Compartir estado emocional',
        `¿Quieres compartir que te sientes ${latestEmotion.emotion} con tus amigos?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Compartir',
            onPress: async () => {
              try {
                await SocialService.shareEmotionalState(user.uid, {
                  emotion: latestEmotion.emotion,
                  value: latestEmotion.value,
                  message: `Me siento ${latestEmotion.emotion} hoy 😊`
                });
                
                Alert.alert('✅ Compartido', 'Tu estado emocional ha sido compartido con tus amigos');
                
                // Recargar estadísticas sociales
                loadSocialStats(user.uid);
              } catch (error) {
                Alert.alert('❌ Error', 'No se pudo compartir tu estado');
              }
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('❌ Error', 'No se pudo obtener tu estado emocional');
    }
  };

  const handleActionPress = (action, title) => {
    const actions = {
      notifications: () => Alert.alert('🔔 Notificaciones', 'Configuración de notificaciones próximamente disponible'),
      goals: () => Alert.alert('🎯 Metas', 'Función de metas personales próximamente disponible'),
      export: handleExportData,
      help: () => Alert.alert('❓ Ayuda', 'Centro de ayuda próximamente disponible'),
      privacy: () => Alert.alert('🔒 Privacidad', 'Configuración de privacidad próximamente disponible'),
      theme: () => Alert.alert('🎨 Tema', 'Configuración de tema próximamente disponible'),
      
      // FUNCIONES SOCIALES QUE SÍ FUNCIONAN
      friends: handleFriendsScreen,
      social: handleSocialFeed,
      addFriend: handleAddFriend,
      shareEmotion: handleShareEmotion,
    };

    const actionFunction = actions[action];
    if (actionFunction) {
      actionFunction();
    } else {
      Alert.alert(title, `Función ${title.toLowerCase()} próximamente disponible`);
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
    if (mood >= 2.5) return COLORS.success;
    if (mood >= 2.0) return COLORS.warning;
    return COLORS.error;
  };

  const getStreakMessage = () => {
    if (stats.streak === 0) return 'Empieza tu racha hoy';
    if (stats.streak === 1) return '¡Buen comienzo!';
    if (stats.streak <= 7) return '¡Vas muy bien!';
    if (stats.streak <= 30) return '¡Increíble constancia!';
    return '¡Eres un campeón!';
  };

  // Preparar datos del usuario para el AvatarPicker
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
          <CustomIcons.User size={48} color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando perfil...</Text>
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
          <Text style={styles.headerTitle}>Mi Perfil</Text>
          <Text style={styles.headerSubtitle}>Información personal y estadísticas</Text>
        </View>
        <TouchableOpacity 
          style={styles.headerAction}
          onPress={() => handleActionPress('export', 'Exportar datos')}
        >
          <CustomIcons.Download size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Perfil principal con foto de perfil */}
        <View style={styles.profileSection}>
          <View style={styles.profileCard}>
            <AvatarPicker
              user={userForAvatar}
              onImageUpdate={handleImageUpdate}
              size={120}
              editable={true}
              showName={true}
            />

            {/* Badges de logros */}
            <View style={styles.badgesSection}>
              {stats.streak >= 7 && (
                <View style={[styles.badge, { backgroundColor: COLORS.successSoft }]}>
                  <Text style={styles.badgeEmoji}>🔥</Text>
                  <Text style={[styles.badgeText, { color: COLORS.success }]}>Constante</Text>
                </View>
              )}
              
              {stats.totalDays >= 30 && (
                <View style={[styles.badge, { backgroundColor: COLORS.blue50 }]}>
                  <Text style={styles.badgeEmoji}>⭐</Text>
                  <Text style={[styles.badgeText, { color: COLORS.primary }]}>Veterano</Text>
                </View>
              )}
              
              {parseFloat(stats.avgMood) >= 2.5 && (
                <View style={[styles.badge, { backgroundColor: COLORS.warningSoft }]}>
                  <Text style={styles.badgeEmoji}>😊</Text>
                  <Text style={[styles.badgeText, { color: COLORS.warning }]}>Positivo</Text>
                </View>
              )}

              {socialStats.friendsCount >= 5 && (
                <View style={[styles.badge, { backgroundColor: COLORS.errorSoft }]}>
                  <Text style={styles.badgeEmoji}>👥</Text>
                  <Text style={[styles.badgeText, { color: COLORS.error }]}>Social</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Estadísticas mejoradas con datos sociales */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📊 Estadísticas</Text>
            <TouchableOpacity
              style={styles.viewMoreButton}
              onPress={() => navigation.navigate('History')}
              activeOpacity={0.8}
            >
              <Text style={styles.viewMoreText}>Ver más</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Text style={styles.statIcon}>📅</Text>
              </View>
              <Text style={styles.statNumber}>{stats.totalDays}</Text>
              <Text style={styles.statLabel}>Días registrados</Text>
            </View>
            
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: getMoodColor(stats.avgMood) + '20' }]}>
                <Text style={styles.statIcon}>{getMoodIcon(stats.avgMood)}</Text>
              </View>
              <Text style={[styles.statNumber, { color: getMoodColor(stats.avgMood) }]}>
                {stats.avgMood}
              </Text>
              <Text style={styles.statLabel}>Estado promedio</Text>
            </View>
            
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: COLORS.warning + '20' }]}>
                <Text style={styles.statIcon}>🔥</Text>
              </View>
              <Text style={[styles.statNumber, { color: COLORS.warning }]}>
                {stats.streak}
              </Text>
              <Text style={styles.statLabel}>Racha actual</Text>
            </View>
          </View>

          {/* Estadísticas sociales */}
          <View style={styles.socialStatsGrid}>
            <View style={styles.socialStatCard}>
              <Text style={styles.socialStatNumber}>{socialStats.friendsCount}</Text>
              <Text style={styles.socialStatLabel}>Amigos</Text>
            </View>
            <View style={styles.socialStatCard}>
              <Text style={styles.socialStatNumber}>{socialStats.sharedStatesCount}</Text>
              <Text style={styles.socialStatLabel}>Estados compartidos</Text>
            </View>
            <View style={styles.socialStatCard}>
              <Text style={styles.socialStatNumber}>{socialStats.receivedLikesCount}</Text>
              <Text style={styles.socialStatLabel}>Likes recibidos</Text>
            </View>
          </View>

          {/* Mensaje motivacional */}
          <View style={styles.motivationCard}>
            <Text style={styles.motivationText}>{getStreakMessage()}</Text>
            {stats.insights?.overallTrend && (
              <Text style={styles.trendText}>
                Tendencia: {stats.insights.overallTrend === 'improving' ? '📈 Mejorando' : 
                          stats.insights.overallTrend === 'declining' ? '📉 Cuidándote' : '➡️ Estable'}
              </Text>
            )}
          </View>
        </View>

        {/* Navegación rápida actualizada con funciones sociales */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚀 Navegación rápida</Text>
          
          <View style={styles.quickNavGrid}>
            <TouchableOpacity
              style={styles.quickNavItem}
              onPress={() => navigation.navigate('Chat', { emotion: { id: 'neutral', label: 'Neutral' } })}
              activeOpacity={0.8}
            >
              <View style={[styles.quickNavIcon, { backgroundColor: COLORS.blue50 }]}>
                <CustomIcons.Chat size={16} color={COLORS.primary} />
              </View>
              <Text style={styles.quickNavText}>Chat IA</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickNavItem}
              onPress={() => handleActionPress('friends', 'Amigos')}
              activeOpacity={0.8}
            >
              <View style={[styles.quickNavIcon, { backgroundColor: COLORS.successSoft }]}>
                <CustomIcons.User size={16} color={COLORS.success} />
              </View>
              <Text style={styles.quickNavText}>Amigos</Text>
              {socialStats.friendsCount > 0 && (
                <View style={styles.quickNavBadge}>
                  <Text style={styles.quickNavBadgeText}>{socialStats.friendsCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickNavItem}
              onPress={() => navigation.navigate('Places')}
              activeOpacity={0.8}
            >
              <View style={[styles.quickNavIcon, { backgroundColor: COLORS.warningSoft }]}>
                <CustomIcons.MapPin size={16} color={COLORS.warning} />
              </View>
              <Text style={styles.quickNavText}>Lugares</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickNavItem}
              onPress={() => navigation.navigate('History')}
              activeOpacity={0.8}
            >
              <View style={[styles.quickNavIcon, { backgroundColor: COLORS.errorSoft }]}>
                <CustomIcons.BarChart size={16} color={COLORS.error} />
              </View>
              <Text style={styles.quickNavText}>Historial</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Nueva sección: Funciones sociales FUNCIONANDO */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👥 Social</Text>
          
          <View style={styles.menuContainer}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleActionPress('friends', 'Mis amigos')}
              activeOpacity={0.8}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIcon, { backgroundColor: COLORS.blue50 }]}>
                  <CustomIcons.User size={16} color={COLORS.primary} />
                </View>
                <View style={styles.menuItemInfo}>
                  <Text style={styles.menuItemTitle}>Mis amigos</Text>
                  <Text style={styles.menuItemSubtitle}>
                    {socialStats.friendsCount} amigos conectados
                  </Text>
                </View>
              </View>
              <View style={styles.menuItemRight}>
                {socialStats.friendsCount > 0 && (
                  <View style={styles.menuBadge}>
                    <Text style={styles.menuBadgeText}>{socialStats.friendsCount}</Text>
                  </View>
                )}
                <CustomIcons.ChevronRight size={16} color={COLORS.textMuted} />
              </View>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleActionPress('social', 'Feed social')}
              activeOpacity={0.8}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIcon, { backgroundColor: COLORS.successSoft }]}>
                  <CustomIcons.Heart size={16} color={COLORS.success} />
                </View>
                <View style={styles.menuItemInfo}>
                  <Text style={styles.menuItemTitle}>Feed social</Text>
                  <Text style={styles.menuItemSubtitle}>Estados de tus amigos</Text>
                </View>
              </View>
              <CustomIcons.ChevronRight size={16} color={COLORS.textMuted} />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleActionPress('shareEmotion', 'Compartir estado')}
              activeOpacity={0.8}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIcon, { backgroundColor: COLORS.warningSoft }]}>
                  <CustomIcons.Share size={16} color={COLORS.warning} />
                </View>
                <View style={styles.menuItemInfo}>
                  <Text style={styles.menuItemTitle}>Compartir estado</Text>
                  <Text style={styles.menuItemSubtitle}>
                    {socialStats.sharedStatesCount} estados compartidos
                  </Text>
                </View>
              </View>
              <CustomIcons.ChevronRight size={16} color={COLORS.textMuted} />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleActionPress('addFriend', 'Agregar amigo')}
              activeOpacity={0.8}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIcon, { backgroundColor: COLORS.errorSoft }]}>
                  <CustomIcons.Plus size={16} color={COLORS.error} />
                </View>
                <View style={styles.menuItemInfo}>
                  <Text style={styles.menuItemTitle}>Agregar amigo</Text>
                  <Text style={styles.menuItemSubtitle}>Buscar y agregar nuevos amigos</Text>
                </View>
              </View>
              <CustomIcons.ChevronRight size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Configuración expandida */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ Configuración</Text>
          
          <View style={styles.menuContainer}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleActionPress('notifications', 'Notificaciones')}
              activeOpacity={0.8}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIcon, { backgroundColor: COLORS.blue50 }]}>
                  <CustomIcons.Bell size={16} color={COLORS.primary} />
                </View>
                <View style={styles.menuItemInfo}>
                  <Text style={styles.menuItemTitle}>Notificaciones</Text>
                  <Text style={styles.menuItemSubtitle}>Recordatorios y alertas</Text>
                </View>
              </View>
              <CustomIcons.ChevronRight size={16} color={COLORS.textMuted} />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleActionPress('goals', 'Metas personales')}
              activeOpacity={0.8}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIcon, { backgroundColor: COLORS.successSoft }]}>
                  <CustomIcons.Target size={16} color={COLORS.success} />
                </View>
                <View style={styles.menuItemInfo}>
                  <Text style={styles.menuItemTitle}>Metas personales</Text>
                  <Text style={styles.menuItemSubtitle}>Objetivos y seguimiento</Text>
                </View>
              </View>
              <CustomIcons.ChevronRight size={16} color={COLORS.textMuted} />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleActionPress('privacy', 'Privacidad')}
              activeOpacity={0.8}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIcon, { backgroundColor: COLORS.warningSoft }]}>
                  <CustomIcons.Shield size={16} color={COLORS.warning} />
                </View>
                <View style={styles.menuItemInfo}>
                  <Text style={styles.menuItemTitle}>Privacidad y datos</Text>
                  <Text style={styles.menuItemSubtitle}>Control de información</Text>
                </View>
              </View>
              <CustomIcons.ChevronRight size={16} color={COLORS.textMuted} />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleActionPress('help', 'Ayuda y soporte')}
              activeOpacity={0.8}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIcon, { backgroundColor: COLORS.gray100 }]}>
                  <CustomIcons.HelpCircle size={16} color={COLORS.textSecondary} />
                </View>
                <View style={styles.menuItemInfo}>
                  <Text style={styles.menuItemTitle}>Ayuda y soporte</Text>
                  <Text style={styles.menuItemSubtitle}>Centro de ayuda</Text>
                </View>
              </View>
              <CustomIcons.ChevronRight size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Información adicional */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📱 Información de la app</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Versión</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Cuenta creada</Text>
              <Text style={styles.infoValue}>
                {user?.metadata?.creationTime 
                  ? new Date(user.metadata.creationTime).toLocaleDateString('es-ES')
                  : 'Recientemente'
                }
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>ID de usuario</Text>
              <Text style={[styles.infoValue, styles.infoValueSmall]}>
                {user?.uid?.substring(0, 8)}...
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Fotos de perfil</Text>
              <Text style={styles.infoValue}>
                {userForAvatar.profilePicture ? 'Configurada' : 'Sin configurar'}
              </Text>
            </View>
          </View>
        </View>

        {/* Botón cerrar sesión */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.signOutButton} 
            onPress={handleSignOut}
            activeOpacity={0.8}
          >
            <CustomIcons.LogOut size={16} color={COLORS.white} />
            <Text style={styles.signOutButtonText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Tranki v1.0.0</Text>
          <Text style={styles.footerSubtext}>Hecho con cuidado para tu bienestar</Text>
          <Text style={styles.footerNote}>
            Tus datos están seguros y se almacenan de forma privada
          </Text>
        </View>
      </ScrollView>
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
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Theme.spacing.md,
    fontSize: Theme.typography.body,
    color: COLORS.textSecondary,
    fontWeight: '500',
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
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
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
  headerAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray50,
  },
  
  // Sections
  section: {
    marginHorizontal: Theme.spacing.xl,
    marginBottom: Theme.spacing.xxxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: Theme.typography.h4,
    fontWeight: '600',
    color: COLORS.text,
  },
  viewMoreButton: {
    backgroundColor: COLORS.blue50,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.medium,
  },
  viewMoreText: {
    fontSize: Theme.typography.caption,
    color: COLORS.primary,
    fontWeight: '500',
  },
  
  // Profile
  profileSection: {
    marginHorizontal: Theme.spacing.xl,
    marginBottom: Theme.spacing.xxxl,
  },
  profileCard: {
    backgroundColor: COLORS.white,
    borderRadius: Theme.borderRadius.large,
    padding: Theme.spacing.xxxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Theme.shadows.small,
  },
  
  // Badges
  badgesSection: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: Theme.spacing.lg,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.full,
    gap: 4,
  },
  badgeEmoji: {
    fontSize: 12,
  },
  badgeText: {
    fontSize: Theme.typography.small,
    fontWeight: '600',
  },
  
  // Stats
  statsGrid: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.large,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Theme.shadows.small,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.blue50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  statIcon: {
    fontSize: 18,
  },
  statNumber: {
    fontSize: Theme.typography.h3,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: Theme.spacing.xs,
  },
  statLabel: {
    fontSize: Theme.typography.small,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },

  // Social Stats
  socialStatsGrid: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
  },
  socialStatCard: {
    flex: 1,
    backgroundColor: COLORS.blue50,
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.medium,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.blue200,
  },
  socialStatNumber: {
    fontSize: Theme.typography.h4,
    fontWeight: '700',
    color: COLORS.blue600,
    marginBottom: 4,
  },
  socialStatLabel: {
    fontSize: Theme.typography.small,
    color: COLORS.blue600,
    textAlign: 'center',
  },
  
  // Motivation card
  motivationCard: {
    backgroundColor: COLORS.white,
    padding: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.large,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    ...Theme.shadows.small,
  },
  motivationText: {
    fontSize: Theme.typography.h5,
    fontWeight: '600',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: Theme.spacing.sm,
  },
  trendText: {
    fontSize: Theme.typography.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  
  // Quick Navigation
  quickNavGrid: {
    flexDirection: 'row',
    gap: Theme.spacing.lg,
  },
  quickNavItem: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.large,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Theme.shadows.small,
    position: 'relative',
  },
  quickNavIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  quickNavText: {
    fontSize: Theme.typography.caption,
    color: COLORS.text,
    fontWeight: '600',
  },
  quickNavBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickNavBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '600',
  },
  
  // Menu
  menuContainer: {
    backgroundColor: COLORS.white,
    borderRadius: Theme.borderRadius.large,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Theme.shadows.small,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Theme.spacing.lg,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.lg,
  },
  menuItemInfo: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: Theme.typography.body,
    color: COLORS.text,
    fontWeight: '500',
    marginBottom: Theme.spacing.xs,
  },
  menuItemSubtitle: {
    fontSize: Theme.typography.small,
    color: COLORS.textMuted,
  },
  menuDivider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginHorizontal: Theme.spacing.lg,
  },
  menuBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
  },
  menuBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '600',
  },
  
  // Info card
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: Theme.borderRadius.large,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Theme.shadows.small,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  infoLabel: {
    fontSize: Theme.typography.body,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: Theme.typography.body,
    color: COLORS.text,
    fontWeight: '600',
  },
  infoValueSmall: {
    fontSize: Theme.typography.caption,
    fontFamily: 'monospace',
  },
  
  // Sign out
  signOutButton: {
    backgroundColor: COLORS.error,
    paddingVertical: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.xl,
    borderRadius: Theme.borderRadius.medium,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    ...Theme.shadows.small,
  },
  signOutButtonText: {
    color: COLORS.white,
    fontSize: Theme.typography.h5,
    fontWeight: '600',
  },
  
  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.xxxl,
    paddingHorizontal: Theme.spacing.xl,
  },
  footerText: {
    fontSize: Theme.typography.caption,
    color: COLORS.textMuted,
    fontWeight: '500',
    marginBottom: Theme.spacing.xs,
  },
  footerSubtext: {
    fontSize: Theme.typography.small,
    color: COLORS.textMuted,
    marginBottom: Theme.spacing.sm,
  },
  footerNote: {
    fontSize: Theme.typography.small,
    color: COLORS.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default ProfileScreen;