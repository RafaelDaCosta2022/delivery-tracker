import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

type ProtectedRouteProps = {
  children: React.ReactNode;
  permitido?: string[]; // Tipos de usuário permitidos (opcional)
};

export default function ProtectedRoute({ children, permitido }: ProtectedRouteProps) {
  const [carregando, setCarregando] = useState(true);
  const [autorizado, setAutorizado] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    const verificarLogin = async () => {
      try {
        const usuarioSalvo = await AsyncStorage.getItem('usuario');
        if (!usuarioSalvo) {
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          return;
        }

        const { tipo } = JSON.parse(usuarioSalvo);

        if (permitido && !permitido.includes(tipo)) {
          navigation.reset({ index: 0, routes: [{ name: 'Home' }] }); // Ou alguma tela de aviso
          return;
        }

        setAutorizado(true);
      } catch (err) {
        console.log('Erro ao verificar login:', err);
      } finally {
        setCarregando(false);
      }
    };

    verificarLogin();
  }, []);

  if (carregando) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return autorizado ? <>{children}</> : null;
}
