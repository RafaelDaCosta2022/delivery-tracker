// 📦 CentralControleScreen.tsx — ADMIN COMPLETA E MELHORADA

import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ProtectedRoute from './ProtectedRoute';
import { API } from './config';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Linking } from 'react-native';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Modal,
  Button,
  Image,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';


export default function CentralControleScreen() {
  const hoje = new Date();
  const [inicio, setInicio] = useState(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  const [fim, setFim] = useState(hoje);
  const [mostrarInicio, setMostrarInicio] = useState(false);
  const [mostrarFim, setMostrarFim] = useState(false);
  const [entregas, setEntregas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [motoristas, setMotoristas] = useState([]);
  const [motoristaSelecionado, setMotoristaSelecionado] = useState('');
  const [modal, setModal] = useState(false);
  const [entregaSelecionada, setEntregaSelecionada] = useState(null);
  const [usuarioTipo, setUsuarioTipo] = useState('');
  const [modalImagemVisivel, setModalImagemVisivel] = useState(false);
  const [imagemSelecionada, setImagemSelecionada] = useState('');

  


  const formatar = (data) => data.toISOString().split('T')[0];

  const buscarEntregas = async () => {
    setCarregando(true);
    const query = `?dataInicio=${formatar(inicio)}&dataFim=${formatar(fim)}${motoristaSelecionado ? `&motorista=${motoristaSelecionado}` : ''}${busca.length >= 3 ? `&busca=${encodeURIComponent(busca)}` : ''}`;
    const usuario = await AsyncStorage.getItem('usuario');
    const token = JSON.parse(usuario || '{}').token;
    const res = await fetch(`${API.ENTREGAS}${query}`, { headers: { Authorization: token } });
    const data = await res.json();
    setEntregas(Array.isArray(data) ? data : []);
    setCarregando(false);
  };

  const gerarPDF = async () => {
  const html = `
    <html><body>
    <h1>Relatório de Entregas</h1>
    <table border="1" style="width:100%;border-collapse:collapse">
      <tr><th>Nota</th><th>Cliente</th><th>Data</th><th>Valor</th><th>Status</th><th>Motorista</th></tr>
      ${entregas.map(e => `
        <tr>
          <td>${e.nota}</td>
          <td>${e.cliente_nome}</td>
          <td>${new Date(e.data_emissao).toLocaleDateString('pt-BR')}</td>
          <td>R$ ${parseFloat(e.valor_total).toFixed(2)}</td>
          <td>${e.status}</td>
          <td>${e.nome_motorista || '---'}</td>
        </tr>
      `).join('')}
    </table>
    </body></html>
  `;

  const file = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(file.uri);
};

  const carregarMotoristas = async () => {
    const usuario = await AsyncStorage.getItem('usuario');
    const parsed = JSON.parse(usuario || '{}');
    setUsuarioTipo(parsed.tipo);
    const token = parsed.token;
    const res = await fetch(API.USUARIOS, { headers: { Authorization: token } });
    const lista = await res.json();
    setMotoristas(lista.filter((m) => m.tipo === 'motorista'));
  };

 const reatribuir = async () => {
  if (!motoristaSelecionado || !entregaSelecionada) return;
  const usuario = await AsyncStorage.getItem('usuario');
  const token = JSON.parse(usuario || '{}').token;

  await fetch(API.ATRIBUIR_MOTORISTA, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    body: JSON.stringify({
      entregaId: entregaSelecionada.id,
      motoristaId: parseInt(motoristaSelecionado),
    }),
  });

  setModal(false);
  setEntregaSelecionada(null);
  setMotoristaSelecionado(''); // limpa filtro para continuar vendo todas
  buscarEntregas();
};



  const marcarComoEntregue = async (id) => {
  const usuario = await AsyncStorage.getItem('usuario');
  const token = JSON.parse(usuario || '{}').token;

  await fetch(`${API.ENTREGAS}/concluir/${id}`, {
    method: 'PUT',
    headers: { Authorization: token },
  });

  buscarEntregas(); // recarrega entregas
}; 
const reenviarCanhoto = async (entregaId: number) => {
  try {
    const permissao = await ImagePicker.requestCameraPermissionsAsync();
    if (permissao.status !== 'granted') {
      alert('Permissão da câmera negada');
      return;
    }

    const imagem = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (imagem.canceled) {
      alert('Envio cancelado');
      return;
    }

    const usuario = await AsyncStorage.getItem('usuario');
    const token = JSON.parse(usuario || '{}').token;

    const formData = new FormData();
    formData.append('file', {
      uri: imagem.assets[0].uri,
      name: `canhoto_${entregaId}.jpg`,
      type: 'image/jpeg',
    } as any);

    const res = await fetch(`${API.CANHOTO}/${entregaId}`, {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: token, // 👈 NÃO defina 'Content-Type' aqui
      },
    });

    const resposta = await res.json();
    console.log('📥 Resposta do servidor:', resposta);

    if (resposta.success) {
      alert('✅ Canhoto enviado com sucesso');
      buscarEntregas(); // Atualiza a lista
    } else {
      alert(`⚠️ Erro: ${resposta.error || 'Erro desconhecido'}`);
    }
  } catch (err) {
    console.error('❌ Erro ao reenviar canhoto:', err);
    alert('Erro ao enviar canhoto');
  }
};




 const renderEntrega = (e) => (
  <View key={e.id} style={styles.card}>
    <Text style={styles.label}>Nota: {e.nota}</Text>
    <Text>Cliente: {e.cliente_nome}</Text>
    <Text>Data emissão: {new Date(e.data_emissao).toLocaleDateString('pt-BR')}</Text>
    <Text>Valor: R$ {parseFloat(e.valor_total).toFixed(2)}</Text>
    <Text>Status: {e.status}</Text>
    <Text>Motorista: {e.nome_motorista || '🚫 Nenhum'}</Text>

    {e.canhoto_path ? (
      <TouchableOpacity
        onPress={() => {
         const filename = e.canhoto_path.split(/[\\/]/).pop();
         const url = `http://192.168.0.108:3000/uploads/${filename}`;
          setImagemSelecionada(url);
          setModalImagemVisivel(true);
        }}
      >
        <Text style={{ color: 'green' }}>🧾 Ver Canhoto</Text>
      </TouchableOpacity>
    ) : (
      <Text style={{ color: 'orange' }}>⚠️ Sem canhoto</Text>
    )}

    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
      <TouchableOpacity onPress={() => { setEntregaSelecionada(e); setModal(true); }}>
        <Text style={styles.link}>🚚 Atribuir motorista</Text>
      </TouchableOpacity>

      {usuarioTipo === 'admin' && (
        <TouchableOpacity onPress={() => reenviarCanhoto(e.id)}>
          <Text style={styles.link}>📷 Novo Canhoto</Text>
        </TouchableOpacity>
      )}

      {e.status === 'PENDENTE' && (
        <TouchableOpacity onPress={() => marcarComoEntregue(e.id)}>
          <Text style={{ color: 'green' }}>✔️ Marcar como Entregue</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
);



  useEffect(() => {
    buscarEntregas();
    carregarMotoristas();
  }, [inicio, fim, motoristaSelecionado, busca]);

  return (
     <ProtectedRoute permitido={['admin']}>
      <View style={styles.filtrosContainer}>
        <TouchableOpacity onPress={() => setMostrarInicio(true)}><Text style={styles.filtroBotao}>📅 Início: {formatar(inicio)}</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setMostrarFim(true)}><Text style={styles.filtroBotao}>📅 Fim: {formatar(fim)}</Text></TouchableOpacity>
        <TextInput
          style={styles.inputBusca}
          placeholder="🔍 Buscar cliente (mín 3 letras)"
          value={busca}
          onChangeText={setBusca}
        />
      </View>
      <TouchableOpacity style={{ backgroundColor: '#007BFF', padding: 10, borderRadius: 8 }} onPress={gerarPDF}>
  <Text style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>📄 Exportar PDF</Text>
</TouchableOpacity>


      {mostrarInicio && (
        <DateTimePicker value={inicio} mode="date" display="default" onChange={(_, d) => { setMostrarInicio(false); if (d) setInicio(d); }} />
      )}
      {mostrarFim && (
        <DateTimePicker value={fim} mode="date" display="default" onChange={(_, d) => { setMostrarFim(false); if (d) setFim(d); }} />
      )}

      <ScrollView contentContainerStyle={styles.lista}>
  {carregando ? (
    <ActivityIndicator size="large" />
  ) : (
    <>
      {entregas.filter(e => new Date(e.data_emissao).toDateString() === new Date().toDateString()).length > 0 && (
        <>
          <Text style={styles.subtitulo}>📆 Entregas de Hoje</Text>
          {entregas
            .filter(e => new Date(e.data_emissao).toDateString() === new Date().toDateString())
            .map((e) => renderEntrega(e))}
        </>
      )}

      {entregas.filter(e => new Date(e.data_emissao).toDateString() !== new Date().toDateString()).length > 0 && (
        <>
          <Text style={styles.subtitulo}>📂 Outras Entregas</Text>
          {entregas
            .filter(e => new Date(e.data_emissao).toDateString() !== new Date().toDateString())
            .map((e) => renderEntrega(e))}
        </>
      )}
    </>
  )}
</ScrollView>


      <Modal visible={modal} transparent animationType="slide">
        <View style={styles.modalBox}>
          <Text style={styles.label}>Nota: {entregaSelecionada?.nota}</Text>
          <Picker selectedValue={motoristaSelecionado} onValueChange={setMotoristaSelecionado}>
            <Picker.Item label="Selecione um motorista" value="" />
            {motoristas.map((m) => (
              <Picker.Item key={m.id} label={m.nome} value={String(m.id)} />
            ))}
          </Picker>
          <Button title="Salvar" onPress={reatribuir} />
          <Button title="Cancelar" color="red" onPress={() => setModal(false)} />
        </View>
      </Modal>
      <Modal visible={modalImagemVisivel} transparent animationType="fade">
  <View style={{
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center'
  }}>
    <TouchableOpacity
      style={{ position: 'absolute', top: 40, right: 20, zIndex: 10 }}
      onPress={() => setModalImagemVisivel(false)}
    >
      <Text style={{ color: 'white', fontSize: 22 }}>✖ Fechar</Text>
    </TouchableOpacity>

    <Image
  source={{ uri: imagemSelecionada }}
  style={{ width: '90%', height: '80%', resizeMode: 'contain', backgroundColor: 'white' }}
  onError={() => {
    alert('❌ Erro ao carregar imagem. Verifique se o canhoto enviado é uma imagem válida (JPG/PNG).');
  }}
/>
</View>

</Modal>

    </ProtectedRoute>
    
  );
}

const styles = StyleSheet.create({
  filtrosContainer: { padding: 10, backgroundColor: '#eee' },
  filtroBotao: { fontSize: 16, marginBottom: 6, color: '#333' },
  inputBusca: { backgroundColor: '#fff', padding: 10, borderRadius: 6, marginBottom: 10 },
  lista: { padding: 10 },
  card: { backgroundColor: '#fff', padding: 12, marginBottom: 10, borderRadius: 10, elevation: 2 },
  label: { fontWeight: 'bold' },
  link: { color: '#007BFF', marginTop: 4 },
  modalBox: { backgroundColor: '#fff', padding: 20, margin: 20, borderRadius: 8, elevation: 5 },
  subtitulo: {
  fontSize: 18,
  fontWeight: 'bold',
  marginVertical: 10,
  color: '#444',
  paddingLeft: 10,
},

});
