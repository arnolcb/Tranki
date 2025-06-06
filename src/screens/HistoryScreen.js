// src/screens/HistoryScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import auth from '@react-native-firebase/auth';
import { COLORS } from '../constants/colors';
import { EMOTIONS } from '../constants/emotions';
import FirebaseService from '../services/firebase';

const { width } = Dimensions.get('window');

const HistoryScreen = ({ navigation }) => {
  const [emotionHistory, setEmotionHistory] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [filter, setFilter] = useState('week'); // 'week', 'month'
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const currentUser = auth().currentUser;
    setUser(currentUser);
    if (currentUser) {
      loadEmotionHistory(currentUser.uid);
    }
  }, []);

  useEffect(() => {
    filterData();
  }, [emotionHistory, filter]);

  const loadEmotionHistory = async (userId) => {
    try {
      setLoading(true);
      const days = filter === 'week' ? 30 : 90; // Cargamos más datos para filtrar
      const history = await FirebaseService.getEmotionHistory(userId, days);
      setEmotionHistory(history);
    } catch (error) {
      console.error('Error loading emotion history:', error);
    } finally {
      setLoading(false);
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

    setFilteredData(filtered.reverse()); // Más reciente al final para el gráfico
  };

  const prepareChartData = () => {
    if (!filteredData.length) {
      return {
        labels: ['Sin datos'],
        datasets: [{
          data: [0]
        }]
      };
    }

    const labels = filteredData.map(record => {
      const date = new Date(record.date);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    });

    const data = filteredData.map(record => record.value);

    return {
      labels: labels.slice(-7), // Mostrar solo últimos 7 días
      datasets: [{
        data: data.slice(-7),
        color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
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

  const renderEmotionCard = (emotionId, count, percentage) => {
    const emotion = Object.values(EMOTIONS).find(e => e.id === emotionId);
    if (!emotion) return null;

    return (
      <View key={emotionId} style={styles.emotionCard}>
        <Text style={styles.emotionCardEmoji}>{emotion.emoji}</Text>
        <Text style={styles.emotionCardLabel}>{emotion.label}</Text>
        <Text style={styles.emotionCardCount}>{count} días</Text>
        <Text style={styles.emotionCardPercentage}>{percentage}%</Text>
      </View>
    );
  };

  const renderInsights = () => {
    const stats = getEmotionStats();
    if (!stats) return null;

    const mostFrequentEmotion = Object.values(EMOTIONS).find(e => e.id === stats.mostFrequent);
    
    return (
      <View style={styles.insightsContainer}>
        <Text style={styles.insightsTitle}>📊 Resumen del período</Text>
        
        <View style={styles.statsRow}>
          {Object.keys(stats.counts).map(emotionId => 
            renderEmotionCard(
              emotionId, 
              stats.counts[emotionId], 
              stats.percentages[emotionId]
            )
          )}
        </View>

        <View style={styles.insightCard}>
          <Text style={styles.insightText}>
            En los últimos {filter === 'week' ? '7 días' : '30 días'}, 
            te has sentido más frecuentemente {' '}
            <Text style={styles.insightEmoji}>{mostFrequentEmotion?.emoji}</Text>
            <Text style={styles.insightEmotionText}>{mostFrequentEmotion?.label.toLowerCase()}</Text>
          </Text>
        </View>

        {stats.percentages.tranki >= 60 && (
          <View style={[styles.insightCard, styles.positiveInsight]}>
            <Text style={styles.positiveInsightText}>
              ¡Excelente! Has tenido un {stats.percentages.tranki}% de días positivos 🎉
            </Text>
          </View>
        )}

        {stats.percentages.stressed >= 50 && (
          <View style={[styles.insightCard, styles.concernInsight]}>
            <Text style={styles.concernInsightText}>
              Nota que has tenido varios días estresantes. ¿Te gustaría hablar con el asistente?
            </Text>
            <TouchableOpacity
              style={styles.chatButton}
              onPress={() => navigation.navigate('Chat', { emotion: EMOTIONS.STRESSED })}
            >
              <Text style={styles.chatButtonText}>Buscar apoyo</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando tu historial...</Text>
      </View>
    );
  }

  const chartData = prepareChartData();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mi Historial Emocional</Text>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'week' && styles.filterButtonActive]}
          onPress={() => setFilter('week')}
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
        >
          <Text style={[
            styles.filterButtonText,
            filter === 'month' && styles.filterButtonTextActive
          ]}>
            Último mes
          </Text>
        </TouchableOpacity>
      </View>

      {filteredData.length > 0 ? (
        <>
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Tendencia emocional</Text>
            <LineChart
              data={chartData}
              width={width - 40}
              height={220}
              yAxisLabel=""
              yAxisSuffix=""
              yAxisInterval={1}
              chartConfig={{
                backgroundColor: COLORS.white,
                backgroundGradientFrom: COLORS.white,
                backgroundGradientTo: COLORS.white,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(51, 51, 51, ${opacity})`,
                style: {
                  borderRadius: 16
                },
                propsForDots: {
                  r: "6",
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
              <Text style={styles.legendText}>😫 Estresado = 1</Text>
              <Text style={styles.legendText}>😐 Neutral = 2</Text>
              <Text style={styles.legendText}>😊 Tranki = 3</Text>
            </View>
          </View>

          {renderInsights()}

          <View style={styles.historyList}>
            <Text style={styles.historyTitle}>Registro detallado</Text>
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
                    <Text style={styles.historyEmotionEmoji}>{emotion?.emoji}</Text>
                    <Text style={styles.historyEmotionText}>{emotion?.label}</Text>
                  </View>
                </View>
              );
            })}
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
          >
            <Text style={styles.recordButtonText}>Registrar emoción de hoy</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
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
    marginTop: 15,
    color: COLORS.text,
    fontSize: 16,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 55,
  },
  backButtonText: {
    color: COLORS.white,
    fontSize: 16,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 20,
    justifyContent: 'center',
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginHorizontal: 5,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  filterButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: COLORS.white,
  },
  chartContainer: {
    backgroundColor: COLORS.white,
    margin: 20,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 15,
  },
  chart: {
    borderRadius: 16,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  legendText: {
    fontSize: 12,
    color: COLORS.text,
  },
  insightsContainer: {
    margin: 20,
  },
  insightsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  emotionCard: {
    backgroundColor: COLORS.white,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  emotionCardEmoji: {
    fontSize: 24,
    marginBottom: 5,
  },
  emotionCardLabel: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  emotionCardCount: {
    fontSize: 14,
    color: COLORS.text,
    marginTop: 5,
  },
  emotionCardPercentage: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  insightCard: {
    backgroundColor: COLORS.white,
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  insightText: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 22,
  },
  insightEmoji: {
    fontSize: 18,
  },
  insightEmotionText: {
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  positiveInsight: {
    backgroundColor: '#E8F5E8',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.secondary,
  },
  positiveInsightText: {
    color: '#2E7D2E',
    fontSize: 16,
    fontWeight: '500',
  },
  concernInsight: {
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  concernInsightText: {
    color: '#E65100',
    fontSize: 16,
    marginBottom: 10,
  },
  chatButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  chatButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  historyList: {
    margin: 20,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  historyDate: {
    flex: 1,
  },
  historyDateText: {
    fontSize: 14,
    color: COLORS.text,
  },
  historyEmotion: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyEmotionEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  historyEmotionText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    margin: 20,
  },
  emptyStateEmoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  recordButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  recordButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default HistoryScreen;