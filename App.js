import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { colors, fonts } from './theme';
import HomeScreen from './screens/HomeScreen';
import AgentsScreen from './screens/AgentsScreen';
import MarketplaceScreen from './screens/MarketplaceScreen';
import GetStartedScreen from './screens/GetStartedScreen';
import LoginScreen from './screens/LoginScreen';
import ProfileScreen from './screens/ProfileScreen';
import TabBar from './components/TabBar';

const Tab = createBottomTabNavigator();

const navTheme = {
  dark: false,
  colors: {
    primary: colors.indigo,
    background: colors.page,
    card: colors.surface,
    text: colors.ink,
    border: colors.border,
    notification: colors.indigo,
  },
  fonts: {
    regular: { fontFamily: fonts.regular, fontWeight: '400' },
    medium: { fontFamily: fonts.medium, fontWeight: '500' },
    bold: { fontFamily: fonts.semibold, fontWeight: '600' },
    heavy: { fontFamily: fonts.semibold, fontWeight: '700' },
  },
};

export default function App() {
  const [fontsLoaded] = useFonts({ Inter_300Light, Inter_400Regular, Inter_500Medium, Inter_600SemiBold });
  // 'start' -> 'login' -> 'app'. Get started skips the door; Log in uses it.
  const [screen, setScreen] = useState('start');

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      {screen === 'app' ? (
        <NavigationContainer theme={navTheme}>
          <Tab.Navigator
            screenOptions={{ headerShown: false, animation: 'fade' }}
            tabBar={(props) => <TabBar {...props} />}
          >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Agents" component={AgentsScreen} options={{ tabBarStyle: { display: 'none' } }} />
            <Tab.Screen name="Marketplace" component={MarketplaceScreen} />
            {/* Reachable from the Home header and Axl's sidebar, not the tab
                bar: a fourth pill would crowd the three that are destinations. */}
            <Tab.Screen
              name="Profile"
              options={{ tabBarStyle: { display: 'none' }, tabBarHidden: true }}
            >
              {({ navigation }) => <ProfileScreen onBack={() => navigation.navigate('Home')} />}
            </Tab.Screen>
          </Tab.Navigator>
        </NavigationContainer>
      ) : screen === 'login' ? (
        <LoginScreen onDone={() => setScreen('app')} onBack={() => setScreen('start')} />
      ) : (
        <GetStartedScreen onStart={() => setScreen('app')} onLogin={() => setScreen('login')} />
      )}
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
