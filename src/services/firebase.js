// src/services/firebase.js
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { formatDate } from '../utils/dateUtils'; 

class FirebaseService {
  // Autenticación
  async signInWithEmail(email, password) {
    try {
      const userCredential = await auth().signInWithEmailAndPassword(email, password);
      return userCredential.user;
    } catch (error) {
      throw error;
    }
  }

  async createUserWithEmail(email, password, userData) {
    try {
      const userCredential = await auth().createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;
      
      // Guardar datos adicionales del usuario
      await firestore()
        .collection('users')
        .doc(user.uid)
        .set({
          ...userData,
          email: user.email,
          createdAt: firestore.FieldValue.serverTimestamp()
        });
      
      return user;
    } catch (error) {
      throw error;
    }
  }

  // Emociones
  async saveEmotion(userId, emotion) {
    try {
      const today = formatDate(new Date());
      await firestore()
        .collection('emotions')
        .doc(`${userId}_${today}`)
        .set({
          userId,
          emotion: emotion.id,
          value: emotion.value,
          date: today,
          timestamp: firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    } catch (error) {
      throw error;
    }
  }

  async getEmotionHistory(userId, days = 30) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);

      const snapshot = await firestore()
        .collection('emotions')
        .where('userId', '==', userId)
        .where('date', '>=', formatDate(startDate))
        .where('date', '<=', formatDate(endDate))
        .orderBy('date', 'desc')
        .get();

      return snapshot.docs.map(doc => doc.data());
    } catch (error) {
      throw error;
    }
  }

  // Horarios
  async saveSchedule(userId, schedule) {
    try {
      await firestore()
        .collection('schedules')
        .doc(userId)
        .set({
          userId,
          schedule,
          updatedAt: firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    } catch (error) {
      throw error;
    }
  }

  async getSchedule(userId) {
    try {
      const doc = await firestore()
        .collection('schedules')
        .doc(userId)
        .get();
      
      return doc.exists ? doc.data().schedule : null;
    } catch (error) {
      throw error;
    }
  }
}

export default new FirebaseService();