// src/screens/ChatScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Animated
} from 'react-native';
import { COLORS } from '../constants/colors';
import { EMOTIONS } from '../constants/emotions';

const ChatScreen = ({ route, navigation }) => {
  const { emotion } = route.params || {};
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [currentFlow, setCurrentFlow] = useState('initial');
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Flujos de conversación predefinidos
  const conversationFlows = {
    stressed: {
      initial: {
        message: "Hola, entiendo que hoy estás sintiéndote estresado/a. Es completamente normal sentirse así. ¿Te gustaría que te ayude con algo específico?",
        options: [
          { id: 'breathing', text: 'Ejercicio de respiración' },
          { id: 'recommendations', text: 'Lugares para relajarme' },
          { id: 'tips', text: 'Consejos para el estrés' }
        ]
      },
      breathing: {
        message: "Perfecto, vamos a hacer un ejercicio de respiración. Sigue mis instrucciones:\n\n1. Inhala lentamente por 4 segundos... 🌬️\n2. Mantén el aire por 4 segundos... ⏸️\n3. Exhala lentamente por 6 segundos... 💨\n\nRepite esto 3 veces. ¿Te sientes mejor?",
        options: [
          { id: 'better', text: 'Sí, me siento mejor' },
          { id: 'same', text: 'Sigo igual' },
          { id: 'recommendations', text: 'Dame recomendaciones' }
        ]
      },
      recommendations: {
        message: "¡Excelente idea! Salir y cambiar de ambiente puede ayudarte mucho. Te voy a mostrar lugares cercanos donde puedes relajarte.",
        options: [
          { id: 'show_places', text: 'Ver lugares cercanos' },
          { id: 'tips', text: 'Mejor dame otros consejos' }
        ]
      },
      tips: {
        message: "Aquí tienes algunos consejos para manejar el estrés:\n\n• Toma descansos de 5-10 minutos cada hora\n• Haz una lista de tareas priorizadas\n• Escucha música relajante\n• Habla con alguien de confianza\n• Haz ejercicio ligero\n\n¿Hay algo específico que te está estresando?",
        options: [
          { id: 'work_stress', text: 'Estrés de trabajo/estudio' },
          { id: 'personal_stress', text: 'Problemas personales' },
          { id: 'general_stress', text: 'Estrés general' }
        ]
      }
    },
    neutral: {
      initial: {
        message: "Hola! Veo que hoy te sientes neutral. Está bien, no todos los días tienen que ser extraordinarios. ¿Te gustaría hacer algo para mejorar tu día?",
        options: [
          { id: 'improve_mood', text: 'Mejorar mi ánimo' },
          { id: 'activities', text: 'Actividades sugeridas' },
          { id: 'just_talk', text: 'Solo conversar' }
        ]
      },
      improve_mood: {
        message: "¡Me gusta tu actitud! Aquí tienes algunas ideas para alegrar tu día:\n\n• Escucha tu canción favorita 🎵\n• Da un paseo corto 🚶‍♀️\n• Llama a un amigo/familiar 📞\n• Haz algo creativo ✨\n• Toma un café o té especial ☕",
        options: [
          { id: 'activities', text: 'Más actividades' },
          { id: 'recommendations', text: 'Lugares para visitar' }
        ]
      }
    },
    tranki: {
      initial: {
        message: "¡Qué alegría! Me encanta saber que te sientes tranki hoy 😊. Es genial cuando podemos disfrutar de estos momentos de bienestar. ¿Quieres mantener esta energía positiva?",
        options: [
          { id: 'maintain_mood', text: 'Mantener este ánimo' },
          { id: 'activities', text: 'Actividades para disfrutar' },
          { id: 'share_positivity', text: 'Compartir mi alegría' }
        ]
      },
      maintain_mood: {
        message: "¡Perfecto! Aquí tienes algunas ideas para mantener esa buena energía:\n\n• Anota 3 cosas por las que te sientes agradecido 📝\n• Haz ejercicio suave o yoga 🧘‍♀️\n• Dedica tiempo a un hobby que amas 🎨\n• Planifica algo especial para mañana 📅\n• Disfruta del momento presente 🌟",
        options: [
          { id: 'gratitude', text: 'Ejercicio de gratitud' },
          { id: 'activities', text: 'Más actividades' }
        ]
      }
    }
  };

  useEffect(() => {
    if (emotion) {
      const emotionType = emotion.id;
      const initialFlow = conversationFlows[emotionType]?.initial;
      
      if (initialFlow) {
        setTimeout(() => {
          addBotMessage(initialFlow.message, initialFlow.options);
        }, 500);
      }
    }

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [emotion]);

  const addBotMessage = (message, options = []) => {
    setIsTyping(true);
    
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: message,
        isBot: true,
        options: options,
        timestamp: new Date()
      }]);
      setIsTyping(false);
    }, 1000);
  };

  const addUserMessage = (message) => {
    setMessages(prev => [...prev, {
      id: Date.now(),
      text: message,
      isBot: false,
      timestamp: new Date()
    }]);
  };

  const handleOptionPress = (option) => {
    addUserMessage(option.text);
    
    const emotionType = emotion?.id || 'neutral';
    const flow = conversationFlows[emotionType]?.[option.id];
    
    if (flow) {
      setTimeout(() => {
        addBotMessage(flow.message, flow.options);
      }, 800);
    } else {
      // Manejar casos especiales
      handleSpecialOptions(option.id);
    }
    
    setCurrentFlow(option.id);
  };

  const handleSpecialOptions = (optionId) => {
    switch (optionId) {
      case 'show_places':
        setTimeout(() => {
          addBotMessage("Te voy a mostrar lugares cercanos para relajarte.", []);
          setTimeout(() => {
            navigation.navigate('Places');
          }, 1000);
        }, 800);
        break;
        
      case 'better':
        setTimeout(() => {
          addBotMessage("¡Qué bueno! Me alegra saber que te sientes mejor. Recuerda que siempre puedes volver a hacer este ejercicio cuando lo necesites. ¿Te gustaría alguna recomendación adicional?", [
            { id: 'recommendations', text: 'Sí, dame recomendaciones' },
            { id: 'end', text: 'No, gracias' }
          ]);
        }, 800);
        break;
        
      case 'gratitude':
        setTimeout(() => {
          addBotMessage("¡Excelente elección! Practicar la gratitud es muy poderoso:\n\n1. Piensa en 3 cosas específicas que te hicieron sentir bien hoy\n2. Pueden ser pequeñas: una sonrisa, el clima, una comida rica\n3. Siéntete realmente agradecido por cada una\n\n¿Ya tienes tus 3 cosas?", [
            { id: 'done_gratitude', text: 'Sí, ya las pensé' },
            { id: 'need_help', text: 'Necesito ayuda' }
          ]);
        }, 800);
        break;
        
      case 'end':
        setTimeout(() => {
          addBotMessage("¡Perfecto! Ha sido un gusto platicar contigo. Recuerda que siempre estaré aquí cuando me necesites. ¡Que tengas un excelente día! 😊", []);
        }, 800);
        break;
        
      default:
        setTimeout(() => {
          addBotMessage("Entiendo. ¿Hay algo más en lo que pueda ayudarte?", [
            { id: 'recommendations', text: 'Ver lugares cercanos' },
            { id: 'tips', text: 'Más consejos' },
            { id: 'end', text: 'Terminar conversación' }
          ]);
        }, 800);
    }
  };

  const handleSendMessage = () => {
    if (inputText.trim()) {
      addUserMessage(inputText);
      setInputText('');
      
      // Respuesta automática simple
      setTimeout(() => {
        addBotMessage("Entiendo lo que me dices. ¿Te gustaría que te ayude con algo específico?", [
          { id: 'breathing', text: 'Ejercicio de respiración' },
          { id: 'recommendations', text: 'Lugares para relajarme' },
          { id: 'tips', text: 'Consejos útiles' }
        ]);
      }, 1000);
    }
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
      </View>
      
      {message.options && message.options.length > 0 && (
        <View style={styles.optionsContainer}>
          {message.options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.optionButton}
              onPress={() => handleOptionPress(option)}
            >
              <Text style={styles.optionButtonText}>{option.text}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </Animated.View>
  );

  return (
    <View style={styles.container}>
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

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd()}
      >
        {messages.map(renderMessage)}
        
        {isTyping && (
          <View style={[styles.messageContainer, styles.botMessageContainer]}>
            <View style={[styles.messageBubble, styles.botMessage]}>
              <Text style={styles.typingText}>Tranki está escribiendo...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Escribe tu mensaje..."
          multiline
          maxLength={200}
        />
        <TouchableOpacity
          style={styles.sendButton}
          onPress={handleSendMessage}
        >
          <Text style={styles.sendButtonText}>Enviar</Text>
        </TouchableOpacity>
      </View>
    </View>
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
  typingText: {
    color: COLORS.text,
    fontStyle: 'italic',
  },
  optionsContainer: {
    marginTop: 10,
    width: '100%',
  },
  optionButton: {
    backgroundColor: COLORS.lightGray,
    padding: 12,
    borderRadius: 20,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  optionButtonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: COLORS.white,
    alignItems: 'flex-end',
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
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
});

export default ChatScreen;