// src/screens/EmotionSelectorScreen.js - VERSIÓN CORREGIDA
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
  SafeAreaView,
  Animated,
  Platform,
  Image,
  Dimensions,
  Easing,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { EMOTIONS } from '../constants/emotions';
import { COLORS } from '../constants/colors';
import { formatDate } from '../utils/dateUtils';
import FirebaseService from '../services/firebase';
import CustomIcons from '../components/CustomIcons';

const { width, height } = Dimensions.get('window');
const EMOTIONS_ARRAY = [EMOTIONS.STRESSED, EMOTIONS.NEUTRAL, EMOTIONS.TRANKI];

const THEME_COLORS = {
  primary: '#638FA3',
  secondary: '#2C3E50',
  light: '#FEFFFF',
  stressedBg: '#2C3E50',
  stressedAccent: '#FF6B6B',
  neutralBg: '#638FA3',
  trankiBg: '#7CB9E8',
  trankiAccent: '#FFD93D',
};

const CLOUD_IMAGES = {
  stressed: require('../assets/images/nube_estres.png'),
  neutral: require('../assets/images/nube_neutral.png'),
  tranki: require('../assets/images/nube_feliz.png'),
};

const TAB_BAR_HEIGHT = 70;
const TAB_BAR_MARGIN_BOTTOM = 20;
const TAB_BAR_EXTRA_PADDING = 20;
const BOTTOM_PADDING = TAB_BAR_HEIGHT + TAB_BAR_MARGIN_BOTTOM + TAB_BAR_EXTRA_PADDING;

