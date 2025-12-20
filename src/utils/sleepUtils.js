// src/utils/sleepUtils.js
// Utilidades y helpers para el Sleep Tracker

import { Alert } from 'react-native';

/**
 * Formatea una hora en formato 12 horas
 */
export const formatTime = (date) => {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
};

/**
 * Formatea una hora en formato 24 horas
 */
export const formatTime24 = (date) => {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

/**
 * Calcula la duración entre dos fechas
 */
export const calculateSleepDuration = (sleepTime, wakeTime) => {
  const diff = wakeTime - sleepTime;
  const totalHours = diff / (1000 * 60 * 60);
  const hours = Math.floor(totalHours);
  const minutes = Math.floor((totalHours - hours) * 60);
  return { hours, minutes, totalHours };
};

/**
 * Determina la calidad del sueño basado en horas
 */
export const getSleepQuality = (hours) => {
  if (hours >= 7) return 'deep';
  if (hours >= 6) return 'light';
  return 'poor';
};

/**
 * Obtiene el mensaje según la calidad del sueño
 */
export const getSleepQualityMessage = (quality) => {
  const messages = {
    deep: '¡Excelente! Tu sueño fue reparador 💙',
    light: 'Bien, pero puedes mejorar 😊',
    poor: 'Intenta dormir más esta noche 😴',
  };
  return messages[quality] || '';
};

/**
 * Obtiene el color según la calidad
 */
export const getSleepQualityColor = (quality) => {
  const colors = {
    deep: '#4A90E2',
    light: '#FFB74D',
    poor: '#E74C3C',
    none: '#374151',
  };
  return colors[quality] || colors.none;
};

/**
 * Formatea una fecha a YYYY-MM-DD
 */
export const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Obtiene el nombre del mes en español
 */
export const getMonthName = (monthIndex) => {
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  return months[monthIndex];
};

/**
 * Obtiene el nombre del día en español
 */
export const getDayName = (dayIndex) => {
  const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  return days[dayIndex];
};

/**
 * Valida que la hora de despertar sea después de la de dormir
 */
export const validateSleepTimes = (sleepTime, wakeTime) => {
  if (wakeTime <= sleepTime) {
    Alert.alert(
      'Error',
      'La hora de despertar debe ser posterior a la hora de dormir'
    );
    return false;
  }
  
  const duration = calculateSleepDuration(sleepTime, wakeTime);
  
  if (duration.totalHours > 16) {
    Alert.alert(
      'Advertencia',
      '¿Realmente dormiste más de 16 horas? Por favor verifica las horas.'
    );
    return false;
  }
  
  if (duration.totalHours < 1) {
    Alert.alert(
      'Advertencia',
      'El tiempo de sueño parece muy corto. ¿Estás seguro?'
    );
    return false;
  }
  
  return true;
};

/**
 * Calcula estadísticas de un array de registros
 */
export const calculateStats = (records) => {
  if (!records || records.length === 0) {
    return {
      average: 0,
      total: 0,
      best: 0,
      worst: 0,
      consistency: 0,
    };
  }

  const durations = records.map(r => r.duration);
  const total = durations.reduce((sum, d) => sum + d, 0);
  const average = total / durations.length;
  const best = Math.max(...durations);
  const worst = Math.min(...durations);
  
  // Calcular consistencia (desviación estándar)
  const variance = durations.reduce((sum, d) => sum + Math.pow(d - average, 2), 0) / durations.length;
  const stdDev = Math.sqrt(variance);
  const consistency = Math.max(0, 100 - (stdDev * 20)); // 0-100%

  return {
    average: Math.round(average * 10) / 10,
    total: Math.round(total * 10) / 10,
    best: Math.round(best * 10) / 10,
    worst: Math.round(worst * 10) / 10,
    consistency: Math.round(consistency),
  };
};

/**
 * Genera recomendaciones basadas en patrones de sueño
 */
export const generateRecommendations = (stats, recentRecords) => {
  const recommendations = [];

  if (stats.average < 7) {
    recommendations.push({
      type: 'warning',
      title: 'Duerme más',
      message: 'Tu promedio está por debajo de 7 horas. Intenta acostarte más temprano.',
    });
  }

  if (stats.consistency < 60) {
    recommendations.push({
      type: 'info',
      title: 'Mantén horarios regulares',
      message: 'Tus horarios varían mucho. Intenta dormir y despertar a la misma hora.',
    });
  }

  // Detectar fines de semana problemáticos
  const weekendRecords = recentRecords.filter(r => {
    const date = new Date(r.date);
    const day = date.getDay();
    return day === 0 || day === 6;
  });

  if (weekendRecords.length > 0) {
    const weekendAvg = weekendRecords.reduce((sum, r) => sum + r.duration, 0) / weekendRecords.length;
    const weekdayAvg = stats.average;
    
    if (Math.abs(weekendAvg - weekdayAvg) > 2) {
      recommendations.push({
        type: 'info',
        title: 'Regulariza tus fines de semana',
        message: 'Hay mucha diferencia entre semana y fin de semana. Intenta mantener horarios similares.',
      });
    }
  }

  if (stats.average >= 7 && stats.consistency >= 70) {
    recommendations.push({
      type: 'success',
      title: '¡Excelente trabajo!',
      message: 'Mantienes buenos hábitos de sueño. ¡Sigue así!',
    });
  }

  return recommendations;
};

/**
 * Calcula la "Sleep Score" del 0-100
 */
export const calculateSleepScore = (duration, quality, consistency) => {
  let score = 0;

  // Puntos por duración (max 50 puntos)
  if (duration >= 7 && duration <= 9) {
    score += 50;
  } else if (duration >= 6 && duration < 7) {
    score += 35;
  } else if (duration >= 5 && duration < 6) {
    score += 20;
  } else {
    score += 10;
  }

  // Puntos por calidad (max 30 puntos)
  const qualityPoints = {
    deep: 30,
    light: 20,
    poor: 10,
  };
  score += qualityPoints[quality] || 0;

  // Puntos por consistencia (max 20 puntos)
  score += Math.round((consistency / 100) * 20);

  return Math.min(100, Math.max(0, score));
};

/**
 * Obtiene consejos aleatorios para dormir mejor
 */
export const getSleepTips = () => {
  const tips = [
    {
      icon: '🌙',
      title: 'Ambiente oscuro',
      description: 'Mantén tu habitación lo más oscura posible. La luz interfiere con la melatonina.',
    },
    {
      icon: '❄️',
      title: 'Temperatura fresca',
      description: 'La temperatura ideal para dormir es entre 15-19°C.',
    },
    {
      icon: '📱',
      title: 'Sin pantallas',
      description: 'Evita pantallas 1 hora antes de dormir. La luz azul altera tu ritmo circadiano.',
    },
    {
      icon: '☕',
      title: 'Evita cafeína',
      description: 'No consumas cafeína después de las 2 PM. Su efecto puede durar 6-8 horas.',
    },
    {
      icon: '🏃',
      title: 'Ejercicio regular',
      description: 'El ejercicio mejora el sueño, pero evítalo 3 horas antes de dormir.',
    },
    {
      icon: '🧘',
      title: 'Rutina de relajación',
      description: 'Crea una rutina nocturna: lectura, meditación o respiración profunda.',
    },
    {
      icon: '⏰',
      title: 'Horarios consistentes',
      description: 'Acuéstate y despierta a la misma hora, incluso los fines de semana.',
    },
    {
      icon: '🍽️',
      title: 'Cena ligera',
      description: 'Evita comidas pesadas 2-3 horas antes de dormir.',
    },
  ];

  return tips.sort(() => Math.random() - 0.5).slice(0, 3);
};

/**
 * Exporta datos a formato CSV
 */
export const exportToCSV = (records) => {
  const header = 'Fecha,Hora Dormir,Hora Despertar,Duración (hrs),Calidad\n';
  const rows = records.map(r => {
    return `${r.date},${r.sleepTime},${r.wakeTime},${r.duration},${r.quality}`;
  }).join('\n');
  
  return header + rows;
};

/**
 * Detecta patrones de insomnio
 */
export const detectInsomniaPattern = (records) => {
  if (records.length < 7) {
    return { hasPattern: false, severity: 'none' };
  }

  const recentWeek = records.slice(0, 7);
  const poorSleepDays = recentWeek.filter(r => r.duration < 6).length;
  const avgDuration = recentWeek.reduce((sum, r) => sum + r.duration, 0) / recentWeek.length;

  if (poorSleepDays >= 5 || avgDuration < 5.5) {
    return { 
      hasPattern: true, 
      severity: 'severe',
      message: 'Patrón preocupante de insomnio. Considera consultar a un profesional.',
    };
  }

  if (poorSleepDays >= 3 || avgDuration < 6.5) {
    return { 
      hasPattern: true, 
      severity: 'moderate',
      message: 'Algunos problemas para dormir. Intenta mejorar tu higiene del sueño.',
    };
  }

  return { hasPattern: false, severity: 'none' };
};

/**
 * Calcula la "deuda de sueño" acumulada
 */
export const calculateSleepDebt = (records, optimalHours = 8) => {
  if (records.length === 0) return 0;

  const debt = records.reduce((total, r) => {
    const deficit = optimalHours - r.duration;
    return total + (deficit > 0 ? deficit : 0);
  }, 0);

  return Math.round(debt * 10) / 10;
};

/**
 * Obtiene el mejor y peor día de la semana
 */
export const getBestAndWorstDays = (records) => {
  if (records.length === 0) {
    return { best: null, worst: null };
  }

  const dayStats = {};
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  records.forEach(r => {
    const date = new Date(r.date);
    const day = date.getDay();
    
    if (!dayStats[day]) {
      dayStats[day] = { total: 0, count: 0, name: dayNames[day] };
    }
    
    dayStats[day].total += r.duration;
    dayStats[day].count += 1;
  });

  const avgByDay = Object.values(dayStats).map(d => ({
    day: d.name,
    average: d.total / d.count,
  }));

  avgByDay.sort((a, b) => b.average - a.average);

  return {
    best: avgByDay[0],
    worst: avgByDay[avgByDay.length - 1],
  };
};

// ============================================
// COMPONENTES DE NOTIFICACIONES
// ============================================

/**
 * Muestra una alerta con consejos para dormir
 */
export const showSleepTipAlert = () => {
  const tips = getSleepTips();
  const tip = tips[0];

  Alert.alert(
    `${tip.icon} ${tip.title}`,
    tip.description,
    [
      { text: 'Ver más consejos', onPress: () => showAllTipsAlert() },
      { text: 'Entendido', style: 'cancel' },
    ]
  );
};

/**
 * Muestra todos los consejos
 */
export const showAllTipsAlert = () => {
  const tips = getSleepTips();
  const message = tips.map((t, i) => `${i + 1}. ${t.icon} ${t.title}\n   ${t.description}`).join('\n\n');

  Alert.alert(
    'Consejos para dormir mejor',
    message,
    [{ text: 'Cerrar', style: 'cancel' }]
  );
};

/**
 * Muestra alerta de advertencia de insomnio
 */
export const showInsomniaWarning = (pattern) => {
  if (!pattern.hasPattern) return;

  Alert.alert(
    pattern.severity === 'severe' ? '⚠️ Advertencia' : 'ℹ️ Aviso',
    pattern.message,
    [
      { 
        text: 'Ver consejos', 
        onPress: () => showSleepTipAlert() 
      },
      { text: 'Entendido', style: 'cancel' },
    ]
  );
};

// ============================================
// VALIDACIONES
// ============================================

/**
 * Valida que los datos del registro sean correctos
 */
export const validateSleepRecord = (record) => {
  const errors = [];

  if (!record.sleepTime) {
    errors.push('Falta la hora de dormir');
  }

  if (!record.wakeTime) {
    errors.push('Falta la hora de despertar');
  }

  if (record.sleepTime && record.wakeTime) {
    const sleepDate = new Date(record.sleepTime);
    const wakeDate = new Date(record.wakeTime);

    if (wakeDate <= sleepDate) {
      errors.push('La hora de despertar debe ser posterior a la de dormir');
    }

    const duration = calculateSleepDuration(sleepDate, wakeDate);
    
    if (duration.totalHours > 16) {
      errors.push('La duración parece muy larga (>16 horas)');
    }

    if (duration.totalHours < 1) {
      errors.push('La duración parece muy corta (<1 hora)');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// ============================================
// EXPORTS
// ============================================

export default {
  formatTime,
  formatTime24,
  calculateSleepDuration,
  getSleepQuality,
  getSleepQualityMessage,
  getSleepQualityColor,
  formatDate,
  getMonthName,
  getDayName,
  validateSleepTimes,
  calculateStats,
  generateRecommendations,
  calculateSleepScore,
  getSleepTips,
  exportToCSV,
  detectInsomniaPattern,
  calculateSleepDebt,
  getBestAndWorstDays,
  showSleepTipAlert,
  showAllTipsAlert,
  showInsomniaWarning,
  validateSleepRecord,
};