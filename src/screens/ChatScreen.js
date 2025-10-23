// src/screens/ChatScreen.js - Con espaciado corregido
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Platform,
  StatusBar,
  SafeAreaView,
  Keyboard,
  Alert,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { COLORS } from '../constants/colors';
import GroqService from '../services/groqService';
import FirebaseService from '../services/firebase';
import CustomIcons from '../components/CustomIcons';

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 90 : 70;
const INPUT_CONTAINER_HEIGHT = 80;
const SAFE_SPACING = 50;

const ChatScreen = ({ route, navigation }) => {
  const { emotion } = route.params || {};
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const flatListRef = useRef();

  useEffect(() => {
    StatusBar.setBarStyle('dark-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('transparent');
      StatusBar.setTranslucent(true);
    }
    
    checkConnectionAndInitialize();

    const showSubscription = Keyboard.addListener(
      'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSubscription = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardHeight(0)
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [emotion]);

  const checkConnectionAndInitialize = async () => {
    setConnectionStatus('checking');
    
    try {
      const connectionTest = await GroqService.testConnection();
      
      if (connectionTest.success) {
        setConnectionStatus('connected');
        
        if (emotion) {
          setTimeout(() => {
            initializeConversation();
          }, 300);
        }
      } else {
        setConnectionStatus('error');
      }
    } catch (error) {
      setConnectionStatus('error');
    }
  };

  const initializeConversation = async () => {
    if (connectionStatus !== 'connected') return;
    
    setIsTyping(true);
    
    try {
      const user = auth().currentUser;
      let userContext = {};
      
      if (user?.uid) {
        try {
          userContext = await getUserContext(user.uid);
        } catch (err) {
          userContext = {};
        }
      }
      
      const welcomeMessage = await GroqService.getContextualResponse(
        emotion,
        `Hola, hoy me siento ${emotion.label.toLowerCase()}`,
        userContext
      );
      
      setTimeout(() => {
        addBotMessage(welcomeMessage);
        setIsTyping(false);
      }, 600);
      
    } catch (error) {
      setIsTyping(false);
      Alert.alert(
        'Error de IA',
        `No pude inicializar la conversación: ${error.message}`,
        [
          { text: 'Reintentar', onPress: () => initializeConversation() },
          { text: 'Volver', onPress: () => navigation.goBack() }
        ]
      );
    }
  };

  const getUserContext = async (userId) => {
    try {
      const [schedule, recentEmotions] = await Promise.all([
        FirebaseService.getSchedule(userId).catch(() => null),
        FirebaseService.getEmotionHistory(userId, 7).catch(() => [])
      ]);

      const today = new Date().toLocaleDateString('es-ES', { weekday: 'long' });
      const todaySchedule = schedule?.[today] || [];
      
      return {
        hasScheduleToday: todaySchedule.length > 0,
        recentEmotions: recentEmotions || [],
        freeTimeAvailable: calculateFreeTime(todaySchedule)
      };
    } catch (error) {
      return {};
    }
  };

  const calculateFreeTime = (schedule) => {
    if (!schedule || !schedule.length) return "todo el día";
    const totalEvents = schedule.length;
    if (totalEvents >= 4) return "poco tiempo";
    if (totalEvents >= 2) return "algunas horas";
    return "bastante tiempo";
  };

  const addBotMessage = (message) => {
    const newMessage = {
      id: Date.now().toString(),
      text: message,
      isBot: true,
      timestamp: new Date()
    };
    
    setMessages(prev => [newMessage, ...prev]);
    
    setConversationHistory(prev => [
      ...prev,
      { role: 'assistant', content: message }
    ].slice(-12));
  };

  const addUserMessage = (message) => {
    const newMessage = {
      id: Date.now().toString(),
      text: message,
      isBot: false,
      timestamp: new Date()
    };
    
    setMessages(prev => [newMessage, ...prev]);
    
    setConversationHistory(prev => [
      ...prev,
      { role: 'user', content: message }
    ].slice(-12));
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isTyping || connectionStatus !== 'connected') return;
    
    const userMessage = inputText.trim();
    setInputText('');
    
    addUserMessage(userMessage);
    setIsTyping(true);
    
    setTimeout(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, 100);
    
    try {
      const response = await GroqService.getChatResponse(
        emotion,
        userMessage,
        conversationHistory
      );
      
      setTimeout(() => {
        addBotMessage(response);
        setIsTyping(false);
      }, 600);
      
    } catch (error) {
      setIsTyping(false);
      Alert.alert(
        'Error de IA',
        `No pude procesar tu mensaje: ${error.message}`,
        [
          { text: 'Reintentar', onPress: () => {
            setInputText(userMessage);
            setMessages(prev => prev.slice(1));
            setConversationHistory(prev => prev.slice(0, -1));
          }}
        ]
      );
    }
  };

  const renderMessage = ({ item }) => {
    const isBot = item.isBot;
    
    return (
      <View
        style={[
          styles.messageContainer,
          isBot ? styles.botMessageContainer : styles.userMessageContainer
        ]}
      >
        {isBot && (
          <View style={styles.botAvatar}>
            <CustomIcons.MessageCircle size={14} color={COLORS.white} />
          </View>
        )}
        
        <View style={[
          styles.messageBubble,
          isBot ? styles.botMessage : styles.userMessage
        ]}>
          <Text style={[
            styles.messageText,
            isBot ? styles.botMessageText : styles.userMessageText
          ]}>
            {item.text}
          </Text>
          
          <Text style={[
            styles.timestamp,
            isBot ? styles.botTimestamp : styles.userTimestamp
          ]}>
            {item.timestamp.toLocaleTimeString('es-ES', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
        </View>
      </View>
    );
  };

  const renderTypingIndicator = () => (
    <View style={[styles.messageContainer, styles.botMessageContainer]}>
      <View style={styles.botAvatar}>
        <CustomIcons.MessageCircle size={14} color={COLORS.white} />
      </View>
      
      <View style={[styles.messageBubble, styles.botMessage, styles.typingBubble]}>
        <View style={styles.typingDots}>
          <View style={styles.typingDot} />
          <View style={styles.typingDot} />
          <View style={styles.typingDot} />
        </View>
      </View>
    </View>
  );

  const ListHeaderComponent = () => {
    if (!isTyping) return null;
    return renderTypingIndicator();
  };

  if (connectionStatus === 'error') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <CustomIcons.ArrowLeft size={22} color={COLORS.text} />
          </TouchableOpacity>
          
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Asistente Tranki</Text>
            <Text style={styles.headerSubtitle}>Error de conexión</Text>
          </View>
        </View>
        
        <View style={styles.errorContainer}>
          <CustomIcons.AlertCircle size={48} color={COLORS.error} />
          <Text style={styles.errorTitle}>IA no disponible</Text>
          <Text style={styles.errorMessage}>
            Verifica tu conexión a internet y la configuración de Groq
          </Text>
          
          <TouchableOpacity
            style={styles.retryButton}
            onPress={checkConnectionAndInitialize}
            activeOpacity={0.8}
          >
            <CustomIcons.Wifi size={18} color={COLORS.white} />
            <Text style={styles.retryButtonText}>Reconectar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Calcular posición del input y padding de mensajes
  const inputBottom = keyboardHeight > 0 ? keyboardHeight : TAB_BAR_HEIGHT;
  const messagesPadding = inputBottom + INPUT_CONTAINER_HEIGHT + SAFE_SPACING;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />
      
      <View style={styles.container}>
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
            <Text style={styles.headerTitle}>Asistente Tranki</Text>
            {emotion && (
              <View style={styles.emotionChip}>
                <Text style={styles.emotionChipText}>{emotion.label}</Text>
              </View>
            )}
          </View>

          <View style={styles.botIndicator}>
            <View style={styles.botIndicatorDot} />
          </View>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          inverted
          contentContainerStyle={[
            styles.messagesContent,
            { paddingBottom: messagesPadding }
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          ListHeaderComponent={ListHeaderComponent}
        />

        {/* Input - Posición absoluta */}
        <View style={[styles.inputContainer, { bottom: inputBottom }]}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder={
                connectionStatus === 'connected' 
                  ? "Escribe un mensaje..." 
                  : "Conectando..."
              }
              placeholderTextColor={COLORS.textMuted}
              multiline
              maxLength={500}
              editable={connectionStatus === 'connected'}
              returnKeyType="send"
              blurOnSubmit={false}
              onSubmitEditing={handleSendMessage}
            />
            
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || isTyping || connectionStatus !== 'connected') 
                  && styles.sendButtonDisabled
              ]}
              onPress={handleSendMessage}
              disabled={!inputText.trim() || isTyping || connectionStatus !== 'connected'}
              activeOpacity={0.8}
            >
              <CustomIcons.Send size={18} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  container: {
    flex: 1,
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
  emotionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF5FB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  emotionChipText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
  },
  botIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  botIndicatorDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  
  // Messages
  messagesContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  botMessageContainer: {
    justifyContent: 'flex-start',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  botAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  botMessage: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  userMessage: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 4,
  },
  botMessageText: {
    color: '#1A1A1A',
  },
  userMessageText: {
    color: COLORS.white,
  },
  timestamp: {
    fontSize: 11,
    marginTop: 2,
  },
  botTimestamp: {
    color: '#9CA3AF',
  },
  userTimestamp: {
    color: COLORS.white,
    opacity: 0.7,
  },
  typingBubble: {
    paddingVertical: 16,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    opacity: 0.4,
  },
  
  // Input con posición absoluta
  inputContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 20 : 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F9FAFB',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A1A',
    marginRight: 12,
    paddingTop: 8,
    paddingBottom: 8,
    maxHeight: 100,
    lineHeight: 20,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  
  // Error
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  retryButton: {
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
  retryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default ChatScreen;