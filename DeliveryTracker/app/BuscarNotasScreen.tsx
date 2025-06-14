import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal,
  ActivityIndicator, TextInput, Image, Alert, Platform
} from 'react-native';
import { API } from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';

export default function BuscarNotasScreen() {
  const [busca, setBusca] = useState('');
  const [notas, setNotas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [notaSelecionada, setNotaSelecionada] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalCanhoto, setModalCanhoto] = useState(false);
  const [imagemCanhoto, setImagemCanhoto] = useState<string | null>(null);

  // Busca inteligente
  const buscarNotas = async () => {
    if (!busca || busca.length < 1) {
      Alert.alert('Digite pelo menos 1 caractere');
      return;
    }
    setCarregando(true);
    try {
      const usuario = await AsyncStorage.getItem('usuario');
      const { token } = JSON.parse(usuario || '{}');
      // 🔥 Sempre use ?busca= para o backend decidir!
      const url = `${API.ENTREGAS}?busca=${encodeURIComponent(busca)}`;
      const res = await fetch(url, { headers: { Authorization: token } });
      const json = await res.json();
      setNotas(json || []);
    } catch {
      Alert.alert('Erro ao buscar notas');
    }
    setCarregando(false);
  };

  // Modal detalhes
  const abrirNota = (nota: any) => {
    setNotaSelecionada(nota);
    setModalVisible(true);
  };

  // Ver canhoto
  const abrirCanhoto = (path: string) => {
    setImagemCanhoto(`${API.BASE}/uploads/${path.split('/').pop()}`);
    setModalCanhoto(true);
  };

  // Baixar ou compartilhar PDF da nota
  const baixarOuCompartilharPDF = async (pdfPath: string | null | undefined) => {
    if (!pdfPath) {
      Alert.alert('Nota sem PDF disponível!');
      return;
    }
    try {
      const url = pdfPath.startsWith('http') ? pdfPath : `${API.BASE}/uploads/${pdfPath.split('/').pop()}`;
      const fileUri = FileSystem.documentDirectory + pdfPath.split('/').pop();
      const downloadResum = await FileSystem.downloadAsync(url, fileUri);
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        await Sharing.shareAsync(downloadResum.uri);
      } else {
        Alert.alert('Download concluído', `Arquivo salvo em: ${downloadResum.uri}`);
      }
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível baixar/enviar o PDF');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Buscar Notas</Text>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Digite nome, número ou CNPJ"
          value={busca}
          onChangeText={setBusca}
          onSubmitEditing={buscarNotas}
        />
        <TouchableOpacity style={styles.searchButton} onPress={buscarNotas}>
          <MaterialIcons name="search" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {carregando ? (
        <ActivityIndicator size="large" color="#3498db" style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={notas}
          keyExtractor={item => item.id?.toString() || Math.random().toString()}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => abrirNota(item)}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Nota: {item.nota}</Text>
                <View style={[
                  styles.statusBadge,
                  item.status === 'ENTREGUE' ? styles.badgeSuccess : styles.badgeWarning
                ]}>
                  <Text style={styles.statusText}>{item.status}</Text>
                </View>
              </View>
              <Text style={styles.cardCliente}>{item.cliente_nome}</Text>
              <Text style={styles.cardSubInfo}>Valor: R$ {parseFloat(item.valor_total).toFixed(2)}</Text>
              <Text style={styles.cardSubInfo}>Emissão: {item.data_emissao ? String(item.data_emissao).slice(0, 10) : '--'}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <MaterialIcons name="inventory" size={60} color="#bdc3c7" />
              <Text style={{ color: '#999', marginTop: 10 }}>Nenhuma nota encontrada</Text>
            </View>
          }
        />
      )}

      {/* Modal detalhes */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <MaterialIcons name="close" size={28} color="#2c3e50" />
            </TouchableOpacity>
            {notaSelecionada && (
              <View>
                <Text style={styles.notaTitle}>Nota: {notaSelecionada.nota}</Text>
                <Text style={styles.notaLabel}>Cliente: {notaSelecionada.cliente_nome}</Text>
                <Text style={styles.notaLabel}>CNPJ: {notaSelecionada.cliente_cnpj || '--'}</Text>
                <Text style={styles.notaLabel}>Valor: R$ {parseFloat(notaSelecionada.valor_total).toFixed(2)}</Text>
                <Text style={styles.notaLabel}>Emissão: {notaSelecionada.data_emissao?.slice(0, 10)}</Text>
                <Text style={styles.notaLabel}>Remetente: {notaSelecionada.remetente_nome}</Text>
                <Text style={styles.notaLabel}>Status: {notaSelecionada.status}</Text>
                <Text style={styles.notaLabel}>Motorista: {notaSelecionada.motorista_nome || '--'}</Text>
                <Text style={styles.notaLabel}>Observação: {notaSelecionada.observacao || '--'}</Text>
                <View style={{ flexDirection: 'row', marginTop: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                  {notaSelecionada.canhoto_path ? (
                    <TouchableOpacity
                      style={styles.canhotoButton}
                      onPress={() => abrirCanhoto(notaSelecionada.canhoto_path)}
                    >
                      <MaterialIcons name="receipt" size={22} color="#3498db" />
                      <Text style={{ color: '#3498db', marginLeft: 8 }}>Ver Canhoto</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={{ color: '#e67e22' }}>Sem comprovante</Text>
                  )}
                  <TouchableOpacity
                    style={[
                      styles.canhotoButton,
                      { marginLeft: 16, backgroundColor: notaSelecionada.pdf_path ? '#e8f4fc' : '#fdebd0' }
                    ]}
                    onPress={() => baixarOuCompartilharPDF(notaSelecionada.pdf_path)}
                  >
                    <Ionicons name="cloud-download" size={22} color={notaSelecionada.pdf_path ? "#2c3e50" : "#e67e22"} />
                    <Text style={{ color: notaSelecionada.pdf_path ? "#2c3e50" : "#e67e22", marginLeft: 8 }}>
                      {notaSelecionada.pdf_path ? "Baixar Nota" : "Nota sem PDF"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal para ver imagem do canhoto */}
      <Modal visible={modalCanhoto} transparent animationType="fade">
        <TouchableOpacity style={styles.modalCanhotoBg} activeOpacity={1} onPress={() => setModalCanhoto(false)}>
          <View style={styles.modalCanhotoContent}>
            {imagemCanhoto && (
              <Image
                source={{ uri: imagemCanhoto }}
                style={{ width: '100%', height: 350, borderRadius: 10 }}
                resizeMode="contain"
              />
            )}
            <TouchableOpacity
              style={styles.closeCanhoto}
              onPress={() => setModalCanhoto(false)}
            >
              <MaterialIcons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9', paddingTop: 24 },
  header: { fontSize: 22, fontWeight: '700', textAlign: 'center', color: '#2c3e50', marginBottom: 12 },
  searchContainer: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 14 },
  searchInput: { flex: 1, height: 50, backgroundColor: 'white', borderRadius: 8, paddingHorizontal: 16, fontSize: 16, color: '#2c3e50', elevation: 2 },
  searchButton: { backgroundColor: '#3498db', padding: 12, borderRadius: 8, marginLeft: 8, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: 'white', borderRadius: 14, padding: 16, marginVertical: 7, marginHorizontal: 16, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#2c3e50' },
  statusBadge: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 10 },
  badgeSuccess: { backgroundColor: '#d5f5e3' },
  badgeWarning: { backgroundColor: '#fdebd0' },
  statusText: { fontSize: 13, fontWeight: '600' },
  cardCliente: { fontSize: 15, color: '#34495e', marginBottom: 4 },
  cardSubInfo: { fontSize: 13, color: '#7f8c8d', marginBottom: 2 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 18, padding: 24, width: '88%' },
  closeButton: { position: 'absolute', top: 14, right: 14, zIndex: 1 },
  notaTitle: { fontSize: 20, fontWeight: 'bold', color: '#2c3e50', marginBottom: 6 },
  notaLabel: { fontSize: 15, color: '#333', marginBottom: 3 },
  canhotoButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e8f4fc', padding: 9, borderRadius: 8, marginRight: 4 },
  modalCanhotoBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  modalCanhotoContent: { width: '88%', alignItems: 'center', position: 'relative' },
  closeCanhoto: { position: 'absolute', top: 18, right: 16, zIndex: 10, backgroundColor: 'rgba(44,62,80,0.6)', borderRadius: 30, padding: 4 }
});
