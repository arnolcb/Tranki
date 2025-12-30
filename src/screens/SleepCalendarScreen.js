// src/screens/SleepCalendarScreen.js - Versión funcional con SVG embebidos
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Animated,
  Platform,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import Svg, { Path, Circle, Line, Polyline } from 'react-native-svg';
import firebaseService from '../services/firebase';

const COLORS = {
  bg: '#0A0E14',
  surface: '#1A1F2E',
  surfaceLight: '#252C3D',
  accent: '#6366F1',
  text: '#E5E7EB',
  textSecondary: '#9CA3AF',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  border: '#2D3748',
};

// Iconos SVG
const ChevronLeftIcon = ({ size = 24, color = '#fff', onPress }) => (
  <TouchableOpacity onPress={onPress}>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="15 18 9 12 15 6" />
    </Svg>
  </TouchableOpacity>
);

const ChevronRightIcon = ({ size = 24, color = '#fff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Polyline points="9 18 15 12 9 6" />
  </Svg>
);

const ClockIcon = ({ size = 24, color = '#fff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="10" />
    <Polyline points="12 6 12 12 16 14" />
  </Svg>
);

const CalendarIcon = ({ size = 24, color = '#fff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M3 4h18v18H3zM16 2v4M8 2v4M3 10h18" />
  </Svg>
);

const XIcon = ({ size = 24, color = '#fff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Line x1="18" y1="6" x2="6" y2="18" />
    <Line x1="6" y1="6" x2="18" y2="18" />
  </Svg>
);

const TrendingUpIcon = ({ size = 24, color = '#fff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <Polyline points="17 6 23 6 23 12" />
  </Svg>
);

const MoonIcon = ({ size = 24, color = '#fff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </Svg>
);

const AlertCircleIcon = ({ size = 24, color = '#fff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="10" />
    <Line x1="12" y1="8" x2="12" y2="12" />
    <Line x1="12" y1="16" x2="12.01" y2="16" />
  </Svg>
);

// Helper para formatear fechas
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDayColor = (hours) => {
  if (!hours || hours === 0) return COLORS.border;
  if (hours >= 7) return COLORS.success;
  if (hours >= 6) return COLORS.warning;
  return COLORS.error;
};

const getQualityLabel = (hours) => {
  if (!hours || hours === 0) return 'Sin datos';
  if (hours >= 7) return 'Óptimo';
  if (hours >= 6) return 'Aceptable';
  return 'Insuficiente';
};

const CalendarDay = ({ day, hours, onPress, isToday }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  if (!day) {
    return <View style={styles.emptyDay} />;
  }

  const color = getDayColor(hours);

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      style={styles.dayContainer}
    >
      <Animated.View
        style={[
          styles.dayCircle,
          {
            backgroundColor: color,
            transform: [{ scale: scaleAnim }],
            borderWidth: isToday ? 2 : 0,
            borderColor: COLORS.accent,
          },
        ]}
      >
        <Text style={[
          styles.dayText,
          hours === 0 && styles.dayTextDisabled
        ]}>
          {day}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

const SleepCalendarScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [sleepData, setSleepData] = useState([]);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const detailsSlideAnim = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('transparent');
      StatusBar.setTranslucent(true);
    }

    const currentUser = auth().currentUser;
    setUser(currentUser);

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    if (currentUser) {
      loadSleepData(currentUser.uid);
    }
  }, []);

  useEffect(() => {
    if (selectedDay) {
      Animated.spring(detailsSlideAnim, {
        toValue: 0,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.spring(detailsSlideAnim, {
        toValue: 100,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }
  }, [selectedDay]);

  const loadSleepData = async (userId) => {
    try {
      setLoading(true);
      // Cargar datos del mes actual (30 días)
      const history = await firebaseService.getSleepHistory(userId, 31);
      setSleepData(history);
    } catch (error) {
      console.error('Error loading sleep data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateCalendarData = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Ajustar para que Lunes = 0

    const days = [];

    // Días vacíos al inicio
    for (let i = 0; i < startDay; i++) {
      days.push({ isEmpty: true });
    }

    // Días del mes
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDate(new Date(year, month, day));
      const dayData = sleepData.find(d => d.date === dateStr);
      
      days.push({
        day,
        hours: dayData ? dayData.duration.hours + (dayData.duration.minutes / 60) : 0,
        date: dateStr,
        sleepTime: dayData?.sleepTime || null,
        wakeTime: dayData?.wakeTime || null,
        duration: dayData?.duration || null,
      });
    }

    return days;
  };

  const calendarData = generateCalendarData();
  const today = new Date().getDate();
  const isCurrentMonth = 
    currentMonth.getMonth() === new Date().getMonth() &&
    currentMonth.getFullYear() === new Date().getFullYear();

  const stats = {
    optimalDays: calendarData.filter(d => d.hours >= 7).length,
    acceptableDays: calendarData.filter(d => d.hours >= 6 && d.hours < 7).length,
    poorDays: calendarData.filter(d => d.hours > 0 && d.hours < 6).length,
  };

  const monthName = currentMonth.toLocaleDateString('es-ES', { 
    month: 'long',
    year: 'numeric' 
  });

  const handleDayPress = (dayData) => {
    if (dayData.hours > 0) {
      setSelectedDay(dayData);
    }
  };

  const handleCloseDetails = () => {
    setSelectedDay(null);
  };

  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    const date = new Date(isoString);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <ChevronLeftIcon
            size={24}
            color={COLORS.text}
            onPress={() => navigation.goBack()}
          />
          <Text style={styles.headerTitle}>Calendario</Text>
          <View style={{ width: 24 }} />
        </Animated.View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Selector de mes */}
          <Animated.View style={[styles.monthSelector, { opacity: fadeAnim }]}>
            <TouchableOpacity 
              style={styles.monthArrow}
              onPress={() => {
                const newMonth = new Date(currentMonth);
                newMonth.setMonth(newMonth.getMonth() - 1);
                setCurrentMonth(newMonth);
              }}
            >
              <ChevronLeftIcon size={20} color={COLORS.accent} />
            </TouchableOpacity>
            <Text style={styles.monthText}>{monthName}</Text>
            <TouchableOpacity 
              style={styles.monthArrow}
              onPress={() => {
                const newMonth = new Date(currentMonth);
                newMonth.setMonth(newMonth.getMonth() + 1);
                setCurrentMonth(newMonth);
              }}
            >
              <ChevronRightIcon size={20} color={COLORS.accent} />
            </TouchableOpacity>
          </Animated.View>

          {/* Leyenda */}
          <Animated.View style={[styles.qualityLegend, { opacity: fadeAnim }]}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.success }]} />
              <Text style={styles.legendText}>7+ hrs</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.warning }]} />
              <Text style={styles.legendText}>6-7 hrs</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.error }]} />
              <Text style={styles.legendText}>&lt;6 hrs</Text>
            </View>
          </Animated.View>

          {/* Calendario */}
          <Animated.View style={[styles.calendarContainer, { opacity: fadeAnim }]}>
            {/* Días de la semana */}
            <View style={styles.weekDaysRow}>
              {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, index) => (
                <View key={index} style={styles.weekDayContainer}>
                  <Text style={styles.weekDayText}>{day}</Text>
                </View>
              ))}
            </View>

            {/* Días del mes */}
            <View style={styles.daysGrid}>
              {calendarData.map((dayData, index) => (
                <CalendarDay
                  key={index}
                  day={dayData.day}
                  hours={dayData.hours}
                  onPress={() => handleDayPress(dayData)}
                  isToday={isCurrentMonth && dayData.day === today}
                />
              ))}
            </View>
          </Animated.View>

          {/* Estadísticas mensuales */}
          <Animated.View style={[styles.monthStats, { opacity: fadeAnim }]}>
            <Text style={styles.statsTitle}>Resumen del mes</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: COLORS.success + '30' }]}>
                  <TrendingUpIcon size={20} color={COLORS.success} />
                </View>
                <Text style={styles.statValue}>{stats.optimalDays}</Text>
                <Text style={styles.statLabel}>Óptimos</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: COLORS.warning + '30' }]}>
                  <MoonIcon size={20} color={COLORS.warning} />
                </View>
                <Text style={styles.statValue}>{stats.acceptableDays}</Text>
                <Text style={styles.statLabel}>Aceptables</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: COLORS.error + '30' }]}>
                  <AlertCircleIcon size={20} color={COLORS.error} />
                </View>
                <Text style={styles.statValue}>{stats.poorDays}</Text>
                <Text style={styles.statLabel}>Insuficientes</Text>
              </View>
            </View>
          </Animated.View>
        </ScrollView>

        {/* Panel de detalles del día */}
        {selectedDay && (
          <Animated.View
            style={[
              styles.detailsPanel,
              {
                transform: [{ translateY: detailsSlideAnim }],
              },
            ]}
          >
            <View style={styles.detailsHandle} />
            
            <View style={styles.detailsHeader}>
              <Text style={styles.detailsDate}>
                Día {selectedDay.day}
              </Text>
              <TouchableOpacity
                onPress={handleCloseDetails}
                style={styles.closeButton}
              >
                <XIcon size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.detailsContent}>
              <View style={[
                styles.qualityBadge,
                { backgroundColor: getDayColor(selectedDay.hours) }
              ]}>
                <Text style={styles.qualityBadgeText}>
                  {getQualityLabel(selectedDay.hours)}
                </Text>
              </View>

              <View style={styles.detailsRow}>
                <ClockIcon size={20} color={COLORS.accent} />
                <Text style={styles.detailsLabel}>Duración</Text>
                <Text style={styles.detailsValue}>
                  {selectedDay.duration ? 
                    `${selectedDay.duration.hours}h ${selectedDay.duration.minutes}m` : 
                    'N/A'}
                </Text>
              </View>

              <View style={styles.detailsRow}>
                <MoonIcon size={20} color={COLORS.accent} />
                <Text style={styles.detailsLabel}>Dormir</Text>
                <Text style={styles.detailsValue}>{formatTime(selectedDay.sleepTime)}</Text>
              </View>

              <View style={styles.detailsRow}>
                <CalendarIcon size={20} color={COLORS.accent} />
                <Text style={styles.detailsLabel}>Despertar</Text>
                <Text style={styles.detailsValue}>{formatTime(selectedDay.wakeTime)}</Text>
              </View>
            </View>
          </Animated.View>
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 20 : 50,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 150,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  monthArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthText: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
    textTransform: 'capitalize',
  },
  qualityLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text,
  },
  calendarContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  weekDayContainer: {
    flex: 1,
    alignItems: 'center',
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayContainer: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 2,
  },
  emptyDay: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
  },
  dayCircle: {
    flex: 1,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  dayTextDisabled: {
    color: COLORS.textSecondary,
  },
  monthStats: {
    marginBottom: 20,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  detailsPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 20,
  },
  detailsHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  detailsDate: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsContent: {
    gap: 16,
  },
  qualityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 8,
  },
  qualityBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surfaceLight,
    padding: 16,
    borderRadius: 12,
  },
  detailsLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  detailsValue: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
});

export default SleepCalendarScreen;