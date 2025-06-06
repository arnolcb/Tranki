
// src/screens/ProfileScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { COLORS } from '../constants/colors';

const ProfileScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [stats, setStats] = useState({ totalDays: 0, avgMood: 0, streak: 0 });

  useEffect(() => {
    const currentUser = auth().currentUser;
    setUser(currentUser);
    if (currentUser) {
      loadUserData(currentUser.uid);
      loadUserStats(currentUser.uid);
    }
  }, []);

  const loadUserData = async (userId) => {
    try {
      const doc = await firestore().collection('users').doc(userId).get();
      if (doc.exists) {
        setUserData(doc.data());
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadUserStats = async (userId) => {
    // Simular estadísticas (en producción calcular desde Firebase)
    setStats({
      totalDays: Math.floor(Math.random() * 30) + 5,
      avgMood: (Math.random() * 1.5 + 1.5).toFixed(1),
      streak: Math.floor(Math.random() * 7) + 1
    });
  };

  const handleSignOut = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: () => auth().signOut()
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mi Perfil</Text>
      </View>

      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatar}>👤</Text>
        </View>
        <Text style={styles.userName}>{userData?.name || 'Usuario'}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        <Text style={styles.userRole}>
          {userData?.role === 'ambos' ? 'Estudiante y Trabajador' : 
           userData?.role === 'estudiante' ? 'Estudiante' : 'Trabajador'}
        </Text>
      </View>

      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>📊 Mis estadísticas</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalDays}</Text>
            <Text style={styles.statLabel}>Días registrados</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.avgMood}</Text>
            <Text style={styles.statLabel}>Estado promedio</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.streak}</Text>
            <Text style={styles.statLabel}>Racha actual</Text>
          </View>
        </View>
      </View>

      <View style={styles.actionsSection}>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>📱</Text>
          <Text style={styles.actionText}>Notificaciones</Text>
          <Text style={styles.actionArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>🎯</Text>
          <Text style={styles.actionText}>Metas personales</Text>
          <Text style={styles.actionArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>📋</Text>
          <Text style={styles.actionText}>Exportar datos</Text>
          <Text style={styles.actionArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>❓</Text>
          <Text style={styles.actionText}>Ayuda y soporte</Text>
          <Text style={styles.actionArrow}>→</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutButtonText}>Cerrar sesión</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Tranki v1.0.0</Text>
        <Text style={styles.footerText}>Hecho con 💚 para tu bienestar</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  // Estilos principales del contenedor
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

  // Estilos del header
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
  },
  saveButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Estilos del contenido principal
  content: {
    flex: 1,
    padding: 20,
  },
  dayContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 10,
    marginTop: 10,
  },
  emptyDay: {
    alignItems: 'center',
    padding: 20,
  },
  emptyDayText: {
    color: COLORS.text,
    opacity: 0.6,
    fontStyle: 'italic',
  },

  // Estilos de eventos
  eventCard: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  eventTime: {
    fontSize: 14,
    color: COLORS.text,
    opacity: 0.7,
  },
  deleteButton: {
    padding: 5,
  },
  deleteButtonText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Estilos de tiempo libre
  freeTimeCard: {
    backgroundColor: '#E8F5E8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  freeTimeIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  freeTimeInfo: {
    flex: 1,
  },
  freeTimeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D2E',
  },
  freeTimeHours: {
    fontSize: 12,
    color: '#2E7D2E',
    opacity: 0.8,
  },
  suggestion: {
    fontSize: 12,
    color: '#2E7D2E',
    fontStyle: 'italic',
    marginTop: 2,
  },

  // Estilos del modal
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 5,
    fontWeight: '500',
  },
  typeSelector: {
    marginBottom: 15,
  },
  typeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  typeButton: {
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    width: '48%',
    marginBottom: 8,
  },
  typeButtonIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  typeButtonText: {
    fontSize: 12,
    color: COLORS.text,
  },
  timeInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeInput: {
    width: '48%',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 20,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.text,
    fontWeight: 'bold',
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 20,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },

  // Estilos de consejos
  tipsContainer: {
    marginTop: 20,
    marginBottom: 30,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 10,
  },
  tipCard: {
    backgroundColor: COLORS.white,
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.secondary,
  },
  tipText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },

  // Estilos del perfil
  profileSection: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    margin: 20,
    padding: 30,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatar: {
    fontSize: 40,
    color: COLORS.white,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    color: COLORS.text,
    opacity: 0.7,
    marginBottom: 5,
  },
  userRole: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },

  // Estilos de estadísticas
  statsSection: {
    margin: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.text,
    textAlign: 'center',
  },

  // Estilos de acciones
  actionsSection: {
    margin: 20,
  },
  actionButton: {
    backgroundColor: COLORS.white,
    padding: 15,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionIcon: {
    fontSize: 20,
    marginRight: 15,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  actionArrow: {
    fontSize: 16,
    color: COLORS.text,
    opacity: 0.5,
  },
  signOutButton: {
    backgroundColor: '#F44336',
    marginHorizontal: 20,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  signOutButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    padding: 20,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.text,
    opacity: 0.5,
    marginBottom: 2,
  },
});

export default ProfileScreen;