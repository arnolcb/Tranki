// src/screens/EmotionSelectorScreen.js - Múltiples registros por día (CORREGIDO)
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
  SafeAreaView,
  ScrollView,
  Animated,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { EMOTIONS } from '../constants/emotions';
import { COLORS, Theme, getEmotionColor, getEmotionBackground, getEmotionIcon } from '../constants/colors';
import { formatDate } from '../utils/dateUtils';
import FirebaseService from '../services/firebase';
import CustomIcons from '../components/CustomIcons';

// Convertir EMOTIONS para compatibilidad
const EMOTIONS_ARRAY = [EMOTIONS.STRESSED, EMOTIONS.NEUTRAL, EMOTIONS.TRANKI];

const EmotionSelectorScreen = ({ navigation }) => {
  const [selectedEmotion, setSelectedEmotion] = useState(null);
  const [todayEmotions, setTodayEmotions] = useState([]);
  const [currentEmotion, setCurrentEmotion] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    StatusBar.setBarStyle('dark-content');
    StatusBar.setBackgroundColor(COLORS.white);
    
    const currentUser = auth().currentUser;
    setUser(currentUser);
    if (currentUser) {
      loadTodayEmotions(currentUser.uid);
    }

    // Animación de entrada
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadTodayEmotions = async (userId) => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const today = formatDate(new Date());
      const todayRecords = await FirebaseService.getTodayEmotions(userId, today);
      
      setTodayEmotions(todayRecords || []);
      
      if (todayRecords && todayRecords.length > 0) {
        // Obtener la emoción más reciente
        const latestEmotion = todayRecords[todayRecords.length - 1];
        const emotion = EMOTIONS_ARRAY.find(e => e.id === latestEmotion.emotion);
        setCurrentEmotion(emotion);
      }
    } catch (error) {
      console.error('Error loading today emotions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmotionSelect = (emotion) => {
    setSelectedEmotion(emotion);
  };

  const handleSaveEmotion = async () => {
    if (!selectedEmotion || !user) return;

    try {
      // Guardar nueva emoción
      await FirebaseService.saveEmotion(user.uid, selectedEmotion);
      
      // Recargar emociones del día
      await loadTodayEmotions(user.uid);
      
      Alert.alert(
        '✅ Registrado',
        `Has registrado que te sientes ${selectedEmotion.label.toLowerCase()}.`,
        [
          {
            text: 'Hablar con asistente',
            onPress: () => navigation.navigate('Chat', { emotion: selectedEmotion })
          },
          { text: 'Continuar', style: 'cancel' }
        ]
      );
      
      setSelectedEmotion(null);
    } catch (error) {
      Alert.alert('❌ Error', 'No se pudo guardar tu estado emocional');
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const getCurrentDate = () => {
    const today = new Date();
    return today.toLocaleDateString('es-ES', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'mañana';
    if (hour < 18) return 'tarde';
    return 'noche';
  };

  const calculateDayAverage = () => {
    if (todayEmotions.length === 0) return null;
    
    const total = todayEmotions.reduce((sum, record) => sum + record.value, 0);
    return total / todayEmotions.length;
  };

  const getEmotionHistory = () => {
    return todayEmotions.map(record => {
      const emotion = EMOTIONS_ARRAY.find(e => e.id === record.emotion);
      return {
        ...record,
        emotionData: emotion,
        timeString: new Date(record.timestamp).toLocaleTimeString('es-ES', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      };
    });
  };

  const renderEmotionHistory = () => {
    const history = getEmotionHistory();
    
    if (history.length === 0) return null;

    return (
      <View style={styles.historySection}>
        <Text style={styles.historyTitle}>📊 Registro de hoy ({history.length})</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.historyScroll}>
          {history.map((record, index) => (
            <View key={record.id || index} style={styles.historyCard}>
              <View style={[
                styles.historyEmotionIcon, 
                { backgroundColor: getEmotionBackground(record.emotion) }
              ]}>
                <Text style={styles.historyEmotionEmoji}>
                  {getEmotionIcon(record.emotion)}
                </Text>
              </View>
              <Text style={styles.historyEmotionLabel}>
                {record.emotionData?.label}
              </Text>
              <Text style={styles.historyTime}>{record.timeString}</Text>
            </View>
          ))}
        </ScrollView>
        
        {todayEmotions.length > 1 && (
          <View style={styles.averageCard}>
            <Text style={styles.averageTitle}>📈 Promedio del día</Text>
            <Text style={styles.averageValue}>
              {calculateDayAverage()?.toFixed(1)}/3.0
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderCurrentStatus = () => {
    if (!currentEmotion) return null;

    return (
      <Animated.View style={[styles.currentStatusCard, { opacity: fadeAnim }]}>
        <View style={styles.currentStatusHeader}>
          <View style={[
            styles.currentEmotionIcon,
            { backgroundColor: getEmotionBackground(currentEmotion.id) }
          ]}>
            <Text style={styles.currentEmotionEmoji}>
              {getEmotionIcon(currentEmotion.id)}
            </Text>
          </View>
          <View style={styles.currentStatusInfo}>
            <Text style={styles.currentStatusTitle}>
              ¿Te sigues sintiendo {currentEmotion.label.toLowerCase()}?
            </Text>
            <Text style={styles.currentStatusSubtitle}>
              Última actualización: {getEmotionHistory()[getEmotionHistory().length - 1]?.timeString}
            </Text>
          </View>
        </View>
        
        <View style={styles.currentStatusActions}>
          <TouchableOpacity
            style={[styles.statusActionButton, styles.statusActionYes]}
            onPress={() => handleSaveEmotion()}
            activeOpacity={0.8}
          >
            <CustomIcons.Check size={16} color={COLORS.white} />
            <Text style={styles.statusActionYesText}>Sí, igual</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.statusActionButton, styles.statusActionNo]}
            onPress={() => setCurrentEmotion(null)}
            activeOpacity={0.8}
          >
            <CustomIcons.X size={16} color={COLORS.primary} />
            <Text style={styles.statusActionNoText}>No, cambió</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <Text style={styles.loadingEmoji}>🌟</Text>
          <Text style={styles.loadingText}>Cargando tu estado emocional...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Si ya hay registros y no se ha cambiado el estado actual
  if (todayEmotions.length > 0 && currentEmotion && !selectedEmotion) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.dateText}>{getCurrentDate()}</Text>
          </View>

          {renderCurrentStatus()}
          {renderEmotionHistory()}

          <View style={styles.actionsSection}>
            <TouchableOpacity
              style={styles.primaryAction}
              onPress={() => navigation.navigate('Chat', { emotion: currentEmotion })}
              activeOpacity={0.8}
            >
              <CustomIcons.Chat size={20} color={COLORS.white} />
              <Text style={styles.primaryActionText}>Hablar con asistente</Text>
            </TouchableOpacity>

            <View style={styles.secondaryActions}>
              <TouchableOpacity
                style={styles.secondaryAction}
                onPress={() => navigation.navigate('History')}
                activeOpacity={0.8}
              >
                <CustomIcons.BarChart size={16} color={COLORS.blue600} />
                <Text style={styles.secondaryActionText}>Ver historial</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryAction}
                onPress={() => navigation.navigate('Places', { emotion: currentEmotion })}
                activeOpacity={0.8}
              >
                <CustomIcons.MapPin size={16} color={COLORS.blue600} />
                <Text style={styles.secondaryActionText}>Lugares cercanos</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Vista de selección de emoción (primera vez del día o cambio de estado)
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.dateText}>{getCurrentDate()}</Text>
          <Text style={styles.question}>
            {todayEmotions.length === 0 
              ? '¿Cómo te sientes hoy?' 
              : `¿Cómo te sientes esta ${getTimeOfDay()}?`
            }
          </Text>
          {todayEmotions.length > 0 && (
            <Text style={styles.questionSubtitle}>
              Ya tienes {todayEmotions.length} registro{todayEmotions.length > 1 ? 's' : ''} hoy
            </Text>
          )}
        </View>

        {renderEmotionHistory()}

        <Animated.View style={[styles.emotionsContainer, { opacity: fadeAnim }]}>
          {EMOTIONS_ARRAY.map((emotion) => (
            <TouchableOpacity
              key={emotion.id}
              style={[
                styles.emotionCard,
                selectedEmotion?.id === emotion.id && [
                  styles.emotionCardSelected,
                  { 
                    borderColor: getEmotionColor(emotion.id),
                    backgroundColor: getEmotionBackground(emotion.id)
                  }
                ]
              ]}
              onPress={() => handleEmotionSelect(emotion)}
              activeOpacity={0.7}
            >
              <View style={styles.emotionCardContent}>
                <Text style={styles.emotionIcon}>{getEmotionIcon(emotion.id)}</Text>
                <View style={styles.emotionInfo}>
                  <Text style={[
                    styles.emotionLabel,
                    selectedEmotion?.id === emotion.id && { color: getEmotionColor(emotion.id) }
                  ]}>
                    {emotion.label}
                  </Text>
                  <Text style={styles.emotionDescription}>
                    {getEmotionDescription(emotion.id)}
                  </Text>
                </View>
                {selectedEmotion?.id === emotion.id && (
                  <View style={[styles.checkmark, { backgroundColor: getEmotionColor(emotion.id) }]}>
                    <CustomIcons.Check size={12} color={COLORS.white} />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </Animated.View>

        {selectedEmotion && (
          <Animated.View 
            style={[styles.confirmContainer, { opacity: fadeAnim }]}
            entering="fadeInUp"
          >
            <TouchableOpacity
              style={[styles.confirmButton, { backgroundColor: getEmotionColor(selectedEmotion.id) }]}
              onPress={handleSaveEmotion}
              activeOpacity={0.8}
            >
              <CustomIcons.Plus size={16} color={COLORS.white} />
              <Text style={styles.confirmButtonText}>
                Registrar: Me siento {selectedEmotion.label.toLowerCase()}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Tips section */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>💡 ¿Sabías que?</Text>
          <View style={styles.tipsCard}>
            <Text style={styles.tipsText}>
              Registrar tus emociones varias veces al día te ayuda a:{'\n'}
              • Identificar patrones emocionales{'\n'}
              • Tomar mejores decisiones{'\n'}
              • Mejorar tu autoconocimiento{'\n'}
              • Obtener recomendaciones más precisas
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const getEmotionDescription = (emotionId) => {
  const descriptions = {
    stressed: 'Necesitas apoyo y relajación',
    neutral: 'Te sientes en equilibrio',
    tranki: 'Te sientes muy bien hoy'
  };
  return descriptions[emotionId] || 'Estado emocional registrado';
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
  loadingEmoji: {
    fontSize: 48,
    marginBottom: Theme.spacing.lg,
  },
  loadingText: {
    fontSize: Theme.typography.body,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  
  // Header
  header: {
    paddingHorizontal: Theme.spacing.xl,
    paddingTop: Theme.spacing.xl,
    paddingBottom: Theme.spacing.xxxl,
  },
  greeting: {
    fontSize: Theme.typography.h1,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: Theme.spacing.sm,
  },
  dateText: {
    fontSize: Theme.typography.body,
    color: COLORS.textMuted,
    marginBottom: Theme.spacing.xl,
    textTransform: 'capitalize',
  },
  question: {
    fontSize: Theme.typography.h3,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: Theme.spacing.sm,
  },
  questionSubtitle: {
    fontSize: Theme.typography.caption,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  
  // Current status card
  currentStatusCard: {
    marginHorizontal: Theme.spacing.xl,
    backgroundColor: COLORS.white,
    borderRadius: Theme.borderRadius.large,
    padding: Theme.spacing.xl,
    marginBottom: Theme.spacing.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Theme.shadows.medium,
  },
  currentStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  currentEmotionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  currentEmotionEmoji: {
    fontSize: 24,
  },
  currentStatusInfo: {
    flex: 1,
  },
  currentStatusTitle: {
    fontSize: Theme.typography.h4,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: Theme.spacing.xs,
  },
  currentStatusSubtitle: {
    fontSize: Theme.typography.caption,
    color: COLORS.textSecondary,
  },
  currentStatusActions: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  statusActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.medium,
    gap: 6,
  },
  statusActionYes: {
    backgroundColor: COLORS.success,
  },
  statusActionNo: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  statusActionYesText: {
    color: COLORS.white,
    fontSize: Theme.typography.body,
    fontWeight: '600',
  },
  statusActionNoText: {
    color: COLORS.primary,
    fontSize: Theme.typography.body,
    fontWeight: '600',
  },
  
  // History section
  historySection: {
    marginHorizontal: Theme.spacing.xl,
    marginBottom: Theme.spacing.xl,
  },
  historyTitle: {
    fontSize: Theme.typography.h5,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: Theme.spacing.md,
  },
  historyScroll: {
    marginBottom: Theme.spacing.lg,
  },
  historyCard: {
    backgroundColor: COLORS.white,
    borderRadius: Theme.borderRadius.medium,
    padding: Theme.spacing.md,
    marginRight: Theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 80,
    ...Theme.shadows.small,
  },
  historyEmotionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  historyEmotionEmoji: {
    fontSize: 16,
  },
  historyEmotionLabel: {
    fontSize: Theme.typography.small,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: Theme.spacing.xs,
  },
  historyTime: {
    fontSize: Theme.typography.small,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  averageCard: {
    backgroundColor: COLORS.blue50,
    borderRadius: Theme.borderRadius.medium,
    padding: Theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.blue200,
  },
  averageTitle: {
    fontSize: Theme.typography.body,
    fontWeight: '600',
    color: COLORS.blue600,
  },
  averageValue: {
    fontSize: Theme.typography.h4,
    fontWeight: '700',
    color: COLORS.blue600,
  },
  
  // Emotions grid
  emotionsContainer: {
    paddingHorizontal: Theme.spacing.xl,
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.xl,
  },
  emotionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: Theme.borderRadius.large,
    padding: Theme.spacing.lg,
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
    ...Theme.shadows.small,
  },
  emotionCardSelected: {
    borderWidth: 2,
    ...Theme.shadows.medium,
  },
  emotionCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emotionIcon: {
    fontSize: 32,
    marginRight: Theme.spacing.lg,
  },
  emotionInfo: {
    flex: 1,
  },
  emotionLabel: {
    fontSize: Theme.typography.h4,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: Theme.spacing.xs,
  },
  emotionDescription: {
    fontSize: Theme.typography.caption,
    color: COLORS.textMuted,
    lineHeight: 16,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Actions section
  actionsSection: {
    paddingHorizontal: Theme.spacing.xl,
    marginBottom: Theme.spacing.xl,
  },
  primaryAction: {
    backgroundColor: COLORS.primary,
    paddingVertical: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.xl,
    borderRadius: Theme.borderRadius.medium,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: Theme.spacing.lg,
    ...Theme.shadows.blue,
  },
  primaryActionText: {
    color: COLORS.white,
    fontSize: Theme.typography.h5,
    fontWeight: '600',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  secondaryAction: {
    flex: 1,
    backgroundColor: COLORS.blue50,
    paddingVertical: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.borderRadius.medium,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.blue200,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryActionText: {
    color: COLORS.blue600,
    fontSize: Theme.typography.caption,
    fontWeight: '500',
    textAlign: 'center',
  },
  
  // Confirmation
  confirmContainer: {
    paddingHorizontal: Theme.spacing.xl,
    marginBottom: Theme.spacing.xl,
  },
  confirmButton: {
    paddingVertical: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.xl,
    borderRadius: Theme.borderRadius.medium,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    ...Theme.shadows.medium,
  },
  confirmButtonText: {
    color: COLORS.white,
    fontSize: Theme.typography.h5,
    fontWeight: '600',
  },
  
  // Tips section
  tipsSection: {
    marginHorizontal: Theme.spacing.xl,
    marginBottom: Theme.spacing.xxxl,
  },
  tipsTitle: {
    fontSize: Theme.typography.h5,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: Theme.spacing.md,
  },
  tipsCard: {
    backgroundColor: COLORS.white,
    padding: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.large,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Theme.shadows.small,
  },
  tipsText: {
    fontSize: Theme.typography.body,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});

export default EmotionSelectorScreen;