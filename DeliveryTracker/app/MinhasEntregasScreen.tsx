// ✅ MinhasEntregasScreen.tsx com filtro, visualização e envio de canhoto por câmera

import React, { useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import ProtectedRoute from './ProtectedRoute';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { API, IP } from './config';

export default function MinhasEntregasScreen() {
  const [entregas, setEntregas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [reenviando, setReenviando] = useState(false);

  useEffect(() => {
    solicitarPermissaoCamera();
    tentarReenviarPendentes();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      carregarEntregas();
    }, [])
  );

  const solicitarPermissaoCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Permita acesso à câmera para tirar fotos.');
    }
  };

  const carregarEntregas = async () => {
    setCarregando(true);
    try {
      const usuario = await AsyncStorage.getItem('usuario');
      const { token } = JSON.parse(usuario || '{}');

      const response = await fetch(API.MINHAS_ENTREGAS(), {
        headers: { Authorization: token },
      });

      if (!response.ok) throw new Error();

      const data = await response.json();

      // Filtro: pendentes ou entregues no dia atual
      const hoje = new Date().toDateString();
      const filtradas = data.filter((e: any) =>
        e.status === 'PENDENTE' || new Date(e.data_entrega).toDateString() === hoje
      );
      setEntregas(filtradas);
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar suas entregas.');
    }
    setCarregando(false);
  };

  const enviarCanhoto = async (entregaId: number, status: string) => {
  if (status === 'ENTREGUE') {
    Alert.alert('Entrega já concluída', 'Não é possível enviar canhoto para entregas finalizadas.');
    return;
  }

  const res = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.7,
  });

  if (res.canceled) return;

  const { uri } = res.assets[0];
  const fileName = uri.split('/').pop() || 'canhoto.jpg';
  const fileType = fileName.split('.').pop();

  const formData = new FormData();
  formData.append('file', {
    uri,
    name: fileName,
    type: `image/${fileType}`,
  } as any);

  const rede = await NetInfo.fetch();
  if (!rede.isConnected) {
    await salvarOffline(entregaId, formData);
    Alert.alert('Offline', '📦 Canhoto salvo localmente e será reenviado assim que estiver online.');
    return;
  }

  try {
    const usuario = await AsyncStorage.getItem('usuario');
    const { token } = JSON.parse(usuario || '{}');

    const response = await fetch(`https://${IP}/canhoto/${entregaId}`, {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: token,
      },
    });

    const data = await response.json();
    console.log('📥 Resposta do servidor:', data);

    if (!response.ok || !data.success) throw new Error();

    Alert.alert('✅ Enviado', 'Canhoto enviado com sucesso!');
    carregarEntregas();
  } catch (err) {
    await salvarOffline(entregaId, formData);
    Alert.alert('Erro', '❌ Falha ao enviar. Salvamos localmente para reenviar depois.');
  }
};


  const salvarOffline = async (nota: string, formData: FormData) => {
    const pendentes = await AsyncStorage.getItem('canhotosPendentes');
    const lista = pendentes ? JSON.parse(pendentes) : [];
    lista.push({ nota, imagem: formData._parts[1][1] });
    await AsyncStorage.setItem('canhotosPendentes', JSON.stringify(lista));
  };

  const tentarReenviarPendentes = async () => {
    setReenviando(true);
    const pendentes = await AsyncStorage.getItem('canhotosPendentes');
    if (!pendentes) {
      setReenviando(false);
      return;
    }

    const lista = JSON.parse(pendentes);
    const enviados = [];

    for (const item of lista) {
      const formData = new FormData();
      formData.append('nota', item.nota);
      formData.append('imagem', item.imagem);

      try {
        const res = await fetch(API.UPLOAD_CANHOTO, {
          method: 'POST',
          body: formData,
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (res.ok) enviados.push(item);
      } catch {}
    }

    const restantes = lista.filter((i: any) => !enviados.includes(i));
    await AsyncStorage.setItem('canhotosPendentes', JSON.stringify(restantes));
    if (enviados.length > 0) carregarEntregas();
    setReenviando(false);
  };

  const renderItem = ({ item }: any) => (
    <View style={styles.card}>
      <Text style={styles.label}>📦 Nota:</Text>
      <Text>{item.nota}</Text>

      <Text style={styles.label}>👤 Cliente:</Text>
      <Text>{item.cliente_nome}</Text>

      <Text style={styles.label}>📌 Status:</Text>
      <Text style={[styles.status, item.status === 'PENDENTE' ? styles.pendente : styles.entregue]}>
        {item.status}
      </Text>

      {item.canhoto_path && (
        <TouchableOpacity
          style={styles.preview}
          onPress={() => {
            const nome = item.canhoto_path.split(/[\\/]/).pop();
            Alert.alert('🧾 Canhoto', '', [
              { text: 'Fechar' },
            ]);
          }}
        >
          <Image source={{ uri: `https://${IP}/${item.canhoto_path}` }} style={styles.canhotoImg} />
          <Text style={{ color: '#555', marginTop: 6 }}>Ver Canhoto</Text>
        </TouchableOpacity>
      )}

      {item.status === 'PENDENTE' && (
        <TouchableOpacity style={styles.btnCanhoto} onPress={() => enviarCanhoto(item.id, item.status)}>
          <Text style={styles.btnText}>📸 Tirar Foto do Canhoto</Text>
        </TouchableOpacity>
      )}

      {item.observacao ? (
        <>
          <Text style={styles.label}>📝 Observação:</Text>
          <Text>{item.observacao}</Text>
        </>
      ) : null}
    </View>
  );

  return (
    <ProtectedRoute>
      <View style={styles.container}>
        <Text style={styles.title}>📋 Minhas Entregas</Text>
        {reenviando && <Text style={styles.reenviando}>⏳ Reenviando canhotos pendentes...</Text>}
        {carregando ? (
          <ActivityIndicator size="large" color="#007bff" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={entregas}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 40 }}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          />
        )}
      </View>
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f9f9f9' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, textAlign: 'center', color: '#333' },
  card: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 4,
  },
  label: { fontWeight: 'bold', marginTop: 6, color: '#444' },
  status: { fontWeight: 'bold', marginTop: 4 },
  pendente: { color: '#e67e22' },
  entregue: { color: '#27ae60' },
  btnCanhoto: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 8,
    marginTop: 14,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  reenviando: { color: '#0066cc', marginBottom: 12, textAlign: 'center' },
  canhotoImg: { width: '100%', height: 200, borderRadius: 8, marginTop: 10 },
  preview: { marginTop: 12, alignItems: 'center' },
});
