// src/screens/SleepScreen.js - Versión Minimalista ONE PAGE

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  Platform,
  Animated,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import auth from '@react-native-firebase/auth';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';

import firebaseService from '../services/firebase';

// Componentes de iconos SVG embebidos
const MoonIcon = ({ size = 24, color = '#fff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </Svg>
);

const SunIcon = ({ size = 24, color = '#fff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="5" />
    <Line x1="12" y1="1" x2="12" y2="3" />
    <Line x1="12" y1="21" x2="12" y2="23" />
    <Line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <Line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <Line x1="1" y1="12" x2="3" y2="12" />
    <Line x1="21" y1="12" x2="23" y2="12" />
    <Line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <Line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </Svg>
);

const BarChartIcon = ({ size = 24, color = '#fff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Line x1="18" y1="20" x2="18" y2="10" />
    <Line x1="12" y1="20" x2="12" y2="4" />
    <Line x1="6" y1="20" x2="6" y2="14" />
  </Svg>
);

const CalendarIcon = ({ size = 24, color = '#fff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <Line x1="16" y1="2" x2="16" y2="6" />
    <Line x1="8" y1="2" x2="8" y2="6" />
    <Line x1="3" y1="10" x2="21" y2="10" />
  </Svg>
);

// Helper para formatear fechas
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const COLORS = {
  bg: '#0A0E14',
  surface: '#1A1F2E',
  surfaceLight: '#252C3D',
  accent: '#6366F1',
  accentDark: '#4F46E5',
  text: '#E5E7EB',
  textSecondary: '#9CA3AF',
  success: '#10B981',
  border: '#2D3748',
};

const formatTime = (date) => {
  if (!date) return '--:--';
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
};

const calculateSleepDuration = (sleepTime, wakeTime) => {
  let diff = wakeTime - sleepTime;
  if (diff < 0) diff += 24 * 60 * 60 * 1000;
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return { hours, minutes };
};

const SleepScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [sleepTime, setSleepTime] = useState(null);
  const [wakeTime, setWakeTime] = useState(null);
  const [showSleepPicker, setShowSleepPicker] = useState(false);
  const [showWakePicker, setShowWakePicker] = useState(false);
  const [tempTime, setTempTime] = useState(new Date());
  const [saving, setSaving] = useState(false);
  
  // Animaciones
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('transparent');
      StatusBar.setTranslucent(true);
    }
    
    const currentUser = auth().currentUser;
    setUser(currentUser);

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
    ]).start();
  }, []);

  const handleSleepTimeChange = (event, selectedDate) => {
    if (Platform.OS === 'android') setShowSleepPicker(false);
    if (selectedDate) setSleepTime(selectedDate);
  };

  const handleWakeTimeChange = (event, selectedDate) => {
    if (Platform.OS === 'android') setShowWakePicker(false);
    if (selectedDate) setWakeTime(selectedDate);
  };

  const handleSaveSleep = async () => {
    if (!sleepTime || !wakeTime || !user) return;

    const duration = calculateSleepDuration(sleepTime, wakeTime);
    
    // Validar duración razonable
    if (duration.hours > 16 || duration.hours < 1) {
      return;
    }

    setSaving(true);
    
    try {
      const sleepData = {
        sleepTime: sleepTime.toISOString(),
        wakeTime: wakeTime.toISOString(),
        duration: {
          hours: duration.hours,
          minutes: duration.minutes
        },
        date: formatDate(new Date())
      };

      await firebaseService.saveSleepRecord(user.uid, sleepData);
      
      // Reset y feedback
      setTimeout(() => {
        setSleepTime(null);
        setWakeTime(null);
        setSaving(false);
      }, 800);
      
    } catch (error) {
      console.error('Error saving sleep:', error);
      setSaving(false);
    }
  };

  const duration = sleepTime && wakeTime ? calculateSleepDuration(sleepTime, wakeTime) : null;
  const isComplete = sleepTime && wakeTime;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Sueño</Text>
            <Text style={styles.headerSubtitle}>Registra tus horas de descanso</Text>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => navigation.navigate('SleepStats')}
            >
              <BarChartIcon size={20} color={COLORS.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => navigation.navigate('SleepCalendar')}
            >
              <CalendarIcon size={20} color={COLORS.text} />
            </TouchableOpacity>
          </View>
        </View>

        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {/* Duración central */}
          {duration && (
            <View style={styles.durationContainer}>
              <Text style={styles.durationLabel}>Duración</Text>
              <Text style={styles.durationValue}>
                {duration.hours}h {duration.minutes}m
              </Text>
            </View>
          )}

          {/* Time Cards */}
          <View style={styles.timeCardsContainer}>
            {/* Sleep Time */}
            <TouchableOpacity
              style={[styles.timeCard, sleepTime && styles.timeCardActive]}
              onPress={() => {
                setTempTime(sleepTime || new Date());
                setShowSleepPicker(true);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.timeIconWrapper}>
                <MoonIcon 
                  size={32} 
                  color={sleepTime ? COLORS.accent : COLORS.textSecondary}
                />
              </View>
              <Text style={[styles.timeLabel, sleepTime && styles.timeLabelActive]}>
                Dormir
              </Text>
              <Text style={[styles.timeValue, !sleepTime && styles.timeValueEmpty]}>
                {formatTime(sleepTime)}
              </Text>
            </TouchableOpacity>

            {/* Wake Time */}
            <TouchableOpacity
              style={[
                styles.timeCard,
                !sleepTime && styles.timeCardDisabled,
                wakeTime && styles.timeCardActive
              ]}
              onPress={() => {
                if (!sleepTime) return;
                setTempTime(wakeTime || new Date());
                setShowWakePicker(true);
              }}
              activeOpacity={0.7}
              disabled={!sleepTime}
            >
              <View style={styles.timeIconWrapper}>
                <SunIcon 
                  size={32} 
                  color={wakeTime ? COLORS.accent : COLORS.textSecondary}
                />
              </View>
              <Text style={[
                styles.timeLabel,
                !sleepTime && styles.timeLabelDisabled,
                wakeTime && styles.timeLabelActive
              ]}>
                Despertar
              </Text>
              <Text style={[
                styles.timeValue,
                !sleepTime && styles.timeValueDisabled,
                !wakeTime && styles.timeValueEmpty
              ]}>
                {formatTime(wakeTime)}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Action Button */}
          {isComplete && (
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonSaving]}
              onPress={handleSaveSleep}
              disabled={saving}
              activeOpacity={0.8}
            >
              <Text style={styles.saveButtonText}>
                {saving ? 'Guardando...' : 'Guardar registro'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Reset Button */}
          {(sleepTime || wakeTime) && !saving && (
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => {
                setSleepTime(null);
                setWakeTime(null);
              }}
            >
              <Text style={styles.resetButtonText}>Reiniciar</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </SafeAreaView>

      {/* Time Pickers */}
      {showSleepPicker && (
        <DateTimePicker
          value={tempTime}
          mode="time"
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleSleepTimeChange}
        />
      )}

      {showWakePicker && (
        <DateTimePicker
          value={tempTime}
          mode="time"
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleWakeTimeChange}
        />
      )}
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 20 : 50,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 60,
  },
  durationContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  durationLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  durationValue: {
    fontSize: 48,
    fontWeight: '700',
    color: COLORS.accent,
    letterSpacing: -2,
  },
  timeCardsContainer: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
    marginBottom: 32,
  },
  timeCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    minHeight: 180,
    justifyContent: 'center',
  },
  timeCardActive: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.surfaceLight,
  },
  timeCardDisabled: {
    opacity: 0.4,
  },
  timeIconWrapper: {
    marginBottom: 16,
  },
  timeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  timeLabelActive: {
    color: COLORS.text,
  },
  timeLabelDisabled: {
    color: COLORS.textSecondary,
  },
  timeValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  timeValueEmpty: {
    color: COLORS.textSecondary,
  },
  timeValueDisabled: {
    color: COLORS.textSecondary,
  },
  saveButton: {
    width: '100%',
    backgroundColor: COLORS.accent,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  saveButtonSaving: {
    backgroundColor: COLORS.accentDark,
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  resetButton: {
    marginTop: 16,
    paddingVertical: 12,
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});

export default SleepScreen;