// src/screens/AuthScreen.js - Optimizado con mejor UX/UI
import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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

const {height: SCREEN_HEIGHT} = Dimensions.get('window');

const AuthScreen = ({navigation}) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [role, setRole] = useState('estudiante');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Animación sutil para transición login/registro
  const fadeAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    StatusBar.setBarStyle('dark-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('transparent');
      StatusBar.setTranslucent(true);
    }

    GoogleSignin.configure({
      webClientId: Config.GOOGLE_WEB_CLIENT_ID,
      offlineAccess: true,
    });
  }, []);

  const toggleAuthMode = () => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
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
        if (!name || !age) {
          Alert.alert('Error', 'Por favor completa todos los campos');
          setLoading(false);
          return;
        }

        await FirebaseService.createUserWithEmail(email, password, {
          name,
          age: parseInt(age),
          role,
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

  const getRoleDisplayName = roleKey => {
    switch (roleKey) {
      case 'estudiante':
        return 'Estudiante';
      case 'trabajador':
        return 'Trabajador';
      case 'ambos':
        return 'Ambos';
      default:
        return roleKey;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}>
          {/* Logo minimalista centrado */}
          <View style={styles.logoSection}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>e</Text>
            </View>
          </View>

          {/* Tarjeta principal con animación */}
          <Animated.View style={[styles.card, {opacity: fadeAnim}]}>
            {/* Header */}
            <View style={styles.cardHeader}>
              <Text style={styles.title}>
                {isLogin ? 'Bienvenido de vuelta' : 'Crear nueva cuenta'}
              </Text>
              <Text style={styles.subtitle}>
                {isLogin
                  ? 'Ingresa tus credenciales para continuar'
                  : 'Completa tus datos para registrarte'}
              </Text>
            </View>

            {/* Campos de formulario */}
            <View style={styles.formSection}>
              {/* Campos de registro */}
              {!isLogin && (
                <>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.label}>NOMBRE COMPLETO</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Ingresa tu nombre"
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                      placeholderTextColor={COLORS.textMuted}
                      returnKeyType="next"
                    />
                  </View>

                  <View style={styles.inputWrapper}>
                    <Text style={styles.label}>EDAD</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Ej. 25"
                      value={age}
                      onChangeText={setAge}
                      keyboardType="numeric"
                      maxLength={2}
                      placeholderTextColor={COLORS.textMuted}
                      returnKeyType="next"
                    />
                  </View>

                  <View style={styles.inputWrapper}>
                    <Text style={styles.label}>¿QUÉ ERES?</Text>
                    <View style={styles.roleContainer}>
                      {['estudiante', 'trabajador', 'ambos'].map(r => (
                        <TouchableOpacity
                          key={r}
                          style={[
                            styles.roleButton,
                            role === r && styles.roleButtonActive,
                          ]}
                          onPress={() => setRole(r)}
                          activeOpacity={0.7}>
                          <Text
                            style={[
                              styles.roleText,
                              role === r && styles.roleTextActive,
                            ]}>
                            {getRoleDisplayName(r)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </>
              )}

              {/* Email */}
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>CORREO ELECTRÓNICO</Text>
                <TextInput
                  style={styles.input}
                  placeholder="nombre@ejemplo.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholderTextColor={COLORS.textMuted}
                  returnKeyType="next"
                />
              </View>

              {/* Contraseña */}
              <View style={styles.inputWrapper}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>CONTRASEÑA</Text>
                  {isLogin && (
                    <TouchableOpacity
                      onPress={handleForgotPassword}
                      activeOpacity={0.7}
                      hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                      <Text style={styles.forgotText}>
                        ¿Olvidaste tu contraseña?
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    placeholderTextColor={COLORS.textMuted}
                    returnKeyType="done"
                    onSubmitEditing={handleAuth}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                    hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                    <EyeIcon size={20} color="#6B7280" closed={!showPassword} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Botón principal */}
              <TouchableOpacity
                style={[
                  styles.mainButton,
                  loading && styles.mainButtonDisabled,
                ]}
                onPress={handleAuth}
                disabled={loading}
                activeOpacity={0.85}>
                <Text style={styles.mainButtonText}>
                  {loading
                    ? 'Procesando...'
                    : isLogin
                    ? 'Iniciar sesión'
                    : 'Crear cuenta'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>O inicia sesión con</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Login */}
            <View style={styles.socialContainer}>
              <TouchableOpacity
                style={[
                  styles.socialButton,
                  googleLoading && styles.socialButtonDisabled,
                ]}
                onPress={handleGoogleSignIn}
                disabled={googleLoading}
                activeOpacity={0.7}>
                <GoogleIcon size={24} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialButton}
                activeOpacity={0.7}
                disabled>
                <FacebookIcon size={24} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialButton}
                activeOpacity={0.7}
                disabled>
                <AppleIcon size={24} />
              </TouchableOpacity>
            </View>

            {/* Switch entre login/registro */}
            <View style={styles.footer}>
              <Text style={styles.footerQuestion}>
                {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
              </Text>
              <TouchableOpacity onPress={toggleAuthMode} activeOpacity={0.7}>
                <Text style={styles.footerLink}>
                  {isLogin ? 'Regístrate' : 'Inicia sesión'}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Espaciado inferior para mejor scroll en teclado */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F8',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 80,
    paddingBottom: 40,
  },

  // Logo Section
  logoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#7DB9DE',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7DB9DE',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoText: {
    fontSize: 42,
    fontWeight: '300',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    marginBottom: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Form Section
  formSection: {
    marginBottom: 24,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  forgotText: {
    fontSize: 12,
    color: '#7DB9DE',
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1A1A1A',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1A1A1A',
  },
  eyeButton: {
    paddingHorizontal: 12,
  },


  // Role Selection
  roleContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  roleButtonActive: {
    backgroundColor: '#EBF5FB',
    borderColor: '#7DB9DE',
    borderWidth: 2,
  },
  roleText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  roleTextActive: {
    color: '#7DB9DE',
    fontWeight: '700',
  },

  // Main Button
  mainButton: {
    backgroundColor: '#5A9AB8',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#5A9AB8',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  mainButtonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  mainButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },

  // Social Login
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  socialButtonDisabled: {
    opacity: 0.5,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  footerQuestion: {
    fontSize: 14,
    color: '#6B7280',
  },
  footerLink: {
    fontSize: 14,
    color: '#7DB9DE',
    fontWeight: '700',
  },

  // Bottom Spacer
  bottomSpacer: {
    height: 60,
  },
});

export default AuthScreen;
