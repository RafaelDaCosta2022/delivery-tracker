import React, { useState } from 'react';
import ProtectedRoute from './ProtectedRoute';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { API } from './config';

export default function CadastroUsuarioScreen() {
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [tipo, setTipo] = useState('motorista');
  const [carregando, setCarregando] = useState(false);

  const cadastrar = async () => {
    if (!nome || !senha) {
      Alert.alert('Erro', 'Preencha todos os campos.');
      return;
    }

    if (senha.length < 4) {
      Alert.alert('Erro', 'A senha deve ter pelo menos 4 caracteres.');
      return;
    }

    setCarregando(true);

    try {
      const response = await fetch(API.CADASTRO, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, senha, tipo }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === 'Nome de usuário já existe') {
          Alert.alert('Erro', 'Esse nome já está cadastrado.');
        } else {
          Alert.alert('Erro', data.error || 'Erro ao cadastrar');
        }
        return;
      }

      Alert.alert('Sucesso', 'Usuário cadastrado com sucesso!');
      setNome('');
      setSenha('');
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível conectar ao servidor.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <ProtectedRoute>
      <View style={styles.container}>
        <Text style={styles.title}>Cadastro de Usuário</Text>

        <TextInput
          style={styles.input}
          placeholder="Nome"
          placeholderTextColor="#a0cfa0"
          value={nome}
          onChangeText={setNome}
        />

        <TextInput
          style={styles.input}
          placeholder="Senha"
          placeholderTextColor="#a0cfa0"
          secureTextEntry
          value={senha}
          onChangeText={setSenha}
        />

        <View style={styles.tipoContainer}>
          <TouchableOpacity
            style={[styles.tipoBtn, tipo === 'motorista' && styles.tipoSelecionado]}
            onPress={() => setTipo('motorista')}
          >
            <Text style={styles.tipoText}>Motorista</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tipoBtn, tipo === 'vendedor' && styles.tipoSelecionado]}
            onPress={() => setTipo('vendedor')}
          >
            <Text style={styles.tipoText}>Vendedor</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, carregando && { opacity: 0.6 }]}
          onPress={cadastrar}
          disabled={carregando}
        >
          <Text style={styles.buttonText}>
            {carregando ? 'Cadastrando...' : 'Cadastrar'}
          </Text>
        </TouchableOpacity>
      </View>
    </ProtectedRoute>
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
    fontSize: 24,
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
  tipoContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  tipoBtn: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 5,
    backgroundColor: '#d0e8d0',
    borderRadius: 10,
    alignItems: 'center',
  },
  tipoSelecionado: {
    backgroundColor: '#84b98e',
  },
  tipoText: {
    color: '#215732',
    fontWeight: 'bold',
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
});
