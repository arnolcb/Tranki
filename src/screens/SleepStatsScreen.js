// src/screens/SleepStatsScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
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
  lightSleep: '#FFB74D',
  deepSleep: '#4A90E2',
  awake: '#E74C3C',
};

// Datos de ejemplo
const SAMPLE_DATA = {
  quality: {
    light: 29,
    deep: 54,
    awake: 17,
  },
  weeklyHours: [
    { day: 'L', hours: 6.5, date: '2024-01-01' },
    { day: 'M', hours: 5.5, date: '2024-01-02' },
    { day: 'M', hours: 7.0, date: '2024-01-03' },
    { day: 'J', hours: 6.0, date: '2024-01-04' },
    { day: 'V', hours: 8.0, date: '2024-01-05' },
    { day: 'S', hours: 7.5, date: '2024-01-06' },
    { day: 'D', hours: 9.0, date: '2024-01-07' },
  ],
  average: 7.1,
  goal: 8.0,
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

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View
        style={{
          transform: [{ rotate: '-90deg' }],
        }}
      >
        {/* Círculo de fondo */}
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: '#374151',
          }}
        />
        
        {/* Círculo de progreso */}
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
            transform: [
              {
                rotate: animatedValue.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0deg', '360deg'],
                }),
              },
            ],
          }}
        />
      </Animated.View>

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
  const maxValue = Math.max(...data.map(d => d.hours));
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
            item.hours >= 7 ? THEME_COLORS.deepSleep :
            item.hours >= 6 ? THEME_COLORS.lightSleep :
            THEME_COLORS.awake;

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
            bottom: (maxHeight * (SAMPLE_DATA.goal / maxValue) * 100) / 100 + 30,
          },
        ]}
      >
        <View style={styles.goalLineDash} />
        <Text style={styles.goalLineText}>Meta: {SAMPLE_DATA.goal}h</Text>
      </View>
    </View>
  );
};

const SleepStatsScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
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
  }, []);

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
          <Text style={styles.headerTitle}>CALIDAD DE SUEÑO</Text>
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

          {/* Gráficos circulares de calidad */}
          <Animated.View style={[styles.qualitySection, { opacity: fadeAnim }]}>
            <Text style={styles.sectionTitle}>Distribución del sueño</Text>
            
            <View style={styles.qualityGrid}>
              <View style={styles.qualityItem}>
                <CircularProgress
                  percentage={SAMPLE_DATA.quality.light}
                  color={THEME_COLORS.lightSleep}
                  size={100}
                  strokeWidth={10}
                />
                <Text style={styles.qualityLabel}>Sueño ligero</Text>
              </View>

              <View style={styles.qualityItem}>
                <CircularProgress
                  percentage={SAMPLE_DATA.quality.deep}
                  color={THEME_COLORS.deepSleep}
                  size={100}
                  strokeWidth={10}
                />
                <Text style={styles.qualityLabel}>Sueño profundo</Text>
              </View>

              <View style={styles.qualityItem}>
                <CircularProgress
                  percentage={SAMPLE_DATA.quality.awake}
                  color={THEME_COLORS.awake}
                  size={100}
                  strokeWidth={10}
                />
                <Text style={styles.qualityLabel}>Despierto</Text>
              </View>
            </View>
          </Animated.View>

          {/* Promedio semanal */}
          <Animated.View style={[styles.averageCard, { opacity: fadeAnim }]}>
            <View style={styles.averageHeader}>
              <CustomIcons.Moon size={24} color={THEME_COLORS.accent} />
              <Text style={styles.averageTitle}>Promedio semanal</Text>
            </View>
            <Text style={styles.averageValue}>
              {SAMPLE_DATA.average.toFixed(1)} horas
            </Text>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${(SAMPLE_DATA.average / SAMPLE_DATA.goal) * 100}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.goalText}>
              Meta: {SAMPLE_DATA.goal} horas por noche
            </Text>
          </Animated.View>

          {/* Gráfico de barras */}
          <Animated.View style={[styles.chartSection, { opacity: fadeAnim }]}>
            <Text style={styles.sectionTitle}>Horas por día</Text>
            <BarChart data={SAMPLE_DATA.weeklyHours} />
          </Animated.View>

          {/* Leyenda */}
          <Animated.View style={[styles.legend, { opacity: fadeAnim }]}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: THEME_COLORS.deepSleep }]} />
              <Text style={styles.legendText}>Óptimo (7+ hrs)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: THEME_COLORS.lightSleep }]} />
              <Text style={styles.legendText}>Aceptable (6-7 hrs)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: THEME_COLORS.awake }]} />
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
    marginBottom: 30,
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

  // Sección de calidad
  qualitySection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME_COLORS.light,
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  qualityGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: THEME_COLORS.cardBg,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  qualityItem: {
    alignItems: 'center',
    gap: 12,
  },
  qualityLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME_COLORS.light,
    textAlign: 'center',
  },
  circularProgressText: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME_COLORS.light,
  },

  // Tarjeta de promedio
  averageCard: {
    backgroundColor: THEME_COLORS.cardBg,
    borderRadius: 20,
    padding: 24,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#374151',
  },
  averageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  averageTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: THEME_COLORS.light,
  },
  averageValue: {
    fontSize: 42,
    fontWeight: '700',
    color: THEME_COLORS.accent,
    marginBottom: 16,
    letterSpacing: -2,
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: '#374151',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    backgroundColor: THEME_COLORS.accent,
    borderRadius: 6,
  },
  goalText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },

  // Gráfico de barras
  chartSection: {
    marginBottom: 30,
  },
  barChartContainer: {
    backgroundColor: THEME_COLORS.cardBg,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#374151',
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
    color: THEME_COLORS.light,
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
    height: 2,
    backgroundColor: '#6B7280',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#6B7280',
  },
  goalLineText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
  },

  // Leyenda
  legend: {
    backgroundColor: THEME_COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#374151',
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
    color: THEME_COLORS.light,
    fontWeight: '500',
  },
});

export default SleepStatsScreen;