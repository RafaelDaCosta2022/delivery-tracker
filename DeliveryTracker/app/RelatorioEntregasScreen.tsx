import React, { useEffect, useState } from 'react';
import ProtectedRoute from './ProtectedRoute';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Button,
  Modal,
  TextInput,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { API } from './config';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export default function RelatorioEntregasScreen() {
  const hoje = new Date();
  const trintaDiasAtras = new Date();
  trintaDiasAtras.setDate(hoje.getDate() - 30);

  const [dataInicio, setDataInicio] = useState(trintaDiasAtras);
  const [dataFim, setDataFim] = useState(hoje);
  const [entregas, setEntregas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [entregaSelecionada, setEntregaSelecionada] = useState(null);
  const [motoristas, setMotoristas] = useState([]);
  const [novoMotorista, setNovoMotorista] = useState('');
  const [filtroNome, setFiltroNome] = useState('');
  const [mostrarBusca, setMostrarBusca] = useState(false);
  const [motoristaSelecionado, setMotoristaSelecionado] = useState('');
  const [mostrarInicio, setMostrarInicio] = useState(false);
  const [mostrarFim, setMostrarFim] = useState(false);
  const [filtroAtivo, setFiltroAtivo] = useState('MES');
  const [usuarioTipo, setUsuarioTipo] = useState('');
  const [imagemSelecionada, setImagemSelecionada] = useState('');
  const [modalImagem, setModalImagem] = useState(false);

  const formatarData = (data) => new Date(data).toLocaleDateString('pt-BR');
  const formatarPadrao = (d) => d.toISOString().split('T')[0];

  const calcularDatasFiltro = () => {
    const inicio = new Date(dataInicio);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(dataFim);
    fim.setHours(23, 59, 59, 999);
    return {
      inicio: formatarPadrao(inicio),
      fim: formatarPadrao(fim),
    };
  };

  const buscarEntregas = async () => {
    setCarregando(true);
    const { inicio, fim } = calcularDatasFiltro();

    let url = `${API.ENTREGAS}?inicio=${inicio}&fim=${fim}`;
    if (motoristaSelecionado) url += `&motorista=${motoristaSelecionado}`;
    if (filtroNome.length >= 3) url += `&nome=${encodeURIComponent(filtroNome)}`;

    try {
      const usuario = await AsyncStorage.getItem('usuario');
      const token = JSON.parse(usuario || '{}').token;
      const res = await fetch(url, { headers: { Authorization: token } });
      if (res.status === 401 || res.status === 403) {
        Alert.alert('Sessão expirada', 'Faça login novamente.');
        setEntregas([]);
        return;
      }
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('Resposta inesperada do servidor');
      setEntregas(data);
    } catch (err) {
      Alert.alert('Erro', 'Falha ao buscar entregas.');
      setEntregas([]);
    }
    setCarregando(false);
  };

  const excluirCanhoto = async (nota) => {
    Alert.alert('Confirmar', 'Deseja realmente excluir o canhoto desta entrega?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            const user = await AsyncStorage.getItem('usuario');
            const token = JSON.parse(user || '{}').token;
            const res = await fetch(`${API.BASE}/canhoto/${nota}`, {
              method: 'DELETE',
              headers: { Authorization: token },
            });
            if (res.ok) {
              Alert.alert('Sucesso', 'Canhoto excluído.');
              buscarEntregas();
            } else {
              Alert.alert('Erro', 'Não foi possível excluir o canhoto.');
            }
          } catch {
            Alert.alert('Erro', 'Erro ao excluir o canhoto.');
          }
        },
      },
    ]);
  };

  const carregarMotoristas = async () => {
    const usuario = await AsyncStorage.getItem('usuario');
    const { tipo } = JSON.parse(usuario || '{}');
    setUsuarioTipo(tipo);
    const token = JSON.parse(usuario || '{}').token;
    const res = await fetch(API.USUARIOS, { headers: { Authorization: token } });
    const dados = await res.json();
    if (Array.isArray(dados)) setMotoristas(dados.filter((u) => u.tipo === 'motorista'));
  };

  const abrirModal = (entrega) => {
    setEntregaSelecionada(entrega);
    setNovoMotorista(entrega.motorista?.toString() || '');
    setModalVisible(true);
  };

  const reatribuirEntrega = async () => {
    if (!novoMotorista) {
      Alert.alert('Erro', 'Selecione um motorista.');
      return;
    }
    const usuario = await AsyncStorage.getItem('usuario');
    const token = JSON.parse(usuario || '{}').token;
    await fetch(API.ATRIBUIR_MOTORISTA, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify({ entregaId: entregaSelecionada.id, motoristaId: parseInt(novoMotorista) }),
    });
    setModalVisible(false);
    buscarEntregas();
  };

  useEffect(() => {
    buscarEntregas();
    carregarMotoristas();
  }, [motoristaSelecionado, dataInicio, dataFim]);

  const pendentes = entregas.filter((e) => e.status === 'PENDENTE');
  const entregues = entregas.filter((e) => e.status === 'ENTREGUE');

  const aplicarFiltro = (tipo) => {
    const novaData = new Date();
    let inicio = new Date(novaData);
    if (tipo === 'SEMANA') inicio.setDate(inicio.getDate() - 7);
    else if (tipo === 'MES') inicio.setDate(inicio.getDate() - 30);
    setDataInicio(inicio);
    setDataFim(novaData);
    setFiltroAtivo(tipo);
  };

  const renderEntrega = (item) => (
    <TouchableOpacity key={item.id} style={styles.card} onPress={() => item.status === 'PENDENTE' && abrirModal(item)}>
      <Text style={styles.label}>Nota: {item.nota}</Text>
      <Text>Cliente: {item.cliente_nome}</Text>
      <Text>Motorista: {item.motorista_nome || '🚫 Sem motorista'}</Text>
      <Text>Status: <Text style={item.status === 'PENDENTE' ? styles.pendente : styles.entregue}>{item.status}</Text></Text>
      <Text>Data: {formatarData(item.status === 'ENTREGUE' ? item.data_entrega : item.data_lancamento)}</Text>
      {item.canhoto_path ? (
        <View style={{ marginTop: 8 }}>
          <TouchableOpacity onPress={() => {
            const url = `${API.BASE}/canhoto/${item.canhoto_path.split('/').pop()}`;
            setImagemSelecionada(url);
            setModalImagem(true);
          }}>
            <Image
              source={{ uri: `${API.BASE}/canhoto/${item.canhoto_path.split('/').pop()}` }}
              style={{ width: 100, height: 100, borderRadius: 8 }}
            />
          </TouchableOpacity>
          {usuarioTipo === 'admin' && (
            <TouchableOpacity style={{ marginTop: 4 }} onPress={() => excluirCanhoto(item.nota)}>
              <Text style={{ color: 'red', fontWeight: 'bold' }}>🗑 Excluir Canhoto</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <Text style={{ color: '#e67e22', marginTop: 6 }}>⚠️ Sem canhoto</Text>
      )}
    </TouchableOpacity>
  );

  return (
     <ProtectedRoute permitido={['admin']}>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>📦 Relatório de Entregas</Text>
        <View style={styles.filtros}>
          <Button title="Hoje" onPress={() => aplicarFiltro('HOJE')} color={filtroAtivo === 'HOJE' ? '#007AFF' : '#aaa'} />
          <Button title="Semana" onPress={() => aplicarFiltro('SEMANA')} color={filtroAtivo === 'SEMANA' ? '#007AFF' : '#aaa'} />
          <Button title="Mês" onPress={() => aplicarFiltro('MES')} color={filtroAtivo === 'MES' ? '#007AFF' : '#aaa'} />
        </View>
        {carregando ? (
          <ActivityIndicator size="large" color="#333" />
        ) : (
          <>
            {pendentes.length > 0 && (
              <View>
                <Text style={styles.subtitulo}>⚠️ Entregas Pendentes</Text>
                {pendentes.map(renderEntrega)}
              </View>
            )}
            {entregues.length > 0 && (
              <View>
                <Text style={styles.subtitulo}>✅ Entregas Concluídas</Text>
                {entregues.map(renderEntrega)}
              </View>
            )}
          </>
        )}
        <Modal visible={modalImagem} transparent animationType="fade">
          <View style={styles.modalContainer}>
            <TouchableOpacity onPress={() => setModalImagem(false)} style={styles.modalFechar}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Fechar</Text>
            </TouchableOpacity>
            {imagemSelecionada && (
              <Image source={{ uri: imagemSelecionada }} style={styles.imgAmpliada} />
            )}
          </View>
        </Modal>
        <Modal visible={modalVisible} transparent animationType="slide">
          <View style={styles.modalContainer}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Reatribuir Entrega</Text>
              <Text>Nota: {entregaSelecionada?.nota}</Text>
              <Picker selectedValue={novoMotorista} onValueChange={setNovoMotorista}>
                <Picker.Item label="Escolha um motorista" value="" />
                {motoristas.map((m) => (
                  <Picker.Item key={m.id} label={m.nome} value={String(m.id)} />
                ))}
              </Picker>
              <Button title="Salvar" onPress={reatribuirEntrega} />
              <Button title="Cancelar" color="red" onPress={() => setModalVisible(false)} />
            </View>
          </View>
        </Modal>
      </ScrollView>
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f4' },
  title: { fontSize: 24, fontWeight: 'bold', marginVertical: 20, textAlign: 'center' },
  filtros: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  subtitulo: { fontSize: 18, fontWeight: 'bold', marginVertical: 10, paddingLeft: 16, color: '#555' },
  card: { backgroundColor: '#fff', marginHorizontal: 16, padding: 12, marginBottom: 10, borderRadius: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  label: { fontWeight: 'bold', marginTop: 6 },
  pendente: { color: '#e67e22', fontWeight: 'bold' },
  entregue: { color: '#27ae60', fontWeight: 'bold' },
  exportarBtn: { backgroundColor: '#007bff', padding: 14, margin: 20, borderRadius: 8, alignItems: 'center' },
  exportarTexto: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  modalContainer: { flex: 1, backgroundColor: '#000000dd', justifyContent: 'center', alignItems: 'center' },
  modalFechar: { position: 'absolute', top: 50, right: 30, padding: 10 },
  imgAmpliada: { width: '90%', height: '70%', resizeMode: 'contain', borderRadius: 10 },
  modalBox: { backgroundColor: '#fff', padding: 20, borderRadius: 10, width: '85%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
});