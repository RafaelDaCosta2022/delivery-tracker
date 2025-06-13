import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Animated,
  Easing
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { API } from './config';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function LoginScreen() {
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [lembrarUsuario, setLembrarUsuario] = useState(true);
  const navigation = useNavigation();
  
  const [fadeAnim] = useState(new Animated.Value(0));
  const [logoScale] = useState(new Animated.Value(0.8));

  useEffect(() => {
    // Animação ao entrar na tela
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true
      })
    ]).start();

    const carregarLoginSalvo = async () => {
      try {
        const salvo = await AsyncStorage.getItem('credenciais');
        if (salvo) {
          const { nome: savedNome, senha: savedSenha, lembrar } = JSON.parse(salvo);
          if (lembrar) {
            setNome(savedNome);
            setSenha(savedSenha);
            setLembrarUsuario(true);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar credenciais:', error);
      }
    };
    
    carregarLoginSalvo();
  }, []);

  const logar = async () => {
    if (!nome.trim() || !senha.trim()) {
      Alert.alert('Campos obrigatórios', 'Preencha todos os campos para continuar');
      return;
    }

    setCarregando(true);

    try {
      const response = await fetch(API.LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, senha }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Animação de erro
        Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 0.9,
            duration: 100,
            useNativeDriver: true
          }),
          Animated.spring(fadeAnim, {
            toValue: 1,
            friction: 3,
            useNativeDriver: true
          })
        ]).start();
        
        Alert.alert('Erro de login', data.error || 'Credenciais inválidas');
      } else {
        // Salvar credenciais se o usuário escolheu lembrar
        if (lembrarUsuario) {
          await AsyncStorage.setItem('credenciais', JSON.stringify({
            nome,
            senha,
            lembrar: lembrarUsuario
          }));
        } else {
          await AsyncStorage.removeItem('credenciais');
        }

        // Salvar dados do usuário (sem senha) para uso no app
        await AsyncStorage.setItem('usuario', JSON.stringify({
          token: data.token,
          nome: data.nome,
          tipo: data.tipo
        }));

        if (['motorista', 'vendedor', 'admin'].includes(data.tipo)) {
          // Animação de sucesso antes de navegar
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true
          }).start(() => navigation.replace('App'));
        } else {
          Alert.alert('Acesso não permitido', 'Seu perfil não tem acesso ao sistema');
        }
      }
    } catch (err) {
      Alert.alert('Erro de conexão', 'Não foi possível conectar ao servidor');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <Animated.View style={[styles.innerContainer, { opacity: fadeAnim }]}>
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
});