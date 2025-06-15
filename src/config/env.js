// src/config/env.js
import Config from 'react-native-config';

export const API_KEYS = {
  OPENAI: Config.OPENAI_API_KEY,
  GOOGLE_MAPS: Config.GOOGLE_MAPS_API_KEY,
};

// Validación en desarrollo
if (__DEV__) {
  console.log('🔧 Verificando configuración de API Keys...');
  if (!API_KEYS.OPENAI) {
    console.warn('⚠️ OPENAI_API_KEY no configurada en .env');
  } else {
    console.log('✅ OpenAI API Key configurada');
  }
  if (!API_KEYS.GOOGLE_MAPS) {
    console.warn('⚠️ GOOGLE_MAPS_API_KEY no configurada en .env');
  } else {
    console.log('✅ Google Maps API Key configurada');
  }
}