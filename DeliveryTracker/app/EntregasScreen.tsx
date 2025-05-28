// EntregasScreen.js (corrigido com token e AsyncStorage)
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  Button,
  Alert,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API } from './config';
import ProtectedRoute from './ProtectedRoute';

export default function EntregasScreen() {
  const [entregas, setEntregas] = useState([]);
  const [nome, setNome] = useState('');
  const [status, setStatus] = useState('');

  const buscarEntregas = useCallback(async () => {
    const token = await AsyncStorage.getItem('token');
    fetch(API.ENTREGAS, {
      headers: { Authorization: token },
    })
      .then(res => res.json())
      .then(data => setEntregas(data))
      .catch(() => {
        Alert.alert('Erro ao buscar entregas');
        setEntregas([]);
      });
  }, []);

  useEffect(() => {
    buscarEntregas();
  }, [buscarEntregas]);

  return (
    <ProtectedRoute>
      <View style={styles.container}>
        <Text style={styles.title}>Entregas</Text>
        <FlatList
          data={entregas}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <View style={{ flex: 1 }}>
                <Text style={styles.nome}>{item?.cliente_nome ?? 'Sem nome'}</Text>
                <Text style={styles.status}>{item?.status ?? 'Sem status'}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>Nenhuma entrega encontrada.</Text>}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      </View>
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#e3eafc' },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#1976d2' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  nome: { fontSize: 18, fontWeight: 'bold', color: '#222' },
  status: { fontSize: 15, color: '#666', marginTop: 4 },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 16, color: '#777' },
});
