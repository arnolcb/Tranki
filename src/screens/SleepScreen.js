// src/screens/SleepScreen.js - VERSIÓN MEJORADA CON TIME PICKER

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
  SafeAreaView,
  Platform,
  ScrollView,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import auth from '@react-native-firebase/auth';

import CustomIcons from '../components/CustomIcons';
import { COLORS } from '../constants/colors';

const THEME_COLORS = {
  primary: '#1A2332',
  darkBg: '#0F1419',
  cardBg: '#1E2937',
  accent: '#FFB74D',
  light: '#FEFFFF',
};

const formatTime = (date) => {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
};

const calculateSleepDuration = (sleepTime, wakeTime) => {
  let diff = wakeTime - sleepTime;
  
  // Si la hora de despertar es menor, significa que es al día siguiente
  if (diff < 0) {
    diff += 24 * 60 * 60 * 1000; // Agregar 24 horas
  }
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return { hours, minutes };
};

const SleepScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [sleepTime, setSleepTime] = useState(null);
  const [wakeTime, setWakeTime] = useState(null);
  
  // Estados para el Time Picker
  const [showSleepPicker, setShowSleepPicker] = useState(false);
  const [showWakePicker, setShowWakePicker] = useState(false);
  const [tempTime, setTempTime] = useState(new Date());

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('transparent');
      StatusBar.setTranslucent(true);
    }
    
    const currentUser = auth().currentUser;
    setUser(currentUser);
  }, []);

  // Manejar cambio de hora de dormir
  const handleSleepTimeChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowSleepPicker(false);
    }
    
    if (selectedDate) {
      setSleepTime(selectedDate);
    }
  };

  // Manejar cambio de hora de despertar
  const handleWakeTimeChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowWakePicker(false);
    }
    
    if (selectedDate) {
      setWakeTime(selectedDate);
    }
  };

  // Abrir picker de hora de dormir
  const openSleepPicker = () => {
    setTempTime(sleepTime || new Date());
    setShowSleepPicker(true);
  };

  // Abrir picker de hora de despertar
  const openWakePicker = () => {
    if (!sleepTime) {
      Alert.alert('Aviso', 'Primero debes establecer la hora de dormir');
      return;
    }
    setTempTime(wakeTime || new Date());
    setShowWakePicker(true);
  };

  // Guardar sueño
  const handleSaveSleep = () => {
    if (!sleepTime || !wakeTime) {
      Alert.alert('Error', 'Debes establecer ambas horas');
      return;
    }

    const duration = calculateSleepDuration(sleepTime, wakeTime);
    
    // Validar que la duración sea razonable
    if (duration.hours > 16) {
      Alert.alert(
        'Advertencia',
        '¿Realmente dormiste más de 16 horas?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Sí, guardar',
            onPress: () => saveSleepRecord(duration)
          }
        ]
      );
      return;
    }
    
    if (duration.hours < 1) {
      Alert.alert(
        'Advertencia',
        'El tiempo de sueño parece muy corto. ¿Estás seguro?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Sí, guardar',
            onPress: () => saveSleepRecord(duration)
          }
        ]
      );
      return;
    }

    saveSleepRecord(duration);
  };

  const saveSleepRecord = (duration) => {
    Alert.alert(
      '✅ Sueño registrado',
      `Dormiste ${duration.hours}h ${duration.minutes}m`,
      [
        {
          text: 'Ver estadísticas',
          onPress: () => navigation.navigate('SleepStats')
        },
        { 
          text: 'Continuar', 
          style: 'cancel',
          onPress: () => {
            setSleepTime(null);
            setWakeTime(null);
          }
        }
      ]
    );
  };

  // Botón de "ahora" rápido
  const setNowSleep = () => {
    setSleepTime(new Date());
  };

  const setNowWake = () => {
    if (!sleepTime) {
      Alert.alert('Aviso', 'Primero debes establecer la hora de dormir');
      return;
    }
    setWakeTime(new Date());
  };

  const duration = sleepTime && wakeTime ? calculateSleepDuration(sleepTime, wakeTime) : null;

  return (
    <View style={[styles.container, { backgroundColor: THEME_COLORS.darkBg }]}>
      <StatusBar barStyle="light-content" />
      
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>💤 DORMIR</Text>
          <TouchableOpacity
            style={styles.statsButton}
            onPress={() => navigation.navigate('SleepStats')}
          >
            <CustomIcons.BarChart size={20} color={THEME_COLORS.light} />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Título con instrucciones */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Registra tu sueño</Text>
            <Text style={styles.subtitle}>
              {!sleepTime ? '👇 Comienza estableciendo la hora que dormiste' : 
               !wakeTime ? '👇 Ahora establece la hora que despertaste' :
               '✨ ¡Perfecto! Ahora puedes guardar tu registro'}
            </Text>
          </View>
          
          {/* Badge de duración */}
          {duration && (
            <View style={styles.durationBadge}>
              <CustomIcons.Moon size={20} color={THEME_COLORS.darkBg} />
              <Text style={styles.durationText}>
                {duration.hours}h {duration.minutes}m
              </Text>
            </View>
          )}

          {/* Tarjeta de dormir */}
          <View style={[styles.timeCard, sleepTime && styles.timeCardActive]}>
            <View style={styles.timeIconContainer}>
              <CustomIcons.Moon size={40} color={sleepTime ? THEME_COLORS.accent : '#6B7280'} />
            </View>
            <Text style={[styles.timeLabel, sleepTime && styles.timeLabelActive]}>
              Hora que dormiste
            </Text>
            
            {sleepTime ? (
              <View style={styles.timeDisplayContainer}>
                <Text style={styles.timeDisplay}>{formatTime(sleepTime)}</Text>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={openSleepPicker}
                >
                  <CustomIcons.Edit2 size={16} color={THEME_COLORS.accent} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={[styles.setTimeButton, styles.nowButton]}
                  onPress={setNowSleep}
                >
                  <CustomIcons.Clock size={18} color={THEME_COLORS.darkBg} />
                  <Text style={styles.setTimeButtonText}>Ahora</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.setTimeButton, styles.customButton]}
                  onPress={openSleepPicker}
                >
                  <CustomIcons.Calendar size={18} color={THEME_COLORS.light} />
                  <Text style={[styles.setTimeButtonText, styles.customButtonText]}>
                    Elegir hora
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Tarjeta de despertar */}
          <View style={[
            styles.timeCard, 
            !sleepTime && styles.timeCardDisabled,
            wakeTime && styles.timeCardActive
          ]}>
            <View style={styles.timeIconContainer}>
              <CustomIcons.Sun size={40} color={wakeTime ? THEME_COLORS.accent : '#6B7280'} />
            </View>
            <Text style={[
              styles.timeLabel, 
              !sleepTime && styles.timeLabelDisabled,
              wakeTime && styles.timeLabelActive
            ]}>
              Hora que despertaste
            </Text>
            
            {wakeTime ? (
              <View style={styles.timeDisplayContainer}>
                <Text style={styles.timeDisplay}>{formatTime(wakeTime)}</Text>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={openWakePicker}
                  disabled={!sleepTime}
                >
                  <CustomIcons.Edit2 size={16} color={THEME_COLORS.accent} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={[styles.setTimeButton, styles.nowButton, !sleepTime && styles.buttonDisabled]}
                  onPress={setNowWake}
                  disabled={!sleepTime}
                >
                  <CustomIcons.Clock size={18} color={sleepTime ? THEME_COLORS.darkBg : '#6B7280'} />
                  <Text style={[
                    styles.setTimeButtonText,
                    !sleepTime && styles.setTimeButtonTextDisabled
                  ]}>
                    Ahora
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.setTimeButton, styles.customButton, !sleepTime && styles.buttonDisabled]}
                  onPress={openWakePicker}
                  disabled={!sleepTime}
                >
                  <CustomIcons.Calendar size={18} color={sleepTime ? THEME_COLORS.light : '#6B7280'} />
                  <Text style={[
                    styles.setTimeButtonText, 
                    styles.customButtonText,
                    !sleepTime && styles.setTimeButtonTextDisabled
                  ]}>
                    Elegir hora
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Botón guardar */}
          {sleepTime && wakeTime && (
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveSleep}
            >
              <CustomIcons.Check size={20} color={THEME_COLORS.darkBg} />
              <Text style={styles.saveButtonText}>Registrar sueño</Text>
            </TouchableOpacity>
          )}

          {/* Botón reset */}
          {(sleepTime || wakeTime) && (
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => {
                setSleepTime(null);
                setWakeTime(null);
              }}
            >
              <CustomIcons.X size={16} color="#EF4444" />
              <Text style={styles.resetButtonText}>Reiniciar</Text>
            </TouchableOpacity>
          )}

          {/* Botones de navegación rápida */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('SleepStats')}
            >
              <CustomIcons.BarChart size={18} color={THEME_COLORS.light} />
              <Text style={styles.quickActionText}>Estadísticas</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('SleepCalendar')}
            >
              <CustomIcons.Calendar size={18} color={THEME_COLORS.light} />
              <Text style={styles.quickActionText}>Calendario</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Time Picker para hora de dormir */}
      {showSleepPicker && (
        <DateTimePicker
          value={tempTime}
          mode="time"
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleSleepTimeChange}
        />
      )}

      {/* Time Picker para hora de despertar */}
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
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
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
    fontSize: 26,
    fontWeight: '700',
    color: THEME_COLORS.light,
    letterSpacing: 1,
  },
  statsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    paddingHorizontal: 24,
    marginTop: 10,
    marginBottom: 30,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: THEME_COLORS.light,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 20,
  },
  durationBadge: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: THEME_COLORS.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 30,
    shadowColor: THEME_COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  durationText: {
    fontSize: 22,
    fontWeight: '700',
    color: THEME_COLORS.darkBg,
    letterSpacing: -0.5,
  },
  timeCard: {
    backgroundColor: THEME_COLORS.cardBg,
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 24,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#374151',
  },
  timeCardActive: {
    borderColor: THEME_COLORS.accent,
    backgroundColor: '#1F2937',
  },
  timeCardDisabled: {
    opacity: 0.5,
  },
  timeIconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  timeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 20,
  },
  timeLabelActive: {
    color: THEME_COLORS.light,
  },
  timeLabelDisabled: {
    color: '#6B7280',
  },
  timeDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  timeDisplay: {
    fontSize: 36,
    fontWeight: '700',
    color: THEME_COLORS.accent,
    letterSpacing: -1,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 183, 77, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  setTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  nowButton: {
    backgroundColor: THEME_COLORS.accent,
  },
  customButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: THEME_COLORS.accent,
  },
  buttonDisabled: {
    backgroundColor: '#4B5563',
    borderColor: '#4B5563',
  },
  setTimeButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME_COLORS.darkBg,
  },
  customButtonText: {
    color: THEME_COLORS.light,
  },
  setTimeButtonTextDisabled: {
    color: '#9CA3AF',
  },
  saveButton: {
    backgroundColor: THEME_COLORS.accent,
    paddingVertical: 18,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 24,
    marginHorizontal: 24,
    shadowColor: THEME_COLORS.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: THEME_COLORS.darkBg,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 12,
    marginHorizontal: 24,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 30,
    paddingHorizontal: 24,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: THEME_COLORS.cardBg,
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME_COLORS.light,
  },
});

export default SleepScreen;