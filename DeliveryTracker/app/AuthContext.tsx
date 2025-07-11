import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import { API, isTokenValid } from './config';

interface Usuario {
  id: string;
  nome: string;
  tipo: string;
  token: string;
}

interface AuthContextType {
  usuario: Usuario | null;
  carregando: boolean;
  login: (userData: Usuario) => Promise<void>;
  logout: () => Promise<void>;
  authHeader: () => Promise<Record<string, string>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const carregarUsuario = async () => {
      try {
        const savedUser = await AsyncStorage.getItem('usuario');
        if (savedUser) {
          const parsedUser = JSON.parse(savedUser);
          if (parsedUser && parsedUser.token && parsedUser.nome) {
            if (isTokenValid(parsedUser.token)) {
              console.log('✅ Token válido encontrado no storage');
              setUsuario(parsedUser);
              return;
            } else {
              console.warn('⏰ Token expirado no storage, limpando...');
              await clearAuthData();
            }
          }
        }

        const creds = await AsyncStorage.getItem('credenciais');
        if (creds) {
          const { nome, senha } = JSON.parse(creds);
          if (nome && senha) {
            console.log('🔐 Tentando auto-login com credenciais salvas...');
            const res = await fetch(API.LOGIN(), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ nome, senha }),
            });
            const data = await res.json();
            if (res.ok && data.token) {
              await login({
                id: data.id,
                nome: data.nome,
                tipo: data.tipo,
                token: data.token,
              });
              console.log('✅ Auto-login bem-sucedido!');
              return;
            } else {
              console.warn('⚠️ Auto-login falhou:', data.error || data);
            }
          }
        }
      } catch (error) {
        console.error('Erro ao carregar usuário:', error);
      } finally {
        setCarregando(false);
      }
    };

    carregarUsuario();
  }, []);

  const login = async (userData: Usuario) => {
    const cleanToken = (userData.token || '').trim().replace(/\s+/g, '');
    const newUser = { ...userData, token: cleanToken };
    await AsyncStorage.setItem('usuario', JSON.stringify(newUser));
    setUsuario(newUser);
  };

  const logout = async () => {
    await clearAuthData();
    setUsuario(null);
  };

  const clearAuthData = async (): Promise<void> => {
    await AsyncStorage.removeItem('usuario');
  };

  const getAuthHeader = async () => {
    if (!usuario || !usuario.token) {
      console.warn('⚠️ Sem usuário ou token.');
      return {};
    }

    if (!isTokenValid(usuario.token)) {
      console.warn('⏰ Token expirado dentro do authHeader, tentando auto-login...');
      await clearAuthData();
      setUsuario(null);

      const creds = await AsyncStorage.getItem('credenciais');
      if (creds) {
        const { nome, senha } = JSON.parse(creds);
        const res = await fetch(API.LOGIN(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome, senha }),
        });
        const data = await res.json();
        if (res.ok && data.token) {
          await login({
            id: data.id,
            nome: data.nome,
            tipo: data.tipo,
            token: data.token,
          });
          console.log('✅ Auto-login dentro do authHeader bem-sucedido!');
          return { Authorization: `Bearer ${data.token}` };
        } else {
          console.warn('⚠️ Auto-login dentro do authHeader falhou!');
          return {};
        }
      } else {
        console.warn('⚠️ Sem credenciais salvas. Faça login manual.');
        return {};
      }
    }

    return { Authorization: `Bearer ${usuario.token}` };
  };

  return (
    <AuthContext.Provider
      value={{
        usuario,
        carregando,
        login,
        logout,
        authHeader: getAuthHeader,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// 👇 ISSO FICA FORA DO COMPONENTE
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
