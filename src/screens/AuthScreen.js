// src/screens/AuthScreen.js - Modern One-Page Design (No Scroll)
import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  SafeAreaView,
  Animated,
  Dimensions,
} from 'react-native';
import {COLORS, Theme} from '../constants/colors';
import FirebaseService from '../services/firebase';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';
import Config from 'react-native-config';
import {
  GoogleIcon,
  FacebookIcon,
  AppleIcon,
  EyeIcon,
} from '../components/icons';

const {height: SCREEN_HEIGHT, width: SCREEN_WIDTH} = Dimensions.get('window');

const AuthScreen = ({navigation}) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Animaciones
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('#2C3E50');
      StatusBar.setTranslucent(false);
    }

    GoogleSignin.configure({
      webClientId: Config.GOOGLE_WEB_CLIENT_ID,
      offlineAccess: true,
    });

    // Animación de entrada
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const toggleAuthMode = () => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.3,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
    setIsLogin(!isLogin);
  };

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await FirebaseService.signInWithEmail(email, password);
      } else {
        if (!name) {
          Alert.alert('Error', 'Por favor ingresa tu nombre');
          setLoading(false);
          return;
        }

        await FirebaseService.createUserWithEmail(email, password, {
          name,
          age: 25, // Valor por defecto
          role: 'estudiante', // Valor por defecto
        });
      }
      navigation.replace('Main');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});
      const signInResult = await GoogleSignin.signIn();

      const idToken =
        signInResult?.idToken ||
        signInResult?.data?.idToken ||
        signInResult?.user?.idToken;

      if (!idToken) {
        throw new Error(
          'No se obtuvo el idToken de Google. Verifica la configuración.',
        );
      }

      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      const userCredential = await auth().signInWithCredential(
        googleCredential,
      );

      if (userCredential.additionalUserInfo?.isNewUser) {
        await FirebaseService.saveUserProfile(userCredential.user.uid, {
          name: userCredential.user.displayName || 'Usuario',
          email: userCredential.user.email,
          profilePicture: userCredential.user.photoURL
            ? {url: userCredential.user.photoURL}
            : null,
          role: 'estudiante',
          age: null,
          createdAt: new Date().toISOString(),
          signInMethod: 'google',
        });
      }

      navigation.replace('Main');
    } catch (err) {
      let errorMessage = 'Error al iniciar sesión con Google';

      if (err?.code === 'sign_in_cancelled') {
        errorMessage = 'Inicio de sesión cancelado';
      } else if (err?.code === 'in_progress') {
        errorMessage = 'Ya hay un inicio de sesión en proceso';
      } else if (err?.code === 'play_services_not_available') {
        errorMessage = 'Google Play Services no disponible';
      } else if (err?.message) {
        errorMessage = err.message;
      }

      Alert.alert('Error de autenticación', errorMessage);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Restablecer contraseña',
      'Ingresa tu email para recibir instrucciones:',
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Enviar',
          onPress: () => {
            if (!email) {
              Alert.alert('Error', 'Por favor ingresa tu email primero');
              return;
            }
            sendPasswordReset();
          },
        },
      ],
    );
  };

  const sendPasswordReset = async () => {
    try {
      await auth().sendPasswordResetEmail(email);
      Alert.alert(
        'Email enviado',
        'Revisa tu bandeja de entrada y sigue las instrucciones para restablecer tu contraseña.',
      );
    } catch (error) {
      let errorMessage = 'Error al enviar el email';

      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No existe una cuenta con este email';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Email inválido';
      }

      Alert.alert('Error', errorMessage);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2C3E50" />
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}>
        <View style={styles.content}>
          {/* Header minimalista */}
          <Animated.View
            style={[
              styles.header,
              {
                opacity: slideAnim,
                transform: [
                  {
                    translateY: slideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-30, 0],
                    }),
                  },
                ],
              },
            ]}>
            <View style={styles.logoContainer}>
              <View style={styles.logoDot} />
              <Text style={styles.logoText}>tranki</Text>
            </View>
            <Text style={styles.welcomeText}>
              {isLogin ? 'Bienvenido de vuelta' : 'Crea tu cuenta'}
            </Text>
          </Animated.View>

          {/* Formulario compacto */}
          <Animated.View style={[styles.formContainer, {opacity: fadeAnim}]}>
            {/* Google Login - PROMINENTE */}
            <TouchableOpacity
              style={[
                styles.googleButton,
                googleLoading && styles.buttonDisabled,
              ]}
              onPress={handleGoogleSignIn}
              disabled={googleLoading}
              activeOpacity={0.8}>
              <GoogleIcon size={20} />
              <Text style={styles.googleButtonText}>
                {googleLoading
                  ? 'Conectando...'
                  : 'Continuar con Google'}
              </Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>o continuar con email</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Nombre (solo registro) */}
            {!isLogin && (
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Nombre completo"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  placeholderTextColor="#A0AEC0"
                  returnKeyType="next"
                />
              </View>
            )}

            {/* Email */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Correo electrónico"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor="#A0AEC0"
                returnKeyType="next"
              />
            </View>

            {/* Password */}
            <View style={styles.inputContainer}>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Contraseña"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  placeholderTextColor="#A0AEC0"
                  returnKeyType="done"
                  onSubmitEditing={handleAuth}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                  hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                  <EyeIcon size={20} color="#A0AEC0" closed={!showPassword} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password (solo login) */}
            {isLogin && (
              <TouchableOpacity
                onPress={handleForgotPassword}
                style={styles.forgotButton}
                activeOpacity={0.7}>
                <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
              </TouchableOpacity>
            )}

            {/* Main Action Button */}
            <TouchableOpacity
              style={[styles.mainButton, loading && styles.buttonDisabled]}
              onPress={handleAuth}
              disabled={loading}
              activeOpacity={0.9}>
              <Text style={styles.mainButtonText}>
                {loading
                  ? 'Procesando...'
                  : isLogin
                  ? 'Iniciar sesión'
                  : 'Crear cuenta'}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
            </Text>
            <TouchableOpacity onPress={toggleAuthMode} activeOpacity={0.7}>
              <Text style={styles.footerLink}>
                {isLogin ? 'Regístrate' : 'Inicia sesión'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2C3E50',
  },
  keyboardContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#507F93',
    marginRight: 8,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  welcomeText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '400',
    opacity: 0.7,
  },

  // Form
  formContainer: {
    width: '100%',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginLeft: 12,
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#507F93',
    opacity: 0.3,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 13,
    color: '#FFFFFF',
    opacity: 0.6,
    fontWeight: '500',
  },

  // Inputs
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#34495E',
    borderWidth: 1,
    borderColor: '#507F93',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 15,
    color: '#FFFFFF',
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34495E',
    borderWidth: 1,
    borderColor: '#507F93',
    borderRadius: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 15,
    color: '#FFFFFF',
  },
  eyeIcon: {
    paddingHorizontal: 14,
  },

  // Forgot Password
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
    opacity: 0.8,
  },

  // Main Button
  mainButton: {
    backgroundColor: '#507F93',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#507F93',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  mainButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    gap: 6,
  },
  footerText: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.7,
  },
  footerLink: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default AuthScreen;