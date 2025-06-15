import { API_KEYS } from '../config/env';

class OpenAIService {
  constructor() {
    this.apiKey = API_KEYS.OPENAI;
    this.baseURL = 'https://api.openai.com/v1/chat/completions';
    
    if (!this.apiKey && __DEV__) {
      console.error('❌ OpenAI API Key no configurada - usando respuestas fallback');
    }
  }

  async getChatResponse(emotion, userMessage, conversationHistory = []) {
    // Si no hay API key, usar respuestas predefinidas
    if (!this.apiKey) {
      console.log('⚠️ Usando respuestas fallback - API Key no disponible');
      return this.getFallbackResponse(emotion, userMessage);
    }

    try {
      const systemPrompt = this.getSystemPrompt(emotion);
      
      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.slice(-6), // Mantener solo últimos 6 mensajes para no exceder límite
        { role: 'user', content: userMessage }
      ];

      console.log('🤖 Enviando mensaje a OpenAI...');
      
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: messages,
          max_tokens: 150,
          temperature: 0.7,
          top_p: 1,
          frequency_penalty: 0.2,
          presence_penalty: 0.1
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ OpenAI API Error:', response.status, errorData);
        
        if (response.status === 401) {
          throw new Error('API Key inválida');
        } else if (response.status === 429) {
          throw new Error('Límite de uso excedido');
        } else {
          throw new Error(`Error de API: ${response.status}`);
        }
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content.trim();
      
      console.log('✅ Respuesta recibida de OpenAI');
      return aiResponse;
      
    } catch (error) {
      console.error('🚨 OpenAI Service Error:', error.message);
      return this.getFallbackResponse(emotion, userMessage);
    }
  }

  getSystemPrompt(emotion) {
    const basePrompt = `Eres Tranki, un asistente de bienestar emocional especializado en ayudar a jóvenes estudiantes y trabajadores. 

Características de tu personalidad:
- Empático y comprensivo
- Usa un lenguaje casual pero profesional  
- Incluye emojis ocasionalmente (máximo 2 por mensaje)
- Respuestas cortas (máximo 2-3 oraciones)
- Enfocado en soluciones prácticas e inmediatas
- Siempre positivo y motivador
- Evita dar consejos médicos profesionales

IMPORTANTE: Mantén las respuestas breves, conversacionales y útiles.`;

    const emotionContext = {
      stressed: `El usuario se siente estresado hoy. Ofrece técnicas de relajación específicas (respiración, ejercicios breves), consejos prácticos para manejar el estrés inmediato, y palabras de aliento. Sugiere actividades calmantes que puede hacer ahora.`,
      
      neutral: `El usuario se siente neutral hoy. Ayúdalo a encontrar motivación, sugiere actividades específicas para mejorar su ánimo (ejercicio, música, llamar a alguien), y mantén una conversación positiva. Pregunta qué le gustaría hacer.`,
      
      tranki: `El usuario se siente tranki (feliz/relajado) hoy. Celebra este estado positivo, ayúdalo a mantener esta energía con actividades específicas, y sugiere formas de aprovechar este buen momento (ser productivo, ayudar a otros, hacer algo especial).`
    };

    return `${basePrompt}\n\nContexto del usuario: ${emotionContext[emotion?.id] || emotionContext.neutral}`;
  }

  getFallbackResponse(emotion, userMessage = '') {
    const keyword = userMessage.toLowerCase();
    
    // Respuestas específicas por palabras clave
    if (keyword.includes('estres') || keyword.includes('ansi') || keyword.includes('nerv')) {
      return "Te entiendo 😔. Prueba esta técnica rápida: inhala 4 segundos, mantén 4, exhala 6. Repítelo 3 veces. También puedes dar una caminata corta o escuchar música relajante. ¿Qué te está causando más estrés ahora?";
    }
    
    if (keyword.includes('triste') || keyword.includes('mal') || keyword.includes('bajón')) {
      return "Siento que tengas un día difícil 💙. A veces ayuda hacer algo pequeño pero positivo: llamar a un amigo, ver algo gracioso, o simplemente salir a tomar aire fresco. ¿Hay algo específico que te tiene así?";
    }
    
    if (keyword.includes('feliz') || keyword.includes('bien') || keyword.includes('genial')) {
      return "¡Qué bueno escuchar eso! 😊 Es genial cuando nos sentimos así. Aprovecha esta energía positiva: tal vez es buen momento para hacer algo que te gusta o ser amable con alguien más. ¿Qué planes tienes?";
    }
    
    if (keyword.includes('sueño') || keyword.includes('cansad') || keyword.includes('dormí')) {
      return "El descanso es súper importante 😴. Si puedes, toma una siesta de 15-20 minutos, o simplemente relájate un rato. También asegúrate de dormir bien esta noche. ¿Has estado durmiendo mal últimamente?";
    }
    
    if (keyword.includes('trabajo') || keyword.includes('estudio') || keyword.includes('tarea')) {
      return "Entiendo la presión del trabajo/estudio 📚. Prueba la técnica Pomodoro: 25 min enfocado, 5 min descanso. También divide las tareas grandes en partes pequeñas. ¿Qué es lo que más te agobia?";
    }

    // Respuestas por defecto según emoción
    const defaultFallbacks = {
      stressed: "Veo que te sientes estresado 😔. Una técnica que funciona es respirar profundo: inhala 4 segundos, mantén 4, exhala 6. También ayuda hacer una pausa y caminar un poco. ¿Qué te está estresando más?",
      
      neutral: "Entiendo que hoy te sientes neutral 😊. ¿Te gustaría que hablemos sobre algo que te ayude a sentirte mejor? Podríamos pensar en actividades que disfrutes o metas pequeñas para hoy.",
      
      tranki: "¡Me alegra saber que te sientes tranki hoy! 😄 Es genial aprovechar estos momentos positivos. ¿Hay algo especial que quieras hacer para mantener esta buena energía?"
    };

    return defaultFallbacks[emotion?.id] || defaultFallbacks.neutral;
  }

  // Generar respuestas con contexto de la app
  async getContextualResponse(emotion, userMessage, userContext = {}) {
    const contextPrompt = this.buildContextPrompt(userContext);
    const fullMessage = `${contextPrompt}\n\nUsuario dice: ${userMessage}`;
    
    return await this.getChatResponse(emotion, fullMessage);
  }

  buildContextPrompt(context) {
    let prompt = "";
    
    if (context.hasScheduleToday) {
      prompt += "El usuario tiene eventos programados hoy. ";
    }
    
    if (context.recentEmotions && context.recentEmotions.length > 0) {
      const pattern = this.analyzeEmotionPattern(context.recentEmotions);
      prompt += `Patrón emocional reciente: ${pattern}. `;
    }
    
    if (context.freeTimeAvailable) {
      prompt += `Tiene ${context.freeTimeAvailable} de tiempo libre disponible hoy. `;
    }

    return prompt;
  }

  analyzeEmotionPattern(recentEmotions) {
    if (!recentEmotions.length) return "sin datos suficientes";
    
    const stressedDays = recentEmotions.filter(e => e.emotion === 'stressed').length;
    const trankiDays = recentEmotions.filter(e => e.emotion === 'tranki').length;
    const total = recentEmotions.length;
    
    if (stressedDays > total * 0.6) {
      return "ha tenido varios días estresantes consecutivos";
    } else if (trankiDays > total * 0.6) {
      return "ha tenido una buena racha de días positivos";
    } else if (stressedDays > trankiDays) {
      return "ha tenido más días difíciles que buenos";
    } else {
      return "ha tenido días variados con altibajos normales";
    }
  }

  // Función para probar la conexión
  async testConnection() {
    if (!this.apiKey) {
      return { success: false, message: 'API Key no configurada' };
    }

    try {
      const response = await this.getChatResponse(
        { id: 'neutral', label: 'Neutral' },
        'Hola, solo estoy probando la conexión'
      );
      
      return { 
        success: true, 
        message: 'Conexión exitosa con OpenAI',
        response: response
      };
    } catch (error) {
      return { 
        success: false, 
        message: `Error de conexión: ${error.message}`
      };
    }
  }
}

export default new OpenAIService();