// src/screens/ChatScreen.js - Versión mejorada
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Vibration
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { COLORS } from '../constants/colors';
import { EMOTIONS } from '../constants/emotions';
import OpenAIService from '../services/openaiService';
import FirebaseService from '../services/firebase';

const ChatScreen = ({ route, navigation }) => {
  const { emotion } = route.params || {};
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const scrollViewRef = useRef();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkConnectionAndInitialize();
    
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [emotion]);

  const checkConnectionAndInitialize = async () => {
    setConnectionStatus('checking');
    
    // Probar conexión con OpenAI
    const connectionTest = await OpenAIService.testConnection();
    
    if (connectionTest.success) {
      setConnectionStatus('connected');
      console.log('✅ Conectado a OpenAI');
    } else {
      setConnectionStatus('fallback');
      console.log('⚠️ Usando modo fallback:', connectionTest.message);
    }

    // Inicializar conversación
    if (emotion) {
      setTimeout(() => {
        initializeConversation();
      }, 500);
    }
  };

  const initializeConversation = async () => {
    setIsTyping(true);
    
    try {
      // Obtener contexto del usuario
      const user = auth().currentUser;
      const userContext = await getUserContext(user?.uid);
      
      let welcomeMessage;
      
      if (connectionStatus === 'connected') {
        welcomeMessage = await OpenAIService.getContextualResponse(
          emotion,
          `Hola, hoy me siento ${emotion.label.toLowerCase()}`,
          userContext
        );
      } else {
        welcomeMessage = OpenAIService.getFallbackResponse(emotion, 'saludo inicial');
      }
      
      setTimeout(() => {
        addBotMessage(welcomeMessage);
        setIsTyping(false);
      }, 1000);
      
    } catch (error) {
      console.error('Error initializing conversation:', error);
      setTimeout(() => {
        addBotMessage(OpenAIService.getFallbackResponse(emotion));
        setIsTyping(false);
      }, 1000);
    }
  };

  const getUserContext = async (userId) => {
    if (!userId) return {};
    
    try {
      const [schedule, recentEmotions] = await Promise.all([
        FirebaseService.getSchedule(userId),
        FirebaseService.getEmotionHistory(userId, 7)
      ]);

      const today = new Date().toLocaleDateString('es-ES', { weekday: 'long' });
      const todaySchedule = schedule?.[today] || [];
      
      return {
        hasScheduleToday: todaySchedule.length > 0,
        recentEmotions,
        freeTimeAvailable: calculateFreeTime(todaySchedule)
      };
    } catch (error) {
      console.error('Error getting user context:', error);
      return {};
    }
  };

  const calculateFreeTime = (schedule) => {
    if (!schedule.length) return "todo el día";
    
    const totalEvents = schedule.length;
    if (totalEvents >= 4) return "poco tiempo";
    if (totalEvents >= 2) return "algunas horas";
    return "bastante tiempo";
  };

  const addBotMessage = (message) => {
    const newMessage = {
      id: Date.now(),
      text: message,
      isBot: true,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    // Agregar al historial para mantener contexto
    setConversationHistory(prev => [
      ...prev,
      { role: 'assistant', content: message }
    ].slice(-10)); // Mantener solo últimos 10 mensajes
    
    // Vibración suave cuando llega mensaje del bot
    Vibration.vibrate(50);
  };

  const addUserMessage = (message) => {
    const newMessage = {
      id: Date.now(),
      text: message,
      isBot: false,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    // Agregar al historial
    setConversationHistory(prev => [
      ...prev,
      { role: 'user', content: message }
    ].slice(-10));
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isTyping) return;
    
    const userMessage = inputText.trim();
    setInputText('');
    addUserMessage(userMessage);
    setIsTyping(true);
    
    try {
      let response;
      
      if (connectionStatus === 'connected') {
        response = await OpenAIService.getChatResponse(
          emotion,
          userMessage,
          conversationHistory
        );
      } else {
        // Modo fallback con respuestas inteligentes
        response = OpenAIService.getFallbackResponse(emotion, userMessage);
      }
      
      // Simular tiempo de escritura más realista
      const typingTime = Math.min(Math.max(response.length * 30, 1000), 3000);
      
      setTimeout(() => {
        addBotMessage(response);
        setIsTyping(false);
      }, typingTime);
      
    } catch (error) {
      console.error('Error getting response:', error);
      setTimeout(() => {
        addBotMessage("Disculpa, tuve un pequeño problema técnico 😅. ¿Puedes repetir tu mensaje?");
        setIsTyping(false);
      }, 1500);
    }
  };

  const handleQuickAction = (text) => {
    setInputText(text);
    // Auto enviar después de un momento para que el usuario vea qué se seleccionó
    setTimeout(() => {
      handleSendMessage();
    }, 500);
  };

  const renderMessage = (message) => (
    <Animated.View
      key={message.id}
      style={[
        styles.messageContainer,
        message.isBot ? styles.botMessageContainer : styles.userMessageContainer,
        { opacity: fadeAnim }
      ]}
    >
      <View style={[
        styles.messageBubble,
        message.isBot ? styles.botMessage : styles.userMessage
      ]}>
        <Text style={[
          styles.messageText,
          message.isBot ? styles.botMessageText : styles.userMessageText
        ]}>
          {message.text}
        </Text>
        <Text style={[
          styles.timestamp,
          message.isBot ? styles.botTimestamp : styles.userTimestamp
        ]}>
          {message.timestamp.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </Text>
      </View>
    </Animated.View>
  );

  const renderConnectionStatus = () => {
    if (connectionStatus === 'checking') return null;
    
    return (
      <View style={[
        styles.statusBanner,
        connectionStatus === 'connected' ? styles.connectedBanner : styles.fallbackBanner
      ]}>
        <Text style={styles.statusText}>
          {connectionStatus === 'connected' 
            ? '🤖 Asistente IA activado' 
            : '💡 Modo asistente básico'
          }
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Asistente Tranki</Text>
        <Text style={styles.emotionIndicator}>
          {emotion?.emoji} {emotion?.label}
        </Text>
      </View>

      {renderConnectionStatus()}

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map(renderMessage)}
        
        {isTyping && (
          <View style={[styles.messageContainer, styles.botMessageContainer]}>
            <View style={[styles.messageBubble, styles.botMessage]}>
              <View style={styles.typingIndicator}>
                <View style={styles.typingDot} />
                <View style={styles.typingDot} />
                <View style={styles.typingDot} />
              </View>
              <Text style={styles.typingText}>Tranki está escribiendo...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Botones de acceso rápido */}
      {!isTyping && messages.length > 0 && (
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => handleQuickAction('¿Puedes darme consejos para relajarme?')}
          >
            <Text style={styles.quickActionText}>💡 Consejos</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => handleQuickAction('¿Qué actividades me recomiendas para hoy?')}
          >
            <Text style={styles.quickActionText}>🎯 Actividades</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => handleQuickAction('¿Cómo puedo sentirme mejor?')}
          >
            <Text style={styles.quickActionText}>✨ Sentirme mejor</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Escribe tu mensaje..."
          multiline
          maxLength={300}
          onSubmitEditing={handleSendMessage}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[
            styles.sendButton, 
            (!inputText.trim() || isTyping) && styles.sendButtonDisabled
          ]}
          onPress={handleSendMessage}
          disabled={!inputText.trim() || isTyping}
        >
          <Text style={styles.sendButtonText}>
            {isTyping ? '⏳' : '📤'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  emotionIndicator: {
    color: COLORS.white,
    fontSize: 14,
    marginTop: 5,
  },
  statusBanner: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    alignItems: 'center',
  },
  connectedBanner: {
    backgroundColor: '#E8F5E8',
  },
  fallbackBanner: {
    backgroundColor: '#FFF3E0',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },
  messagesContainer: {
    flex: 1,
    padding: 15,
  },
  messageContainer: {
    marginBottom: 15,
  },
  botMessageContainer: {
    alignItems: 'flex-start',
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 18,
  },
  botMessage: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userMessage: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  botMessageText: {
    color: COLORS.text,
  },
  userMessageText: {
    color: COLORS.white,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    opacity: 0.7,
  },
  botTimestamp: {
    color: COLORS.text,
  },
  userTimestamp: {
    color: COLORS.white,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginRight: 3,
    opacity: 0.6,
  },
  typingText: {
    color: COLORS.text,
    fontStyle: 'italic',
    fontSize: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: COLORS.white,
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 80,
    marginRight: 10,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 50,
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.lightGray,
  },
  sendButtonText: {
    fontSize: 18,
  },
  quickActions: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: COLORS.white,
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  quickActionButton: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  quickActionText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '500',
  },
});

export default ChatScreen;