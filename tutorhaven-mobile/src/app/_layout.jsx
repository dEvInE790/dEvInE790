import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { useFonts } from 'expo-font'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans'
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter'
import { AuthProvider } from '../context/AuthContext'
import { SettingsProvider } from '../context/SettingsContext'
import { ToastProvider } from '../context/ToastContext'
import { FavouritesProvider } from '../context/FavouritesContext'
import { UnreadProvider } from '../context/UnreadContext'
import { colors } from '../theme'

SplashScreen.preventAutoHideAsync().catch(() => {})

export default function RootLayout() {
  const [loaded, error] = useFonts({
    PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold,
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold,
  })
  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {})
  }, [loaded, error])
  if (!loaded && !error) return null

  return (
    <SafeAreaProvider>
      <ToastProvider>
        <SettingsProvider>
          <AuthProvider>
            <FavouritesProvider>
              <UnreadProvider>
              <StatusBar style="dark" />
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream100 }, animation: 'slide_from_right' }}>
                <Stack.Screen name="index" options={{ animation: 'fade' }} />
                <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
                <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
                <Stack.Screen name="membership" options={{ presentation: 'modal' }} />
              </Stack>
              </UnreadProvider>
            </FavouritesProvider>
          </AuthProvider>
        </SettingsProvider>
      </ToastProvider>
    </SafeAreaProvider>
  )
}
