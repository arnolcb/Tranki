// src/services/SleepService.js
import firestore from '@react-native-firebase/firestore';

const COLLECTIONS = {
  SLEEP_RECORDS: 'sleepRecords',
  USER_SLEEP: 'userSleep',
};

/**
 * Servicio para gestionar los registros de sueño en Firebase
 */
class SleepService {
  /**
   * Guarda un nuevo registro de sueño
   * @param {string} userId - ID del usuario
   * @param {Object} record - Datos del registro de sueño
   * @returns {Promise<string>} ID del documento creado
   */
  static async saveSleepRecord(userId, record) {
    try {
      const sleepData = {
        userId,
        sleepTime: record.sleepTime,
        wakeTime: record.wakeTime,
        duration: record.duration, // En horas (ej: 7.5)
        date: record.date, // Formato: YYYY-MM-DD
        quality: this.calculateQuality(record.duration),
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      const docRef = await firestore()
        .collection(COLLECTIONS.SLEEP_RECORDS)
        .add(sleepData);

      // Actualizar estadísticas del usuario
      await this.updateUserStats(userId);

      console.log('Sleep record saved:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error saving sleep record:', error);
      throw error;
    }
  }

  /**
   * Obtiene el registro de sueño de hoy
   * @param {string} userId - ID del usuario
   * @param {string} date - Fecha en formato YYYY-MM-DD
   * @returns {Promise<Object|null>} Registro de sueño o null
   */
  static async getTodaySleep(userId, date) {
    try {
      const snapshot = await firestore()
        .collection(COLLECTIONS.SLEEP_RECORDS)
        .where('userId', '==', userId)
        .where('date', '==', date)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
      };
    } catch (error) {
      console.error('Error getting today sleep:', error);
      throw error;
    }
  }

