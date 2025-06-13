// MinhasEntregasScreen.tsx
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
  RefreshControl,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { API } from './config';
import { Ionicons } from '@expo/vector-icons';

// Paleta de cores moderna
const COLORS = {
  primary: '#4361ee',
  secondary: '#3f37c9',
  accent: '#4895ef',
  success: '#4cc9f0',
  danger: '#f72585',
  warning: '#f8961e',
  light: '#f8f9fa',
  dark: '#212529',
  gray: '#adb5bd',
  card: '#ffffff',
};

export default function MinhasEntregasScreen() {
  const [entregas, setEntregas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [modalImagemVisivel, setModalImagemVisivel] = useState(false);
  const [imagemSelecionada, setImagemSelecionada] = useState('');
  const [modalConfirmacao, setModalConfirmacao] = useState(false);
  const [entregaSelecionada, setEntregaSelecionada] = useState<any>(null);
  const [estaOffline, setEstaOffline] = useState(false);

  useEffect(() => {
    solicitarPermissaoCamera();
    tentarReenviarPendentes();
    
    // Monitorar estado da rede
    const unsubscribe = NetInfo.addEventListener(state => {
      setEstaOffline(!state.isConnected);
    });
    
    return () => unsubscribe();
  }, []);

  const solicitarPermissaoCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera para registrar os canhotos');
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      carregarEntregas();
    }, [])
  );

  const carregarEntregas = async () => {
  setRefreshing(true);
  try {
    const usuario = await AsyncStorage.getItem('usuario');
    const { token } = JSON.parse(usuario || '{}');

    if (!token) {
      throw new Error('Token de autenticação não encontrado');
    }

    const response = await fetch(API.MINHAS_ENTREGAS(), { // <- CORRETO AGORA
      headers: { Authorization: token },
    });

    console.log('Resposta da API:', response.status);
    
    if (!response.ok) {
      throw new Error(`Erro na API: ${response.status}`);
    }

    const data = await response.json();
    const agora = new Date();
    const entregasFiltradas = data.filter((e: any) => {
      if (e.status === 'PENDENTE') return true;
      if (e.status === 'ENTREGUE' && e.data_entrega) {
        const dataEntrega = new Date(e.data_entrega);
        const diffHoras = (agora.getTime() - dataEntrega.getTime()) / (1000 * 60 * 60);
        return diffHoras <= 12;
      }
      return false;
    });

    setEntregas(entregasFiltradas);
  } catch (error: any) {
    console.error('Erro ao carregar entregas:', error);
    Alert.alert('Erro', error.message || 'Não foi possível carregar suas entregas');
  } finally {
    setCarregando(false);
    setRefreshing(false);
  }
};


  const enviarCanhoto = async (entregaId: number) => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        aspect: [4, 3],
      });

      if (result.canceled) return;

      const { uri } = result.assets[0];
      const usuario = await AsyncStorage.getItem('usuario');
      const token = JSON.parse(usuario || '{}').token;

      // Se offline, salvar localmente
      if (estaOffline) {
        await salvarOffline(entregaId, uri);
        Alert.alert('Offline', 'Canhoto salvo localmente. Será enviado automaticamente quando houver conexão');
        return;
      }

      // Se online, enviar diretamente
      await enviarCanhotoOnline(entregaId, uri, token);
      
    } catch (err) {
      console.error('Erro ao enviar canhoto:', err);
      Alert.alert('Erro', 'Falha ao enviar canhoto. Tente novamente');
    }
  };

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
    
    if (resposta.success) {
      Alert.alert('Sucesso', 'Canhoto enviado com sucesso!');
      carregarEntregas();
    } else {
      throw new Error(resposta.error || 'Erro ao enviar canhoto');
    }
  };

  const salvarOffline = async (entregaId: number, uri: string) => {
    try {
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
      Alert.alert('Erro', 'Falha ao salvar o canhoto offline');
    }
  };

  const tentarReenviarPendentes = async () => {
    if (estaOffline) return;
    
    setReenviando(true);
    
    try {
      const pendentes = await AsyncStorage.getItem('canhotosPendentes');
      if (!pendentes) return;

      const lista = JSON.parse(pendentes);
      const usuario = await AsyncStorage.getItem('usuario');
      const token = JSON.parse(usuario || '{}').token;
      const enviados = [];
      const falhas = [];

      for (const item of lista) {
        if (!item.imagemBase64) continue;

        try {
          const fileUri = `${FileSystem.cacheDirectory}${item.nome}`;
          
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
            await FileSystem.deleteAsync(fileUri);
          } else {
            falhas.push(item);
          }
        } catch (err) {
          falhas.push(item);
        }
      }

      await AsyncStorage.setItem('canhotosPendentes', JSON.stringify(falhas));
      
      if (enviados.length > 0) {
        Alert.alert('Sucesso', `${enviados.length} canhotos pendentes enviados!`);
        carregarEntregas();
      }
    } catch (err) {
      console.error('Erro no reenvio:', err);
    } finally {
      setReenviando(false);
    }
  };

  const confirmarEnvio = (entrega: any) => {
    setEntregaSelecionada(entrega);
    setModalConfirmacao(true);
  };

  const visualizarCanhoto = (caminho: string) => {
    const filename = caminho.split('/').pop();
    const url = `${API.BASE}/uploads/${filename}`;
    setImagemSelecionada(url);
    setModalImagemVisivel(true);
  };

  const renderItem = ({ item }: any) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusIndicator,
            item.status === 'PENDENTE' ? styles.pendente : styles.entregue
          ]} />
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
        <Text style={styles.nota}>NF: {item.nota}</Text>
      </View>

      <View style={styles.infoContainer}>
        <Ionicons name="business-outline" size={18} color={COLORS.gray} />
        <Text style={styles.cliente}>{item.cliente_nome}</Text>
      </View>

      <View style={styles.infoContainer}>
        <Ionicons name="calendar-outline" size={18} color={COLORS.gray} />
        <Text style={styles.infoText}>
          {new Date(item.data_emissao).toLocaleDateString('pt-BR')}
        </Text>
      </View>

      <View style={styles.infoContainer}>
        <Ionicons name="cash-outline" size={18} color={COLORS.gray} />
        <Text style={styles.infoText}>R$ {parseFloat(item.valor_total).toFixed(2)}</Text>
      </View>

      <View style={styles.actionsContainer}>
        {item.canhoto_path ? (
          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={() => visualizarCanhoto(item.canhoto_path)}
          >
            <Ionicons name="eye-outline" size={18} color={COLORS.primary} />
            <Text style={styles.btnTextSecondary}>Ver Canhoto</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.semCanhoto}>Canhoto não disponível</Text>
        )}

        {item.status === 'PENDENTE' && (
          <TouchableOpacity 
            style={[styles.btnPrimary, estaOffline && styles.btnDisabled]}
            onPress={() => confirmarEnvio(item)}
            disabled={estaOffline}
          >
            <Ionicons name="camera-outline" size={18} color="#fff" />
            <Text style={styles.btnTextPrimary}>
              {estaOffline ? 'Salvo Local' : 'Enviar Canhoto'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <ProtectedRoute>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Minhas Entregas</Text>
          <Ionicons name="car-outline" size={28} color={COLORS.primary} />
        </View>

        {estaOffline && (
          <View style={styles.offlineBanner}>
            <Ionicons name="cloud-offline-outline" size={20} color="#fff" />
            <Text style={styles.offlineText}>Você está offline</Text>
          </View>
        )}

        {reenviando && (
          <View style={styles.reenvioContainer}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.reenviando}>Enviando canhotos pendentes...</Text>
          </View>
        )}

        <FlatList
          data={entregas}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            !carregando ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="file-tray-outline" size={60} color={COLORS.gray} />
                <Text style={styles.emptyTitle}>Nenhuma entrega</Text>
                <Text style={styles.emptyText}>Você não tem entregas atribuídas no momento</Text>
              </View>
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={carregarEntregas}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          ListFooterComponent={<View style={{ height: 30 }} />}
        />

        {carregando && !refreshing && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        )}

        {/* Modal de Visualização de Canhoto */}
        <Modal visible={modalImagemVisivel} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setModalImagemVisivel(false)}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            
            <Image
              source={{ uri: imagemSelecionada }}
              style={styles.imagemModal}
              resizeMode="contain"
            />
          </View>
        </Modal>

        {/* Modal de Confirmação */}
        <Modal visible={modalConfirmacao} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.confirmModal}>
              <Text style={styles.modalTitle}>Enviar Canhoto</Text>
              
              <View style={styles.modalBody}>
                <Ionicons name="document-attach-outline" size={40} color={COLORS.primary} />
                <Text style={styles.modalText}>
                  Confirmar envio do canhoto para a nota:
                </Text>
                <Text style={styles.noteText}>{entregaSelecionada?.nota}</Text>
                <Text style={styles.clientText}>{entregaSelecionada?.cliente_nome}</Text>
              </View>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setModalConfirmacao(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.confirmButton}
                  onPress={() => {
                    setModalConfirmacao(false);
                    enviarCanhoto(entregaSelecionada.id);
                  }}
                >
                  <Text style={styles.confirmButtonText}>Confirmar</Text>
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
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.dark,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  offlineText: {
    color: '#fff',
    fontWeight: '500',
    marginLeft: 8,
  },
  reenvioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f7ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  reenviando: {
    color: COLORS.primary,
    marginLeft: 8,
    fontWeight: '500',
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  pendente: {
    backgroundColor: COLORS.warning,
  },
  entregue: {
    backgroundColor: COLORS.success,
  },
  statusText: {
    fontWeight: '600',
    fontSize: 14,
    color: COLORS.dark,
  },
  nota: {
    fontWeight: '700',
    fontSize: 16,
    color: COLORS.dark,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cliente: {
    fontSize: 16,
    color: COLORS.dark,
    marginLeft: 10,
    fontWeight: '500',
  },
  infoText: {
    fontSize: 15,
    color: COLORS.dark,
    marginLeft: 10,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
  },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    flex: 1,
    marginLeft: 10,
    justifyContent: 'center',
  },
  btnDisabled: {
    backgroundColor: COLORS.gray,
  },
  btnTextPrimary: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
    marginLeft: 8,
  },
  btnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
    justifyContent: 'center',
  },
  btnTextSecondary: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 15,
    marginLeft: 8,
  },
  semCanhoto: {
    color: COLORS.danger,
    fontStyle: 'italic',
    textAlign: 'center',
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.dark,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 24,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  imagemModal: {
    width: '90%',
    height: '80%',
    borderRadius: 12,
  },
  confirmModal: {
    backgroundColor: COLORS.card,
    width: '90%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.dark,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalBody: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  modalText: {
    fontSize: 16,
    color: COLORS.dark,
    textAlign: 'center',
    marginTop: 15,
  },
  noteText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 10,
  },
  clientText: {
    fontSize: 18,
    color: COLORS.dark,
    fontWeight: '500',
    marginTop: 5,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 25,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 10,
  },
  cancelButtonText: {
    color: COLORS.dark,
    fontWeight: '600',
    fontSize: 16,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginLeft: 10,
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});