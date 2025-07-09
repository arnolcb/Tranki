// src/screens/ChatScreen.js - Chat 100% IA con Groq, sin fallbacks
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  SafeAreaView,
  Dimensions,
  Keyboard,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { COLORS, Theme, getEmotionColor, getEmotionIcon } from '../constants/colors';
import { EMOTIONS } from '../constants/emotions';
import GroqService from '../services/groqService'; // 🚀 Solo Groq
import FirebaseService from '../services/firebase';
import CustomIcons from '../components/CustomIcons';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

const ChatScreen = ({ route, navigation }) => {
  const { emotion } = route.params || {};
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('checking'); // 'checking', 'connected', 'error'
  const [connectionError, setConnectionError] = useState(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef();
  const textInputRef = useRef();

  useEffect(() => {
    StatusBar.setBarStyle('dark-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor(COLORS.white);
    }
    
    checkConnectionAndInitialize();

    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      handleKeyboardShow
    );
    
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      handleKeyboardHide
    );

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, [emotion]);

  const handleKeyboardShow = (event) => {
    const { height } = event.endCoordinates;
    setKeyboardHeight(height);
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleKeyboardHide = () => {
    setKeyboardHeight(0);
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const checkConnectionAndInitialize = async () => {
    setConnectionStatus('checking');
    setConnectionError(null);
    
    try {
      console.log('🔍 Verificando conexión con Groq...');
      const connectionTest = await GroqService.testConnection();
      
      if (connectionTest.success) {
        setConnectionStatus('connected');
        console.log('✅ Conectado a Groq ⚡');
        
        if (emotion) {
          setTimeout(() => {
            initializeConversation();
          }, 500);
        }
      } else {
        setConnectionStatus('error');
        setConnectionError(connectionTest.message);
        console.error('❌ Error de conexión:', connectionTest.message);
      }
    } catch (error) {
      console.error('💥 Error crítico verificando conexión:', error);
      setConnectionStatus('error');
      setConnectionError('Error de conexión. Verifica tu internet y la configuración de Groq.');
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
        } catch (contextError) {
          console.warn('Could not get user context:', contextError);
          userContext = {};
        }
      }
      
      
      const startTime = Date.now();
      
      const welcomeMessage = await GroqService.getContextualResponse(
        emotion,
        `Hola, hoy me siento ${emotion.label.toLowerCase()}`,
        userContext
      );
      
      const endTime = Date.now();
      const responseTimeMs = endTime - startTime;
      console.log(`Groq respondió en ${responseTimeMs}ms`);
      
      setTimeout(() => {
        addBotMessage(welcomeMessage);
        setIsTyping(false);
      }, Math.max(800 - responseTimeMs, 200)); // Mínimo UX delay
      
    } catch (error) {
      console.error('💥 Error inicializando conversación:', error);
      setIsTyping(false);
      
      // Mostrar error específico
      Alert.alert(
        '🤖 Error de IA',
        `No pude inicializar la conversación: ${error.message}`,
        [
          { text: 'Reintentar', onPress: () => initializeConversation() },
          { text: 'Configurar', onPress: () => navigation.navigate('Profile') },
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
      console.error('Error getting user context:', error);
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
      id: Date.now(),
      text: message,
      isBot: true,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    setConversationHistory(prev => [
      ...prev,
      { role: 'assistant', content: message }
    ].slice(-12));

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const addUserMessage = (message) => {
    const newMessage = {
      id: Date.now(),
      text: message,
      isBot: false,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newMessage]);
    
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
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 50);
    
    try {
      const startTime = Date.now();
      
      const response = await GroqService.getChatResponse(
        emotion,
        userMessage,
        conversationHistory
      );
      
      const endTime = Date.now();
      const responseTimeMs = endTime - startTime;
      console.log(`⚡ Groq respondió en ${responseTimeMs}ms`);
      
      // Mínimo delay para UX (Groq es muy rápido)
      const minDelay = 600;
      const actualDelay = Math.max(minDelay - responseTimeMs, 200);
      
      setTimeout(() => {
        addBotMessage(response);
        setIsTyping(false);
      }, actualDelay);
      
    } catch (error) {
      console.error('💥 Error obteniendo respuesta:', error);
      setIsTyping(false);
      
      // Mostrar error específico al usuario
      Alert.alert(
        '🤖 Error de IA',
        `No pude procesar tu mensaje: ${error.message}`,
        [
          { text: 'Reintentar', onPress: () => {
            // Reenviar el mismo mensaje
            setInputText(userMessage);
            // Remover el último mensaje del usuario para evitar duplicados
            setMessages(prev => prev.slice(0, -1));
            setConversationHistory(prev => prev.slice(0, -1));
          }},
          { text: 'Verificar conexión', onPress: () => checkConnectionAndInitialize() }
        ]
      );
    }
  };

  const handleQuickAction = (text) => {
    if (connectionStatus !== 'connected') {
      Alert.alert('🔌 Sin conexión', 'Primero necesitas estar conectado a Groq para usar el chat.');
      return;
    }
    
    setInputText(text);
    setTimeout(() => {
      textInputRef.current?.focus();
    }, 100);
  };

  const shouldGroupMessage = (currentMsg, prevMsg) => {
    if (!prevMsg) return false;
    if (currentMsg.isBot !== prevMsg.isBot) return false;
    
    const timeDiff = currentMsg.timestamp.getTime() - prevMsg.timestamp.getTime();
    return timeDiff < 60000;
  };

  const renderMessage = (message, index) => {
    const prevMessage = index > 0 ? messages[index - 1] : null;
    const isGrouped = shouldGroupMessage(message, prevMessage);
    const isLastInGroup = index === messages.length - 1 || 
      !shouldGroupMessage(messages[index + 1], message);

    return (
      <View
        key={message.id}
        style={[
          styles.messageContainer,
          message.isBot ? styles.botMessageContainer : styles.userMessageContainer,
          isGrouped && styles.groupedMessage
        ]}
      >
        {message.isBot && !isGrouped && (
          <View style={styles.botAvatar}>
            <CustomIcons.BotAvatar size={16} color={COLORS.white} />
          </View>
        )}
        
        {message.isBot && isGrouped && (
          <View style={styles.avatarPlaceholder} />
        )}
        
        <View style={[
          styles.messageBubble,
          message.isBot ? styles.botMessage : styles.userMessage,
          isGrouped && message.isBot && styles.groupedBotMessage,
          isGrouped && !message.isBot && styles.groupedUserMessage,
          !isGrouped && message.isBot && styles.firstBotMessage,
          !isGrouped && !message.isBot && styles.firstUserMessage
        ]}>
          <Text style={[
            styles.messageText,
            message.isBot ? styles.botMessageText : styles.userMessageText
          ]}>
            {message.text}
          </Text>
          
          {isLastInGroup && (
            <View style={styles.messageFooter}>
              <Text style={[
                styles.timestamp,
                message.isBot ? styles.botTimestamp : styles.userTimestamp
              ]}>
                {message.timestamp.toLocaleTimeString('es-ES', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </Text>
              
              {message.isBot && (
                <Text style={styles.responseTimeText}>
                  IA
                </Text>
              )}
              
              {!message.isBot && (
                <View style={styles.messageStatus}>
                  <CustomIcons.Check size={12} color={COLORS.success} />
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderTypingIndicator = () => (
    <View style={[styles.messageContainer, styles.botMessageContainer]}>
      <View style={styles.botAvatar}>
        <CustomIcons.BotAvatar size={16} color={COLORS.white} />
      </View>
      
      <View style={[styles.messageBubble, styles.botMessage, styles.typingBubble]}>
        <View style={styles.typingContainer}>
          <View style={styles.typingDots}>
            {[0, 1, 2].map((index) => (
              <View 
                key={index}
                style={[
                  styles.typingDot,
                  { animationDelay: `${index * 0.2}s` }
                ]} 
              />
            ))}
          </View>
          <Text style={styles.typingText}>Pensando...</Text>
        </View>
      </View>
    </View>
  );

  const renderConnectionStatus = () => {
    if (connectionStatus === 'checking') {
      return (
        <View style={[styles.statusBanner, styles.checkingBanner]}>
          <CustomIcons.Loading size={12} color={COLORS.warning} />
          <Text style={styles.statusText}>Conectando a Groq...</Text>
        </View>
      );
    }
    
    if (connectionStatus === 'connected') {
      return (
        <View style={[styles.statusBanner, styles.connectedBanner]}>
          <Text style={styles.statusText}>🤖 Asistente conectado</Text>
        </View>
      );
    }
    
    if (connectionStatus === 'error') {
      return (
        <View style={[styles.statusBanner, styles.errorBanner]}>
          <CustomIcons.AlertCircle size={12} color={COLORS.error} />
          <Text style={styles.statusTextError}>Error de conexión</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={checkConnectionAndInitialize}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return null;
  };

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <CustomIcons.AlertCircle size={48} color={COLORS.error} />
      <Text style={styles.errorTitle}>🤖 IA no disponible</Text>
      <Text style={styles.errorMessage}>{connectionError}</Text>
      
      <View style={styles.errorActions}>
        <TouchableOpacity
          style={styles.primaryErrorButton}
          onPress={checkConnectionAndInitialize}
          activeOpacity={0.8}
        >
          <CustomIcons.Wifi size={16} color={COLORS.white} />
          <Text style={styles.primaryErrorButtonText}>Reconectar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.secondaryErrorButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryErrorButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.errorInfo}>
        <Text style={styles.errorInfoTitle}>💡 ¿Qué puedes hacer?</Text>
        <Text style={styles.errorInfoText}>
          • Verifica tu conexión a internet{'\n'}
          • Asegúrate de tener una API key válida de Groq{'\n'}
          • Contacta soporte si el problema persiste
        </Text>
      </View>
    </View>
  );

  const quickActions = [
    'Técnicas de relajación',
    'Ejercicios de respiración', 
    'Actividades para hoy',
    'Consejos de bienestar'
  ];

  if (connectionStatus === 'error') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <CustomIcons.ArrowLeft size={20} color={COLORS.text} />
          </TouchableOpacity>
          
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Asistente Tranki</Text>
            <Text style={styles.headerSubtitle}>Error de conexión</Text>
          </View>
        </View>
        
        {renderErrorState()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <CustomIcons.ArrowLeft size={20} color={COLORS.text} />
            </TouchableOpacity>
            
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>Asistente Tranki</Text>
              {emotion && (
                <View style={styles.emotionChip}>
                  <Text style={styles.emotionChipIcon}>{getEmotionIcon(emotion.id)}</Text>
                  <Text style={styles.emotionChipText}>{emotion.label}</Text>
                </View>
              )}
            </View>

            <TouchableOpacity 
              style={styles.headerAction}
              onPress={() => Alert.alert('🤖 Asistente IA', GroqService.getModelInfo().features.join('\n'))}
            >
              <CustomIcons.BotAvatar size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          {renderConnectionStatus()}

          <KeyboardAvoidingView 
            style={styles.chatContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          >
            {/* Messages con scroll arreglado */}
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              scrollEnabled={true}
              bounces={true}
              onContentSizeChange={() => {
                // Solo auto-scroll si el usuario está cerca del final
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 100);
              }}
            >
              {messages.map((message, index) => renderMessage(message, index))}
              {isTyping && renderTypingIndicator()}
            </ScrollView>

            {/* Quick Actions */}
            {!isTyping && messages.length > 0 && keyboardHeight === 0 && connectionStatus === 'connected' && (
              <View style={styles.quickActions}>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.quickActionsContent}
                >
                  {quickActions.map((action, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.quickActionButton}
                      onPress={() => handleQuickAction(action)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.quickActionText}>{action}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Input area con mejor posicionamiento */}
            <View style={[styles.inputContainer, Platform.OS === 'android' && { paddingBottom: Math.max(keyboardHeight * 0.02, Theme.spacing.lg) }]}>
              <View style={styles.inputWrapper}>
                <TextInput
                  ref={textInputRef}
                  style={styles.textInput}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder={connectionStatus === 'connected' ? "Escribe tu mensaje..." : "Esperando conexión..."}
                  placeholderTextColor={COLORS.textMuted}
                  multiline
                  maxLength={500}
                  textAlignVertical="top"
                  editable={connectionStatus === 'connected'}
                  returnKeyType="send"
                  blurOnSubmit={false}
                  onSubmitEditing={handleSendMessage}
                  onFocus={() => {
                    setTimeout(() => {
                      scrollViewRef.current?.scrollToEnd({ animated: true });
                    }, 300);
                  }}
                />
                
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    (!inputText.trim() || isTyping || connectionStatus !== 'connected') && styles.sendButtonDisabled
                  ]}
                  onPress={handleSendMessage}
                  disabled={!inputText.trim() || isTyping || connectionStatus !== 'connected'}
                  activeOpacity={0.8}
                >
                  {isTyping ? (
                    <CustomIcons.Loading size={16} color={COLORS.white} />
                  ) : (
                    <CustomIcons.Send size={16} color={COLORS.white} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  
  // Header
  header: {
    backgroundColor: COLORS.white,
    paddingTop: Theme.spacing.sm,
    paddingBottom: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray50,
    marginRight: Theme.spacing.md,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  headerAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray50,
  },
  headerActionText: {
    fontSize: 18,
  },
  emotionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.blue50,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  emotionChipIcon: {
    fontSize: 10,
    marginRight: 4,
  },
  emotionChipText: {
    fontSize: 11,
    color: COLORS.blue600,
    fontWeight: '600',
  },
  
  // Status banners
  statusBanner: {
    paddingVertical: 8,
    paddingHorizontal: Theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  checkingBanner: {
    backgroundColor: COLORS.warningSoft,
  },
  connectedBanner: {
    backgroundColor: COLORS.successSoft,
  },
  errorBanner: {
    backgroundColor: COLORS.errorSoft,
    justifyContent: 'space-between',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.success,
  },
  statusTextError: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.error,
  },
  responseTimeStatus: {
    fontSize: 10,
    color: COLORS.success,
    opacity: 0.8,
  },
  retryButton: {
    backgroundColor: COLORS.error,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '600',
  },
  
  // Chat container
  chatContainer: {
    flex: 1,
  },
  
  // Messages
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: Theme.spacing.lg,
    flexGrow: 1,
    paddingBottom: Theme.spacing.xxxl, // Más espacio para scroll
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: Theme.spacing.md,
    alignItems: 'flex-end',
  },
  groupedMessage: {
    marginBottom: Theme.spacing.xs,
  },
  botMessageContainer: {
    justifyContent: 'flex-start',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  
  // Avatar
  botAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.sm,
  },
  botAvatarText: {
    fontSize: 14,
    color: COLORS.white,
  },
  avatarPlaceholder: {
    width: 28,
    marginRight: Theme.spacing.sm,
  },
  
  // Bubbles
  messageBubble: {
    maxWidth: screenWidth * 0.75,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  
  botMessage: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  userMessage: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  firstBotMessage: {
    borderTopLeftRadius: 18,
  },
  firstUserMessage: {
    borderTopRightRadius: 18,
  },
  groupedBotMessage: {
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  groupedUserMessage: {
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
  },
  
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  botMessageText: {
    color: COLORS.text,
  },
  userMessageText: {
    color: COLORS.white,
  },
  
  // Message footer
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  timestamp: {
    fontSize: 11,
    fontWeight: '500',
  },
  botTimestamp: {
    color: COLORS.textMuted,
  },
  userTimestamp: {
    color: COLORS.white,
    opacity: 0.8,
  },
  responseTimeText: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  messageStatus: {
    opacity: 0.8,
  },
  
  // Typing indicator
  typingBubble: {
    paddingVertical: 12,
  },
  typingContainer: {
    alignItems: 'center',
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    opacity: 0.4,
  },
  typingText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  
  // Quick actions
  quickActions: {
    backgroundColor: COLORS.white,
    paddingVertical: Theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  quickActionsContent: {
    paddingHorizontal: Theme.spacing.lg,
    gap: Theme.spacing.sm,
  },
  quickActionButton: {
    backgroundColor: COLORS.blue50,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.blue200,
  },
  quickActionText: {
    fontSize: 13,
    color: COLORS.blue600,
    fontWeight: '600',
  },
  
  // Input con mejor manejo de teclado
  inputContainer: {
    backgroundColor: COLORS.white,
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? Theme.spacing.lg : Theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: COLORS.gray50,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 48,
    maxHeight: 120,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    marginRight: 12,
    paddingVertical: 8,
    lineHeight: 20,
    maxHeight: 80,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.gray300,
    ...Platform.select({
      ios: {
        shadowOpacity: 0,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  
  // Error state
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.xxxl,
  },
  errorTitle: {
    fontSize: Theme.typography.h3,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: Theme.typography.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Theme.spacing.xxxl,
  },
  errorActions: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.xxxl,
  },
  primaryErrorButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: Theme.spacing.xl,
    paddingVertical: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.medium,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  primaryErrorButtonText: {
    color: COLORS.white,
    fontSize: Theme.typography.h5,
    fontWeight: '600',
  },
  secondaryErrorButton: {
    backgroundColor: COLORS.white,
    paddingHorizontal: Theme.spacing.xl,
    paddingVertical: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryErrorButtonText: {
    color: COLORS.text,
    fontSize: Theme.typography.h5,
    fontWeight: '600',
  },
  errorInfo: {
    backgroundColor: COLORS.blue50,
    padding: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.large,
    borderWidth: 1,
    borderColor: COLORS.blue200,
    alignSelf: 'stretch',
  },
  errorInfoTitle: {
    fontSize: Theme.typography.h5,
    fontWeight: '600',
    color: COLORS.blue600,
    marginBottom: Theme.spacing.sm,
  },
  errorInfoText: {
    fontSize: Theme.typography.body,
    color: COLORS.blue600,
    lineHeight: 18,
  },
});

export default ChatScreen;