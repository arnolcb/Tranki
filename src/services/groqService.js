// src/services/groqService.js - Servicio de IA ultrarrápido con Groq
import Config from 'react-native-config';

class GroqService {
  constructor() {
    this.apiKey = Config.GROQ_API_KEY || process.env.GROQ_API_KEY;
    this.baseURL = 'https://api.groq.com/openai/v1/chat/completions';
    
    console.log('🚀 Groq Service inicializado');
    console.log('🔑 API Key configurada:', !!this.apiKey);
    
    if (!this.apiKey && __DEV__) {
      console.error('❌ Groq API Key no configurada - usando respuestas fallback');
    }
  }

  async getChatResponse(emotion, userMessage, conversationHistory = []) {
    // Si no hay API key, lanzar error
    if (!this.apiKey) {
      throw new Error('Groq API Key no configurada. La aplicación requiere una clave válida para funcionar.');
    }

    try {
      const systemPrompt = this.getSystemPrompt(emotion);
      
      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.slice(-8), // Groq puede manejar más contexto
        { role: 'user', content: userMessage }
      ];

      console.log('🤖 Enviando mensaje a Groq...');
      
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant', // ✅ Modelo actualizado y disponible
          messages: messages,
          max_tokens: 250,
          temperature: 0.7,
          top_p: 0.9,
          frequency_penalty: 0.2,
          presence_penalty: 0.1,
          stream: false
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Groq API Error:', response.status, errorData);
        
        if (response.status === 401) {
          throw new Error('API Key inválida o expirada');
        } else if (response.status === 429) {
          throw new Error('Límite de uso excedido. Intenta de nuevo en un momento');
        } else if (response.status === 400) {
          throw new Error('Formato de request inválido');
        } else {
          throw new Error(`Error del servidor Groq: ${response.status}`);
        }
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Respuesta inválida de Groq API');
      }
      
      const aiResponse = data.choices[0].message.content.trim();
      
      console.log('✅ Respuesta recibida de Groq');
      console.log('📊 Tokens usados:', data.usage?.total_tokens || 'N/A');
      
      return aiResponse;
      
    } catch (error) {
      console.error('🚨 Groq Service Error:', error.message);
      throw error; // Propagar el error para manejo en la UI
    }
  }

  getSystemPrompt(emotion) {
    const basePrompt = `Eres Tranki, un asistente de bienestar emocional especializado en ayudar a jóvenes estudiantes y trabajadores. 

Características de tu personalidad:
- Empático y comprensivo, con energía positiva y cálida
- Usas un lenguaje amigable y profesional, natural y conversacional
- Incluyes emojis ocasionalmente para dar calidez (máximo 2-3 por mensaje)
- Das respuestas concisas pero completas (máximo 3-4 oraciones)
- Te enfocas en soluciones prácticas e inmediatas
- Siempre eres positivo y motivador
- Evitas dar consejos médicos profesionales
- Ofreces técnicas de bienestar mental respaldadas por la ciencia
- Sugieres actividades y lugares específicos cuando es apropiado

IMPORTANTE: 
- Mantén las respuestas genuinas, naturales y útiles
- Si no conoces algo específico, sé honesto al respecto
- Enfócate en el bienestar emocional y mental del usuario
- Genera respuestas únicas y personalizadas para cada situación`;

    const emotionContext = {
      stressed: `El usuario se siente estresado hoy. Ofrece técnicas de relajación específicas y científicamente válidas (respiración, mindfulness, ejercicios breves), consejos prácticos para manejar el estrés inmediato, y palabras genuinas de aliento. Sugiere actividades específicas que puedan ayudar a reducir el estrés.`,
      
      neutral: `El usuario se siente neutral hoy. Ayúdalo a encontrar motivación y dirección, sugiere actividades específicas para mejorar su estado de ánimo (ejercicio, actividades creativas, conexión social), mantén una conversación positiva y genuina. Pregunta qué le gustaría explorar o lograr.`,
      
      tranki: `El usuario se siente tranki (feliz/relajado) hoy. Celebra genuinamente este estado positivo, ayúdalo a mantener y aprovechar esta energía con actividades constructivas, y sugiere formas de usar este buen momento para crecer o ayudar a otros. Ofrece ideas específicas y significativas.`
    };

    return `${basePrompt}\n\nContexto del usuario: ${emotionContext[emotion?.id] || emotionContext.neutral}`;
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
      return { 
        success: false, 
        message: 'API Key no configurada',
        service: 'groq'
      };
    }

    try {
      console.log('🧪 Probando conexión con Groq...');
      
      const response = await this.getChatResponse(
        { id: 'neutral', label: 'Neutral' },
        'Hola, estoy probando la conexión'
      );
      
      return { 
        success: true, 
        message: 'Conexión exitosa con Groq ⚡',
        response: response,
        service: 'groq'
      };
    } catch (error) {
      return { 
        success: false, 
        message: `Error de conexión con Groq: ${error.message}`,
        service: 'groq'
      };
    }
  }

  // Método para obtener información del modelo
  getModelInfo() {
    return {
      service: 'Groq',
      model: 'llama-3.1-8b-instant',
      features: [
        '🧠 Inteligencia artificial avanzada',
        '💬 Conversación natural y empática',
        '🎯 Enfocado en bienestar emocional',
        '🔥 Respuestas personalizadas'
      ],
      advantages: [
        'Respuestas rápidas y precisas',
        'Comprensión contextual',
        'Conversación fluida',
        'Disponibilidad 24/7'
      ]
    };
  }

  // Método para streaming (futuro)
  async getChatResponseStream(emotion, userMessage, conversationHistory = [], onChunk = null) {
    // TODO: Implementar streaming para respuestas en tiempo real
    // Groq soporta Server-Sent Events para respuestas progresivas
    console.log('🔄 Streaming no implementado aún, usando método normal');
    return await this.getChatResponse(emotion, userMessage, conversationHistory);
  }

  // Verificar si el servicio está configurado correctamente
  isConfigured() {
    return !!this.apiKey;
  }

  // Obtener estadísticas de uso
  getUsageStats() {
    return {
      configured: this.isConfigured(),
      model: 'llama-3.1-8b-instant',
      status: 'Activo',
      reliability: 'Excelente'
    };
  }
}

export default new GroqService();