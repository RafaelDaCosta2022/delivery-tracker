import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { API } from './config';

export default function LoginScreen() {
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    const carregarLoginSalvo = async () => {
      const salvo = await AsyncStorage.getItem('usuario');
      if (salvo) {
        const user = JSON.parse(salvo);
        setNome(user.nome || '');
        setSenha(user.senha || '');
      }
    };
    carregarLoginSalvo();
  }, []);

  useEffect(() => {
    const testarBackend = async () => {
      const salvo = await AsyncStorage.getItem('usuario');
      const token = salvo ? JSON.parse(salvo).token : null;

      fetch(API.USUARIOS, {
        headers: {
          Authorization: token,
        },
      })
        .then(res => res.json())
        .then(json => console.log('✔️ Conexão com backend protegida:', json))
        .catch(err => console.log('❌ ERRO CONEXÃO API:', err));
    };

    testarBackend();
  }, []);

  const logar = async () => {
  if (!nome || !senha) {
    Alert.alert('Erro', 'Preencha todos os campos.');
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
      Alert.alert('Erro', data.error || 'Falha no login');
    } else {
      await AsyncStorage.setItem('usuario', JSON.stringify({ ...data, senha }));

      if (['motorista', 'vendedor', 'admin'].includes(data.tipo)) {
        navigation.replace('App');
      } else {
        Alert.alert('Erro', 'Tipo de usuário desconhecido.');
      }
    }
  } catch (err) {
    Alert.alert('Erro', 'Não foi possível conectar ao servidor.');
  } finally {
    setCarregando(false);
  }
};


  return (
    <View style={styles.container}>
      <Text style={styles.title}>lOGIN</Text>

      <TextInput
        style={styles.input}
        placeholder="Nome"
        placeholderTextColor="#a0cfa0"
        value={nome}
        onChangeText={setNome}
      />

      <View style={styles.senhaContainer}>
        <TextInput
          style={[styles.input, { flex: 1, marginBottom: 0 }]}
          placeholder="Senha"
          placeholderTextColor="#a0cfa0"
          secureTextEntry={!mostrarSenha}
          value={senha}
          onChangeText={setSenha}
        />
        <TouchableOpacity onPress={() => setMostrarSenha(!mostrarSenha)} style={styles.toggle}>
          <Text style={{ fontSize: 18 }}>{mostrarSenha ? '🙈' : '👁️'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.button} onPress={logar} disabled={carregando}>
        {carregando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Entrar</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.rodape}>Acesso restrito. Solicite ao administrador.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e4f9e7',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#215732',
    marginBottom: 30,
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#fff',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    color: '#333',
  },
  senhaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 15,
  },
  toggle: {
    padding: 10,
    marginLeft: 8,
  },
  button: {
    backgroundColor: '#84b98e',
    paddingVertical: 15,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  rodape: {
    marginTop: 20,
    color: '#666',
    fontSize: 13,
    textAlign: 'center',
  },
});
