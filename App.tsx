import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { RootNavigator } from './src/navigation/RootNavigator';
import { QueryProvider } from './src/providers/QueryProvider';
import { AuthProvider } from './src/providers/AuthProvider';
import { BookingSyncProvider } from './src/providers/BookingSyncProvider';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <BookingSyncProvider>
          <QueryProvider>
            <NavigationContainer>
              <StatusBar style="dark" />
              <RootNavigator />
            </NavigationContainer>
          </QueryProvider>
        </BookingSyncProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
