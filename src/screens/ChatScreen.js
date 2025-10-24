import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Alert,
  Animated,
  Dimensions,
  Keyboard,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { COLORS } from '../constants/colors';
import GroqService from '../services/groqService';
import FirebaseService from '../services/firebase';
import CustomIcons from '../components/CustomIcons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 90 : 70;
const INPUT_AREA_DEFAULT_HEIGHT = 80;

const ChatScreen = ({ route, navigation }) => {
  const { emotion } = route.params || {};
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [inputContainerHeight, setInputContainerHeight] = useState(INPUT_AREA_DEFAULT_HEIGHT);

  const flatListRef = useRef(null);
  const inputRef = useRef(null);
  const inputBottomAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    StatusBar.setBarStyle('dark-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('transparent');
      StatusBar.setTranslucent(true);
    }

    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        const kHeight = e.endCoordinates.height;
        setKeyboardHeight(kHeight);
        Animated.timing(inputBottomAnim, {
          toValue: kHeight - TAB_BAR_HEIGHT,
          duration: Platform.OS === 'ios' ? e.duration : 250,
          useNativeDriver: false,
        }).start();
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      (e) => {
        setKeyboardHeight(0);
        Animated.timing(inputBottomAnim, {
          toValue: 0,
          duration: Platform.OS === 'ios' ? e.duration : 250,
          useNativeDriver: false,
        }).start();
      }
    );

    checkConnectionAndInitialize();

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, [emotion]);

  const checkConnectionAndInitialize = async () => {
    setConnectionStatus('checking');
    try {
      const connectionTest = await GroqService.testConnection();
      if (connectionTest.success) {
        setConnectionStatus('connected');
        if (emotion) setTimeout(() => initializeConversation(), 300);
      } else setConnectionStatus('error');
    } catch {
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
        } catch {
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
    } catch {
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
    const newMessage = { id: Date.now().toString(), text: message, isBot: true, timestamp: new Date() };
    setMessages(prev => [...prev, newMessage]);
    setConversationHistory(prev => [...prev, { role: 'assistant', content: message }].slice(-12));
  };

  const addUserMessage = (message) => {
    const newMessage = { id: Date.now().toString(), text: message, isBot: false, timestamp: new Date() };
    setMessages(prev => [...prev, newMessage]);
    setConversationHistory(prev => [...prev, { role: 'user', content: message }].slice(-12));
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isTyping || connectionStatus !== 'connected') return;
    const userMessage = inputText.trim();
    setInputText('');
    addUserMessage(userMessage);
    setIsTyping(true);
    try {
      const response = await GroqService.getChatResponse(emotion, userMessage, conversationHistory);
      setTimeout(() => {
        addBotMessage(response);
        setIsTyping(false);
      }, 600);
    } catch (error) {
      setIsTyping(false);
      Alert.alert('Error de IA', `No pude procesar tu mensaje: ${error.message}`, [
        { text: 'Reintentar', onPress: () => setInputText(userMessage) }
      ]);
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const AnimatedMessage = ({ item }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(20)).current;
    useEffect(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }, []);
    const isBot = item.isBot;
    return (
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY }] }}>
        <View style={[styles.messageContainer, isBot ? styles.botMessageContainer : styles.userMessageContainer]}>
          {isBot && (
            <View style={styles.botAvatar}>
              <CustomIcons.MessageCircle size={14} color={COLORS.white} />
            </View>
          )}
          <View style={[styles.messageBubble, isBot ? styles.botMessage : styles.userMessage]}>
            <Text style={[styles.messageText, isBot ? styles.botMessageText : styles.userMessageText]}>
              {item.text}
            </Text>
            <Text style={[styles.timestamp, isBot ? styles.botTimestamp : styles.userTimestamp]}>
              {item.timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderMessage = useCallback(({ item }) => <AnimatedMessage item={item} />, []);

  const TypingIndicator = () => (
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

  if (connectionStatus === 'error') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <CustomIcons.AlertCircle size={48} color={COLORS.error} />
          <Text style={styles.errorTitle}>IA no disponible</Text>
          <TouchableOpacity onPress={checkConnectionAndInitialize} style={styles.retryButton}>
            <CustomIcons.RefreshCw size={18} color={COLORS.white} />
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <CustomIcons.ArrowLeft size={22} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Asistente Tranki</Text>
            {emotion && (
              <View style={styles.emotionChip}>
                <Text style={styles.emotionChipText}>{emotion.emoji} {emotion.label}</Text>
              </View>
            )}
          </View>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'flex-end',
            paddingHorizontal: 16,
            paddingBottom: inputContainerHeight,
            paddingTop: 16,
          }}
          ListFooterComponent={isTyping ? <TypingIndicator /> : null}
        />

        <Animated.View
          style={[styles.inputContainer, { bottom: inputBottomAnim }]}
          onLayout={(e) => {
            const { height } = e.nativeEvent.layout;
            if (height > 0 && height !== inputContainerHeight) {
              setInputContainerHeight(height);
            }
          }}
        >
          <View style={styles.inputWrapper}>
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Escribe un mensaje..."
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
                (!inputText.trim() || isTyping || connectionStatus !== 'connected') && styles.sendButtonDisabled
              ]}
              onPress={handleSendMessage}
              disabled={!inputText.trim() || isTyping || connectionStatus !== 'connected'}
            >
              <CustomIcons.Send size={18} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  container: {
    flex: 1,
  },

  // Header Styles
  header: {
    backgroundColor: COLORS.white,
    paddingTop: Platform.OS === 'ios' ? 10 : StatusBar.currentHeight + 10,
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
    zIndex: 10,
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
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
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
    fontSize: 12,
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

  // Messages Styles - PADDING MOVIDO AL contentContainerStyle
  messagesContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    // paddingBottom se aplica dinámicamente en el FlatList
    flexGrow: 1, // Importante para que el padding funcione en listas cortas
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
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
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
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
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  userMessage: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
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
    alignSelf: 'flex-end', // Asegura que el timestamp esté a la derecha
  },
  botTimestamp: {
    color: '#9CA3AF',
  },
  userTimestamp: {
    color: COLORS.white,
    opacity: 0.8,
  },
  typingBubble: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },

  // Input Styles - CON POSITION ABSOLUTE Y ANIMACIÓN
  inputContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0, // La animación controla la posición real
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? TAB_BAR_HEIGHT + 8 : TAB_BAR_HEIGHT + 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
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
    paddingTop: Platform.OS === 'ios' ? 8 : 0,
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

  // Error Styles
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginBottom: TAB_BAR_HEIGHT,
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