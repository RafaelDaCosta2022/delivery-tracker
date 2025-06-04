import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API } from './config';

export default function HomeScreen() {
  const [resumo, setResumo] = useState(null);
  const [carregando, setCarregando] = useState(true);

  const hoje = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const carregarResumo = async () => {
      setCarregando(true);
      try {
        const user = await AsyncStorage.getItem('usuario');
        const token = JSON.parse(user || '{}').token;
        const res = await fetch(`${API.RELATORIO_VENDEDOR}?data=${hoje}`, {
          headers: { Authorization: token },
        });
        const json = await res.json();
        setResumo(json?.resumo || []);
      } catch (err) {
        console.error(err);
      }
      setCarregando(false);
    };

    carregarResumo();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>🏠 Painel Inicial</Text>

      {carregando ? (
        <ActivityIndicator size="large" color="#007bff" />
      ) : (
        <>
          <Text style={styles.subtitulo}>🚚 Motoristas com Entregas</Text>
          <FlatList
            data={resumo}
            keyExtractor={(item) => item.motorista_id?.toString() || Math.random().toString()}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.motorista}>
                  {item.motorista_nome || 'Sem motorista'}
                </Text>
                <Text>Total de notas: {item.total_notas}</Text>
                <Text>Valor total: R$ {item.valor_total?.toFixed(2) || 0}</Text>
                <Text>✅ Entregues: {item.entregues} | 🚚 Pendentes: {item.pendentes}</Text>
              </View>
            )}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  titulo: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  subtitulo: { fontSize: 18, fontWeight: '600', marginBottom: 10 },
  card: {
    backgroundColor: '#f0f8ff',
    padding: 14,
    marginBottom: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  motorista: { fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
});
