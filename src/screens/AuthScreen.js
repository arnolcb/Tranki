// src/screens/AuthScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { COLORS } from '../constants/colors';
import FirebaseService from '../services/firebase';

const AuthScreen = ({ navigation }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [role, setRole] = useState('estudiante');
  const [loading, setLoading] = useState(false);

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
          role
        });
      }
      navigation.replace('Main');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.logo}>😊 Tranki</Text>
          <Text style={styles.subtitle}>
            Tu compañero para el bienestar emocional
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.title}>
            {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </Text>

          {!isLogin && (
            <>
              <TextInput
                style={styles.input}
                placeholder="Nombre completo"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
              
              <TextInput
                style={styles.input}
                placeholder="Edad"
                value={age}
                onChangeText={setAge}
                keyboardType="numeric"
                maxLength={2}
              />

              <View style={styles.roleContainer}>
                <Text style={styles.roleLabel}>Eres:</Text>
                <View style={styles.roleButtons}>
                  {['estudiante', 'trabajador', 'ambos'].map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[
                        styles.roleButton,
                        role === r && styles.roleButtonActive
                      ]}
                      onPress={() => setRole(r)}
                    >
                      <Text style={[
                        styles.roleButtonText,
                        role === r && styles.roleButtonTextActive
                      ]}>
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          )}

          <TextInput
            style={styles.input}
            placeholder="Correo electrónico"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleAuth}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Cargando...' : (isLogin ? 'Entrar' : 'Registrarse')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => setIsLogin(!isLogin)}
          >
            <Text style={styles.switchButtonText}>
              {isLogin 
                ? '¿No tienes cuenta? Regístrate' 
                : '¿Ya tienes cuenta? Inicia sesión'
              }
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 48,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
  },
  form: {
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  roleContainer: {
    marginBottom: 15,
  },
  roleLabel: {
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 8,
  },
  roleButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  roleButton: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 6,
    marginHorizontal: 2,
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  roleButtonText: {
    color: COLORS.text,
    fontSize: 12,
  },
  roleButtonTextActive: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchButton: {
    marginTop: 15,
    alignItems: 'center',
  },
  switchButtonText: {
    color: COLORS.primary,
    fontSize: 14,
  },
});

export default AuthScreen;