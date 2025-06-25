// App.js
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AuthProvider, useAuth } from './app/AuthContext';
import { initIP } from './app/config';

import ConfiguracaoScreen from './app/ConfiguracaoScreen';
import DrawerNavigator from './app/DrawerNavigator';
import LoginScreen from './app/LoginScreen';


const Stack = createStackNavigator();

export default function App() {
  useEffect(() => {
    initIP().then(ip => {
      console.log('[App] ✅ IP carregado:', ip);
    });
  }, []);

  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}

function RootNavigator() {
  const { usuario, carregando } = useAuth();

  if (carregando) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#4caf50" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {usuario ? (
        <Stack.Screen name="Main" component={DrawerNavigator} />
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}

      {/* ✅ Tela de configuração visível a qualquer momento */}
      <Stack.Screen name="Configuracao" component={ConfiguracaoScreen} />
    </Stack.Navigator>
  );
}

const AuthStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="Login"
      component={LoginScreen}
      options={{ headerShown: false }}
    />
  </Stack.Navigator>
);

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
});
