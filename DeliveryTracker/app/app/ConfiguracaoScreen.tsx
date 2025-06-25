import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateIP, getBaseURL, DEFAULT_IP } from './config';

export default function ConfiguracaoScreen() {
  const [ip, setIp] = useState('');
  const [ipSalvo, setIpSalvo] = useState('');

  useEffect(() => {
    const loadSavedIP = async () => {
      try {
        const currentIP = getBaseURL();
        setIpSalvo(currentIP);
        setIp(currentIP);
      } catch (error) {
        console.error('Erro ao carregar IP:', error);
        setIpSalvo(DEFAULT_IP);
      }
    };

    loadSavedIP();
  }, []);

  const isValidURL = (url) => {
    return /^https:\/\/([a-zA-Z0-9-]+\.)?ngrok-free\.app(\/.*)?$/.test(url);
  };

  const salvarIP = async () => {
    if (!ip) {
      return Alert.alert('Erro', 'Digite um endereço ngrok válido');
    }

    let formattedIP = ip.trim();
    if (!formattedIP.startsWith('https://')) {
      formattedIP = 'https://' + formattedIP;
    }

    if (!isValidURL(formattedIP)) {
      return Alert.alert(
        'Formato inválido',
        'O endereço deve ser um link ngrok válido (ex: https://seu-link.ngrok-free.app)'
      );
    }

    const success = await updateIP(formattedIP);
    if (success) {
      Alert.alert('Sucesso', 'URL do servidor atualizada com sucesso!');
      setIpSalvo(formattedIP);
    } else {
      Alert.alert('Erro', 'Não foi possível salvar a URL');
    }
  };

  const limparIP = async () => {
    await updateIP(DEFAULT_IP);
    setIp(DEFAULT_IP);
    setIpSalvo(DEFAULT_IP);
    Alert.alert('Configuração restaurada', 'Usando o endereço padrão do app.');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <Text style={styles.title}>Configuração do Servidor</Text>
      
      <Text style={styles.label}>URL do Servidor Backend:</Text>
      <Text style={styles.subtext}>
        Exemplo: <Text style={styles.example}>https://xxxx.ngrok-free.app</Text>
      </Text>

      <TextInput
        style={styles.input}
        value={ip}
        onChangeText={setIp}
        placeholder={ipSalvo}
        placeholderTextColor="#aaa"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        returnKeyType="done"
      />

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={salvarIP}>
          <Text style={styles.buttonText}>Salvar URL</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.clearButton]} onPress={limparIP}>
          <Text style={styles.buttonText}>Restaurar Padrão</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>URL Atual:</Text>
        <Text style={styles.infoText}>{ipSalvo}</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 30,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    marginBottom: 6,
    color: '#2c3e50',
    fontWeight: '600',
  },
  subtext: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 15,
  },
  example: {
    fontWeight: 'bold',
    color: '#3498db',
  },
  input: {
    borderWidth: 1,
    borderColor: '#dcdde1',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 25,
    color: '#2c3e50',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  buttonContainer: {
    marginBottom: 30,
  },
  button: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  saveButton: {
    backgroundColor: '#27ae60',
  },
  clearButton: {
    backgroundColor: '#e74c3c',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  infoBox: {
    backgroundColor: '#ecf0f1',
    borderRadius: 10,
    padding: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
  },
  infoTitle: {
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  infoText: {
    color: '#7f8c8d',
    fontSize: 14,
  },
});