const EmotionSelectorScreen = ({ navigation }) => {
  const [selectedEmotion, setSelectedEmotion] = useState(null);
  const [lastSavedEmotion, setLastSavedEmotion] = useState(null);
  const [todayEmotions, setTodayEmotions] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Animaciones principales
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const cloudScale = useRef(new Animated.Value(0.5)).current;
  const cloudFloat = useRef(new Animated.Value(0)).current;
  const cloudRotate = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Animaciones para rayos (stressed)
  const lightning1 = useRef(new Animated.Value(0)).current;
  const lightning2 = useRef(new Animated.Value(0)).current;
  const lightning3 = useRef(new Animated.Value(0)).current;
  const screenShake = useRef(new Animated.Value(0)).current;
  
  // Animaciones para lluvia de estrellas (tranki)
  const stars = useRef([...Array(8)].map(() => ({
    opacity: new Animated.Value(0),
    translateY: new Animated.Value(-50),
    translateX: new Animated.Value(0),
    rotate: new Animated.Value(0),
  }))).current;
  
  // Animaciones para ondas (neutral)
  const waves = useRef([...Array(3)].map(() => ({
    scale: new Animated.Value(0),
    opacity: new Animated.Value(0.6),
  }))).current;

  // Refs para controlar los loops de animación
  const lightningTimeoutRef = useRef(null);
  const starsAnimationsRef = useRef([]);
  const wavesAnimationsRef = useRef([]);
  const floatingAnimationRef = useRef(null);
  const rotatingAnimationRef = useRef(null);

  // ✅ FIX 1: Limpiar animaciones al desmontar y al cambiar de foco
  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('transparent');
      StatusBar.setTranslucent(true);
    }
    
    const currentUser = auth().currentUser;
    setUser(currentUser);
    
    // ✅ FIX 2: Cargar datos correctamente
    const loadData = async () => {
      if (currentUser) {
        await loadTodayEmotions(currentUser.uid);
      }
      setLoading(false);
    };
    
    loadData();

    // Animación de entrada
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(cloudScale, {
        toValue: 1,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Animación flotante continua
    floatingAnimationRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(cloudFloat, {
          toValue: -20,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(cloudFloat, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    floatingAnimationRef.current.start();

    // Rotación sutil
    rotatingAnimationRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(cloudRotate, {
          toValue: 1,
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(cloudRotate, {
          toValue: -1,
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(cloudRotate, {
          toValue: 0,
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    rotatingAnimationRef.current.start();

    // ✅ FIX 3: Cleanup completo al desmontar
    return () => {
      stopAllAnimations();
      if (floatingAnimationRef.current) {
        floatingAnimationRef.current.stop();
      }
      if (rotatingAnimationRef.current) {
        rotatingAnimationRef.current.stop();
      }
    };
  }, []);

  // ✅ FIX 4: Escuchar cambios en el foco de navegación
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Resetear animaciones cuando la pantalla gana foco
      fadeAnim.setValue(1);
      cloudScale.setValue(1);
      pulseAnim.setValue(1);
      
      // Recargar datos
      if (user) {
        loadTodayEmotions(user.uid);
      }
    });

    return unsubscribe;
  }, [navigation, user]);

  useEffect(() => {
    const emotionToShow = selectedEmotion || lastSavedEmotion;
    if (emotionToShow) {
      startEmotionAnimation(emotionToShow.id);
    } else {
      stopAllAnimations();
    }
  }, [selectedEmotion, lastSavedEmotion]);

  // ✅ FIX 5: Cargar correctamente el último estado guardado
  const loadTodayEmotions = async (userId) => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const today = formatDate(new Date());
      const todayRecords = await FirebaseService.getTodayEmotions(userId, today);
      
      setTodayEmotions(todayRecords || []);
      
      // ✅ Obtener el último estado guardado
      if (todayRecords && todayRecords.length > 0) {
        const latestRecord = todayRecords[todayRecords.length - 1];
        const emotion = EMOTIONS_ARRAY.find(e => e.id === latestRecord.emotion);
        if (emotion) {
          setLastSavedEmotion(emotion);
        }
      } else {
        setLastSavedEmotion(null);
      }
    } catch (error) {
      console.error('Error loading today emotions:', error);
    } finally {
      setLoading(false);
    }
  };

  const stopAllAnimations = () => {
    // Limpiar timeout de rayos
    if (lightningTimeoutRef.current) {
      clearTimeout(lightningTimeoutRef.current);
      lightningTimeoutRef.current = null;
    }

    // Detener animaciones de estrellas
    starsAnimationsRef.current.forEach(anim => {
      if (anim && anim.stop) {
        anim.stop();
      }
    });
    starsAnimationsRef.current = [];

    // Detener animaciones de ondas
    wavesAnimationsRef.current.forEach(anim => {
      if (anim && anim.stop) {
        anim.stop();
      }
    });
    wavesAnimationsRef.current = [];

    // ✅ FIX 6: Resetear valores de animación a su estado inicial
    lightning1.setValue(0);
    lightning2.setValue(0);
    lightning3.setValue(0);
    screenShake.setValue(0);
    
    stars.forEach(star => {
      star.opacity.setValue(0);
      star.translateY.setValue(-50);
      star.translateX.setValue(0);
      star.rotate.setValue(0);
    });
    
    waves.forEach(wave => {
      wave.scale.setValue(0);
      wave.opacity.setValue(0);
    });
  };

  const startEmotionAnimation = (emotionId) => {
    stopAllAnimations();

    if (emotionId === 'stressed') {
      startLightningAnimation();
    } else if (emotionId === 'tranki') {
      startStarsAnimation();
    } else if (emotionId === 'neutral') {
      startWavesAnimation();
    }
  };

  const startLightningAnimation = () => {
    const createLightning = (lightningAnim, delay) => {
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(lightningAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(lightningAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(lightningAnim, {
          toValue: 0.8,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.timing(lightningAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    };

    const shakeLightning = () => {
      Animated.sequence([
        Animated.timing(screenShake, {
          toValue: 10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(screenShake, {
          toValue: -10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(screenShake, {
          toValue: 0,
          duration: 50,
          useNativeDriver: true,
        }),
      ]).start();
    };

    const lightningLoop = () => {
      if (!lightningTimeoutRef.current) return;
      
      createLightning(lightning1, 0);
      createLightning(lightning2, 300);
      createLightning(lightning3, 600);
      shakeLightning();
      
      lightningTimeoutRef.current = setTimeout(lightningLoop, 4000);
    };
    
    lightningTimeoutRef.current = setTimeout(lightningLoop, 0);
  };

  const startStarsAnimation = () => {
    stars.forEach((star, index) => {
      const delay = index * 200;
      const randomX = (Math.random() - 0.5) * width * 0.6;
      
      const animation = Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(star.opacity, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(star.translateY, {
              toValue: height * 0.4,
              duration: 2500,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(star.translateX, {
              toValue: randomX,
              duration: 2500,
              useNativeDriver: true,
            }),
            Animated.timing(star.rotate, {
              toValue: 1,
              duration: 2500,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(star.opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.parallel([
            Animated.timing(star.translateY, {
              toValue: -50,
              duration: 0,
              useNativeDriver: true,
            }),
            Animated.timing(star.translateX, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
            Animated.timing(star.rotate, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
          Animated.delay(1000),
        ])
      );
      
      animation.start();
      starsAnimationsRef.current.push(animation);
    });
  };

  const startWavesAnimation = () => {
    waves.forEach((wave, index) => {
      const delay = index * 800;
      
      const animation = Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(wave.scale, {
              toValue: 2.5,
              duration: 2500,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(wave.opacity, {
              toValue: 0,
              duration: 2500,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(wave.scale, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
            Animated.timing(wave.opacity, {
              toValue: 0.6,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
      
      animation.start();
      wavesAnimationsRef.current.push(animation);
    });
  };

  const handleEmotionSelect = (emotion) => {
    setSelectedEmotion(emotion);
    
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.15,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(pulseAnim, {
        toValue: 1,
        tension: 50,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.spring(cloudScale, {
      toValue: 1,
      tension: 40,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  // ✅ FIX 7: Guardar correctamente en Firebase
  const handleSaveEmotion = async () => {
    if (!selectedEmotion || !user) return;

    try {
      // Guardar en Firebase
      await FirebaseService.saveEmotion(user.uid, selectedEmotion);
      
      // Actualizar estado local inmediatamente
      setLastSavedEmotion(selectedEmotion);
      
      // Recargar las emociones del día
      await loadTodayEmotions(user.uid);
      
      Alert.alert(
        'Estado registrado',
        `Has registrado que te sientes ${selectedEmotion.label.toLowerCase()}.`,
        [
          {
            text: 'Hablar con asistente',
            onPress: () => navigation.navigate('Chat', { emotion: selectedEmotion })
          },
          { 
            text: 'Continuar', 
            style: 'cancel',
            onPress: () => setSelectedEmotion(null)
          }
        ]
      );
      
      setSelectedEmotion(null);
      
    } catch (error) {
      console.error('Error saving emotion:', error);
      Alert.alert('Error', 'No se pudo guardar tu estado emocional');
    }
  };

  const getBackgroundColor = () => {
    const emotionToShow = selectedEmotion || lastSavedEmotion;
    if (!emotionToShow) return THEME_COLORS.primary;
    
    switch (emotionToShow.id) {
      case 'stressed':
        return THEME_COLORS.stressedBg;
      case 'neutral':
        return THEME_COLORS.neutralBg;
      case 'tranki':
        return THEME_COLORS.trankiBg;
      default:
        return THEME_COLORS.primary;
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const spin = cloudRotate.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-5deg', '5deg']
  });

  const renderLightningEffects = () => {
    const emotionToShow = selectedEmotion || lastSavedEmotion;
    if (!emotionToShow || emotionToShow.id !== 'stressed') return null;

    return (
      <View 
        style={[
          StyleSheet.absoluteFill,
          { zIndex: -1 }
        ]} 
        pointerEvents="none">
        <Animated.View
          style={[
            styles.lightning,
            {
              left: '15%',
              top: '10%',
              opacity: lightning1,
            }
          ]}>
          <View style={styles.lightningBolt}>
            <View style={[styles.lightningSegment, { width: 4, height: 80, marginLeft: 0 }]} />
            <View style={[styles.lightningSegment, { width: 4, height: 60, marginLeft: 15 }]} />
            <View style={[styles.lightningSegment, { width: 4, height: 70, marginLeft: 5 }]} />
            <View style={[styles.lightningSegment, { width: 4, height: 50, marginLeft: 20 }]} />
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.lightning,
            {
              left: '45%',
              top: '5%',
              opacity: lightning2,
            }
          ]}>
          <View style={styles.lightningBolt}>
            <View style={[styles.lightningSegment, { width: 5, height: 100, marginLeft: 0 }]} />
            <View style={[styles.lightningSegment, { width: 4, height: 70, marginLeft: 20 }]} />
            <View style={[styles.lightningSegment, { width: 4, height: 60, marginLeft: 10 }]} />
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.lightning,
            {
              right: '10%',
              top: '15%',
              opacity: lightning3,
            }
          ]}>
          <View style={styles.lightningBolt}>
            <View style={[styles.lightningSegment, { width: 4, height: 90, marginLeft: 0 }]} />
            <View style={[styles.lightningSegment, { width: 4, height: 50, marginLeft: -15 }]} />
            <View style={[styles.lightningSegment, { width: 4, height: 65, marginLeft: -5 }]} />
          </View>
        </Animated.View>
      </View>
    );
  };

  const renderStarsEffect = () => {
    const emotionToShow = selectedEmotion || lastSavedEmotion;
    if (!emotionToShow || emotionToShow.id !== 'tranki') return null;

    return (
      <View 
        style={[StyleSheet.absoluteFill, { zIndex: -1 }]} 
        pointerEvents="none">
        {stars.map((star, index) => {
          const rotate = star.rotate.interpolate({
            inputRange: [0, 1],
            outputRange: ['0deg', '720deg']
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.star,
                {
                  opacity: star.opacity,
                  transform: [
                    { translateY: star.translateY },
                    { translateX: star.translateX },
                    { rotate },
                  ],
                }
              ]}>
              <View style={styles.starShape}>
                <View style={styles.starBar1} />
                <View style={styles.starBar2} />
              </View>
            </Animated.View>
          );
        })}
      </View>
    );
  };

  const renderWavesEffect = () => {
    const emotionToShow = selectedEmotion || lastSavedEmotion;
    if (!emotionToShow || emotionToShow.id !== 'neutral') return null;

    return (
      <View 
        style={[styles.wavesContainer, { zIndex: -1 }]} 
        pointerEvents="none">
        {waves.map((wave, index) => (
          <Animated.View
            key={index}
            style={[
              styles.wave,
              {
                opacity: wave.opacity,
                transform: [{ scale: wave.scale }],
              }
            ]}
          />
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: THEME_COLORS.primary }]}>
        <View style={styles.loadingContent}>
          <Animated.View style={{ transform: [{ scale: cloudScale }] }}>
            <Image
              source={CLOUD_IMAGES.neutral}
              style={styles.loadingCloudImage}
              resizeMode="contain"
            />
          </Animated.View>
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayedEmotion = selectedEmotion || lastSavedEmotion;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: getBackgroundColor(),
          transform: [{ translateX: screenShake }],
        }
      ]}>
      <StatusBar barStyle="light-content" />
      
      {/* Efectos de fondo */}
      {renderLightningEffects()}
      {renderStarsEffect()}
      {renderWavesEffect()}

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.userName}>
                {user?.displayName?.split(' ')[0] || 'Usuario'}
              </Text>
            </View>
            
            {todayEmotions.length > 0 && (
              <View style={styles.streakBadge}>
                <CustomIcons.Check size={14} color={THEME_COLORS.light} />
                <Text style={styles.streakText}>{todayEmotions.length}</Text>
              </View>
            )}
          </View>
        </Animated.View>

        <Animated.View 
          style={[
            styles.mainEmotionDisplay,
            {
              opacity: fadeAnim,
              transform: [{ scale: pulseAnim }],
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
              source={displayedEmotion ? CLOUD_IMAGES[displayedEmotion.id] : CLOUD_IMAGES.neutral}
              style={styles.mainCloudImage}
              resizeMode="contain"
            />
          </Animated.View>

          {displayedEmotion && (
            <Animated.View style={[styles.emotionLabel, { opacity: fadeAnim }]}>
              <Text style={styles.emotionLabelText}>{displayedEmotion.label}</Text>
            </Animated.View>
          )}

          {!displayedEmotion && (
            <Animated.View style={[styles.questionContainer, { opacity: fadeAnim }]}>
              <Text style={styles.questionText}>¿Cómo te sientes?</Text>
            </Animated.View>
          )}
        </Animated.View>

        <Animated.View 
          style={[
            styles.emotionSelector,
            { opacity: fadeAnim }
          ]}>
          <View style={styles.selectorHandle} />
          
          <View style={styles.emotionsGrid}>
            {EMOTIONS_ARRAY.map((emotion) => (
              <TouchableOpacity
                key={emotion.id}
                style={[
                  styles.emotionButton,
                  selectedEmotion?.id === emotion.id && styles.emotionButtonSelected
                ]}
                onPress={() => handleEmotionSelect(emotion)}
                activeOpacity={0.7}>
                <Image
                  source={CLOUD_IMAGES[emotion.id]}
                  style={styles.emotionIcon}
                  resizeMode="contain"
                />
                <Text style={[
                  styles.emotionButtonText,
                  selectedEmotion?.id === emotion.id && styles.emotionButtonTextSelected
                ]}>
                  {emotion.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedEmotion && (
            <Animated.View style={{ opacity: fadeAnim }}>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleSaveEmotion}
                activeOpacity={0.8}>
                <CustomIcons.Check size={20} color={THEME_COLORS.secondary} />
                <Text style={styles.confirmButtonText}>Registrar estado</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {!selectedEmotion && todayEmotions.length > 0 && (
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => navigation.navigate('Chat')}
                activeOpacity={0.8}>
                <CustomIcons.MessageCircle size={18} color={THEME_COLORS.light} />
                <Text style={styles.quickActionText}>Chat</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => navigation.navigate('History')}
                activeOpacity={0.8}>
                <CustomIcons.BarChart size={18} color={THEME_COLORS.light} />
                <Text style={styles.quickActionText}>Historial</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </SafeAreaView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCloudImage: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 16,
    color: THEME_COLORS.light,
    fontWeight: '600',
  },

  header: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 20 : 50,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: THEME_COLORS.light,
    letterSpacing: -0.5,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  streakText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME_COLORS.light,
  },

  mainEmotionDisplay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginBottom: 20,
  },
  mainCloudImage: {
    width: width * 0.65,
    height: width * 0.65,
  },
  emotionLabel: {
    marginTop: 20,
    backgroundColor: THEME_COLORS.light,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  emotionLabelText: {
    fontSize: 24,
    fontWeight: '700',
    color: THEME_COLORS.secondary,
    letterSpacing: -0.5,
  },
  questionContainer: {
    marginTop: 20,
  },
  questionText: {
    fontSize: 26,
    fontWeight: '600',
    color: THEME_COLORS.light,
    textAlign: 'center',
    letterSpacing: -0.5,
  },

  emotionSelector: {
    backgroundColor: THEME_COLORS.light,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: BOTTOM_PADDING,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  selectorHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  emotionsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  emotionButton: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emotionButtonSelected: {
    backgroundColor: THEME_COLORS.primary + '20',
    borderColor: THEME_COLORS.primary,
  },
  emotionIcon: {
    width: 48,
    height: 48,
    marginBottom: 6,
  },
  emotionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME_COLORS.secondary,
    textAlign: 'center',
  },
  emotionButtonTextSelected: {
    color: THEME_COLORS.primary,
    fontWeight: '700',
  },

  confirmButton: {
    backgroundColor: THEME_COLORS.light,
    borderWidth: 2,
    borderColor: THEME_COLORS.secondary,
    paddingVertical: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME_COLORS.secondary,
  },

  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: THEME_COLORS.secondary,
    paddingVertical: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME_COLORS.light,
  },

  lightning: {
    position: 'absolute',
  },
  lightningBolt: {
    flexDirection: 'column',
  },
  lightningSegment: {
    backgroundColor: '#FFF',
    shadowColor: THEME_COLORS.stressedAccent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 10,
  },

  star: {
    position: 'absolute',
    left: '50%',
    top: '20%',
  },
  starShape: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starBar1: {
    position: 'absolute',
    width: 20,
    height: 3,
    backgroundColor: THEME_COLORS.trankiAccent,
    borderRadius: 2,
    shadowColor: THEME_COLORS.trankiAccent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  starBar2: {
    position: 'absolute',
    width: 3,
    height: 20,
    backgroundColor: THEME_COLORS.trankiAccent,
    borderRadius: 2,
    shadowColor: THEME_COLORS.trankiAccent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },

  wavesContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wave: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
});

export default EmotionSelectorScreen;