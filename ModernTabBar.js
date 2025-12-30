import React, {useEffect} from 'react';
import {View, TouchableOpacity, StyleSheet, Platform} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import {COLORS} from './src/constants/colors';
import CustomIcons from './src/components/CustomIcons';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const TabBarButton = ({route, focused, onPress}) => {
  const scale = useSharedValue(focused ? 1 : 0.9);
  const opacity = useSharedValue(focused ? 1 : 0.6);
  const backgroundColor = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    scale.value = withSpring(focused ? 1 : 0.9, {
      damping: 15,
      stiffness: 150,
    });
    opacity.value = withTiming(focused ? 1 : 0.6, {duration: 200});
    backgroundColor.value = withTiming(focused ? 1 : 0, {duration: 300});
  }, [focused]);

  const animatedStyle = useAnimatedStyle(() => {
    const bgOpacity = interpolate(
      backgroundColor.value,
      [0, 1],
      [0, 1],
      Extrapolation.CLAMP
    );

    return {
      transform: [{scale: scale.value}],
      opacity: opacity.value,
      backgroundColor: `rgba(139, 92, 246, ${bgOpacity * 0.12})`,
    };
  });

  const isChatButton = route.name === 'Chat';

  if (isChatButton) {
    return (
      <AnimatedTouchable
        activeOpacity={0.7}
        onPress={onPress}
        style={[styles.chatButton, animatedStyle]}>
        <View style={styles.chatButtonInner}>
          <CustomIcons.MessageCircle size={28} color={COLORS.white} />
        </View>
      </AnimatedTouchable>
    );
  }

  let IconComponent;
  switch (route.name) {
    case 'EmotionSelector':
      IconComponent = CustomIcons.Home;
      break;
    case 'Sleep':
      IconComponent = CustomIcons.ZZZ;
      break;
    case 'Mindful':
      IconComponent = CustomIcons.Breathing;
      break;
    case 'Profile':
      IconComponent = CustomIcons.User;
      break;
    default:
      IconComponent = CustomIcons.Home;
  }

  return (
    <AnimatedTouchable
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.tabButton, animatedStyle]}>
      <IconComponent
        size={24}
        color={focused ? COLORS.primary : '#9CA3AF'}
      />
    </AnimatedTouchable>
  );
};

const ModernTabBar = ({state, descriptors, navigation}) => {
  const tabBarScale = useSharedValue(1);

  useEffect(() => {
    tabBarScale.value = withSpring(1, {
      damping: 20,
      stiffness: 150,
    });
  }, []);

  const animatedTabBarStyle = useAnimatedStyle(() => {
    return {
      transform: [{scale: tabBarScale.value}],
    };
  });

  return (
    <Animated.View style={[styles.tabBarContainer, animatedTabBarStyle]}>
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const {options} = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              if (route.name === 'Chat') {
                navigation.navigate('Chat', {emotion: null});
              } else {
                navigation.navigate(route.name);
              }
            }
          };

          return (
            <TabBarButton
              key={route.key}
              route={route}
              focused={isFocused}
              onPress={onPress}
            />
          );
        })}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 35,
    height: 70,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'space-around',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 12},
        shadowOpacity: 0.15,
        shadowRadius: 24,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  tabButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: {width: 0, height: 8},
        shadowOpacity: 0.45,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
      },
    }),
  },
});

export default ModernTabBar;