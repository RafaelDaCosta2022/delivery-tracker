// 📦 CentralControleScreen.tsx — ADMIN COMPLETA E MELHORADA
import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ProtectedRoute from './ProtectedRoute';
import { API } from './config';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
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
  Alert
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
  const [entregaSelecionada, setEntregaSelecionada] = useState(null);
  const [usuarioTipo, setUsuarioTipo] = useState('');
  const [modalImagemVisivel, setModalImagemVisivel] = useState(false);
  const [imagemSelecionada, setImagemSelecionada] = useState('');
  
  const [motoristaAtribuicaoId, setMotoristaAtribuicaoId] = useState('');
  const [modalAtribuirVisivel, setModalAtribuirVisivel] = useState(false);
  const [atribuindo, setAtribuindo] = useState(false);

  // ✅ Formatar data no formato DD/MM/AAAA
  const formatar = (data) => {
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    return `${dia}/${mes}/${ano}`;
  };

  const buscarEntregas = async () => {
    setCarregando(true);
    
    // ✅ Converter datas para formato americano para a API
    const formatarParaAPI = (data) => {
      const ano = data.getFullYear();
      const mes = String(data.getMonth() + 1).padStart(2, '0');
      const dia = String(data.getDate()).padStart(2, '0');
      return `${ano}-${mes}-${dia}`;
    };
    
    const query = `?dataInicio=${formatarParaAPI(inicio)}&dataFim=${formatarParaAPI(fim)}${motoristaSelecionado ? `&motorista=${motoristaSelecionado}` : ''}${busca.length >= 3 ? `&busca=${encodeURIComponent(busca)}` : ''}`;
    
    const usuario = await AsyncStorage.getItem('usuario');
    const token = JSON.parse(usuario || '{}').token;
    
    try {
      const res = await fetch(`${API.ENTREGAS}${query}`, { headers: { Authorization: token } });
      const data = await res.json();
      setEntregas(Array.isArray(data) ? data : []);
    } catch (error) {
      Alert.alert('Erro', 'Falha ao carregar entregas');
    } finally {
      setCarregando(false);
    }
  };

  const gerarPDF = async () => {
  const html = `
    <html><body>
    <h1>Relatório de Entregas</h1>
    <table border="1" style="width:100%;border-collapse:collapse">
      <tr><th>Cliente</th><th>Nota</th><th>Data</th><th>Valor</th><th>Status</th><th>Motorista</th></tr>
      ${entregas.map(e => `
        <tr>
          <td>${e.cliente_nome}</td>
          <td>${e.nota}</td>
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
    try {
      const res = await fetch(API.USUARIOS, { headers: { Authorization: token } });
      const lista = await res.json();
      setMotoristas(lista.filter((m) => m.tipo === 'motorista'));
    } catch (error) {
      console.error('Erro ao carregar motoristas:', error);
    }
  };

  const reatribuir = async () => {
    if (atribuindo || !motoristaAtribuicaoId || !entregaSelecionada) return;
    
    setAtribuindo(true);
    const usuario = await AsyncStorage.getItem('usuario');
    const token = JSON.parse(usuario || '{}').token;

    try {
      const response = await fetch(API.ATRIBUIR_MOTORISTA, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
        },
        body: JSON.stringify({
          entregaId: entregaSelecionada.id,
          motoristaId: parseInt(motoristaAtribuicaoId),
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setEntregas(entregas.map(entrega => 
          entrega.id === entregaSelecionada.id 
            ? { 
                ...entrega, 
                status: 'PENDENTE',
                motorista_id: parseInt(motoristaAtribuicaoId),
                nome_motorista: motoristas.find(m => m.id == motoristaAtribuicaoId)?.nome || entrega.nome_motorista
              } 
            : entrega
        ));
        
        Alert.alert('✅ Sucesso', `Entrega reatribuída com sucesso`);
      } else {
        Alert.alert('❌ Erro', data.error || 'Falha na reatribuição');
      }
    } catch (error) {
      Alert.alert('❌ Erro', 'Falha na comunicação com o servidor');
    } finally {
      setAtribuindo(false);
      setModalAtribuirVisivel(false);
      setEntregaSelecionada(null);
      setMotoristaAtribuicaoId('');
    }
  };

  const marcarComoEntregue = async (id) => {
    const usuario = await AsyncStorage.getItem('usuario');
    const token = JSON.parse(usuario || '{}').token;

    try {
      await fetch(`${API.ENTREGAS}/concluir/${id}`, {
        method: 'PUT',
        headers: { Authorization: token },
      });
      buscarEntregas();
    } catch (error) {
      Alert.alert('Erro', 'Falha ao atualizar entrega');
    }
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
          Authorization: token,
        },
      });

      const resposta = await res.json();
      console.log('📥 Resposta do servidor:', resposta);

      if (resposta.success) {
        alert('✅ Canhoto enviado com sucesso');
        buscarEntregas();
      } else {
        alert(`⚠️ Erro: ${resposta.error || 'Erro desconhecido'}`);
      }
    } catch (err) {
      console.error('❌ Erro ao reenviar canhoto:', err);
      alert('Erro ao enviar canhoto');
    }
  };

  const renderEntrega = (e) => (
    <View key={e.id} style={[
      styles.card,
      e.status === 'CONCLUIDA' ? styles.cardConcluida : null,
      e.status === 'PENDENTE' ? styles.cardPendente : null
    ]}>
      {/* ✅ Cliente como primeiro campo */}
      <Text style={styles.label}>Cliente: {e.cliente_nome}</Text>
      <Text>Nota: {e.nota}</Text>
      <Text>Data emissão: {new Date(e.data_emissao).toLocaleDateString('pt-BR')}</Text>
      <Text>Valor: R$ {parseFloat(e.valor_total).toFixed(2)}</Text>
      <Text>Status: {e.status}</Text>
      <Text>Motorista: {e.nome_motorista || '🚫 Nenhum'}</Text>

      {e.canhoto_path ? (
        <TouchableOpacity onPress={() => {
          const filename = e.canhoto_path.split('/').pop();
          const url = `${API.BASE}/uploads/${filename}`;
          console.log('Acessando canhoto:', url);
          setImagemSelecionada(url);
          setModalImagemVisivel(true);
        }}>
          <Text style={{ color: 'green' }}>🧾 Ver Canhoto</Text>
        </TouchableOpacity>
      ) : (
        <Text style={{ color: 'orange' }}>⚠️ Canhoto não disponível</Text>
      )}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        <TouchableOpacity onPress={() => { 
          setEntregaSelecionada(e); 
          setModalAtribuirVisivel(true); 
        }}>
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
        <View style={styles.filtroLinha}>
          <TouchableOpacity 
            onPress={() => setMostrarInicio(true)}
            style={styles.filtroBotaoContainer}
          >
            <Text style={styles.filtroBotao}>📅 Início: {formatar(inicio)}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => setMostrarFim(true)}
            style={styles.filtroBotaoContainer}
          >
            <Text style={styles.filtroBotao}>📅 Fim: {formatar(fim)}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filtroLinha}>
          <TextInput
            style={styles.inputBusca}
            placeholder="🔍 Buscar cliente (mín 3 letras)"
            value={busca}
            onChangeText={setBusca}
          />
          
          <Picker
            selectedValue={motoristaSelecionado}
            onValueChange={setMotoristaSelecionado}
            style={styles.picker}
          >
            <Picker.Item label="Todos motoristas" value="" />
            {motoristas.map((m) => (
              <Picker.Item 
                key={m.id} 
                label={m.nome} 
                value={m.id} 
              />
            ))}
          </Picker>
        </View>
      </View>

      <TouchableOpacity style={styles.botaoPDF} onPress={gerarPDF}>
        <Text style={styles.textoBotaoPDF}>📄 Exportar PDF</Text>
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

      {/* MODAL DE VISUALIZAÇÃO DE IMAGEM */}
      <Modal visible={modalImagemVisivel} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.botaoFecharModal}
            onPress={() => setModalImagemVisivel(false)}
          >
            <Text style={styles.textoFecharModal}>✖ Fechar</Text>
          </TouchableOpacity>

          <Image
            source={{ uri: imagemSelecionada }}
            style={styles.imagemModal}
            onError={() => {
              alert('❌ Erro ao carregar imagem. Verifique se o canhoto é uma imagem válida.');
            }}
          />
        </View>
      </Modal>

      {/* MODAL PARA ATRIBUIR MOTORISTA */}
      <Modal visible={modalAtribuirVisivel} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Atribuir Motorista</Text>
            <Text style={styles.modalInfo}>Cliente: {entregaSelecionada?.cliente_nome}</Text>
            <Text style={styles.modalInfo}>Nota: {entregaSelecionada?.nota}</Text>
            
            {atribuindo ? (
              <ActivityIndicator size="large" style={styles.carregandoModal} />
            ) : (
              <>
                <Picker
                  selectedValue={motoristaAtribuicaoId}
                  onValueChange={setMotoristaAtribuicaoId}
                  style={styles.pickerModal}
                >
                  <Picker.Item label="Selecione um motorista..." value="" />
                  {motoristas.map((m) => (
                    <Picker.Item 
                      key={m.id} 
                      label={m.nome} 
                      value={m.id} 
                    />
                  ))}
                </Picker>

                <View style={styles.modalButtons}>
                  <Button 
                    title="Cancelar" 
                    onPress={() => setModalAtribuirVisivel(false)} 
                    color="#999" 
                  />
                  <Button 
                    title="Atribuir" 
                    onPress={reatribuir} 
                    disabled={!motoristaAtribuicaoId || atribuindo}
                  />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  filtrosContainer: { 
    padding: 10, 
    backgroundColor: '#eee' 
  },
  filtroLinha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  filtroBotaoContainer: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 5,
  },
  filtroBotao: { 
    fontSize: 16, 
    color: '#333',
    textAlign: 'center',
  },
  inputBusca: { 
    backgroundColor: '#fff', 
    padding: 10, 
    borderRadius: 6, 
    flex: 1,
    marginRight: 10,
  },
  picker: {
    backgroundColor: '#fff',
    flex: 1,
    height: 50,
  },
  pickerModal: {
    backgroundColor: '#f0f0f0',
    marginVertical: 10,
  },
  lista: { padding: 10 },
  card: { 
    backgroundColor: '#fff', 
    padding: 12, 
    marginBottom: 10, 
    borderRadius: 10, 
    elevation: 2 
  },
  label: { 
    fontWeight: 'bold' 
  },
  link: { 
    color: '#007BFF', 
    marginTop: 4 
  },
  subtitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 10,
    color: '#444',
    paddingLeft: 10,
  },
  botaoPDF: {
    backgroundColor: '#007BFF',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 10,
    marginBottom: 10,
  },
  textoBotaoPDF: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalBox: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  botaoFecharModal: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 10,
    borderRadius: 20,
  },
  textoFecharModal: {
    color: 'white',
    fontSize: 16,
  },
  imagemModal: {
    width: '100%',
    height: '80%',
    resizeMode: 'contain',
    backgroundColor: 'white',
  },
  modalInfo: {
    fontSize: 16,
    marginBottom: 5,
    color: '#555',
  },
  carregandoModal: {
    marginVertical: 20,
  },
  cardConcluida: {
    backgroundColor: '#e8f5e9',
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  cardPendente: {
    backgroundColor: '#fffde7',
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
});