  /**
   * Obtiene el último registro de sueño del usuario
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object|null>} Último registro o null
   */
  static async getLastEmotion(userId) {
    try {
      const snapshot = await firestore()
        .collection(COLLECTIONS.SLEEP_RECORDS)
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
      };
    } catch (error) {
      console.error('Error getting last sleep:', error);
      throw error;
    }
  }

  /**
   * Obtiene el historial de sueño de los últimos N días
   * @param {string} userId - ID del usuario
   * @param {number} days - Número de días a obtener
   * @returns {Promise<Array>} Array de registros de sueño
   */
  static async getSleepHistory(userId, days = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = this.formatDate(startDate);

      const snapshot = await firestore()
        .collection(COLLECTIONS.SLEEP_RECORDS)
        .where('userId', '==', userId)
        .where('date', '>=', startDateStr)
        .orderBy('date', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('Error getting sleep history:', error);
      throw error;
    }
  }

  /**
   * Obtiene los registros de sueño de un mes específico
   * @param {string} userId - ID del usuario
   * @param {number} year - Año
   * @param {number} month - Mes (1-12)
   * @returns {Promise<Array>} Array de registros del mes
   */
  static async getMonthSleep(userId, year, month) {
    try {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

      const snapshot = await firestore()
        .collection(COLLECTIONS.SLEEP_RECORDS)
        .where('userId', '==', userId)
        .where('date', '>=', startDate)
        .where('date', '<=', endDate)
        .orderBy('date', 'asc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('Error getting month sleep:', error);
      throw error;
    }
  }

  /**
   * Obtiene las estadísticas del usuario
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object>} Estadísticas del usuario
   */
  static async getUserStats(userId) {
    try {
      const doc = await firestore()
        .collection(COLLECTIONS.USER_SLEEP)
        .doc(userId)
        .get();

      if (!doc.exists) {
        return {
          totalRecords: 0,
          averageDuration: 0,
          bestStreak: 0,
          currentStreak: 0,
          qualityDistribution: {
            deep: 0,
            light: 0,
            poor: 0,
          },
        };
      }

      return doc.data();
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error;
    }
  }

  /**
   * Actualiza las estadísticas del usuario
   * @param {string} userId - ID del usuario
   * @returns {Promise<void>}
   */
  static async updateUserStats(userId) {
    try {
      // Obtener todos los registros del usuario
      const snapshot = await firestore()
        .collection(COLLECTIONS.SLEEP_RECORDS)
        .where('userId', '==', userId)
        .orderBy('date', 'desc')
        .get();

      const records = snapshot.docs.map(doc => doc.data());

      if (records.length === 0) {
        return;
      }

      // Calcular estadísticas
      const totalDuration = records.reduce((sum, r) => sum + r.duration, 0);
      const averageDuration = totalDuration / records.length;

      const qualityDistribution = {
        deep: records.filter(r => r.quality === 'deep').length,
        light: records.filter(r => r.quality === 'light').length,
        poor: records.filter(r => r.quality === 'poor').length,
      };

      const currentStreak = this.calculateCurrentStreak(records);
      const bestStreak = this.calculateBestStreak(records);

      // Guardar estadísticas
      await firestore()
        .collection(COLLECTIONS.USER_SLEEP)
        .doc(userId)
        .set({
          totalRecords: records.length,
          averageDuration: Math.round(averageDuration * 10) / 10,
          currentStreak,
          bestStreak,
          qualityDistribution,
          lastUpdated: firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

    } catch (error) {
      console.error('Error updating user stats:', error);
      throw error;
    }
  }

  /**
   * Elimina un registro de sueño
   * @param {string} recordId - ID del registro a eliminar
   * @returns {Promise<void>}
   */
  static async deleteSleepRecord(recordId) {
    try {
      await firestore()
        .collection(COLLECTIONS.SLEEP_RECORDS)
        .doc(recordId)
        .delete();

      console.log('Sleep record deleted:', recordId);
    } catch (error) {
      console.error('Error deleting sleep record:', error);
      throw error;
    }
  }

  /**
   * Actualiza un registro de sueño existente
   * @param {string} recordId - ID del registro
   * @param {Object} updates - Datos a actualizar
   * @returns {Promise<void>}
   */
  static async updateSleepRecord(recordId, updates) {
    try {
      await firestore()
        .collection(COLLECTIONS.SLEEP_RECORDS)
        .doc(recordId)
        .update({
          ...updates,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });

      console.log('Sleep record updated:', recordId);
    } catch (error) {
      console.error('Error updating sleep record:', error);
      throw error;
    }
  }

  // ========== MÉTODOS AUXILIARES ==========

  /**
   * Calcula la calidad del sueño basado en la duración
   * @param {number} duration - Duración en horas
   * @returns {string} Calidad: 'deep', 'light', 'poor'
   */
  static calculateQuality(duration) {
    if (duration >= 7) return 'deep';
    if (duration >= 6) return 'light';
    return 'poor';
  }

  /**
   * Calcula la racha actual de días con sueño registrado
   * @param {Array} records - Array de registros ordenados por fecha desc
   * @returns {number} Número de días consecutivos
   */
  static calculateCurrentStreak(records) {
    if (records.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    let checkDate = new Date(today);

    for (const record of records) {
      const recordDate = new Date(record.date);
      const expectedDate = this.formatDate(checkDate);

      if (record.date === expectedDate) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * Calcula la mejor racha de días consecutivos
   * @param {Array} records - Array de registros ordenados por fecha
   * @returns {number} Mejor racha
   */
  static calculateBestStreak(records) {
    if (records.length === 0) return 0;

    let bestStreak = 1;
    let currentStreak = 1;

    const sortedRecords = [...records].sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    for (let i = 1; i < sortedRecords.length; i++) {
      const prevDate = new Date(sortedRecords[i - 1].date);
      const currDate = new Date(sortedRecords[i].date);
      
      const diffDays = Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        currentStreak++;
        bestStreak = Math.max(bestStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }

    return bestStreak;
  }

  /**
   * Formatea una fecha a YYYY-MM-DD
   * @param {Date} date - Fecha a formatear
   * @returns {string} Fecha formateada
   */
  static formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Obtiene la fecha actual en formato YYYY-MM-DD
   * @returns {string} Fecha actual
   */
  static getTodayDate() {
    return this.formatDate(new Date());
  }
}

export default SleepService;