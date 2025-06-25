// ProtectedRoute.tsx
import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useAuth } from './AuthContext';

type Props = {
  children: React.ReactNode;
  permitido?: string[];
};

export default function ProtectedRoute({ children, permitido = [] }: Props) {
  const { usuario, carregando, authHeader } = useAuth(); // ✅ agora está completo
  const headers = authHeader(); // Se você quiser usar os headers aqui, senão pode remover

  if (carregando) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4a6cff" />
        <Text>Carregando...</Text>
      </View>
    );
  }

  if (!usuario || !permitido.includes(usuario.tipo)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'red', fontSize: 18 }}>Acesso negado</Text>
      </View>
    );
  }

  return <>{children}</>;
}
