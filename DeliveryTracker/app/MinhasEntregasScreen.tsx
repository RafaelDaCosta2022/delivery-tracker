// ✅ MinhasEntregasScreen.tsx - Versão Corrigida com Offline Robustecido
import React, { useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import ProtectedRoute from './ProtectedRoute';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system'; // Importe o FileSystem
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { API } from './config';

export default function MinhasEntregasScreen() {
  const [entregas, setEntregas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [reenviando, setReenviando] = useState(false);
  const [modalImagemVisivel, setModalImagemVisivel] = useState(false);
  const [imagemSelecionada, setImagemSelecionada] = useState('');
  const [modalConfirmacao, setModalConfirmacao] = useState(false);
  const [entregaSelecionada, setEntregaSelecionada] = useState(null);

  useEffect(() => {
    solicitarPermissaoCamera();
    tentarReenviarPendentes();
  }, []);

  const solicitarPermissaoCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Permita acesso à câmera para tirar fotos.');
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      carregarEntregas();
    }, [])
  );

  const carregarEntregas = async () => {
  setCarregando(true);
  try {
    const usuario = await AsyncStorage.getItem('usuario');
    const { token, id } = JSON.parse(usuario || '{}');
    
    const response = await fetch(API.MINHAS_ENTREGAS, {
      headers: { Authorization: token },
    });

    if (!response.ok) throw new Error();

    const data = await response.json();
    
    // Filtra apenas entregas pendentes para exibição
    const entregasPendentes = data.filter((e: any) => e.status === 'PENDENTE');
    setEntregas(entregasPendentes);
    
  } catch {
    Alert.alert('Erro', 'Não foi possível carregar suas entregas.');
  }
  setCarregando(false);
};

  const enviarCanhoto = async (entregaId: number) => {
    try {
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (res.canceled) return;

      const { uri } = res.assets[0];
      const usuario = await AsyncStorage.getItem('usuario');
      const token = JSON.parse(usuario || '{}').token;

      const rede = await NetInfo.fetch();
      
      // Se offline, salvar localmente
      if (!rede.isConnected) {
        await salvarOffline(entregaId, uri);
        Alert.alert('Offline', 'Canhoto salvo localmente e será reenviado quando houver conexão.');
        return;
      }

      // Se online, enviar diretamente
      await enviarCanhotoOnline(entregaId, uri, token);
      
    } catch (err) {
      console.error('Erro ao enviar canhoto:', err);
      Alert.alert('Erro', 'Falha ao enviar canhoto. Tente novamente.');
    }
  };

  // Função para enviar o canhoto quando online
  const enviarCanhotoOnline = async (entregaId: number, uri: string, token: string) => {
    const formData = new FormData();
    formData.append('file', {
      uri,
      name: `canhoto_${entregaId}.jpg`,
      type: 'image/jpeg',
    } as any);

    const response = await fetch(`${API.CANHOTO}/${entregaId}`, {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: token,
      },
    });

    const resposta = await response.json();
    console.log('Resposta do servidor:', resposta);

    if (resposta.success) {
      Alert.alert('Sucesso', 'Canhoto enviado com sucesso!');
      carregarEntregas();
    } else {
      throw new Error(resposta.error || 'Erro desconhecido');
    }
  };

  // CORREÇÃO: Salvar offline usando FileSystem
  const salvarOffline = async (entregaId: number, uri: string) => {
    try {
      // Ler o arquivo como base64
      const base64Data = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      const pendentes = await AsyncStorage.getItem('canhotosPendentes');
      const lista = pendentes ? JSON.parse(pendentes) : [];
      
      lista.push({ 
        entregaId, 
        imagemBase64: base64Data,
        tipo: 'image/jpeg',
        nome: `canhoto_${entregaId}_${Date.now()}.jpg`
      });
      
      await AsyncStorage.setItem('canhotosPendentes', JSON.stringify(lista));
    } catch (error) {
      console.error('Erro ao salvar offline:', error);
      Alert.alert('Erro', 'Falha ao salvar o canhoto offline.');
    }
  };

  // CORREÇÃO: Reenviar pendentes usando base64
  const tentarReenviarPendentes = async () => {
  setReenviando(true);
  
  try {
    const usuario = await AsyncStorage.getItem('usuario');
    const token = JSON.parse(usuario || '{}').token;
    const pendentes = await AsyncStorage.getItem('canhotosPendentes');
    
    if (!pendentes) {
      setReenviando(false);
      return;
    }

    const lista = JSON.parse(pendentes);
    const enviados = [];
    const falhas = [];

    for (const item of lista) {
      // Verificação crítica para dados corrompidos
      if (!item.imagemBase64) {
        console.warn(`Canhoto pendente para entrega ${item.entregaId} sem dados de imagem. Item ignorado.`);
        continue;
      }

      try {
        const fileUri = `${FileSystem.cacheDirectory}${item.nome}`;
        
        // Escreve o arquivo temporário
        await FileSystem.writeAsStringAsync(fileUri, item.imagemBase64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const formData = new FormData();
        formData.append('file', {
          uri: fileUri,
          name: item.nome,
          type: item.tipo,
        } as any);

        const res = await fetch(`${API.CANHOTO}/${item.entregaId}`, {
          method: 'POST',
          body: formData,
          headers: {
            Authorization: token,
          },
        });

        const resposta = await res.json();
        
        if (resposta.success) {
          enviados.push(item);
          await FileSystem.deleteAsync(fileUri); // Limpeza do arquivo temporário
        } else {
          falhas.push(item);
        }
      } catch (err) {
        console.error('Erro ao reenviar pendente:', err);
        falhas.push(item);
      }
    }

    // Atualiza lista de pendentes com filtro de segurança
    const itensValidos = falhas.filter(item => !!item.imagemBase64);
    await AsyncStorage.setItem('canhotosPendentes', JSON.stringify(itensValidos));
    
    if (enviados.length > 0) {
      Alert.alert('Sucesso', `${enviados.length} canhotos pendentes foram enviados!`);
      carregarEntregas();
    }
  } catch (err) {
    console.error('Erro geral no processo de reenvio:', err);
    Alert.alert('Erro', 'Ocorreu um problema ao tentar reenviar pendentes');
  } finally {
    setReenviando(false);
  }
};

  // Restante do código permanece igual...
  // ... (funções de renderização, modais, etc)

  const confirmarEnvio = (entrega) => {
    setEntregaSelecionada(entrega);
    setModalConfirmacao(true);
  };

  const visualizarCanhoto = (caminho) => {
    const filename = caminho.split('/').pop();
    const url = `${API.BASE}/uploads/${filename}`;
    setImagemSelecionada(url);
    setModalImagemVisivel(true);
  };

  const renderItem = ({ item }: any) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.nota}>📦 Nota: {item.nota}</Text>
        <Text style={[styles.status, item.status === 'PENDENTE' ? styles.pendente : styles.entregue]}>
          {item.status}
        </Text>
      </View>

      <Text style={styles.label}>👤 Cliente: {item.cliente_nome}</Text>
      <Text style={styles.label}>📅 Data: {new Date(item.data_emissao).toLocaleDateString('pt-BR')}</Text>
      <Text style={styles.label}>💰 Valor: R$ {parseFloat(item.valor_total).toFixed(2)}</Text>

      {item.canhoto_path ? (
        <TouchableOpacity
          style={styles.btnVerCanhoto}
          onPress={() => visualizarCanhoto(item.canhoto_path)}
        >
          <Text style={styles.btnTextVer}>👁️ Ver Canhoto</Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.semCanhoto}>⚠️ Canhoto não disponível</Text>
      )}

      {item.status === 'PENDENTE' && (
        <TouchableOpacity 
          style={styles.btnCanhoto} 
          onPress={() => confirmarEnvio(item)}
        >
          <Text style={styles.btnText}>📸 Enviar Canhoto</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <ProtectedRoute>
      <View style={styles.container}>
        <Text style={styles.title}>📋 Minhas Entregas</Text>
        
        {reenviando && (
          <View style={styles.reenvioContainer}>
            <ActivityIndicator size="small" color="#0066cc" />
            <Text style={styles.reenviando}>Enviando canhotos pendentes...</Text>
          </View>
        )}
        
        {carregando ? (
          <View style={styles.carregandoContainer}>
            <ActivityIndicator size="large" color="#007bff" />
            <Text style={styles.carregandoTexto}>Carregando entregas...</Text>
          </View>
        ) : entregas.length === 0 ? (
          <View style={styles.semEntregasContainer}>
            <Text style={styles.semEntregasTexto}>Nenhuma entrega encontrada</Text>
            <Text style={styles.semEntregasSubtexto}>Você não tem entregas atribuídas no momento</Text>
          </View>
        ) : (
          <FlatList
            data={entregas}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 40 }}
            ItemSeparatorComponent={() => <View style={{ height: 15 }} />}
          />
        )}

        {/* Modal de Visualização de Canhoto */}
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
              resizeMode="contain"
              onError={() => Alert.alert('Erro', 'Não foi possível carregar o canhoto')}
            />
          </View>
        </Modal>

        {/* Modal de Confirmação de Envio */}
        <Modal visible={modalConfirmacao} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalConfirmacao}>
              <Text style={styles.modalTitulo}>Enviar Canhoto</Text>
              <Text style={styles.modalTexto}>
                Confirma o envio do canhoto para a entrega da nota {entregaSelecionada?.nota}?
              </Text>
              
              <View style={styles.modalBotoes}>
                <TouchableOpacity 
                  style={styles.modalBotaoCancelar}
                  onPress={() => setModalConfirmacao(false)}
                >
                  <Text style={styles.modalBotaoTexto}>Cancelar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.modalBotaoConfirmar}
                  onPress={() => {
                    setModalConfirmacao(false);
                    enviarCanhoto(entregaSelecionada.id);
                  }}
                >
                  <Text style={styles.modalBotaoTexto}>Confirmar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f0f4f8' },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 15, 
    textAlign: 'center', 
    color: '#2c3e50',
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 2,
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  nota: { fontWeight: 'bold', fontSize: 16, color: '#2c3e50' },
  label: { fontSize: 15, color: '#555', marginVertical: 3 },
  status: { 
    fontWeight: 'bold', 
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    fontSize: 14,
  },
  pendente: { backgroundColor: '#ffeaa7', color: '#d35400' },
  entregue: { backgroundColor: '#d5f5e3', color: '#27ae60' },
  btnCanhoto: {
    backgroundColor: '#3498db',
    padding: 14,
    borderRadius: 10,
    marginTop: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnVerCanhoto: {
    backgroundColor: '#2ecc71',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  btnTextVer: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  semCanhoto: { 
    color: '#e74c3c', 
    textAlign: 'center', 
    marginTop: 10,
    fontStyle: 'italic',
  },
  reenvioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e3f2fd',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  reenviando: { 
    color: '#0066cc', 
    marginLeft: 10,
    fontWeight: '500',
  },
  carregandoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  carregandoTexto: {
    marginTop: 15,
    color: '#7f8c8d',
    fontSize: 16,
  },
  semEntregasContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  semEntregasTexto: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#7f8c8d',
    marginBottom: 10,
  },
  semEntregasSubtexto: {
    fontSize: 16,
    color: '#95a5a6',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  botaoFecharModal: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.3)',
    padding: 10,
    borderRadius: 20,
  },
  textoFecharModal: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  imagemModal: {
    width: '95%',
    height: '85%',
    backgroundColor: '#000',
  },
  modalConfirmacao: {
    backgroundColor: '#ffffff',
    padding: 25,
    borderRadius: 15,
    width: '90%',
    maxWidth: 400,
  },
  modalTitulo: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    color: '#2c3e50',
  },
  modalTexto: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 25,
    color: '#555',
    lineHeight: 24,
  },
  modalBotoes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalBotaoCancelar: {
    backgroundColor: '#e0e0e0',
    padding: 14,
    borderRadius: 10,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  modalBotaoConfirmar: {
    backgroundColor: '#3498db',
    padding: 14,
    borderRadius: 10,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  modalBotaoTexto: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});