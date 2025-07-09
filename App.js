import React, {useEffect, useState} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import auth from '@react-native-firebase/auth';
import {ActivityIndicator, View, StyleSheet} from 'react-native';

import AuthScreen from './src/screens/AuthScreen';
import EmotionSelectorScreen from './src/screens/EmotionSelectorScreen';
import ChatScreen from './src/screens/ChatScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import PlacesScreen from './src/screens/PlacesScreen';
import ScheduleScreen from './src/screens/ScheduleScreen';
import ProfileScreen from './src/screens/ProfileScreen';

import FriendsScreen from './src/screens/FriendsScreen';
import SearchFriendsScreen from './src/screens/SearchFriendsScreen';
import SocialFeedScreen from './src/screens/SocialFeedScreen';

import CustomIcons from './src/components/CustomIcons';
import ImageService from './src/services/imageService';
import {COLORS} from './src/constants/colors';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Configuración de tabs principales con diseño profesional usando solo texto
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 0,
          elevation: 10,
          shadowOffset: {
            width: 0,
            height: -2,
          },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          paddingBottom: 8,
          paddingTop: 8,
          height: 70,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
        tabBarIcon: ({focused, color}) => {
          let IconComponent;
          const iconSize = 22;

          switch (route.name) {
            case 'EmotionSelector':
              IconComponent = CustomIcons.Home;
              break;
            case 'History':
              IconComponent = CustomIcons.Analytics;
              break;
            case 'Places':
              IconComponent = CustomIcons.Location;
              break;
            case 'Schedule':
              IconComponent = CustomIcons.Calendar;
              break;
            case 'Profile':
              IconComponent = CustomIcons.User;
              break;
            default:
              IconComponent = CustomIcons.Home;
          }

          return (
            <View
              style={{
                backgroundColor: focused ? COLORS.blue50 : 'transparent',
                paddingHorizontal: 16,
                paddingVertical: 6,
                borderRadius: 20,
                minWidth: 50,
                alignItems: 'center',
              }}>
              <IconComponent
                size={iconSize}
                color={focused ? COLORS.primary : color}
              />
            </View>
          );
        },
      })}>
      <Tab.Screen
        name="EmotionSelector"
        component={EmotionSelectorScreen}
        options={{
          tabBarLabel: 'Inicio',
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarLabel: 'Historial',
        }}
      />
      <Tab.Screen
        name="Places"
        component={PlacesScreen}
        options={{
          tabBarLabel: 'Lugares',
        }}
      />
      <Tab.Screen
        name="Schedule"
        component={ScheduleScreen}
        options={{
          tabBarLabel: 'Horarios',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Perfil',
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  // Manejar cambios de estado de autenticación
  function onAuthStateChanged(user) {
    setUser(user);
    if (initializing) setInitializing(false);
  }

  useEffect(() => {
    // Test de Cloudinary
    ImageService.testConnection().then(result => {
      console.log('📸 Cloudinary test:', result);
    });

    const subscriber = auth().onAuthStateChanged(onAuthStateChanged);
    return subscriber; // unsubscribe on unmount
  }, []);

  if (initializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        {user ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            {/* AGREGAR ESTAS 3 LÍNEAS: */}
            <Stack.Screen name="Friends" component={FriendsScreen} />
            <Stack.Screen name="SearchFriends" component={SearchFriendsScreen} />
            <Stack.Screen name="SocialFeed" component={SocialFeedScreen} />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});