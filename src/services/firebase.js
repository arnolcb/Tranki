// src/services/firebase.js - Migrado a Firebase v9+ API modular con múltiples emociones
import { getApp } from '@react-native-firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  addDoc,
  query, 
  where, 
  orderBy,
  serverTimestamp,
  deleteDoc,
  writeBatch
} from '@react-native-firebase/firestore';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from '@react-native-firebase/auth';
import { formatDate } from '../utils/dateUtils';

class FirebaseService {
  constructor() {
    // Inicializar app y servicios
    this.app = getApp();
    this.db = getFirestore(this.app);
    this.auth = getAuth(this.app);
    
    console.log('🔥 Firebase Service inicializado con API modular v9+');
  }

  // Autenticación
  async signInWithEmail(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      console.log('✅ Usuario autenticado:', userCredential.user.uid);
      return userCredential.user;
    } catch (error) {
      console.error('❌ Error en autenticación:', error.message);
      throw error;
    }
  }

  async createUserWithEmail(email, password, userData) {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;
      
      console.log('✅ Usuario creado:', user.uid);
      
      // Guardar datos adicionales del usuario usando la nueva API
      const userDocRef = doc(this.db, 'users', user.uid);
      await setDoc(userDocRef, {
        ...userData,
        email: user.email,
        createdAt: serverTimestamp()
      });
      
      console.log('✅ Datos del usuario guardados en Firestore');
      return user;
    } catch (error) {
      console.error('❌ Error creando usuario:', error.message);
      throw error;
    }
  }

  // ========== EMOCIONES - MÚLTIPLES POR DÍA ==========

  // Guardar emoción (permite múltiples por día)
  async saveEmotion(userId, emotion) {
    try {
      const now = new Date();
      const today = formatDate(now);
      
      const emotionData = {
        emotion: emotion.id,
        value: emotion.value || this.getEmotionValue(emotion.id),
        timestamp: now.toISOString(),
        date: today,
        hour: now.getHours(),
        createdAt: serverTimestamp()
      };

      // Guardar en subcolección de emociones del día
      const dayRecordsRef = collection(this.db, 'users', userId, 'emotions', today, 'records');
      await addDoc(dayRecordsRef, emotionData);

      // También actualizar el documento del día con el promedio
      await this.updateDayAverage(userId, today);
      
      console.log('✅ Emotion saved successfully');
      return emotionData;
    } catch (error) {
      console.error('❌ Error saving emotion:', error);
      throw error;
    }
  }

  // Obtener todas las emociones de un día específico
  async getTodayEmotions(userId, date) {
    try {
      const dayRecordsRef = collection(this.db, 'users', userId, 'emotions', date, 'records');
      const q = query(dayRecordsRef, orderBy('timestamp', 'asc'));
      const snapshot = await getDocs(q);

      const emotions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp
      }));

      console.log(`📊 Found ${emotions.length} emotions for ${date}`);
      return emotions;
    } catch (error) {
      console.error('❌ Error getting today emotions:', error);
      return [];
    }
  }

  // Actualizar promedio del día
  async updateDayAverage(userId, date) {
    try {
      const emotions = await this.getTodayEmotions(userId, date);
      
      if (emotions.length === 0) return;

      const totalValue = emotions.reduce((sum, emotion) => sum + emotion.value, 0);
      const averageValue = totalValue / emotions.length;
      
      // Determinar la emoción predominante
      const emotionCounts = emotions.reduce((acc, emotion) => {
        acc[emotion.emotion] = (acc[emotion.emotion] || 0) + 1;
        return acc;
      }, {});
      
      const predominantEmotion = Object.keys(emotionCounts).reduce((a, b) => 
        emotionCounts[a] > emotionCounts[b] ? a : b
      );

      // Actualizar documento del día
      const dayDocRef = doc(this.db, 'users', userId, 'emotions', date);
      await setDoc(dayDocRef, {
        date,
        emotion: predominantEmotion, // Para compatibilidad con código existente
        value: averageValue,
        totalRecords: emotions.length,
        lastUpdated: serverTimestamp()
      }, { merge: true });

      console.log(`📈 Updated day average for ${date}: ${averageValue.toFixed(2)}`);
    } catch (error) {
      console.error('❌ Error updating day average:', error);
    }
  }

  // Obtener historial de emociones (promedio por día) - COMPATIBLE CON CÓDIGO EXISTENTE
  async getEmotionHistory(userId, days = 30) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);

      const emotionsRef = collection(this.db, 'users', userId, 'emotions');
      const q = query(
        emotionsRef,
        where('date', '>=', formatDate(startDate)),
        where('date', '<=', formatDate(endDate)),
        orderBy('date', 'desc')
      );

      const snapshot = await getDocs(q);
      const history = snapshot.docs.map(doc => ({
        ...doc.data(),
        date: doc.data().date
      }));

      console.log(`📊 Retrieved ${history.length} days of emotion history`);
      return history;
    } catch (error) {
      console.error('❌ Error getting emotion history:', error);
      return [];
    }
  }

  // Obtener estadísticas detalladas de emociones
  async getDetailedEmotionStats(userId, days = 7) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);

      const dayPromises = [];
      const currentDate = new Date(startDate);

      // Obtener datos para cada día
      while (currentDate <= endDate) {
        const dateStr = formatDate(currentDate);
        dayPromises.push(this.getTodayEmotions(userId, dateStr));
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const dailyEmotions = await Promise.all(dayPromises);
      
      // Procesar estadísticas
      const stats = {
        totalRecords: 0,
        dailyAverages: [],
        emotionDistribution: {},
        hourlyPatterns: {},
        trends: []
      };

      dailyEmotions.forEach((dayEmotions, index) => {
        const date = new Date(startDate);
        date.setDate(date.getDate() + index);
        const dateStr = formatDate(date);

        stats.totalRecords += dayEmotions.length;

        if (dayEmotions.length > 0) {
          const dayAverage = dayEmotions.reduce((sum, e) => sum + e.value, 0) / dayEmotions.length;
          stats.dailyAverages.push({ date: dateStr, average: dayAverage, count: dayEmotions.length });

          // Distribución por emoción
          dayEmotions.forEach(emotion => {
            stats.emotionDistribution[emotion.emotion] = 
              (stats.emotionDistribution[emotion.emotion] || 0) + 1;

            // Patrones por hora
            const hour = emotion.hour || new Date(emotion.timestamp).getHours();
            stats.hourlyPatterns[hour] = (stats.hourlyPatterns[hour] || 0) + 1;
          });
        }
      });

      console.log('📈 Generated detailed emotion stats:', stats);
      return stats;
    } catch (error) {
      console.error('❌ Error getting detailed emotion stats:', error);
      return null;
    }
  }

  // Obtener insights y recomendaciones
  async getEmotionInsights(userId, days = 7) {
    try {
      const stats = await this.getDetailedEmotionStats(userId, days);
      if (!stats) return null;

      const insights = {
        totalDays: stats.dailyAverages.length,
        averageRecordsPerDay: stats.totalRecords / days,
        overallTrend: this.calculateTrend(stats.dailyAverages),
        recommendations: [],
        warnings: []
      };

      // Generar recomendaciones basadas en patrones
      if (stats.emotionDistribution['stressed'] > stats.totalRecords * 0.4) {
        insights.warnings.push({
          type: 'stress',
          message: 'Hemos notado niveles altos de estrés. Considera técnicas de relajación.',
          suggestion: 'Prueba ejercicios de respiración o meditación.'
        });
      }

      if (stats.totalRecords < days * 2) {
        insights.recommendations.push({
          type: 'frequency',
          message: 'Registra tus emociones más frecuentemente para mejores insights.',
          suggestion: 'Intenta registrar al menos 2-3 veces por día.'
        });
      }

      // Patrones horarios
      const morningRecords = Object.keys(stats.hourlyPatterns)
        .filter(hour => hour >= 6 && hour <= 12)
        .reduce((sum, hour) => sum + stats.hourlyPatterns[hour], 0);

      if (morningRecords < stats.totalRecords * 0.2) {
        insights.recommendations.push({
          type: 'morning',
          message: 'Registra tu estado matutino para identificar patrones.',
          suggestion: 'Tu estado emocional matutino puede predecir el resto del día.'
        });
      }

      console.log('🧠 Generated emotion insights:', insights);
      return insights;
    } catch (error) {
      console.error('❌ Error getting emotion insights:', error);
      return null;
    }
  }

  // Calcular tendencia
  calculateTrend(dailyAverages) {
    if (dailyAverages.length < 3) return 'insufficient_data';

    const recent = dailyAverages.slice(-3);
    const older = dailyAverages.slice(0, -3);

    if (older.length === 0) return 'insufficient_data';

    const recentAvg = recent.reduce((sum, day) => sum + day.average, 0) / recent.length;
    const olderAvg = older.reduce((sum, day) => sum + day.average, 0) / older.length;

    const difference = recentAvg - olderAvg;

    if (difference > 0.3) return 'improving';
    if (difference < -0.3) return 'declining';
    return 'stable';
  }

  // ========== HORARIOS ==========

  // Guardar horario
  async saveSchedule(userId, schedule) {
    try {
      const userDocRef = doc(this.db, 'users', userId);
      await setDoc(userDocRef, {
        schedule,
        scheduleUpdatedAt: serverTimestamp()
      }, { merge: true });

      console.log('✅ Schedule saved successfully');
    } catch (error) {
      console.error('❌ Error saving schedule:', error);
      throw error;
    }
  }

  // Obtener horario
  async getSchedule(userId) {
    try {
      const userDocRef = doc(this.db, 'users', userId);
      const docSnap = await getDoc(userDocRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return data.schedule || {};
      }
      return {};
    } catch (error) {
      console.error('❌ Error getting schedule:', error);
      return {};
    }
  }

  // ========== PERFIL DE USUARIO ==========

  // Guardar perfil de usuario
  async saveUserProfile(userId, profileData) {
    try {
      const userDocRef = doc(this.db, 'users', userId);
      await setDoc(userDocRef, {
        ...profileData,
        updatedAt: serverTimestamp()
      }, { merge: true });

      console.log('✅ User profile saved successfully');
    } catch (error) {
      console.error('❌ Error saving user profile:', error);
      throw error;
    }
  }

  // Obtener perfil de usuario
  async getUserProfile(userId) {
    try {
      const userDocRef = doc(this.db, 'users', userId);
      const docSnap = await getDoc(userDocRef);

      if (docSnap.exists()) {
        return docSnap.data();
      }
      return null;
    } catch (error) {
      console.error('❌ Error getting user profile:', error);
      return null;
    }
  }

  // ========== MÉTODOS AUXILIARES ==========

  // Helpers
  getEmotionValue(emotionId) {
    const values = {
      'stressed': 1,
      'neutral': 2,
      'tranki': 3
    };
    return values[emotionId] || 2;
  }

  // ========== MÉTODOS EXISTENTES MANTENIDOS ==========

  // Método para obtener el usuario actual
  getCurrentUser() {
    return this.auth.currentUser;
  }

  // Método para cerrar sesión
  async signOut() {
    try {
      await this.auth.signOut();
      console.log('✅ Sesión cerrada');
    } catch (error) {
      console.error('❌ Error cerrando sesión:', error.message);
      throw error;
    }
  }

  // Método para escuchar cambios de autenticación
  onAuthStateChanged(callback) {
    return this.auth.onAuthStateChanged(callback);
  }

  // Método para verificar si el usuario está autenticado
  isAuthenticated() {
    return !!this.auth.currentUser;
  }

  // Obtener datos del usuario (alias para compatibilidad)
  async getUserData(userId) {
    return this.getUserProfile(userId);
  }

  // Actualizar datos del usuario (alias para compatibilidad)
  async updateUserData(userId, userData) {
    return this.saveUserProfile(userId, userData);
  }

  // Métodos para estadísticas de emociones (mantenido para compatibilidad)
  async getEmotionStats(userId, days = 7) {
    try {
      const emotions = await this.getEmotionHistory(userId, days);
      
      if (emotions.length === 0) {
        return {
          total: 0,
          average: 0,
          mostFrequent: null,
          trend: 'neutral'
        };
      }

      // Calcular estadísticas
      const total = emotions.length;
      const average = emotions.reduce((sum, emotion) => sum + (emotion.value || 0), 0) / total;
      
      // Emoción más frecuente
      const emotionCounts = emotions.reduce((acc, emotion) => {
        acc[emotion.emotion] = (acc[emotion.emotion] || 0) + 1;
        return acc;
      }, {});
      
      const mostFrequent = Object.keys(emotionCounts).reduce((a, b) => 
        emotionCounts[a] > emotionCounts[b] ? a : b
      );

      // Tendencia (comparar últimos 3 días con 3 anteriores)
      const recent = emotions.slice(0, Math.floor(emotions.length / 2));
      const older = emotions.slice(Math.floor(emotions.length / 2));
      
      const recentAvg = recent.reduce((sum, e) => sum + (e.value || 0), 0) / recent.length;
      const olderAvg = older.reduce((sum, e) => sum + (e.value || 0), 0) / older.length;
      
      let trend = 'neutral';
      if (recentAvg > olderAvg + 0.5) trend = 'improving';
      else if (recentAvg < olderAvg - 0.5) trend = 'declining';

      console.log('✅ Estadísticas de emociones calculadas');
      return {
        total,
        average: parseFloat(average.toFixed(1)),
        mostFrequent,
        trend,
        recentAverage: parseFloat(recentAvg.toFixed(1)),
        olderAverage: parseFloat(olderAvg.toFixed(1))
      };
    } catch (error) {
      console.error('❌ Error calculando estadísticas:', error.message);
      throw error;
    }
  }

  // Método para guardar lugares favoritos
  async saveFavoritePlace(userId, place) {
    try {
      const favoritesRef = collection(this.db, 'favorites');
      const favoriteDocRef = doc(favoritesRef, `${userId}_${place.id}`);
      
      await setDoc(favoriteDocRef, {
        userId,
        placeId: place.id,
        placeName: place.name,
        placeAddress: place.address,
        category: place.category || 'general',
        savedAt: serverTimestamp()
      });
      
      console.log('✅ Lugar favorito guardado:', place.name);
    } catch (error) {
      console.error('❌ Error guardando lugar favorito:', error.message);
      throw error;
    }
  }

  // Método para obtener lugares favoritos
  async getFavoritePlaces(userId) {
    try {
      const favoritesRef = collection(this.db, 'favorites');
      const q = query(
        favoritesRef,
        where('userId', '==', userId),
        orderBy('savedAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const favorites = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('✅ Lugares favoritos obtenidos:', favorites.length);
      return favorites;
    } catch (error) {
      console.error('❌ Error obteniendo lugares favoritos:', error.message);
      throw error;
    }
  }

  // ========== NUEVOS MÉTODOS PARA FUNCIONALIDADES AVANZADAS ==========

  // Limpiar datos antiguos (llamar ocasionalmente)
  async cleanupOldData(userId, daysToKeep = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      const cutoffDateStr = formatDate(cutoffDate);

      const emotionsRef = collection(this.db, 'users', userId, 'emotions');
      const q = query(
        emotionsRef,
        where('date', '<', cutoffDateStr)
      );

      const snapshot = await getDocs(q);
      const batch = writeBatch(this.db);
      
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      console.log(`🧹 Cleaned up ${snapshot.size} old emotion records`);
    } catch (error) {
      console.error('❌ Error cleaning up old data:', error);
    }
  }

  // Exportar datos para el usuario
  async exportUserData(userId) {
    try {
      const [profile, schedule, emotions] = await Promise.all([
        this.getUserProfile(userId),
        this.getSchedule(userId),
        this.getEmotionHistory(userId, 365) // Un año de datos
      ]);

      const exportData = {
        profile,
        schedule,
        emotions,
        exportDate: new Date().toISOString(),
        userId // Para referencia
      };

      console.log('📤 User data exported successfully');
      return exportData;
    } catch (error) {
      console.error('❌ Error exporting user data:', error);
      throw error;
    }
  }

  // ========== MÉTODOS DE MIGRACIÓN ==========

  // Migrar emociones del formato antiguo al nuevo (ejecutar una vez)
  async migrateOldEmotions(userId) {
    try {
      console.log('🔄 Starting emotion migration for user:', userId);
      
      // Buscar emociones en el formato antiguo
      const oldEmotionsRef = collection(this.db, 'emotions');
      const q = query(oldEmotionsRef, where('userId', '==', userId));
      const snapshot = await getDocs(q);

      const batch = writeBatch(this.db);
      let migratedCount = 0;

      for (const docSnap of snapshot.docs) {
        const oldData = docSnap.data();
        const date = oldData.date;
        
        // Crear registro en el nuevo formato
        const newRecordRef = doc(collection(this.db, 'users', userId, 'emotions', date, 'records'));
        batch.set(newRecordRef, {
          emotion: oldData.emotion,
          value: oldData.value || this.getEmotionValue(oldData.emotion),
          timestamp: oldData.timestamp || new Date(date).toISOString(),
          date: date,
          hour: new Date(oldData.timestamp || date).getHours(),
          createdAt: oldData.timestamp || serverTimestamp(),
          migrated: true
        });

        // Crear documento del día
        const dayDocRef = doc(this.db, 'users', userId, 'emotions', date);
        batch.set(dayDocRef, {
          date: date,
          emotion: oldData.emotion,
          value: oldData.value || this.getEmotionValue(oldData.emotion),
          totalRecords: 1,
          lastUpdated: serverTimestamp(),
          migrated: true
        }, { merge: true });

        migratedCount++;
      }

      if (migratedCount > 0) {
        await batch.commit();
        console.log(`✅ Migrated ${migratedCount} emotion records`);
      }

      return migratedCount;
    } catch (error) {
      console.error('❌ Error migrating emotions:', error);
      throw error;
    }
  }
}

export default new FirebaseService();