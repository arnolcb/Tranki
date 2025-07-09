// src/constants/colors.js - Minimal Blue & White Design
export const COLORS = {
  // === AZULES PRINCIPALES ===
  primary: '#3B82F6',       // Azul moderno suave
  primaryDark: '#2563EB',   // Azul un poco más oscuro
  primaryLight: '#93C5FD',  // Azul muy claro
  primarySoft: '#DBEAFE',   // Azul casi blanco
  
  // === AZULES PARA ESTADOS ===
  blue50: '#EFF6FF',        // Azul 50 - casi blanco
  blue100: '#DBEAFE',       // Azul 100 - muy claro
  blue200: '#BFDBFE',       // Azul 200 - claro
  blue500: '#3B82F6',       // Azul 500 - principal
  blue600: '#2563EB',       // Azul 600 - oscuro
  blue700: '#1D4ED8',       // Azul 700 - más oscuro
  
  // === GRISES MINIMALISTAS ===
  gray50: '#F9FAFB',        // Gris casi blanco
  gray100: '#F3F4F6',       // Gris muy claro
  gray200: '#E5E7EB',       // Gris claro
  gray300: '#D1D5DB',       // Gris medio-claro
  gray400: '#9CA3AF',       // Gris medio
  gray500: '#6B7280',       // Gris
  gray600: '#4B5563',       // Gris oscuro
  gray700: '#374151',       // Gris muy oscuro
  gray800: '#1F2937',       // Gris casi negro
  gray900: '#111827',       // Gris negro
  
  // === COLORES BASE ===
  white: '#FFFFFF',         // Blanco puro
  background: '#FAFBFC',    // Fondo principal (blanco con tinte azul)
  surface: '#FFFFFF',       // Superficies/cards
  surfaceHover: '#F8FAFC',  // Hover states
  
  // === TEXTOS MINIMALISTAS ===
  text: '#1F2937',          // Texto principal (gris muy oscuro)
  textSecondary: '#6B7280', // Texto secundario (gris medio)
  textMuted: '#9CA3AF',     // Texto silenciado (gris claro)
  textInverse: '#FFFFFF',   // Texto sobre fondos azules
  
  // === BORDES SUAVES ===
  border: '#E5E7EB',        // Bordes normales
  borderLight: '#F3F4F6',   // Bordes muy suaves
  borderFocus: '#3B82F6',   // Bordes en focus (azul)
  
  // === ESTADOS EMOCIONALES SUAVES ===
  // Tranquilo/Positivo - Verde suave
  success: '#10B981',
  successLight: '#D1FAE5',
  successSoft: '#ECFDF5',
  
  // Neutral - Gris azulado
  neutral: '#6B7280',
  neutralLight: '#E5E7EB',
  neutralSoft: '#F9FAFB',
  
  // Estresado - Rojo suave (no agresivo)
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  warningSoft: '#FFFBEB',
  
  error: '#EF4444',
  errorLight: '#FEE2E2',
  errorSoft: '#FEF2F2',
  
  // === OVERLAYS MINIMALISTAS ===
  overlay: 'rgba(31, 41, 55, 0.4)',      // Overlay oscuro suave
  overlayLight: 'rgba(31, 41, 55, 0.1)', // Overlay muy suave
  overlayBlue: 'rgba(59, 130, 246, 0.1)', // Overlay azul
};

export const Theme = {
  // Bordes redondeados suaves
  borderRadius: {
    small: 6,
    medium: 8,
    large: 12,
    extraLarge: 16,
    full: 9999,
  },
  
  // Espaciado consistente
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  
  // Tipografía moderna
  typography: {
    h1: 28,
    h2: 24,
    h3: 20,
    h4: 18,
    h5: 16,
    body: 14,
    caption: 12,
    small: 11,
    tiny: 10,
  },
  
  // Sombras suaves minimalistas
  shadows: {
    none: {},
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    // Sombras azules para elementos importantes
    blue: {
      shadowColor: '#3B82F6',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
  }
};

// Utilidades para obtener colores según emociones
export const getEmotionColor = (emotionId) => {
  switch (emotionId) {
    case 'stressed':
      return COLORS.error;
    case 'neutral':
      return COLORS.neutral;
    case 'tranki':
      return COLORS.success;
    default:
      return COLORS.neutral;
  }
};

export const getEmotionBackground = (emotionId) => {
  switch (emotionId) {
    case 'stressed':
      return COLORS.errorSoft;
    case 'neutral':
      return COLORS.neutralSoft;
    case 'tranki':
      return COLORS.successSoft;
    default:
      return COLORS.neutralSoft;
  }
};

export const getEmotionIcon = (emotionId) => {
  switch (emotionId) {
    case 'stressed':
      return '😰';
    case 'neutral':
      return '😐';
    case 'tranki':
      return '😊';
    default:
      return '😐';
  }
};