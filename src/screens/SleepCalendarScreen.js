// src/screens/SleepCalendarScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import CustomIcons from '../components/CustomIcons';
import { COLORS } from '../constants/colors';

const { width } = Dimensions.get('window');

const THEME_COLORS = {
  primary: '#1A2332',
  darkBg: '#0F1419',
  cardBg: '#1E2937',
  accent: '#FFB74D',
  light: '#FEFFFF',
  deepSleep: '#4A90E2',
  lightSleep: '#FFB74D',
  poorSleep: '#E74C3C',
  noData: '#374151',
};

const SLEEP_QUALITY = {
  DEEP: 'deep',
  LIGHT: 'light',
  POOR: 'poor',
  NONE: 'none',
};

// Datos de ejemplo para el mes
const generateMonthData = () => {
  const days = [];
  const daysInMonth = 31;
  const startDay = 1; // Lunes (0 = Domingo, 1 = Lunes, etc.)

  // Días vacíos al inicio
  for (let i = 0; i < startDay; i++) {
    days.push({ isEmpty: true });
  }

  // Días del mes
  for (let day = 1; day <= daysInMonth; day++) {
    const random = Math.random();
    let quality = SLEEP_QUALITY.NONE;
    let hours = 0;

    if (day <= new Date().getDate()) {
      if (random > 0.7) {
        quality = SLEEP_QUALITY.DEEP;
        hours = 7 + Math.random() * 2;
      } else if (random > 0.4) {
        quality = SLEEP_QUALITY.LIGHT;
        hours = 6 + Math.random();
      } else if (random > 0.2) {
        quality = SLEEP_QUALITY.POOR;
        hours = 4 + Math.random() * 2;
      }
    }

    days.push({
      day,
      quality,
      hours: Math.round(hours * 10) / 10,
      date: `2024-01-${day.toString().padStart(2, '0')}`,
    });
  }

  return days;
};

const SAMPLE_CALENDAR_DATA = generateMonthData();

const getDayColor = (quality) => {
  switch (quality) {
    case SLEEP_QUALITY.DEEP:
      return THEME_COLORS.deepSleep;
    case SLEEP_QUALITY.LIGHT:
      return THEME_COLORS.lightSleep;
    case SLEEP_QUALITY.POOR:
      return THEME_COLORS.poorSleep;
    default:
      return THEME_COLORS.noData;
  }
};

