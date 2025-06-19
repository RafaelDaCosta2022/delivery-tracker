import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ProtectedRoute from './app/ProtectedRoute';
import DrawerNavigator from './app/DrawerNavigator';
import LoginScreen from './app/LoginScreen';

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const init = async () => {
      const usuarioStorage = await AsyncStorage.getItem('usuario');
      setUsuario(usuarioStorage ? JSON.parse(usuarioStorage) : null);
      setCarregando(false);
    };

    init();
  }, []);

  if (carregando) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4a6cff" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {usuario ? (
        <ProtectedRoute>
          <DrawerNavigator />
        </ProtectedRoute>
      ) : (
        <LoginScreen />
      )}
    </NavigationContainer>
  );
}
