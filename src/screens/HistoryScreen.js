// src/screens/HistoryScreen.js - Actualizado con flecha SVG
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
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import auth from '@react-native-firebase/auth';
import { COLORS, Theme, getEmotionColor, getEmotionIcon } from '../constants/colors';
import { EMOTIONS } from '../constants/emotions';
import FirebaseService from '../services/firebase';
import CustomIcons from '../components/CustomIcons';

const { width } = Dimensions.get('window');

const HistoryScreen = ({ navigation }) => {
  const [emotionHistory, setEmotionHistory] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [filter, setFilter] = useState('week'); // 'week', 'month'
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [insights, setInsights] = useState(null);

  useEffect(() => {
    StatusBar.setBarStyle('dark-content');
    StatusBar.setBackgroundColor(COLORS.white);
    
    const currentUser = auth().currentUser;
    setUser(currentUser);
    if (currentUser) {
      loadEmotionHistory(currentUser.uid);
      loadInsights(currentUser.uid);
    }
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
          color: () => COLORS.textMuted,
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
        color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
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

  const renderEmotionStat = (emotionId, count, percentage) => {
    const emotion = Object.values(EMOTIONS).find(e => e.id === emotionId);
    if (!emotion) return null;

    return (
      <View key={emotionId} style={styles.emotionStatCard}>
        <View style={[styles.emotionStatIcon, { backgroundColor: getEmotionColor(emotionId) + '20' }]}>
          <Text style={styles.emotionStatEmoji}>{getEmotionIcon(emotionId)}</Text>
        </View>
        <Text style={styles.emotionStatLabel}>{emotion.label}</Text>
        <Text style={[styles.emotionStatPercentage, { color: getEmotionColor(emotionId) }]}>
          {percentage}%
        </Text>
        <Text style={styles.emotionStatCount}>{count} días</Text>
      </View>
    );
  };

  const renderInsights = () => {
    const stats = getEmotionStats();
    if (!stats) return null;

    const mostFrequentEmotion = Object.values(EMOTIONS).find(e => e.id === stats.mostFrequent);
    
    return (
      <View style={styles.insightsSection}>
        <Text style={styles.sectionTitle}>📈 Resumen del período</Text>
        
        <View style={styles.emotionStatsGrid}>
          {Object.keys(stats.counts).map(emotionId => 
            renderEmotionStat(
              emotionId, 
              stats.counts[emotionId], 
              stats.percentages[emotionId]
            )
          )}
        </View>

        {/* Insights AI */}
        {insights && (
          <View style={styles.aiInsightsSection}>
            <Text style={styles.aiInsightsTitle}>🧠 Insights personalizados</Text>
            
            {insights.warnings?.map((warning, index) => (
              <View key={index} style={[styles.insightCard, styles.warningInsight]}>
                <Text style={styles.warningInsightTitle}>⚠️ {warning.message}</Text>
                <Text style={styles.warningInsightText}>{warning.suggestion}</Text>
              </View>
            ))}

            {insights.recommendations?.map((rec, index) => (
              <View key={index} style={[styles.insightCard, styles.recommendationInsight]}>
                <Text style={styles.recommendationInsightTitle}>💡 {rec.message}</Text>
                <Text style={styles.recommendationInsightText}>{rec.suggestion}</Text>
              </View>
            ))}

            {insights.overallTrend && (
              <View style={styles.trendCard}>
                <Text style={styles.trendTitle}>
                  📊 Tendencia: {getTrendText(insights.overallTrend)}
                </Text>
                <Text style={styles.trendDescription}>
                  {getTrendDescription(insights.overallTrend)}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.insightCard}>
          <Text style={styles.insightTitle}>Tu estado más frecuente</Text>
          <View style={styles.insightContent}>
            <Text style={styles.insightEmoji}>{getEmotionIcon(mostFrequentEmotion?.id)}</Text>
            <View style={styles.insightInfo}>
              <Text style={styles.insightText}>
                En los últimos {filter === 'week' ? '7 días' : '30 días'}, te has sentido más frecuentemente{' '}
                <Text style={[styles.insightEmotionText, { color: getEmotionColor(mostFrequentEmotion?.id) }]}>
                  {mostFrequentEmotion?.label.toLowerCase()}
                </Text>
              </Text>
            </View>
          </View>
        </View>

        {stats.percentages.tranki >= 60 && (
          <View style={[styles.insightCard, styles.positiveInsight]}>
            <Text style={styles.positiveInsightTitle}>¡Excelente progreso! 🎉</Text>
            <Text style={styles.positiveInsightText}>
              Has tenido un {stats.percentages.tranki}% de días positivos. Sigue así.
            </Text>
          </View>
        )}

        {stats.percentages.stressed >= 50 && (
          <View style={[styles.insightCard, styles.concernInsight]}>
            <Text style={styles.concernInsightTitle}>Cuidemos tu bienestar</Text>
            <Text style={styles.concernInsightText}>
              Has tenido varios días difíciles. ¿Te gustaría hablar con el asistente?
            </Text>
            <TouchableOpacity
              style={styles.chatButton}
              onPress={() => navigation.navigate('Chat', { emotion: EMOTIONS.STRESSED })}
              activeOpacity={0.8}
            >
              <CustomIcons.Chat size={16} color={COLORS.white} />
              <Text style={styles.chatButtonText}>Buscar apoyo</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const getTrendText = (trend) => {
    const trends = {
      improving: 'Mejorando ⬆️',
      declining: 'Declinando ⬇️',
      stable: 'Estable ➡️',
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
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando tu historial...</Text>
      </SafeAreaView>
    );
  }

  const chartData = prepareChartData();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header actualizado */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <CustomIcons.ArrowLeft size={20} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Mi Historial</Text>
          <Text style={styles.headerSubtitle}>Seguimiento emocional</Text>
        </View>
        <TouchableOpacity style={styles.headerAction}>
          <CustomIcons.Download size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Filter */}
        <View style={styles.filterSection}>
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[styles.filterButton, filter === 'week' && styles.filterButtonActive]}
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
              style={[styles.filterButton, filter === 'month' && styles.filterButtonActive]}
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
          <>
            {/* Chart */}
            <View style={styles.chartSection}>
              <Text style={styles.sectionTitle}>📊 Tendencia emocional</Text>
              <View style={styles.chartContainer}>
                <LineChart
                  data={chartData}
                  width={width - 64}
                  height={220}
                  yAxisLabel=""
                  yAxisSuffix=""
                  yAxisInterval={1}
                  chartConfig={{
                    backgroundColor: COLORS.white,
                    backgroundGradientFrom: COLORS.white,
                    backgroundGradientTo: COLORS.white,
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(75, 85, 99, ${opacity})`,
                    style: {
                      borderRadius: Theme.borderRadius.large
                    },
                    propsForDots: {
                      r: "4",
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
                    <View style={[styles.legendDot, { backgroundColor: COLORS.error }]} />
                    <Text style={styles.legendText}>Estresado = 1</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: COLORS.warning }]} />
                    <Text style={styles.legendText}>Neutral = 2</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: COLORS.success }]} />
                    <Text style={styles.legendText}>Tranki = 3</Text>
                  </View>
                </View>
              </View>
            </View>

            {renderInsights()}

            {/* Detailed history */}
            <View style={styles.historySection}>
              <Text style={styles.sectionTitle}>📋 Registro detallado</Text>
              <View style={styles.historyList}>
                {filteredData.slice(-10).reverse().map((record, index) => {
                  const emotion = Object.values(EMOTIONS).find(e => e.id === record.emotion);
                  const date = new Date(record.date);
                  
                  return (
                    <View key={index} style={styles.historyItem}>
                      <View style={styles.historyDate}>
                        <Text style={styles.historyDateText}>
                          {date.toLocaleDateString('es-ES', { 
                            weekday: 'short', 
                            day: 'numeric', 
                            month: 'short' 
                          })}
                        </Text>
                      </View>
                      
                      <View style={styles.historyEmotion}>
                        <View style={[styles.historyEmotionIcon, { backgroundColor: getEmotionColor(emotion?.id) + '20' }]}>
                          <Text style={styles.historyEmotionEmoji}>{getEmotionIcon(emotion?.id)}</Text>
                        </View>
                        <View style={styles.historyEmotionInfo}>
                          <Text style={styles.historyEmotionText}>{emotion?.label}</Text>
                          <Text style={styles.historyEmotionTime}>
                            {record.totalRecords ? `${record.totalRecords} registros` : 'Registro único'}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={[styles.historyIndicator, { backgroundColor: getEmotionColor(emotion?.id) }]} />
                    </View>
                  );
                })}
              </View>
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateEmoji}>📊</Text>
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
              <Text style={styles.recordButtonText}>Registrar emoción de hoy</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: Theme.spacing.lg,
    color: COLORS.textSecondary,
    fontSize: Theme.typography.body,
    fontWeight: '500',
  },
  
  // Header actualizado
  header: {
    backgroundColor: COLORS.white,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray50,
    marginRight: Theme.spacing.md,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  headerAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray50,
  },
  
  // Content
  content: {
    flex: 1,
  },
  
  // Filter
  filterSection: {
    backgroundColor: COLORS.white,
    paddingHorizontal: Theme.spacing.xl,
    paddingVertical: Theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.gray50,
    borderRadius: Theme.borderRadius.medium,
    padding: 4,
  },
  filterButton: {
    flex: 1,
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.medium,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: COLORS.white,
    ...Theme.shadows.small,
  },
  filterButtonText: {
    fontSize: Theme.typography.body,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  
  // Sections
  sectionTitle: {
    fontSize: Theme.typography.h4,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: Theme.spacing.lg,
  },
  
  // Chart
  chartSection: {
    padding: Theme.spacing.xl,
  },
  chartContainer: {
    backgroundColor: COLORS.white,
    borderRadius: Theme.borderRadius.large,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Theme.shadows.small,
  },
  chart: {
    borderRadius: Theme.borderRadius.medium,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Theme.spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Theme.spacing.sm,
  },
  legendText: {
    fontSize: Theme.typography.small,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  
  // Insights
  insightsSection: {
    paddingHorizontal: Theme.spacing.xl,
    paddingBottom: Theme.spacing.xl,
  },
  emotionStatsGrid: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.xl,
  },
  emotionStatCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.large,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Theme.shadows.small,
  },
  emotionStatIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  emotionStatEmoji: {
    fontSize: 18,
  },
  emotionStatLabel: {
    fontSize: Theme.typography.caption,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginBottom: Theme.spacing.xs,
  },
  emotionStatPercentage: {
    fontSize: Theme.typography.h4,
    fontWeight: '700',
    marginBottom: Theme.spacing.xs,
  },
  emotionStatCount: {
    fontSize: Theme.typography.small,
    color: COLORS.textMuted,
  },
  
  // AI Insights
  aiInsightsSection: {
    marginBottom: Theme.spacing.xl,
  },
  aiInsightsTitle: {
    fontSize: Theme.typography.h5,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: Theme.spacing.md,
  },
  
  // Insight cards
  insightCard: {
    backgroundColor: COLORS.white,
    padding: Theme.spacing.xl,
    borderRadius: Theme.borderRadius.large,
    marginBottom: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Theme.shadows.small,
  },
  insightTitle: {
    fontSize: Theme.typography.h5,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: Theme.spacing.md,
  },
  insightContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  insightEmoji: {
    fontSize: 32,
    marginRight: Theme.spacing.lg,
  },
  insightInfo: {
    flex: 1,
  },
  insightText: {
    fontSize: Theme.typography.body,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  insightEmotionText: {
    fontWeight: '600',
  },
  
  // Warning insights
  warningInsight: {
    backgroundColor: COLORS.warningSoft,
    borderColor: COLORS.warning,
    borderLeftWidth: 4,
  },
  warningInsightTitle: {
    fontSize: Theme.typography.body,
    fontWeight: '600',
    color: COLORS.warning,
    marginBottom: Theme.spacing.sm,
  },
  warningInsightText: {
    fontSize: Theme.typography.body,
    color: COLORS.warning,
    fontWeight: '500',
  },
  
  // Recommendation insights
  recommendationInsight: {
    backgroundColor: COLORS.blue50,
    borderColor: COLORS.primary,
    borderLeftWidth: 4,
  },
  recommendationInsightTitle: {
    fontSize: Theme.typography.body,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: Theme.spacing.sm,
  },
  recommendationInsightText: {
    fontSize: Theme.typography.body,
    color: COLORS.primary,
    fontWeight: '500',
  },
  
  // Trend card
  trendCard: {
    backgroundColor: COLORS.gray50,
    padding: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.medium,
    marginBottom: Theme.spacing.lg,
  },
  trendTitle: {
    fontSize: Theme.typography.h5,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: Theme.spacing.sm,
  },
  trendDescription: {
    fontSize: Theme.typography.body,
    color: COLORS.textSecondary,
  },
  
  positiveInsight: {
    backgroundColor: COLORS.successSoft,
    borderColor: COLORS.success,
    borderLeftWidth: 4,
  },
  positiveInsightTitle: {
    fontSize: Theme.typography.h5,
    fontWeight: '600',
    color: COLORS.success,
    marginBottom: Theme.spacing.sm,
  },
  positiveInsightText: {
    fontSize: Theme.typography.body,
    color: COLORS.success,
    fontWeight: '500',
  },
  
  concernInsight: {
    backgroundColor: COLORS.warningSoft,
    borderColor: COLORS.warning,
    borderLeftWidth: 4,
  },
  concernInsightTitle: {
    fontSize: Theme.typography.h5,
    fontWeight: '600',
    color: COLORS.warning,
    marginBottom: Theme.spacing.sm,
  },
  concernInsightText: {
    fontSize: Theme.typography.body,
    color: COLORS.warning,
    marginBottom: Theme.spacing.lg,
    fontWeight: '500',
  },
  chatButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: Theme.spacing.xl,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.borderRadius.medium,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...Theme.shadows.small,
  },
  chatButtonText: {
    color: COLORS.white,
    fontSize: Theme.typography.body,
    fontWeight: '600',
  },
  
  // History
  historySection: {
    paddingHorizontal: Theme.spacing.xl,
    paddingBottom: Theme.spacing.xxxl,
  },
  historyList: {
    backgroundColor: COLORS.white,
    borderRadius: Theme.borderRadius.large,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Theme.shadows.small,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  historyDate: {
    width: 60,
    marginRight: Theme.spacing.lg,
  },
  historyDateText: {
    fontSize: Theme.typography.caption,
    color: COLORS.textMuted,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  historyEmotion: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyEmotionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  historyEmotionEmoji: {
    fontSize: 16,
  },
  historyEmotionInfo: {
    flex: 1,
  },
  historyEmotionText: {
    fontSize: Theme.typography.body,
    color: COLORS.text,
    fontWeight: '500',
    marginBottom: Theme.spacing.xs,
  },
  historyEmotionTime: {
    fontSize: Theme.typography.small,
    color: COLORS.textMuted,
  },
  historyIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  
  // Empty state
  emptyState: {
    alignItems: 'center',
    padding: Theme.spacing.xxxl,
    margin: Theme.spacing.xl,
  },
  emptyStateEmoji: {
    fontSize: 64,
    marginBottom: Theme.spacing.xl,
  },
  emptyStateTitle: {
    fontSize: Theme.typography.h3,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: Theme.spacing.md,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: Theme.typography.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Theme.spacing.xxxl,
  },
  recordButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: Theme.spacing.xl,
    paddingVertical: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.medium,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...Theme.shadows.small,
  },
  recordButtonText: {
    color: COLORS.white,
    fontSize: Theme.typography.h5,
    fontWeight: '600',
  },
});

export default HistoryScreen;