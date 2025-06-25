import React, { useEffect, useState, createContext, useContext } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { jwtDecode } from 'jwt-decode';
import { API, initIP } from './config';

// Tipos
export type Usuario = {
  id: number;
  nome: string;
  tipo: string;
  token: string;
};

type TokenPayload = {
  id: number;
  nome: string;
  tipo: string;
  exp: number;
  iat: number;
};

type ProtectedRouteProps = {
  children: React.ReactNode;
  permitido?: string[];
};

// Contexto
const AuthContext = createContext<{
  usuario: Usuario | null;
  authHeader: () => Record<string, string>;
}>({
  usuario: null,
  authHeader: () => ({}),
});

export const useAuth = () => useContext(AuthContext);

export default function ProtectedRoute({ children, permitido }: ProtectedRouteProps) {
  const [carregando, setCarregando] = useState(true);
  const [autorizado, setAutorizado] = useState(false);
  const [erroToken, setErroToken] = useState('');
  const [usuarioAutenticado, setUsuarioAutenticado] = useState<Usuario | null>(null);
  const [ipReady, setIpReady] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    const init = async () => {
      await initIP();
      setIpReady(true);
    };
    init();
  }, []);

  const verificarToken = async (token: string): Promise<boolean> => {
    try {
      const cleanToken = token.trim().replace(/\s+/g, '');
      const res = await fetch(`${API.BASE()}/validate-token`, {
        headers: {
          Authorization: `Bearer ${cleanToken}`,
          'Content-Type': 'application/json',
        },
      });
      return res.ok;
    } catch (error) {
      console.error('Erro na validação do token:', error);
      return false;
    }
  };

  const redirecionarLogin = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      })
    );
  };

  useEffect(() => {
    if (!ipReady) return;

    const verificarAutenticacao = async () => {
      setCarregando(true);
      
      try {
        const usuarioSalvo = await AsyncStorage.getItem('usuario');
        if (!usuarioSalvo) {
          redirecionarLogin();
          return;
        }

        const usuarioObj: Usuario = JSON.parse(usuarioSalvo);
        const cleanToken = usuarioObj.token?.trim().replace(/\s+/g, '');
        if (!cleanToken) {
          throw new Error('Token inválido ou ausente');
        }

        // Verificar estrutura do token
        const tokenParts = cleanToken.split('.');
        if (tokenParts.length !== 3) {
          throw new Error('Token mal formado');
        }

        // Decodificar para verificar expiração
        const decoded = jwtDecode<TokenPayload>(cleanToken);
        const agora = Math.floor(Date.now() / 1000);
        if (decoded.exp < agora) {
          throw new Error('Token expirado');
        }

        // Validar token no backend
        const validoNoBackend = await verificarToken(cleanToken);
        if (!validoNoBackend) {
          throw new Error('Token rejeitado pelo servidor');
        }

        const usuarioAtualizado = { ...usuarioObj, token: cleanToken };
        await AsyncStorage.setItem('usuario', JSON.stringify(usuarioAtualizado));
        setUsuarioAutenticado(usuarioAtualizado);

        // Verificar se o tipo de usuário é permitido
        if (permitido && !permitido.includes(usuarioAtualizado.tipo)) {
          throw new Error('Acesso não permitido para este perfil');
        }

        setAutorizado(true);
      } catch (error: any) {
        console.log('Erro na verificação:', error);
        setErroToken(error.message || 'Erro de autenticação');
        await AsyncStorage.removeItem('usuario');
      } finally {
        setCarregando(false);
      }
    };

    verificarAutenticacao();
  }, [ipReady]);

  const authHeader = () => {
    if (!usuarioAutenticado?.token) return {};
    return {
      Authorization: `Bearer ${usuarioAutenticado.token}`,
      'Content-Type': 'application/json',
    };
  };

  const handleReLogin = () => {
    redirecionarLogin();
  };

  if (carregando) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4361ee" />
        <Text style={styles.textoCarregando}>Verificando autenticação...</Text>
      </View>
    );
  }

  if (erroToken) {
    return (
      <View style={styles.container}>
        <Text style={styles.tituloErro}>Erro de Autenticação</Text>
        <Text style={styles.mensagemErro}>{erroToken}</Text>
        <TouchableOpacity style={styles.botao} onPress={handleReLogin}>
          <Text style={styles.textoBotao}>Ir para Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return autorizado ? (
    <AuthContext.Provider value={{ usuario: usuarioAutenticado, authHeader }}>
      {children}
    </AuthContext.Provider>
  ) : null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  textoCarregando: {
    marginTop: 15,
    color: '#6c757d',
    fontSize: 16,
  },
  tituloErro: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 15,
  },
  mensagemErro: {
    fontSize: 16,
    color: '#212529',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  botao: {
    backgroundColor: '#4361ee',
    paddingVertical: 12,
    paddingHorizontal: 35,
    borderRadius: 8,
    elevation: 3,
  },
  textoBotao: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});