import React, {useEffect, useState} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import auth from '@react-native-firebase/auth';
import {ActivityIndicator, View, StyleSheet, Platform, TouchableOpacity} from 'react-native';

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

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 0,
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: -8,
          },
          shadowOpacity: 0.12,
          shadowRadius: 16,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 12,
          height: Platform.OS === 'ios' ? 90 : 70,
          position: 'absolute',
        },
        tabBarButton: (props) => (
          <TouchableOpacity
            {...props}
            activeOpacity={1}
          />
        ),
        tabBarIcon: ({focused}) => {
          let IconComponent;
          const iconSize = 26;
          const isChatButton = route.name === 'Chat';

          // Botón central MEGA llamativo
          if (isChatButton) {
            return (
              <View style={{
                position: 'absolute',
                top: -28,
                width: 70,
                height: 70,
                borderRadius: 35,
                backgroundColor: COLORS.primary,
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: COLORS.primary,
                shadowOffset: {width: 0, height: 10},
                shadowOpacity: 0.5,
                shadowRadius: 20,
                elevation: 15,
                borderWidth: 5,
                borderColor: COLORS.white,
              }}>
                <CustomIcons.MessageCircle size={32} color={COLORS.white} />
              </View>
            );
          }

          // Iconos normales con animación
          switch (route.name) {
            case 'EmotionSelector':
              IconComponent = CustomIcons.Home;
              break;
            case 'Places':
              IconComponent = CustomIcons.MapPin;
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
            <View style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              backgroundColor: focused ? COLORS.primary + '15' : 'transparent',
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'hidden',
            }}>
              <IconComponent
                size={28}
                color={focused ? COLORS.primary : '#9CA3AF'}
              />
            </View>
          );
        },
      })}>
      <Tab.Screen
        name="EmotionSelector"
        component={EmotionSelectorScreen}
      />
      <Tab.Screen
        name="Places"
        component={PlacesScreen}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        listeners={({navigation}) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('Chat', {
              emotion: null,
            });
          },
        })}
      />
      <Tab.Screen
        name="Schedule"
        component={ScheduleScreen}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  function onAuthStateChanged(user) {
    setUser(user);
    if (initializing) setInitializing(false);
  }

  useEffect(() => {
    ImageService.testConnection().then(result => {
      console.log('📸 Cloudinary test:', result);
    });

    const subscriber = auth().onAuthStateChanged(onAuthStateChanged);
    return subscriber;
  }, []);

  if (initializing) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <View style={styles.logoCircle}>
            <View style={styles.logoInner} />
          </View>
          <ActivityIndicator 
            size="large" 
            color={COLORS.primary} 
            style={styles.spinner}
          />
        </View>
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
            <Stack.Screen name="History" component={HistoryScreen} />
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
    backgroundColor: '#F0F4F8',
  },
  loadingContent: {
    alignItems: 'center',
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  logoInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  spinner: {
    marginTop: 8,
  },
});