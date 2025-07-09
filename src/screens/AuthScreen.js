// src/screens/AuthScreen.js - Con Google Sign-In y Reset Password
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
} from 'react-native';
import {COLORS, Theme} from '../constants/colors';
import FirebaseService from '../services/firebase';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';
import Config from 'react-native-config';

const AuthScreen = ({navigation}) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [role, setRole] = useState('estudiante');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  React.useEffect(() => {
    StatusBar.setBarStyle('dark-content');
    StatusBar.setBackgroundColor(COLORS.white);

    // Configurar Google Sign-In
    GoogleSignin.configure({
      webClientId: Config.GOOGLE_WEB_CLIENT_ID, // Usar desde .env
    });
  }, []);

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
      // Check if your device supports Google Play
      await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});

      // Get the users ID token
      const {idToken} = await GoogleSignin.signIn();

      // Create a Google credential with the token
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);

      // Sign-in the user with the credential
      const userCredential = await auth().signInWithCredential(
        googleCredential,
      );

      // Si es un usuario nuevo, guardar datos adicionales
      if (userCredential.additionalUserInfo?.isNewUser) {
        await FirebaseService.saveUserProfile(userCredential.user.uid, {
          name: userCredential.user.displayName,
          email: userCredential.user.email,
          profilePicture: userCredential.user.photoURL
            ? {
                url: userCredential.user.photoURL,
              }
            : null,
          role: 'estudiante', // Valor por defecto
          age: null,
          createdAt: new Date().toISOString(),
          signInMethod: 'google',
        });
      }

      Alert.alert('✅ Éxito', 'Has iniciado sesión con Google correctamente');
      navigation.replace('Main');
    } catch (error) {
      console.error('Google Sign-In Error:', error);

      if (error.code === 'sign_in_cancelled') {
        // User cancelled the login flow
        Alert.alert('Cancelado', 'Inicio de sesión cancelado');
      } else if (error.code === 'in_progress') {
        // Operation (e.g. sign in) is in progress already
        Alert.alert('En proceso', 'Ya hay un inicio de sesión en proceso');
      } else if (error.code === 'play_services_not_available') {
        // Play services not available or outdated
        Alert.alert('Error', 'Google Play Services no disponible');
      } else {
        Alert.alert('Error', 'Error al iniciar sesión con Google');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      '🔐 Restablecer contraseña',
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
        '✅ Email enviado',
        'Revisa tu bandeja de entrada y sigue las instrucciones para restablecer tu contraseña.',
        [{text: 'Entendido'}],
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
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.logoIcon}>
                <Text style={styles.logoEmoji}>🧘‍♀️</Text>
              </View>
              <Text style={styles.appName}>Tranki</Text>
            </View>
            <Text style={styles.tagline}>
              Tu compañero para el bienestar emocional
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>
                {isLogin ? 'Bienvenido de vuelta' : 'Crear nueva cuenta'}
              </Text>
              <Text style={styles.formSubtitle}>
                {isLogin
                  ? 'Ingresa tus credenciales para continuar'
                  : 'Únete a nuestra comunidad de bienestar'}
              </Text>
            </View>

            <View style={styles.formBody}>
              {/* Google Sign-In Button */}
              <TouchableOpacity
                style={[
                  styles.googleButton,
                  googleLoading && styles.googleButtonDisabled,
                ]}
                onPress={handleGoogleSignIn}
                disabled={googleLoading}
                activeOpacity={0.8}>
                <View style={styles.googleIcon}>
                  <Text style={styles.googleIconText}>G</Text>
                </View>
                <Text style={styles.googleButtonText}>
                  {googleLoading ? 'Conectando...' : 'Continuar con Google'}
                </Text>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>o continúa con email</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Campos de registro */}
              {!isLogin && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Nombre completo</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Ingresa tu nombre"
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Edad</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Ej. 25"
                      value={age}
                      onChangeText={setAge}
                      keyboardType="numeric"
                      maxLength={2}
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>¿Qué eres?</Text>
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
                              styles.roleButtonText,
                              role === r && styles.roleButtonTextActive,
                            ]}>
                            {getRoleDisplayName(r)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </>
              )}

              {/* Campos comunes */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Correo electrónico</Text>
                <TextInput
                  style={styles.input}
                  placeholder="nombre@ejemplo.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.passwordHeader}>
                  <Text style={styles.inputLabel}>Contraseña</Text>
                  {isLogin && (
                    <TouchableOpacity
                      onPress={handleForgotPassword}
                      activeOpacity={0.7}>
                      <Text style={styles.forgotPasswordText}>
                        ¿Olvidaste tu contraseña?
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>

              {/* Botón principal */}
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  loading && styles.primaryButtonDisabled,
                ]}
                onPress={handleAuth}
                disabled={loading}
                activeOpacity={0.8}>
                <Text style={styles.primaryButtonText}>
                  {loading
                    ? 'Procesando...'
                    : isLogin
                    ? 'Iniciar sesión'
                    : 'Crear cuenta'}
                </Text>
              </TouchableOpacity>

              {/* Switch entre login/registro */}
              <TouchableOpacity
                style={styles.switchButton}
                onPress={() => setIsLogin(!isLogin)}
                activeOpacity={0.7}>
                <Text style={styles.switchButtonText}>
                  {isLogin
                    ? '¿No tienes cuenta? Regístrate aquí'
                    : '¿Ya tienes cuenta? Inicia sesión'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Al continuar, aceptas nuestros términos de servicio y política de
              privacidad
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: Theme.spacing.xl,
    paddingVertical: Theme.spacing.xxxl,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: Theme.spacing.xxxl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  logoIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
    ...Theme.shadows.medium,
  },
  logoEmoji: {
    fontSize: 36,
  },
  appName: {
    fontSize: Theme.typography.h1,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: Theme.typography.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },

  // Form Card
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: Theme.borderRadius.extraLarge,
    padding: Theme.spacing.xxxl,
    marginBottom: Theme.spacing.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Theme.shadows.large,
  },
  formHeader: {
    alignItems: 'center',
    marginBottom: Theme.spacing.xxxl,
  },
  formTitle: {
    fontSize: Theme.typography.h3,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: Theme.spacing.sm,
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: Theme.typography.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  formBody: {
    gap: Theme.spacing.lg,
  },

  // Google Button
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: Theme.borderRadius.medium,
    paddingVertical: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.xl,
    backgroundColor: COLORS.white,
    gap: Theme.spacing.md,
    ...Theme.shadows.small,
  },
  googleButtonDisabled: {
    opacity: 0.6,
  },
  googleIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleIconText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  googleButtonText: {
    fontSize: Theme.typography.body,
    color: COLORS.text,
    fontWeight: '600',
  },

  // Input Groups
  inputGroup: {
    gap: Theme.spacing.sm,
  },
  inputLabel: {
    fontSize: Theme.typography.caption,
    color: COLORS.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: Theme.borderRadius.medium,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.lg,
    fontSize: Theme.typography.body,
    color: COLORS.text,
    backgroundColor: COLORS.gray50,
  },

  // Password Header
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgotPasswordText: {
    fontSize: Theme.typography.small,
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Role Selection
  roleContainer: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
  },
  roleButton: {
    flex: 1,
    paddingVertical: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: Theme.borderRadius.medium,
    alignItems: 'center',
    backgroundColor: COLORS.gray50,
  },
  roleButtonActive: {
    backgroundColor: COLORS.blue50,
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  roleButtonText: {
    fontSize: Theme.typography.caption,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  roleButtonTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },

  // Buttons
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.xl,
    borderRadius: Theme.borderRadius.medium,
    alignItems: 'center',
    marginTop: Theme.spacing.md,
    ...Theme.shadows.blue,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
    ...Theme.shadows.none,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: Theme.typography.h5,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Theme.spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    marginHorizontal: Theme.spacing.lg,
    fontSize: Theme.typography.small,
    color: COLORS.textMuted,
    fontWeight: '500',
  },

  // Switch Button
  switchButton: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.lg,
  },
  switchButtonText: {
    color: COLORS.primary,
    fontSize: Theme.typography.body,
    fontWeight: '600',
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.lg,
  },
  footerText: {
    fontSize: Theme.typography.small,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default AuthScreen;
