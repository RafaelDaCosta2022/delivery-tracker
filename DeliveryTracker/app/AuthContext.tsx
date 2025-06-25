//AuthContext.tsx

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';



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
          
          // Verificação rápida de estrutura básica
          if (parsedUser && parsedUser.token && parsedUser.nome) {
            setUsuario(parsedUser);
          } else {
            console.warn('Dados de usuário inválidos, limpando...');
            await clearAuthData();
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
    try {
      // Sanitização básica do token
      const cleanToken = (userData.token || '').trim().replace(/\s+/g, '');
      const newUser = { ...userData, token: cleanToken };
      
      await AsyncStorage.setItem('usuario', JSON.stringify(newUser));
      setUsuario(newUser);
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await clearAuthData();
      setUsuario(null);
    } catch (error) {
      console.error('Erro no logout:', error);
    }
  };

  const clearAuthData = async (): Promise<void> => {
  await AsyncStorage.multiRemove(['usuario', 'credenciais']);
};

  const getAuthHeader = async () => {
    if (!usuario || !usuario.token) return {};
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
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};



