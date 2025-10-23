// src/screens/EmotionSelectorScreen.js - Versión con nubes animadas
import React, { useState, useEffect, useRef } from 'react';
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
  Platform,
  Image,
  Dimensions,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { EMOTIONS } from '../constants/emotions';
import { COLORS, getEmotionColor, getEmotionBackground } from '../constants/colors';
import { formatDate } from '../utils/dateUtils';
import FirebaseService from '../services/firebase';
import CustomIcons from '../components/CustomIcons';

const { width } = Dimensions.get('window');
const EMOTIONS_ARRAY = [EMOTIONS.STRESSED, EMOTIONS.NEUTRAL, EMOTIONS.TRANKI];

// Mapeo de emociones a imágenes de nubes
const CLOUD_IMAGES = {
  stressed: require('../assets/images/nube_estres.png'),
  neutral: require('../assets/images/nube_neutral.png'),
  tranki: require('../assets/images/nube_feliz.png'),
};

const EmotionSelectorScreen = ({ navigation }) => {
  const [selectedEmotion, setSelectedEmotion] = useState(null);
  const [todayEmotions, setTodayEmotions] = useState([]);
  const [currentEmotion, setCurrentEmotion] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Animaciones
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const cloudScale = useRef(new Animated.Value(0.8)).current;
  const cloudFloat = useRef(new Animated.Value(0)).current;
  const cloudRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    StatusBar.setBarStyle('dark-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('transparent');
      StatusBar.setTranslucent(true);
    }
    
    const currentUser = auth().currentUser;
    setUser(currentUser);
    if (currentUser) {
      loadTodayEmotions(currentUser.uid);
    }

    // Animación de entrada
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(cloudScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Animación flotante continua de la nube
    Animated.loop(
      Animated.sequence([
        Animated.timing(cloudFloat, {
          toValue: -15,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(cloudFloat, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Animación sutil de rotación
    Animated.loop(
      Animated.sequence([
        Animated.timing(cloudRotate, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(cloudRotate, {
          toValue: -1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(cloudRotate, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const loadTodayEmotions = async (userId) => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const today = formatDate(new Date());
      const todayRecords = await FirebaseService.getTodayEmotions(userId, today);
      
      setTodayEmotions(todayRecords || []);
      
      if (todayRecords && todayRecords.length > 0) {
        const latestEmotion = todayRecords[todayRecords.length - 1];
        const emotion = EMOTIONS_ARRAY.find(e => e.id === latestEmotion.emotion);
        setCurrentEmotion(emotion);
        animateCloudChange();
      }
    } catch (error) {
      console.error('Error loading today emotions:', error);
    } finally {
      setLoading(false);
    }
  };

  const animateCloudChange = () => {
    cloudScale.setValue(0.8);
    Animated.spring(cloudScale, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  };

  const handleEmotionSelect = (emotion) => {
    setSelectedEmotion(emotion);
    // Animación al seleccionar
    Animated.sequence([
      Animated.timing(cloudScale, {
        toValue: 1.1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(cloudScale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleSaveEmotion = async () => {
    if (!selectedEmotion || !user) return;

    try {
      await FirebaseService.saveEmotion(user.uid, selectedEmotion);
      await loadTodayEmotions(user.uid);
      
      Alert.alert(
        'Estado registrado',
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
      Alert.alert('Error', 'No se pudo guardar tu estado emocional');
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
      day: 'numeric',
      month: 'long'
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

  const getEmotionDescription = (emotionId) => {
    const descriptions = {
      stressed: 'Necesitas apoyo y relajación',
      neutral: 'Te sientes en equilibrio',
      tranki: 'Te sientes muy bien hoy'
    };
    return descriptions[emotionId] || 'Estado emocional registrado';
  };

  const getCurrentCloudImage = () => {
    if (selectedEmotion) {
      return CLOUD_IMAGES[selectedEmotion.id];
    }
    if (currentEmotion) {
      return CLOUD_IMAGES[currentEmotion.id];
    }
    return CLOUD_IMAGES.neutral; // Default
  };

  const getCloudBackgroundColor = () => {
    const emotionId = selectedEmotion?.id || currentEmotion?.id || 'neutral';
    const colors = {
      stressed: '#FFF4F4',
      neutral: '#F8FAFE',
      tranki: '#F0FDF4'
    };
    return colors[emotionId];
  };

  const spin = cloudRotate.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-3deg', '3deg']
  });

  const renderCloudDisplay = () => {
    return (
      <Animated.View 
        style={[
          styles.cloudContainer,
          { 
            backgroundColor: getCloudBackgroundColor(),
            opacity: fadeAnim,
          }
        ]}>
        <Animated.View
          style={{
            transform: [
              { scale: cloudScale },
              { translateY: cloudFloat },
              { rotate: spin }
            ]
          }}>
          <Image
            source={getCurrentCloudImage()}
            style={styles.cloudImage}
            resizeMode="contain"
          />
        </Animated.View>
        
        {(currentEmotion || selectedEmotion) && (
          <Animated.View style={[styles.cloudLabel, { opacity: fadeAnim }]}>
            <Text style={styles.cloudLabelText}>
              {selectedEmotion?.label || currentEmotion?.label}
            </Text>
          </Animated.View>
        )}
      </Animated.View>
    );
  };

  const renderEmotionHistory = () => {
    const history = getEmotionHistory();
    if (history.length === 0) return null;

    return (
      <View style={styles.historySection}>
        <View style={styles.historySectionHeader}>
          <CustomIcons.BarChart size={18} color={COLORS.primary} />
          <Text style={styles.historyTitle}>
            Registro de hoy ({history.length})
          </Text>
        </View>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.historyScroll}
          contentContainerStyle={styles.historyScrollContent}>
          {history.map((record, index) => (
            <TouchableOpacity 
              key={record.id || index} 
              style={styles.historyCard}
              activeOpacity={0.7}>
              <Image
                source={CLOUD_IMAGES[record.emotion]}
                style={styles.historyCloudIcon}
                resizeMode="contain"
              />
              <Text style={styles.historyEmotionLabel}>
                {record.emotionData?.label}
              </Text>
              <Text style={styles.historyTime}>{record.timeString}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        {todayEmotions.length > 1 && (
          <View style={styles.averageCard}>
            <View style={styles.averageCardLeft}>
              <Text style={styles.averageTitle}>Promedio del día</Text>
              <Text style={styles.averageSubtitle}>
                Basado en {todayEmotions.length} registros
              </Text>
            </View>
            <View style={styles.averageCardRight}>
              <Text style={styles.averageValue}>
                {calculateDayAverage()?.toFixed(1)}
              </Text>
              <Text style={styles.averageMaxValue}>/3.0</Text>
            </View>
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
          <Image
            source={CLOUD_IMAGES[currentEmotion.id]}
            style={styles.currentStatusCloudIcon}
            resizeMode="contain"
          />
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
            onPress={handleSaveEmotion}
            activeOpacity={0.8}>
            <CustomIcons.Check size={18} color={COLORS.white} />
            <Text style={styles.statusActionYesText}>Sí, igual</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.statusActionButton, styles.statusActionNo]}
            onPress={() => setCurrentEmotion(null)}
            activeOpacity={0.8}>
            <CustomIcons.X size={18} color={COLORS.primary} />
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
          <Animated.View style={{ transform: [{ scale: cloudScale }] }}>
            <Image
              source={CLOUD_IMAGES.neutral}
              style={styles.loadingCloudImage}
              resizeMode="contain"
            />
          </Animated.View>
          <Text style={styles.loadingText}>Cargando tu estado emocional</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Vista cuando ya hay registros del día
  if (todayEmotions.length > 0 && currentEmotion && !selectedEmotion) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={styles.headerLeft}>
                <Text style={styles.greeting}>{getGreeting()},</Text>
                <Text style={styles.userName}>
                  {user?.displayName?.split(' ')[0] || 'Usuario'}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.notificationButton}
                activeOpacity={0.7}>
                <CustomIcons.Bell size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.dateText}>{getCurrentDate()}</Text>
          </View>

          {renderCloudDisplay()}
          {renderCurrentStatus()}
          {renderEmotionHistory()}

          {/* Action Cards */}
          <View style={styles.actionsSection}>
            <TouchableOpacity
              style={styles.primaryAction}
              onPress={() => navigation.navigate('Chat', { emotion: currentEmotion })}
              activeOpacity={0.8}>
              <CustomIcons.MessageCircle size={22} color={COLORS.white} />
              <Text style={styles.primaryActionText}>Hablar con asistente</Text>
            </TouchableOpacity>

            <View style={styles.secondaryActions}>
              <TouchableOpacity
                style={styles.secondaryAction}
                onPress={() => navigation.navigate('History')}
                activeOpacity={0.8}>
                <CustomIcons.BarChart size={20} color={COLORS.primary} />
                <Text style={styles.secondaryActionText}>Historial</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryAction}
                onPress={() => navigation.navigate('Places', { emotion: currentEmotion })}
                activeOpacity={0.8}>
                <CustomIcons.MapPin size={20} color={COLORS.primary} />
                <Text style={styles.secondaryActionText}>Lugares</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Vista de selección de emoción
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <Text style={styles.greeting}>{getGreeting()},</Text>
              <Text style={styles.userName}>
                {user?.displayName?.split(' ')[0] || 'Usuario'}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.notificationButton}
              activeOpacity={0.7}>
              <CustomIcons.Bell size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.dateText}>{getCurrentDate()}</Text>
        </View>

        {/* Cloud Display - Ahora más prominente */}
        {renderCloudDisplay()}

        {/* Question Section */}
        <View style={styles.questionSection}>
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

        {/* Emotion Cards */}
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
              activeOpacity={0.7}>
              <View style={styles.emotionCardContent}>
                <Image
                  source={CLOUD_IMAGES[emotion.id]}
                  style={styles.emotionCardCloudIcon}
                  resizeMode="contain"
                />
                
                <View style={styles.emotionInfo}>
                  <Text style={[
                    styles.emotionLabel,
                    selectedEmotion?.id === emotion.id && { 
                      color: getEmotionColor(emotion.id) 
                    }
                  ]}>
                    {emotion.label}
                  </Text>
                  <Text style={styles.emotionDescription}>
                    {getEmotionDescription(emotion.id)}
                  </Text>
                </View>
                
                {selectedEmotion?.id === emotion.id && (
                  <View style={[
                    styles.checkmark, 
                    { backgroundColor: getEmotionColor(emotion.id) }
                  ]}>
                    <CustomIcons.Check size={14} color={COLORS.white} />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* Confirm Button */}
        {selectedEmotion && (
          <Animated.View style={[styles.confirmContainer, { opacity: fadeAnim }]}>
            <TouchableOpacity
              style={[
                styles.confirmButton, 
                { backgroundColor: getEmotionColor(selectedEmotion.id) }
              ]}
              onPress={handleSaveEmotion}
              activeOpacity={0.8}>
              <CustomIcons.Check size={20} color={COLORS.white} />
              <Text style={styles.confirmButtonText}>
                Registrar estado
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Info Card */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <View style={styles.infoIconWrapper}>
              <CustomIcons.Info size={20} color={COLORS.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>¿Por qué registrar?</Text>
              <Text style={styles.infoText}>
                Registrar tus emociones te ayuda a identificar patrones, 
                tomar mejores decisiones y mejorar tu bienestar emocional.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 80,
    paddingBottom: 100,
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingCloudImage: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  
  // Cloud Display
  cloudContainer: {
    marginHorizontal: 24,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    minHeight: 200,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  cloudImage: {
    width: width * 0.5,
    height: width * 0.35,
  },
  cloudLabel: {
    marginTop: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  cloudLabelText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  
  // Header
  header: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },
  userName: {
    fontSize: 32,
    fontWeight: '300',
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },
  dateText: {
    fontSize: 14,
    color: '#6B7280',
    textTransform: 'capitalize',
    fontWeight: '500',
  },
  notificationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  
  // Question
  questionSection: {
    paddingHorizontal: 24,
    marginBottom: 28,
  },
  question: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  questionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  
  // Current Status Card
  currentStatusCard: {
    marginHorizontal: 24,
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  currentStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  currentStatusCloudIcon: {
    width: 56,
    height: 56,
    marginRight: 12,
  },
  currentStatusInfo: {
    flex: 1,
  },
  currentStatusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  currentStatusSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  currentStatusActions: {
    flexDirection: 'row',
    gap: 12,
  },
  statusActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  statusActionYes: {
    backgroundColor: '#10B981',
  },
  statusActionNo: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  statusActionYesText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  statusActionNoText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  
  // History Section
  historySection: {
    paddingLeft: 24,
    marginBottom: 32,
  },
  historySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingRight: 24,
    gap: 8,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  historyScroll: {
    marginBottom: 16,
  },
  historyScrollContent: {
    paddingRight: 24,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 90,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  historyCloudIcon: {
    width: 48,
    height: 48,
    marginBottom: 8,
  },
  historyEmotionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 4,
  },
  historyTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  averageCard: {
    backgroundColor: '#EBF5FB',
    borderRadius: 16,
    padding: 16,
    marginRight: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#7DB9DE40',
  },
  averageCardLeft: {
    flex: 1,
  },
  averageTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 2,
  },
  averageSubtitle: {
    fontSize: 12,
    color: '#5A9AB8',
  },
  averageCardRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  averageValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary,
  },
  averageMaxValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7DB9DE',
    marginLeft: 2,
  },
  
  // Emotions Container
  emotionsContainer: {
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 20,
  },
  emotionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  emotionCardSelected: {
    borderWidth: 2,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  emotionCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emotionCardCloudIcon: {
    width: 56,
    height: 56,
    marginRight: 16,
  },
  emotionInfo: {
    flex: 1,
  },
  emotionLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  emotionDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Actions
  actionsSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  primaryAction: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryAction: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  secondaryActionText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  
  // Confirm
  confirmContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  confirmButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  
  // Info Section
  infoSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  infoCard: {
    backgroundColor: '#F0F9FF',
    padding: 18,
    borderRadius: 16,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#7DB9DE40',
    gap: 12,
  },
  infoIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(125, 185, 222, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#5A9AB8',
    lineHeight: 18,
  },
});

export default EmotionSelectorScreen;