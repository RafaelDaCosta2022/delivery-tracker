import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from './AuthContext';
import { API } from './config';

export default function LoginScreen() {
  const { login } = useAuth();

  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [lembrarUsuario, setLembrarUsuario] = useState(true);
  const navigation = useNavigation();
  const [shakeAnim] = useState(new Animated.Value(0));
  
  const [fadeAnim] = useState(new Animated.Value(0));
  const [logoScale] = useState(new Animated.Value(0.8));
const shake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 20,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -20,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 6,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -6,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };
  

useEffect(() => {
  const carregarLoginSalvo = async () => {
    try {
      // Corrigir nome da chave (de 'credenciais' para 'credenciais')
      const salvo = await AsyncStorage.getItem('credenciais');
      console.log('🔐 Conteúdo carregado do storage:', salvo);

      if (salvo) {
        const credenciais = JSON.parse(salvo);
        
        // Verificar se a flag lembrar está ativa
        if (credenciais.lembrar) {
          console.log('🔐 Credenciais válidas encontradas');
          setNome(credenciais.nome || '');
          setSenha(credenciais.senha || '');
          setLembrarUsuario(true);
        } else {
          console.log('🔐 Lembrar usuário desativado');
          setLembrarUsuario(false);
        }
      } else {
        console.log('🔐 Nenhuma credencial encontrada');
        setLembrarUsuario(false);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar credenciais:', error);
      setLembrarUsuario(false);
    }
  };

 

  carregarLoginSalvo();

  // Animação da logo
  Animated.parallel([
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }),
    Animated.spring(logoScale, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }),
  ]).start();
}, []);

  const logar = async () => {
  if (!nome.trim() || !senha.trim()) {
    Alert.alert('Campos obrigatórios', 'Preencha todos os campos para continuar');
    return;
  }

  setCarregando(true);

  try {
    const url = API.LOGIN();
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ nome: nome.trim(), senha: senha.trim() }),
    });

    const data = await response.json();

    if (!response.ok) {
  shake(); // 👈 aqui dispara o shake
  Animated.sequence([
    Animated.timing(fadeAnim, {
      toValue: 0.8,
      duration: 80,
      useNativeDriver: true,
    }),
    Animated.spring(fadeAnim, {
      toValue: 1,
      friction: 2,
      useNativeDriver: true,
    }),
  ]).start();

  Alert.alert('Erro de login', data.error || 'Credenciais inválidas');
  return;
}

    // 🔐 Salvar ou limpar credenciais
    if (lembrarUsuario) {
      const json = JSON.stringify({ nome, senha, lembrar: true });
      console.log('💾 Salvando credenciais:', json);
      await AsyncStorage.setItem('credenciais', json);
      await new Promise(resolve => setTimeout(resolve, 100));
    } else {
      console.log('🧹 Limpando credenciais');
      await AsyncStorage.removeItem('credenciais');
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const cleanToken = (data.token || '').trim().replace(/\s+/g, '');
    await login({
      id: data.id,
      nome: data.nome,
      tipo: data.tipo,
      token: cleanToken,
    });

    if (['motorista', 'vendedor', 'admin'].includes(data.tipo)) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
      });
    } else {
      Alert.alert('Acesso não permitido', 'Seu perfil não tem acesso ao sistema');
    }

  } catch (err) {
    Alert.alert('Erro de conexão', 'Não foi possível conectar ao servidor');
    console.error('❌ Erro no login:', err);
  } finally {
    setCarregando(false);
  }
};

 // <-- ESSE ENCERRAMENTO estava faltando

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* resto do seu JSX */}

      <Animated.View
  style={[
    styles.innerContainer,
    {
      opacity: fadeAnim,
      transform: [{ translateX: shakeAnim }],
    },
  ]}
>
        {/* Cabeçalho com logo animada */}
        <Animated.View style={[styles.header, { transform: [{ scale: logoScale }] }]}>
          
          <Text style={styles.title}>Bem-vindo</Text>
          <Text style={styles.subtitle}>Faça login para continuar</Text>
        </Animated.View>

        {/* Formulário */}
        <View style={styles.formContainer}>
          {/* Campo Nome */}
          <View style={styles.inputContainer}>
            <Icon name="account-outline" size={24} color="#4caf50" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Nome de usuário"
              placeholderTextColor="#9e9e9e"
              value={nome}
              onChangeText={setNome}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Campo Senha */}
          <View style={styles.inputContainer}>
            <Icon name="lock-outline" size={24} color="#4caf50" style={styles.icon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Senha"
              placeholderTextColor="#9e9e9e"
              secureTextEntry={!mostrarSenha}
              value={senha}
              onChangeText={setSenha}
            />
            <TouchableOpacity 
              onPress={() => setMostrarSenha(!mostrarSenha)} 
              style={styles.toggle}
            >
              <Icon 
                name={mostrarSenha ? "eye-off-outline" : "eye-outline"} 
                size={24} 
                color="#757575" 
              />
            </TouchableOpacity>
          </View>

          {/* Opção Lembrar-me */}
          <TouchableOpacity 
            style={styles.rememberContainer}
            onPress={() => setLembrarUsuario(!lembrarUsuario)}
          >
            <View style={[styles.checkbox, lembrarUsuario && styles.checkboxChecked]}>
              {lembrarUsuario && <Icon name="check" size={16} color="#fff" />}
            </View>
            <Text style={styles.rememberText}>Lembrar minhas credenciais</Text>
          </TouchableOpacity>

          {/* Botão Entrar */}
          <TouchableOpacity 
            style={[styles.button, carregando && styles.buttonDisabled]} 
            onPress={logar} 
            disabled={carregando}
            activeOpacity={0.8}
          >
            {carregando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Entrar</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Rodapé */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Acesso restrito a funcionários autorizados</Text>
          <Text style={styles.footerNote}>Entre em contato com o administrador para suporte</Text>
        </View>
        {/* Botão de engrenagem para abrir Configuração */}
<TouchableOpacity 
  style={styles.configButton}
  onPress={() => navigation.navigate('Configuracao')}
  activeOpacity={0.7}
>
  <Icon name="cog-outline" size={26} color="#4caf50" />
</TouchableOpacity>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  innerContainer: {
    flex: 1,
    padding: 30,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 140,
    height: 140,
    marginBottom: 20,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2e7d32',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#757575',
    fontWeight: '500',
  },
  formContainer: {
    marginBottom: 30,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 20,
    marginBottom: 20,
    height: 60,
    shadowColor: '#4caf50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  toggle: {
    padding: 8,
    marginLeft: 5,
  },
  rememberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
    alignSelf: 'flex-start',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: '#4caf50',
    borderColor: '#4caf50',
  },
  rememberText: {
    fontSize: 15,
    color: '#424242',
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#4caf50',
    borderRadius: 16,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2e7d32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  buttonDisabled: {
    backgroundColor: '#a5d6a7',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footer: {
    alignItems: 'center',
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eeeeee',
  },
  footerText: {
    color: '#616161',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 5,
    fontWeight: '500',
  },
  footerNote: {
    color: '#9e9e9e',
    fontSize: 12,
    textAlign: 'center',

  },
  
  configButton: {
  position: 'absolute',
  bottom: 20,
  right: 20,
  backgroundColor: '#ffffff',
  borderRadius: 30,
  padding: 12,
  elevation: 5,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 3,


  },
});