const CalendarDay = ({ day, quality, hours, onPress, isToday }) => {
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

  const color = getDayColor(quality);

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
            borderWidth: isToday ? 3 : 0,
            borderColor: THEME_COLORS.light,
          },
        ]}
      >
        <Text style={[
          styles.dayText,
          quality === SLEEP_QUALITY.NONE && styles.dayTextDisabled
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

  const handleDayPress = (dayData) => {
    if (dayData.quality !== SLEEP_QUALITY.NONE) {
      setSelectedDay(dayData);
    }
  };

  const handleCloseDetails = () => {
    setSelectedDay(null);
  };

  const getQualityLabel = (quality) => {
    switch (quality) {
      case SLEEP_QUALITY.DEEP:
        return 'Profundo';
      case SLEEP_QUALITY.LIGHT:
        return 'Ligero';
      case SLEEP_QUALITY.POOR:
        return 'Pesado';
      default:
        return 'Sin datos';
    }
  };

  const monthName = currentMonth.toLocaleDateString('es-ES', { 
    month: 'long',
    year: 'numeric' 
  });

  const today = new Date().getDate();

  const stats = {
    deepDays: SAMPLE_CALENDAR_DATA.filter(d => d.quality === SLEEP_QUALITY.DEEP).length,
    lightDays: SAMPLE_CALENDAR_DATA.filter(d => d.quality === SLEEP_QUALITY.LIGHT).length,
    poorDays: SAMPLE_CALENDAR_DATA.filter(d => d.quality === SLEEP_QUALITY.POOR).length,
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <CustomIcons.ChevronLeft
            size={24}
            color={THEME_COLORS.light}
            onPress={() => navigation.goBack()}
          />
          <Text style={styles.headerTitle}>DÍAS DE SUEÑO</Text>
          <View style={{ width: 24 }} />
        </Animated.View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Icono decorativo */}
          <Animated.View style={[styles.decorativeIcon, { opacity: fadeAnim }]}>
            <View style={styles.clockIconLarge}>
              <View style={styles.sunIconLarge}>
                {[...Array(12)].map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.sunRayLarge,
                      {
                        transform: [
                          { rotate: `${i * 30}deg` },
                          { translateY: -45 }
                        ]
                      }
                    ]}
                  />
                ))}
              </View>
              <View style={styles.moonIconLarge}>
                <View style={styles.moonInnerLarge} />
              </View>
            </View>
          </Animated.View>

          {/* Selector de mes */}
          <Animated.View style={[styles.monthSelector, { opacity: fadeAnim }]}>
            <TouchableOpacity style={styles.monthArrow}>
              <CustomIcons.ChevronLeft size={20} color={THEME_COLORS.accent} />
            </TouchableOpacity>
            <Text style={styles.monthText}>{monthName}</Text>
            <TouchableOpacity style={styles.monthArrow}>
              <CustomIcons.ChevronRight size={20} color={THEME_COLORS.accent} />
            </TouchableOpacity>
          </Animated.View>

          {/* Leyenda de calidad */}
          <Animated.View style={[styles.qualityLegend, { opacity: fadeAnim }]}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: THEME_COLORS.deepSleep }]} />
              <Text style={styles.legendText}>Profundo</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: THEME_COLORS.lightSleep }]} />
              <Text style={styles.legendText}>Ligero</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: THEME_COLORS.poorSleep }]} />
              <Text style={styles.legendText}>Pesado</Text>
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
              {SAMPLE_CALENDAR_DATA.map((dayData, index) => (
                <CalendarDay
                  key={index}
                  day={dayData.day}
                  quality={dayData.quality}
                  hours={dayData.hours}
                  onPress={() => handleDayPress(dayData)}
                  isToday={dayData.day === today}
                />
              ))}
            </View>
          </Animated.View>

          {/* Estadísticas mensuales */}
          <Animated.View style={[styles.monthStats, { opacity: fadeAnim }]}>
            <Text style={styles.statsTitle}>Resumen del mes</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: THEME_COLORS.deepSleep + '30' }]}>
                  <CustomIcons.TrendingUp size={20} color={THEME_COLORS.deepSleep} />
                </View>
                <Text style={styles.statValue}>{stats.deepDays}</Text>
                <Text style={styles.statLabel}>Días profundos</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: THEME_COLORS.lightSleep + '30' }]}>
                  <CustomIcons.Moon size={20} color={THEME_COLORS.lightSleep} />
                </View>
                <Text style={styles.statValue}>{stats.lightDays}</Text>
                <Text style={styles.statLabel}>Días ligeros</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: THEME_COLORS.poorSleep + '30' }]}>
                  <CustomIcons.AlertCircle size={20} color={THEME_COLORS.poorSleep} />
                </View>
                <Text style={styles.statValue}>{stats.poorDays}</Text>
                <Text style={styles.statLabel}>Días pesados</Text>
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
                <CustomIcons.X size={20} color={THEME_COLORS.light} />
              </TouchableOpacity>
            </View>

            <View style={styles.detailsContent}>
              <View style={[
                styles.qualityBadge,
                { backgroundColor: getDayColor(selectedDay.quality) }
              ]}>
                <Text style={styles.qualityBadgeText}>
                  {getQualityLabel(selectedDay.quality)}
                </Text>
              </View>

              <View style={styles.detailsRow}>
                <CustomIcons.Clock size={20} color={THEME_COLORS.accent} />
                <Text style={styles.detailsLabel}>Horas de sueño</Text>
                <Text style={styles.detailsValue}>{selectedDay.hours}h</Text>
              </View>

              <View style={styles.detailsRow}>
                <CustomIcons.Calendar size={20} color={THEME_COLORS.accent} />
                <Text style={styles.detailsLabel}>Fecha</Text>
                <Text style={styles.detailsValue}>{selectedDay.date}</Text>
              </View>

              <TouchableOpacity
                style={styles.viewMoreButton}
                onPress={() => {
                  handleCloseDetails();
                  navigation.navigate('SleepStats');
                }}
              >
                <Text style={styles.viewMoreText}>Ver más detalles</Text>
                <CustomIcons.ChevronRight size={16} color={THEME_COLORS.accent} />
              </TouchableOpacity>
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
    backgroundColor: THEME_COLORS.darkBg,
  },
  safeArea: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 20 : 50,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME_COLORS.light,
    letterSpacing: 1,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  // Icono decorativo
  decorativeIcon: {
    alignItems: 'center',
    marginBottom: 24,
  },
  clockIconLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: THEME_COLORS.cardBg,
    borderWidth: 4,
    borderColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sunIconLarge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: THEME_COLORS.accent,
    position: 'absolute',
    right: -10,
    top: -10,
  },
  sunRayLarge: {
    position: 'absolute',
    width: 4,
    height: 15,
    backgroundColor: THEME_COLORS.accent,
    borderRadius: 2,
    top: '50%',
    left: '50%',
    marginLeft: -2,
    marginTop: -7.5,
  },
  moonIconLarge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E3E9F0',
    position: 'absolute',
    left: -10,
    bottom: -10,
  },
  moonInnerLarge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME_COLORS.cardBg,
    position: 'absolute',
    right: 0,
    top: 5,
  },

  // Selector de mes
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME_COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  monthArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 183, 77, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthText: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME_COLORS.light,
    textTransform: 'capitalize',
  },

  // Leyenda
  qualityLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: THEME_COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME_COLORS.light,
  },

  // Calendario
  calendarContainer: {
    backgroundColor: THEME_COLORS.cardBg,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#374151',
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
    fontWeight: '700',
    color: '#9CA3AF',
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
    fontWeight: '700',
    color: THEME_COLORS.light,
  },
  dayTextDisabled: {
    color: '#6B7280',
  },

  // Estadísticas mensuales
  monthStats: {
    marginBottom: 100,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME_COLORS.light,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: THEME_COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: THEME_COLORS.light,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    textAlign: 'center',
  },

  // Panel de detalles
  detailsPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: THEME_COLORS.cardBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: '#374151',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 20,
  },
  detailsHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#4B5563',
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
    fontSize: 22,
    fontWeight: '700',
    color: THEME_COLORS.light,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
    color: THEME_COLORS.light,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 12,
  },
  detailsLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  detailsValue: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME_COLORS.light,
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 183, 77, 0.1)',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  viewMoreText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME_COLORS.accent,
  },
});

export default SleepCalendarScreen;