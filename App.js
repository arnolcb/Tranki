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

import SleepScreen from './src/screens/SleepScreen';
import SleepStatsScreen from './src/screens/SleepStatsScreen';
import SleepCalendarScreen from './src/screens/SleepCalendarScreen';

import MindfulnessScreen from './src/screens/MindfulnessScreen';

import FriendsScreen from './src/screens/FriendsScreen';
import SearchFriendsScreen from './src/screens/SearchFriendsScreen';
import SocialFeedScreen from './src/screens/SocialFeedScreen';

import ImageService from './src/services/imageService';
import {COLORS} from './src/constants/colors';
import ModernTabBar from './ModernTabBar';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <ModernTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}>
      <Tab.Screen
        name="EmotionSelector"
        component={EmotionSelectorScreen}
      />
      <Tab.Screen
        name="Sleep"
        component={SleepScreen}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
      />
      <Tab.Screen
        name="Mindful"
        component={MindfulnessScreen}
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
            <Stack.Screen name="SleepStats" component={SleepStatsScreen} />
            <Stack.Screen name="SleepCalendar" component={SleepCalendarScreen} />
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