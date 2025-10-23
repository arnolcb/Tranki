// src/screens/HistoryScreen.js - Rediseño profesional
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Animated,
  Platform,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import auth from '@react-native-firebase/auth';
import { COLORS } from '../constants/colors';
import { EMOTIONS } from '../constants/emotions';
import FirebaseService from '../services/firebase';
import CustomIcons from '../components/CustomIcons';

const { width } = Dimensions.get('window');

const HistoryScreen = ({ navigation }) => {
  const [emotionHistory, setEmotionHistory] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [filter, setFilter] = useState('week');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [insights, setInsights] = useState(null);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    StatusBar.setBarStyle('dark-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('transparent');
      StatusBar.setTranslucent(true);
    }
    
    const currentUser = auth().currentUser;
    setUser(currentUser);
    if (currentUser) {
      loadEmotionHistory(currentUser.uid);
      loadInsights(currentUser.uid);
    }

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    filterData();
  }, [emotionHistory, filter]);

  const loadEmotionHistory = async (userId) => {
    try {
      setLoading(true);
      const days = filter === 'week' ? 30 : 90;
      const history = await FirebaseService.getEmotionHistory(userId, days);
      setEmotionHistory(history);
    } catch (error) {
      console.error('Error loading emotion history:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInsights = async (userId) => {
    try {
      const insightsData = await FirebaseService.getEmotionInsights(userId, 7);
      setInsights(insightsData);
    } catch (error) {
      console.error('Error loading insights:', error);
    }
  };

  const filterData = () => {
    if (!emotionHistory.length) return;

    const now = new Date();
    let startDate;

    if (filter === 'week') {
      startDate = new Date();
      startDate.setDate(now.getDate() - 7);
    } else {
      startDate = new Date();
      startDate.setDate(now.getDate() - 30);
    }

    const filtered = emotionHistory.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate >= startDate && recordDate <= now;
    });

    setFilteredData(filtered.reverse());
  };

  const prepareChartData = () => {
    if (!filteredData.length) {
      return {
        labels: ['Sin datos'],
        datasets: [{
          data: [0],
          color: () => '#D1D5DB',
        }]
      };
    }

    const labels = filteredData.map(record => {
      const date = new Date(record.date);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    });

    const data = filteredData.map(record => record.value);

    return {
      labels: labels.slice(-7),
      datasets: [{
        data: data.slice(-7),
        color: (opacity = 1) => `rgba(125, 185, 222, ${opacity})`,
        strokeWidth: 3
      }]
    };
  };

  const getEmotionStats = () => {
    if (!filteredData.length) return null;

    const emotionCounts = {
      stressed: 0,
      neutral: 0,
      tranki: 0
    };

    filteredData.forEach(record => {
      emotionCounts[record.emotion]++;
    });

    const total = filteredData.length;
    const mostFrequent = Object.keys(emotionCounts).reduce((a, b) => 
      emotionCounts[a] > emotionCounts[b] ? a : b
    );

    return {
      total,
      counts: emotionCounts,
      mostFrequent,
      percentages: {
        stressed: Math.round((emotionCounts.stressed / total) * 100),
        neutral: Math.round((emotionCounts.neutral / total) * 100),
        tranki: Math.round((emotionCounts.tranki / total) * 100)
      }
    };
  };

  const getEmotionColor = (emotionId) => {
    const colors = {
      stressed: '#EF4444',
      neutral: '#F59E0B',
      tranki: '#10B981'
    };
    return colors[emotionId] || '#6B7280';
  };

  const getEmotionIcon = (emotionId) => {
    const icons = {
      stressed: '😰',
      neutral: '😐',
      tranki: '😊'
    };
    return icons[emotionId] || '😐';
  };

  const renderEmotionStat = (emotionId, count, percentage) => {
    const emotion = Object.values(EMOTIONS).find(e => e.id === emotionId);
    if (!emotion) return null;

    return (
      <View key={emotionId} style={styles.emotionStatCard}>
        <View style={[
          styles.emotionStatIcon, 
          { backgroundColor: getEmotionColor(emotionId) + '20' }
        ]}>
          <View style={[
            styles.emotionStatDot,
            { backgroundColor: getEmotionColor(emotionId) }
          ]} />
        </View>
        <Text style={styles.emotionStatLabel}>{emotion.label}</Text>
        <Text style={[
          styles.emotionStatPercentage, 
          { color: getEmotionColor(emotionId) }
        ]}>
          {percentage}%
        </Text>
        <Text style={styles.emotionStatCount}>{count} días</Text>
      </View>
    );
  };

  const renderInsights = () => {
    const stats = getEmotionStats();
    if (!stats) return null;

    const mostFrequentEmotion = Object.values(EMOTIONS).find(
      e => e.id === stats.mostFrequent
    );
    
    return (
      <View style={styles.insightsSection}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIconWrapper}>
            <CustomIcons.BarChart size={18} color={COLORS.primary} />
          </View>
          <Text style={styles.sectionTitle}>Resumen del período</Text>
        </View>
        
        <View style={styles.emotionStatsGrid}>
          {Object.keys(stats.counts).map(emotionId => 
            renderEmotionStat(
              emotionId, 
              stats.counts[emotionId], 
              stats.percentages[emotionId]
            )
          )}
        </View>

        {/* AI Insights */}
        {insights && (
          <View style={styles.aiInsightsSection}>
            <View style={styles.aiInsightsHeader}>
              <View style={styles.aiIconWrapper}>
                <CustomIcons.TrendingUp size={16} color={COLORS.primary} />
              </View>
              <Text style={styles.aiInsightsTitle}>Insights personalizados</Text>
            </View>
            
            {insights.warnings?.map((warning, index) => (
              <View key={index} style={[styles.insightCard, styles.warningInsight]}>
                <View style={styles.insightCardHeader}>
                  <CustomIcons.AlertCircle size={16} color="#F59E0B" />
                  <Text style={styles.warningInsightTitle}>{warning.message}</Text>
                </View>
                <Text style={styles.warningInsightText}>{warning.suggestion}</Text>
              </View>
            ))}

            {insights.recommendations?.map((rec, index) => (
              <View key={index} style={[styles.insightCard, styles.recommendationInsight]}>
                <View style={styles.insightCardHeader}>
                  <CustomIcons.Info size={16} color={COLORS.primary} />
                  <Text style={styles.recommendationInsightTitle}>{rec.message}</Text>
                </View>
                <Text style={styles.recommendationInsightText}>{rec.suggestion}</Text>
              </View>
            ))}

            {insights.overallTrend && (
              <View style={styles.trendCard}>
                <View style={styles.trendHeader}>
                  <CustomIcons.TrendingUp size={18} color={COLORS.primary} />
                  <Text style={styles.trendTitle}>
                    Tendencia: {getTrendText(insights.overallTrend)}
                  </Text>
                </View>
                <Text style={styles.trendDescription}>
                  {getTrendDescription(insights.overallTrend)}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.mainInsightCard}>
          <View style={styles.mainInsightHeader}>
            <View style={[
              styles.mainInsightIcon,
              { backgroundColor: getEmotionColor(mostFrequentEmotion?.id) + '20' }
            ]}>
              <Text style={styles.mainInsightEmoji}>
                {getEmotionIcon(mostFrequentEmotion?.id)}
              </Text>
            </View>
            <View style={styles.mainInsightInfo}>
              <Text style={styles.mainInsightTitle}>Tu estado más frecuente</Text>
              <Text style={styles.mainInsightText}>
                En los últimos {filter === 'week' ? '7 días' : '30 días'}, te has sentido más{' '}
                <Text style={[
                  styles.mainInsightEmotionText, 
                  { color: getEmotionColor(mostFrequentEmotion?.id) }
                ]}>
                  {mostFrequentEmotion?.label.toLowerCase()}
                </Text>
              </Text>
            </View>
          </View>
        </View>

        {stats.percentages.tranki >= 60 && (
          <View style={[styles.insightCard, styles.positiveInsight]}>
            <View style={styles.insightCardHeader}>
              <CustomIcons.Heart size={16} color="#10B981" />
              <Text style={styles.positiveInsightTitle}>¡Excelente progreso!</Text>
            </View>
            <Text style={styles.positiveInsightText}>
              Has tenido un {stats.percentages.tranki}% de días positivos. Sigue así.
            </Text>
          </View>
        )}

        {stats.percentages.stressed >= 50 && (
          <View style={[styles.insightCard, styles.concernInsight]}>
            <View style={styles.insightCardHeader}>
              <CustomIcons.AlertCircle size={16} color="#F59E0B" />
              <Text style={styles.concernInsightTitle}>Cuidemos tu bienestar</Text>
            </View>
            <Text style={styles.concernInsightText}>
              Has tenido varios días difíciles. ¿Te gustaría hablar con el asistente?
            </Text>
            <TouchableOpacity
              style={styles.chatButton}
              onPress={() => navigation.navigate('Chat', { emotion: EMOTIONS.STRESSED })}
              activeOpacity={0.8}
            >
              <CustomIcons.MessageCircle size={16} color={COLORS.white} />
              <Text style={styles.chatButtonText}>Buscar apoyo</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const getTrendText = (trend) => {
    const trends = {
      improving: 'Mejorando',
      declining: 'Declinando',
      stable: 'Estable',
      insufficient_data: 'Datos insuficientes'
    };
    return trends[trend] || 'Desconocido';
  };

  const getTrendDescription = (trend) => {
    const descriptions = {
      improving: 'Tu estado emocional ha mejorado en los últimos días. ¡Continúa así!',
      declining: 'Tu estado emocional ha empeorado recientemente. Considera hablar con alguien.',
      stable: 'Tu estado emocional se mantiene estable.',
      insufficient_data: 'Necesitamos más datos para generar insights precisos.'
    };
    return descriptions[trend] || '';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <View style={styles.loadingCircle}>
            <ActivityIndicator size="large" color={COLORS.white} />
          </View>
          <Text style={styles.loadingText}>Cargando tu historial...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const chartData = prepareChartData();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <CustomIcons.ArrowLeft size={22} color={COLORS.text} />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Mi Historial</Text>
          <Text style={styles.headerSubtitle}>Seguimiento emocional</Text>
        </View>

        <TouchableOpacity style={styles.headerAction} activeOpacity={0.7}>
          <CustomIcons.Download size={18} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Filter */}
        <View style={styles.filterSection}>
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[
                styles.filterButton, 
                filter === 'week' && styles.filterButtonActive
              ]}
              onPress={() => setFilter('week')}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.filterButtonText,
                filter === 'week' && styles.filterButtonTextActive
              ]}>
                Última semana
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.filterButton, 
                filter === 'month' && styles.filterButtonActive
              ]}
              onPress={() => setFilter('month')}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.filterButtonText,
                filter === 'month' && styles.filterButtonTextActive
              ]}>
                Último mes
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {filteredData.length > 0 ? (
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Chart */}
            <View style={styles.chartSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconWrapper}>
                  <CustomIcons.TrendingUp size={18} color={COLORS.primary} />
                </View>
                <Text style={styles.sectionTitle}>Tendencia emocional</Text>
              </View>
              
              <View style={styles.chartContainer}>
                <LineChart
                  data={chartData}
                  width={width - 64}
                  height={200}
                  yAxisLabel=""
                  yAxisSuffix=""
                  yAxisInterval={1}
                  chartConfig={{
                    backgroundColor: COLORS.white,
                    backgroundGradientFrom: COLORS.white,
                    backgroundGradientTo: COLORS.white,
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(125, 185, 222, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                    style: {
                      borderRadius: 16
                    },
                    propsForDots: {
                      r: "5",
                      strokeWidth: "2",
                      stroke: COLORS.primary
                    }
                  }}
                  bezier
                  style={styles.chart}
                  fromZero
                  segments={2}
                />
                
                <View style={styles.chartLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                    <Text style={styles.legendText}>Estresado = 1</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                    <Text style={styles.legendText}>Neutral = 2</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                    <Text style={styles.legendText}>Tranki = 3</Text>
                  </View>
                </View>
              </View>
            </View>

            {renderInsights()}

            {/* Detailed history */}
            <View style={styles.historySection}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconWrapper}>
                  <CustomIcons.List size={18} color={COLORS.primary} />
                </View>
                <Text style={styles.sectionTitle}>Registro detallado</Text>
              </View>
              
              <View style={styles.historyList}>
                {filteredData.slice(-10).reverse().map((record, index) => {
                  const emotion = Object.values(EMOTIONS).find(e => e.id === record.emotion);
                  const date = new Date(record.date);
                  
                  return (
                    <View 
                      key={index} 
                      style={[
                        styles.historyItem,
                        index === filteredData.slice(-10).reverse().length - 1 && styles.historyItemLast
                      ]}
                    >
                      <View style={styles.historyDate}>
                        <Text style={styles.historyDateDay}>
                          {date.getDate()}
                        </Text>
                        <Text style={styles.historyDateMonth}>
                          {date.toLocaleDateString('es-ES', { month: 'short' })}
                        </Text>
                      </View>
                      
                      <View style={styles.historyContent}>
                        <View style={styles.historyEmotion}>
                          <View style={[
                            styles.historyEmotionIcon, 
                            { backgroundColor: getEmotionColor(emotion?.id) + '20' }
                          ]}>
                            <View style={[
                              styles.historyEmotionDot,
                              { backgroundColor: getEmotionColor(emotion?.id) }
                            ]} />
                          </View>
                          <View style={styles.historyEmotionInfo}>
                            <Text style={styles.historyEmotionText}>
                              {emotion?.label}
                            </Text>
                            <Text style={styles.historyEmotionTime}>
                              {record.totalRecords 
                                ? `${record.totalRecords} registros` 
                                : 'Registro único'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </Animated.View>
        ) : (
          <Animated.View style={[styles.emptyState, { opacity: fadeAnim }]}>
            <View style={styles.emptyStateIcon}>
              <CustomIcons.BarChart size={48} color={COLORS.textMuted} />
            </View>
            
            <Text style={styles.emptyStateTitle}>No hay datos suficientes</Text>
            <Text style={styles.emptyStateText}>
              Registra tu estado emocional durante algunos días para ver tu historial y tendencias.
            </Text>
            
            <TouchableOpacity
              style={styles.recordButton}
              onPress={() => navigation.navigate('EmotionSelector')}
              activeOpacity={0.8}
            >
              <CustomIcons.Plus size={16} color={COLORS.white} />
              <Text style={styles.recordButtonText}>Registrar emoción</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  
  // Header
  header: {
    backgroundColor: COLORS.white,
    paddingTop: Platform.OS === 'ios' ? 10 : 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  
  // Content
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  
  // Filter
  filterSection: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  filterButtonText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  
  // Sections
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EBF5FB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  
  // Chart
  chartSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 24,
  },
  chartContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  chart: {
    borderRadius: 12,
    marginVertical: 8,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  
  // Insights
  insightsSection: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  emotionStatsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  emotionStatCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  emotionStatIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emotionStatDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  emotionStatLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  emotionStatPercentage: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  emotionStatCount: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  
  // AI Insights
  aiInsightsSection: {
    marginBottom: 24,
  },
  aiInsightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  aiIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EBF5FB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiInsightsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  
  // Insight cards
  insightCard: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  insightCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  
  // Main insight
  mainInsightCard: {
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  mainInsightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mainInsightIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  mainInsightEmoji: {
    fontSize: 28,
  },
  mainInsightInfo: {
    flex: 1,
  },
  mainInsightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 6,
  },
  mainInsightText: {
    fontSize: 15,
    color: '#1A1A1A',
    lineHeight: 20,
  },
  mainInsightEmotionText: {
    fontWeight: '700',
  },
  
  // Warning insights
  warningInsight: {
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  warningInsightTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
  },
  warningInsightText: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  
  // Recommendation insights
  recommendationInsight: {
    backgroundColor: '#EBF5FB',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  recommendationInsightTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  recommendationInsightText: {
    fontSize: 13,
    color: '#5A9AB8',
    lineHeight: 18,
  },
  
  // Trend card
  trendCard: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  trendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  trendTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  trendDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  
  // Positive insight
  positiveInsight: {
    backgroundColor: '#D1FAE5',
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  positiveInsightTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065F46',
  },
  positiveInsightText: {
    fontSize: 13,
    color: '#065F46',
    lineHeight: 18,
  },
  
  // Concern insight
  concernInsight: {
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  concernInsightTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
  },
  concernInsightText: {
    fontSize: 13,
    color: '#92400E',
    marginBottom: 12,
    lineHeight: 18,
  },
  chatButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  chatButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  
  // History
  historySection: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  historyList: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  historyItemLast: {
    borderBottomWidth: 0,
  },
  historyDate: {
    width: 50,
    alignItems: 'center',
    marginRight: 16,
  },
  historyDateDay: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    lineHeight: 24,
  },
  historyDateMonth: {
    fontSize: 11,
    color: '#6B7280',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  historyContent: {
    flex: 1,
  },
  historyEmotion: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyEmotionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyEmotionDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  historyEmotionInfo: {
    flex: 1,
  },
  historyEmotionText: {
    fontSize: 15,
    color: '#1A1A1A',
    fontWeight: '600',
    marginBottom: 2,
  },
  historyEmotionTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  
  // Empty state
  emptyState: {
    alignItems: 'center',
    padding: 32,
    marginTop: 60,
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  recordButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  recordButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
});

export default HistoryScreen;