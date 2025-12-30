// src/screens/SleepStatsScreen.js - Versión funcional con SVG embebidos
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Animated,
  Platform,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import Svg, { Circle, Line, Polyline, Path } from 'react-native-svg';
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
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Polyline points="15 18 9 12 15 6" onPress={onPress} />
  </Svg>
);

const MoonIcon = ({ size = 24, color = '#fff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </Svg>
);

// Helper para formatear fechas
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const CircularProgress = ({ percentage, color, size = 120, strokeWidth = 12 }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: percentage,
      duration: 1500,
      useNativeDriver: true,
    }).start();
  }, [percentage]);

  const rotation = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: COLORS.border,
        }}
      />
      
      <Animated.View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: color,
          borderTopColor: 'transparent',
          borderLeftColor: 'transparent',
          transform: [{ rotate: rotation }],
        }}
      />

      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text style={styles.circularProgressText}>{percentage}%</Text>
      </View>
    </View>
  );
};

const BarChart = ({ data, maxHeight = 200 }) => {
  const maxValue = Math.max(...data.map(d => d.hours), 8);
  const animatedValues = useRef(
    data.map(() => new Animated.Value(0))
  ).current;

  useEffect(() => {
    Animated.stagger(
      100,
      data.map((item, index) =>
        Animated.spring(animatedValues[index], {
          toValue: 1,
          tension: 40,
          friction: 8,
          useNativeDriver: false,
        })
      )
    ).start();
  }, []);

  return (
    <View style={styles.barChartContainer}>
      <View style={styles.barsContainer}>
        {data.map((item, index) => {
          const heightPercentage = (item.hours / maxValue) * 100;
          const animatedHeight = animatedValues[index].interpolate({
            inputRange: [0, 1],
            outputRange: [0, (maxHeight * heightPercentage) / 100],
          });

          const barColor =
            item.hours >= 7 ? COLORS.success :
            item.hours >= 6 ? COLORS.warning :
            COLORS.error;

          return (
            <View key={index} style={styles.barWrapper}>
              <View style={[styles.barContainer, { height: maxHeight }]}>
                <Animated.View
                  style={[
                    styles.bar,
                    {
                      height: animatedHeight,
                      backgroundColor: barColor,
                    },
                  ]}
                />
              </View>
              <Text style={styles.barLabel}>{item.day}</Text>
            </View>
          );
        })}
      </View>

      {/* Línea de meta */}
      <View
        style={[
          styles.goalLine,
          {
            bottom: (maxHeight * (8 / maxValue) * 100) / 100 + 30,
          },
        ]}
      >
        <View style={styles.goalLineDash} />
        <Text style={styles.goalLineText}>Meta: 8h</Text>
      </View>
    </View>
  );
};

const SleepStatsScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [weeklyData, setWeeklyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

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
      loadStats(currentUser.uid);
    }
  }, []);

  const loadStats = async (userId) => {
    try {
      setLoading(true);
      
      // Obtener estadísticas de 7 días
      const sleepStats = await firebaseService.getSleepStats(userId, 7);
      setStats(sleepStats);

      // Obtener historial semanal
      const history = await firebaseService.getSleepHistory(userId, 7);
      
      // Preparar datos para el gráfico
      const daysOfWeek = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
      const weekData = [];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = formatDate(date);
        const dayIndex = date.getDay();
        
        const dayData = history.find(h => h.date === dateStr);
        const hours = dayData ? 
          dayData.duration.hours + (dayData.duration.minutes / 60) : 
          0;
        
        weekData.push({
          day: daysOfWeek[dayIndex],
          hours: Math.round(hours * 10) / 10,
          date: dateStr,
        });
      }
      
      setWeeklyData(weekData);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  // Calcular distribución de calidad
  const totalRecorded = weeklyData.filter(d => d.hours > 0).length;
  const qualityDistribution = {
    optimal: totalRecorded > 0 ? Math.round((weeklyData.filter(d => d.hours >= 7).length / totalRecorded) * 100) : 0,
    acceptable: totalRecorded > 0 ? Math.round((weeklyData.filter(d => d.hours >= 6 && d.hours < 7).length / totalRecorded) * 100) : 0,
    poor: totalRecorded > 0 ? Math.round((weeklyData.filter(d => d.hours > 0 && d.hours < 6).length / totalRecorded) * 100) : 0,
  };

  const averageHours = stats?.averageHours || 0;
  const averageMinutes = stats?.averageMinutes || 0;
  const goalHours = 8;
  const progressPercentage = Math.min(((averageHours + averageMinutes / 60) / goalHours) * 100, 100);

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
          <Text style={styles.headerTitle}>Estadísticas</Text>
          <View style={{ width: 24 }} />
        </Animated.View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Gráficos circulares de calidad */}
          <Animated.View style={[styles.qualitySection, { opacity: fadeAnim }]}>
            <Text style={styles.sectionTitle}>Distribución semanal</Text>
            
            <View style={styles.qualityGrid}>
              <View style={styles.qualityItem}>
                <CircularProgress
                  percentage={qualityDistribution.optimal}
                  color={COLORS.success}
                  size={100}
                  strokeWidth={10}
                />
                <Text style={styles.qualityLabel}>Óptimo</Text>
              </View>

              <View style={styles.qualityItem}>
                <CircularProgress
                  percentage={qualityDistribution.acceptable}
                  color={COLORS.warning}
                  size={100}
                  strokeWidth={10}
                />
                <Text style={styles.qualityLabel}>Aceptable</Text>
              </View>

              <View style={styles.qualityItem}>
                <CircularProgress
                  percentage={qualityDistribution.poor}
                  color={COLORS.error}
                  size={100}
                  strokeWidth={10}
                />
                <Text style={styles.qualityLabel}>Insuficiente</Text>
              </View>
            </View>
          </Animated.View>

          {/* Promedio semanal */}
          <Animated.View style={[styles.averageCard, { opacity: fadeAnim }]}>
            <View style={styles.averageHeader}>
              <MoonIcon size={24} color={COLORS.accent} />
              <Text style={styles.averageTitle}>Promedio semanal</Text>
            </View>
            <Text style={styles.averageValue}>
              {averageHours}h {averageMinutes}m
            </Text>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${progressPercentage}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.goalText}>
              Meta: 8 horas por noche
            </Text>
          </Animated.View>

          {/* Gráfico de barras */}
          <Animated.View style={[styles.chartSection, { opacity: fadeAnim }]}>
            <Text style={styles.sectionTitle}>Últimos 7 días</Text>
            <BarChart data={weeklyData} />
          </Animated.View>

          {/* Leyenda */}
          <Animated.View style={[styles.legend, { opacity: fadeAnim }]}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: COLORS.success }]} />
              <Text style={styles.legendText}>Óptimo (7+ hrs)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: COLORS.warning }]} />
              <Text style={styles.legendText}>Aceptable (6-7 hrs)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: COLORS.error }]} />
              <Text style={styles.legendText}>Insuficiente (&lt;6 hrs)</Text>
            </View>
          </Animated.View>
        </ScrollView>
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
    paddingBottom: 40,
  },
  qualitySection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  qualityGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  qualityItem: {
    alignItems: 'center',
    gap: 12,
  },
  qualityLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  circularProgressText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  averageCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  averageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  averageTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
  },
  averageValue: {
    fontSize: 38,
    fontWeight: '700',
    color: COLORS.accent,
    marginBottom: 16,
    letterSpacing: -1.5,
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: COLORS.border,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 5,
  },
  goalText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  chartSection: {
    marginBottom: 30,
  },
  barChartContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  barWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  barContainer: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
  },
  bar: {
    width: '80%',
    borderRadius: 6,
    minHeight: 20,
  },
  barLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 8,
  },
  goalLine: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goalLineDash: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.textSecondary,
    opacity: 0.5,
  },
  goalLineText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  legend: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  legendColor: {
    width: 20,
    height: 20,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
});

export default SleepStatsScreen;