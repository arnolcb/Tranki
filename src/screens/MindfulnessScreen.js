// src/screens/MindfulnessScreen.js - Ejercicios de respiración guiados
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Animated,
  Platform,
  StatusBar,
  Dimensions,
  Image,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import Svg, { Circle, Path } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

const COLORS = {
  bg: '#FFFFFF',
  bgSecondary: '#F8FAFB',
  white: '#FFFFFF',
  text: '#1A1F2E',
  textLight: '#6B7280',
  primary: '#7CC5C5',
  primaryDark: '#5BA5A5',
  primaryLight: '#B8E6E6',
  accent: '#FFB74D',
  success: '#10B981',
  border: '#E5E7EB',
};

// Iconos SVG
const ChevronLeftIcon = ({ size = 24, color = '#000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M15 18l-6-6 6-6" />
  </Svg>
);

const MessageIcon = ({ size = 24, color = '#000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </Svg>
);

// Estados del ejercicio
const EXERCISE_STATES = {
  WELCOME: 'welcome',
  INHALE: 'inhale',
  HOLD: 'hold',
  EXHALE: 'exhale',
  COMPLETE: 'complete',
};

// Ejercicios disponibles
const EXERCISES = {
  BOX: {
    id: 'box',
    name: 'Respiración 4-7-8',
    description: 'Técnica relajante para calmar la mente',
    phases: [
      { state: EXERCISE_STATES.INHALE, duration: 4, label: 'Inhala' },
      { state: EXERCISE_STATES.HOLD, duration: 7, label: 'Sostén' },
      { state: EXERCISE_STATES.EXHALE, duration: 8, label: 'Exhala' },
    ],
    cycles: 3,
  },
  CALM: {
    id: 'calm',
    name: 'Respiración Calma',
    description: 'Para reducir el estrés rápidamente',
    phases: [
      { state: EXERCISE_STATES.INHALE, duration: 4, label: 'Inhala' },
      { state: EXERCISE_STATES.EXHALE, duration: 6, label: 'Exhala' },
    ],
    cycles: 5,
  },
};

const AnimatedBreathingCircle = ({ phase, progress, size = 220 }) => {
  const scale = useRef(new Animated.Value(0.6)).current;
  const innerScale = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0.4)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Animación de pulso continuo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (phase === EXERCISE_STATES.INHALE) {
      // Expandir (inhalar)
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 1,
          duration: progress * 1000,
          useNativeDriver: true,
        }),
        Animated.timing(innerScale, {
          toValue: 1,
          duration: progress * 1000,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: progress * 1000,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (phase === EXERCISE_STATES.EXHALE) {
      // Contraer (exhalar)
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 0.6,
          duration: progress * 1000,
          useNativeDriver: true,
        }),
        Animated.timing(innerScale, {
          toValue: 0.7,
          duration: progress * 1000,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: progress * 1000,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (phase === EXERCISE_STATES.HOLD) {
      // Mantener
      scale.setValue(1);
      innerScale.setValue(1);
      opacity.setValue(0.9);
    }
  }, [phase, progress]);

  return (
    <View style={[styles.breathingCircleContainer, { width: size, height: size }]}>
      {/* Anillos exteriores */}
      <Animated.View
        style={[
          styles.breathingRing,
          {
            width: size * 1.3,
            height: size * 1.3,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />
      
      <Animated.View
        style={[
          styles.breathingRing,
          {
            width: size * 1.15,
            height: size * 1.15,
            opacity: 0.3,
          },
        ]}
      />
      
      {/* Círculo principal animado */}
      <Animated.View
        style={[
          styles.breathingCircle,
          {
            width: size,
            height: size,
            transform: [{ scale }],
            opacity,
          },
        ]}
      >
        {/* Círculo interior */}
        <Animated.View
          style={[
            styles.breathingInner,
            {
              transform: [{ scale: innerScale }],
            },
          ]}
        />
      </Animated.View>
    </View>
  );
};

const MindfulnessScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [exerciseState, setExerciseState] = useState(EXERCISE_STATES.WELCOME);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [currentCycle, setCurrentCycle] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    StatusBar.setBarStyle('dark-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor(COLORS.bg);
      StatusBar.setTranslucent(false);
    }

    const currentUser = auth().currentUser;
    setUser(currentUser);

    // Animación de entrada
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    let interval;
    
    if (isRunning && selectedExercise && countdown > 0) {
      interval = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (isRunning && countdown === 0 && selectedExercise) {
      // Avanzar a la siguiente fase
      const phases = selectedExercise.phases;
      const nextPhase = currentPhase + 1;
      
      if (nextPhase >= phases.length) {
        // Completar ciclo
        const nextCycle = currentCycle + 1;
        
        if (nextCycle >= selectedExercise.cycles) {
          // Ejercicio completado
          setExerciseState(EXERCISE_STATES.COMPLETE);
          setIsRunning(false);
        } else {
          // Nuevo ciclo
          setCurrentCycle(nextCycle);
          setCurrentPhase(0);
          setExerciseState(phases[0].state);
          setCountdown(phases[0].duration);
        }
      } else {
        // Siguiente fase
        setCurrentPhase(nextPhase);
        setExerciseState(phases[nextPhase].state);
        setCountdown(phases[nextPhase].duration);
      }
    }

    return () => clearInterval(interval);
  }, [isRunning, countdown, currentPhase, currentCycle, selectedExercise]);

  const startExercise = (exercise) => {
    setSelectedExercise(exercise);
    setCurrentPhase(0);
    setCurrentCycle(0);
    setExerciseState(exercise.phases[0].state);
    setCountdown(exercise.phases[0].duration);
    setIsRunning(true);
  };

  const pauseExercise = () => {
    setIsRunning(!isRunning);
  };

  const resetExercise = () => {
    setSelectedExercise(null);
    setExerciseState(EXERCISE_STATES.WELCOME);
    setIsRunning(false);
    setCurrentPhase(0);
    setCurrentCycle(0);
    setCountdown(0);
  };

  const getPhaseLabel = () => {
    if (!selectedExercise) return '';
    const phase = selectedExercise.phases[currentPhase];
    return phase.label;
  };

  const getCurrentInstruction = () => {
    switch (exerciseState) {
      case EXERCISE_STATES.INHALE:
        return 'Respira profundamente...';
      case EXERCISE_STATES.HOLD:
        return 'Mantén la respiración...';
      case EXERCISE_STATES.EXHALE:
        return 'Exhala suavemente...';
      default:
        return '';
    }
  };

  if (exerciseState === EXERCISE_STATES.WELCOME) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <ChevronLeftIcon size={28} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>RESPIRAR</Text>
            <View style={{ width: 28 }} />
          </View>

          <Animated.View 
            style={[
              styles.welcomeContent,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {/* Círculo decorativo */}
            <View style={styles.welcomeCircle}>
              <View style={styles.welcomeCircleInner}>
                <View style={styles.welcomeCircleDot} />
              </View>
            </View>

            {/* Título */}
            <Text style={styles.welcomeTitle}>Hola,{'\n'}soy Tranki</Text>
            <Text style={styles.welcomeSubtitle}>
              Estoy aquí para{'\n'}acompañarte en tu{'\n'}respiración profunda
            </Text>

            {/* Botón continuar */}
            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => setExerciseState('select')}
              activeOpacity={0.8}
            >
              <Text style={styles.continueButtonText}>Continuar</Text>
            </TouchableOpacity>
          </Animated.View>
        </SafeAreaView>
      </View>
    );
  }

  if (exerciseState === 'select') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setExerciseState(EXERCISE_STATES.WELCOME)}>
              <ChevronLeftIcon size={28} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Elige ejercicio</Text>
            <View style={{ width: 28 }} />
          </View>

          <View style={styles.exercisesContainer}>
            {Object.values(EXERCISES).map((exercise, index) => (
              <TouchableOpacity
                key={exercise.id}
                style={styles.exerciseCard}
                onPress={() => startExercise(exercise)}
                activeOpacity={0.9}
              >
                <View style={styles.exerciseIcon}>
                  <View style={styles.exerciseCircle}>
                    <View style={styles.exerciseCircleInner} />
                  </View>
                </View>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                <Text style={styles.exerciseDescription}>{exercise.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (exerciseState === EXERCISE_STATES.COMPLETE) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={resetExercise}>
              <ChevronLeftIcon size={28} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>RESPIRAR</Text>
            <View style={{ width: 28 }} />
          </View>

          <View style={styles.completeContent}>
            <View style={styles.completeCircle}>
              <View style={styles.completeCircleInner}>
                <View style={styles.completeCheckmark} />
              </View>
            </View>

            <Text style={styles.completeTitle}>¡Buen trabajo!</Text>
            <Text style={styles.completeSubtitle}>
              Has completado el ejercicio de respiración
            </Text>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={resetExercise}
              activeOpacity={0.8}
            >
              <Text style={styles.actionButtonText}>Repetir ejercicio</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={() => {/* Implementar chat */}}
              activeOpacity={0.8}
            >
              <MessageIcon size={20} color={COLORS.text} />
              <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
                Hablar con Tranki
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={() => {/* Implementar registro de emoción */}}
              activeOpacity={0.8}
            >
              <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
                Registrar emoción
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Ejercicio en progreso
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={resetExercise}>
            <ChevronLeftIcon size={28} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {selectedExercise?.name}
          </Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.exerciseContent}>
          {/* Círculo animado */}
          <AnimatedBreathingCircle 
            phase={exerciseState}
            progress={selectedExercise?.phases[currentPhase]?.duration || 4}
          />

          {/* Instrucción */}
          <Text style={styles.phaseLabel}>{getPhaseLabel()}</Text>
          <Text style={styles.instruction}>{getCurrentInstruction()}</Text>

          {/* Contador */}
          <Text style={styles.countdown}>{countdown}</Text>

          {/* Progreso */}
          <Text style={styles.progress}>
            Ciclo {currentCycle + 1} de {selectedExercise?.cycles}
          </Text>

          {/* Botón pausa */}
          <TouchableOpacity
            style={styles.pauseButton}
            onPress={pauseExercise}
            activeOpacity={0.8}
          >
            <Text style={styles.pauseButtonText}>
              {isRunning ? 'Pausar ejercicio' : 'Continuar'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  safeArea: {
    flex: 1,
    paddingBottom: 100, // Espacio para tab bar (70px + 20px bottom + margen)
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 60, // Espacio para StatusBar
    paddingBottom: 16,
    backgroundColor: COLORS.bg,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 1.5,
  },
  welcomeContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  welcomeCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  welcomeCircleInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeCircleDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.white,
  },
  welcomeTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 38,
  },
  welcomeSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },
  continueButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 50,
    borderRadius: 30,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.3,
  },
  exercisesContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 10,
    gap: 16,
  },
  exerciseCard: {
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  exerciseIcon: {
    marginBottom: 16,
  },
  exerciseCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  exerciseCircleInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  exerciseDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textLight,
    textAlign: 'center',
  },
  exerciseContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  breathingCircleContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
  },
  breathingRing: {
    position: 'absolute',
    borderRadius: 1000,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    opacity: 0.15,
  },
  breathingCircle: {
    borderRadius: 1000,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  breathingInner: {
    width: '50%',
    height: '50%',
    borderRadius: 1000,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  avatarContainer: {
    position: 'absolute',
  },
  phaseLabel: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  instruction: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textLight,
    marginBottom: 16,
  },
  countdown: {
    fontSize: 56,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 10,
  },
  progress: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 25,
  },
  pauseButton: {
    backgroundColor: COLORS.white,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: COLORS.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pauseButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  completeContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  completeCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  completeCircleInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeCheckmark: {
    width: 30,
    height: 15,
    borderLeftWidth: 4,
    borderBottomWidth: 4,
    borderColor: COLORS.white,
    transform: [{ rotate: '-45deg' }],
    marginTop: -8,
    marginLeft: 5,
  },
  completeTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  completeSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 35,
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  secondaryButton: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
  secondaryButtonText: {
    color: COLORS.text,
  },
});

export default MindfulnessScreen;