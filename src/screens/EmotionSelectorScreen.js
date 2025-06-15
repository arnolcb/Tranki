// src/screens/EmotionSelectorScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  Dimensions
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { EMOTIONS } from '../constants/emotions';
import { COLORS } from '../constants/colors';
import { formatDate } from '../utils/dateUtils';
import FirebaseService from '../services/firebase';

const { width } = Dimensions.get('window');

const EmotionSelectorScreen = ({ navigation }) => {
  const [selectedEmotion, setSelectedEmotion] = useState(null);
  const [todayEmotion, setTodayEmotion] = useState(null);
  const [user, setUser] = useState(null);
  const [scaleAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    const currentUser = auth().currentUser;
    setUser(currentUser);
    
    // Animación de entrada
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();

    // Verificar si ya registró emoción hoy
    checkTodayEmotion(currentUser?.uid);
  }, []);

const checkTodayEmotion = async (userId) => {
  if (!userId) return;
  
  try {
    // Obtener emociones recientes
    const history = await FirebaseService.getEmotionHistory(userId, 7); // Solo 7 días
    const today = formatDate(new Date());
    
    console.log('Checking emotions for today:', today);
    console.log('Retrieved history:', history);
    
    const todayRecord = history.find(record => record.date === today);
    
    if (todayRecord) {
      const emotion = Object.values(EMOTIONS).find(e => e.id === todayRecord.emotion);
      console.log('Found today emotion:', emotion);
      setTodayEmotion(emotion);
    }
  } catch (error) {
    console.error('Error checking today emotion:', error);
    // No mostrar error al usuario, solo log
  }
};

  const handleEmotionSelect = (emotion) => {
    setSelectedEmotion(emotion);
    
    // Animación de selección
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start();
  };

  const handleSaveEmotion = async () => {
    if (!selectedEmotion || !user) return;

    try {
      await FirebaseService.saveEmotion(user.uid, selectedEmotion);
      setTodayEmotion(selectedEmotion);
      
      Alert.alert(
        '¡Registrado!', 
        `Has registrado que te sientes ${selectedEmotion.label.toLowerCase()} hoy.`,
        [
          {
            text: 'Hablar con el bot',
            onPress: () => navigation.navigate('Chat', { emotion: selectedEmotion })
          },
          {
            text: 'Continuar',
            style: 'cancel'
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar tu estado emocional');
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '¡Buenos días!';
    if (hour < 18) return '¡Buenas tardes!';
    return '¡Buenas noches!';
  };

  if (todayEmotion) {
    return (
      <View style={styles.container}>
        <View style={styles.completedContainer}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.completedTitle}>Ya registraste tu emoción hoy</Text>
          
          <View style={styles.todayEmotionContainer}>
            <Text style={styles.todayEmotionEmoji}>{todayEmotion.emoji}</Text>
            <Text style={styles.todayEmotionLabel}>Te sientes {todayEmotion.label}</Text>
          </View>

          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => navigation.navigate('Chat', { emotion: todayEmotion })}
          >
            <Text style={styles.chatButtonText}>Hablar con el asistente</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => navigation.navigate('History')}
          >
            <Text style={styles.historyButtonText}>Ver mi historial</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      <View style={styles.header}>
        <Text style={styles.greeting}>{getGreeting()}</Text>
        <Text style={styles.question}>¿Cómo te sientes hoy?</Text>
      </View>

      <View style={styles.emotionsContainer}>
        {Object.values(EMOTIONS).map((emotion) => (
          <TouchableOpacity
            key={emotion.id}
            style={[
              styles.emotionButton,
              selectedEmotion?.id === emotion.id && styles.emotionButtonSelected
            ]}
            onPress={() => handleEmotionSelect(emotion)}
          >
            <Text style={styles.emotionEmoji}>{emotion.emoji}</Text>
            <Text style={[
              styles.emotionLabel,
              selectedEmotion?.id === emotion.id && styles.emotionLabelSelected
            ]}>
              {emotion.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {selectedEmotion && (
        <Animated.View style={styles.confirmContainer}>
          <Text style={styles.confirmText}>
            Has seleccionado: {selectedEmotion.emoji} {selectedEmotion.label}
          </Text>
          
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSaveEmotion}
          >
            <Text style={styles.saveButtonText}>Confirmar</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 50,
    marginBottom: 40,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 10,
  },
  question: {
    fontSize: 18,
    color: COLORS.text,
    textAlign: 'center',
  },
  emotionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 40,
  },
  emotionButton: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    width: width * 0.25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emotionButtonSelected: {
    backgroundColor: COLORS.primary,
    transform: [{ scale: 1.05 }],
  },
  emotionEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  emotionLabel: {
    fontSize: 14,
    color: COLORS.text,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  emotionLabelSelected: {
    color: COLORS.white,
  },
  confirmContainer: {
    alignItems: 'center',
    marginTop: 30,
  },
  confirmText: {
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  completedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedTitle: {
    fontSize: 20,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 30,
  },
  todayEmotionContainer: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 30,
    borderRadius: 20,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  todayEmotionEmoji: {
    fontSize: 60,
    marginBottom: 15,
  },
  todayEmotionLabel: {
    fontSize: 18,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  chatButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 15,
  },
  chatButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  historyButton: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  historyButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default EmotionSelectorScreen;