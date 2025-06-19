import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal,
  ActivityIndicator, TextInput, Image, Alert, Platform, Linking
} from 'react-native';
import { API } from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { ScrollView } from 'react-native';
import { useAuth } from './ProtectedRoute';
import { MaterialIcons, Ionicons, FontAwesome5,FontAwesome } from '@expo/vector-icons';
import ImageViewing from 'react-native-image-viewing'; // ✅ Substituto moderno
export default function BuscarNotasScreen() {
  const { authHeader, usuario } = useAuth();

if (!usuario) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#000" />
      <Text>Carregando usuário...</Text>
    </View>
  );
}
  const [busca, setBusca] = useState('');
  const [notas, setNotas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [notaSelecionada, setNotaSelecionada] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalCanhoto, setModalCanhoto] = useState(false);
  const [imagemCanhoto, setImagemCanhoto] = useState<string | null>(null);
  const [baixandoPDF, setBaixandoPDF] = useState(false);
  const [baixandoXML, setBaixandoXML] = useState(false);

  

const buscarNotas = async () => {
  if (!busca || busca.length < 1) {
    Alert.alert('Digite pelo menos 1 caractere');
    return;
  }
  setCarregando(true);
  try {
    const rawHeaders = await authHeader();

    if (!rawHeaders.Authorization) {
      throw new Error('Token de autenticação não encontrado');
    }

    const tokenSanitizado = rawHeaders.Authorization
      .replace('Bearer', '')
      .trim()
      .replace(/\s+/g, '');

    const tokenParts = tokenSanitizado.split('.');
    if (tokenParts.length !== 3) {
      throw new Error('Estrutura do token inválida');
    }

    const headers = {
      ...rawHeaders,
      Authorization: `Bearer ${tokenSanitizado}`,
    };

    const url = `${API.BUSCAR_NOTAS()}?busca=${encodeURIComponent(busca)}`;
    const res = await fetch(url, { headers });

    if (!res.ok) {
      const textoErro = await res.text();
      throw new Error(`Erro ao buscar notas: ${textoErro}`);
    }

    const json = await res.json();
    setNotas(json || []);
  } catch (err: any) {
    console.error('Erro ao buscar notas:', err);
    let msg = err?.message || 'Erro inesperado';
    if (msg.includes('Token')) msg = 'Problema de autenticação. Faça login novamente.';
    Alert.alert('Erro', msg);
  } finally {
    setCarregando(false);
  }
};




  const abrirNota = (nota: any) => {
    setNotaSelecionada(nota);
    setModalVisible(true);
  };

  const abrirCanhoto = (path: string) => {
    setImagemCanhoto(`${API.BASE}/uploads/${path.split('/').pop()}`);
    setModalCanhoto(true);
  };

  const baixarOuCompartilharPDF = async (pdfPath: string | null | undefined) => {
    if (!pdfPath) {
      Alert.alert('Nota sem PDF disponível!');
      return;
    }
    
    setBaixandoPDF(true);
    try {
      const url = pdfPath.startsWith('http') ? pdfPath : `${API.BASE}/uploads/${pdfPath.split('/').pop()}`;
      const fileName = pdfPath?.split('/').pop() || 'nota.pdf';
      const dir = FileSystem.documentDirectory ?? '';
      const fileUri = dir + fileName;

      const downloadResum = await FileSystem.downloadAsync(url, fileUri);
      
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        await Sharing.shareAsync(downloadResum.uri);
      } else {
        Alert.alert('Download concluído', `Arquivo salvo em: ${downloadResum.uri}`);
      }
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível baixar/enviar o PDF');
    } finally {
      setBaixandoPDF(false);
    }
  };

  const visualizarXML = async (xmlPath: string | null | undefined) => {
    if (!xmlPath) {
      Alert.alert('XML não disponível para esta nota');
      return;
    }
    
    setBaixandoXML(true);
    try {
      const url = xmlPath.startsWith('http') ? xmlPath : `${API.BASE}/uploads/${xmlPath.split('/').pop()}`;
      
      // Abre o XML no navegador do dispositivo
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Não foi possível abrir o XML', 'Instale um visualizador de XML');
      }
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível abrir o XML');
    } finally {
      setBaixandoXML(false);
    }
  };

  const compartilharCanhoto = async (canhotoPath: string) => {
    try {
      const url = canhotoPath.startsWith('http') ? canhotoPath : `${API.BASE}/uploads/${canhotoPath.split('/').pop()}`;
      await Sharing.shareAsync(url);
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível compartilhar o canhoto');
    }
  };

  const formatarData = (dataString: string) => {
    if (!dataString) return '--/--/----';
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR');
  };

  const renderItem = ({ item }: any) => (
  <TouchableOpacity style={styles.card} onPress={() => abrirNota(item)}>
    <View style={styles.cardHeader}>
      <Text style={styles.cardTitle}>Nota: {item.nota}</Text>
      <View style={[
        styles.statusBadge,
        item.status === 'ENTREGUE' || item.status === 'CONCLUIDA'
          ? styles.badgeSuccess
          : styles.badgeWarning
      ]}>
        <Text style={styles.statusText}>
          {item.status === 'CONCLUIDA' ? 'ENTREGUE' : item.status}
        </Text>
      </View>
    </View>

    <Text style={styles.cardCliente}>{item.cliente_nome}</Text>
    <Text style={styles.cardCNPJ}>CNPJ: {item.cliente_cnpj || '--'}</Text>

    <Text style={styles.cardEndereco}>
      📍 {item.cidade || '--'} – {item.endereco || '--'}
    </Text>
    <Text style={styles.cardCep}>CEP: {item.cep || '--'}</Text>

    <View style={styles.cardFooter}>
      <Text style={styles.cardSubInfo}>
        <Ionicons name="calendar" size={14} /> {formatarData(item.data_emissao)}
      </Text>
      <Text style={styles.cardValor}>
        R$ {parseFloat(item.valor_total).toFixed(2)}
      </Text>
    </View>
  </TouchableOpacity>
);

  

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Buscar Notas Fiscais</Text>
      
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nota, cliente ou CNPJ..."
          placeholderTextColor="#95a5a6"
          value={busca}
          onChangeText={setBusca}
          onSubmitEditing={buscarNotas}
        />
        <TouchableOpacity 
          style={styles.searchButton} 
          onPress={buscarNotas}
          disabled={carregando}
        >
          {carregando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <MaterialIcons name="search" size={28} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      <FlatList
  data={notas}
  keyExtractor={item => item.id?.toString() || Math.random().toString()}
  renderItem={renderItem}
  contentContainerStyle={notas.length === 0 && styles.emptyContainer}
  ListEmptyComponent={
    !carregando ? (
      <View style={styles.emptyContent}>
        <MaterialIcons name="inventory" size={60} color="#bdc3c7" />
        <Text style={styles.emptyText}>Nenhuma nota encontrada</Text>
        <Text style={styles.emptySubtext}>
          Busque por número, nome do cliente ou CNPJ
        </Text>
      </View>
    ) : null
  }
/>


      {/* Modal de detalhes */}
      <Modal visible={modalVisible} animationType="slide" transparent>
  <View style={styles.modalBg}>
    <View style={styles.modalContent}>
      <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
        <MaterialIcons name="close" size={28} color="#2c3e50" />
      </TouchableOpacity>

      {notaSelecionada && (
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.notaTitle}>Nota Fiscal: {notaSelecionada.nota}</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📦 Dados da Nota</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Emissão:</Text>
              <Text style={styles.detailValue}>{formatarData(notaSelecionada.data_emissao)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Valor Total:</Text>
              <Text style={styles.detailValue}>R$ {parseFloat(notaSelecionada.valor_total).toFixed(2)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status:</Text>
              <Text style={[styles.detailValue, { fontWeight: 'bold', color: notaSelecionada.status === 'ENTREGUE' || notaSelecionada.status === 'CONCLUIDA' ? '#2ecc71' : '#e67e22' }]}>
                {notaSelecionada.status === 'CONCLUIDA' ? 'ENTREGUE' : notaSelecionada.status}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👤 Cliente</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Nome:</Text>
              <Text style={styles.detailValue}>{notaSelecionada.cliente_nome}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>CNPJ:</Text>
              <Text style={styles.detailValue}>{notaSelecionada.cliente_cnpj || '--'}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏢 Remetente</Text>
            <Text style={styles.detailValue}>{notaSelecionada.remetente_nome}</Text>
            <Text style={styles.detailValue}>CNPJ: {notaSelecionada.remetente_cnpj || '--'}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📍 Destino</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Cidade:</Text>
              <Text style={styles.detailValue}>{notaSelecionada.cidade || '--'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Endereço:</Text>
              <Text style={styles.detailValue}>{notaSelecionada.endereco || '--'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>CEP:</Text>
              <Text style={styles.detailValue}>{notaSelecionada.cep || '--'}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🚚 Entrega</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Motorista:</Text>
              <Text style={styles.detailValue}>{notaSelecionada.motorista_nome || 'Não atribuído'}</Text>
            </View>
            {notaSelecionada.data_entrega && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Data Entrega:</Text>
                <Text style={styles.detailValue}>{formatarData(notaSelecionada.data_entrega)}</Text>
              </View>
            )}
          </View>

          {notaSelecionada.observacao && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📝 Observações</Text>
              <Text style={styles.detailValue}>{notaSelecionada.observacao}</Text>
            </View>
          )}

          <View style={styles.actionsContainer}>
            {notaSelecionada.canhoto_path ? (
              <TouchableOpacity style={styles.actionButton} onPress={() => abrirCanhoto(notaSelecionada.canhoto_path)}>
                <MaterialIcons name="receipt" size={22} color="#3498db" />
                <Text style={styles.actionButtonText}>Ver Canhoto</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.actionButtonDisabled}>
                <Text style={styles.actionButtonTextDisabled}>Sem comprovante</Text>
              </View>
            )}

            {notaSelecionada.pdf_path ? (
              <TouchableOpacity style={styles.actionButton} onPress={() => baixarOuCompartilharPDF(notaSelecionada.pdf_path)} disabled={baixandoPDF}>
                {baixandoPDF ? (
                  <ActivityIndicator color="#2c3e50" />
                ) : (
                  <>
                    <Ionicons name="document" size={22} color="#2c3e50" />
                    <Text style={styles.actionButtonText}>{Platform.OS === 'web' ? 'Baixar PDF' : 'Compartilhar PDF'}</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.actionButtonDisabled}>
                <Text style={styles.actionButtonTextDisabled}>Sem PDF</Text>
              </View>
            )}

            {notaSelecionada.xml_path && (
              <TouchableOpacity style={styles.actionButton} onPress={() => visualizarXML(notaSelecionada.xml_path)} disabled={baixandoXML}>
                {baixandoXML ? (
                  <ActivityIndicator color="#8e44ad" />
                ) : (
                  <>
                    <FontAwesome name="code" size={22} color="#8e44ad" />
                    <Text style={styles.actionButtonText}>Ver XML</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  </View>
</Modal>


      {/* Modal com Zoom de imagem do canhoto */}
      <ImageViewing
        images={[{ uri: imagemCanhoto || '' }]}
        imageIndex={0}
        visible={modalCanhoto}
        onRequestClose={() => setModalCanhoto(false)}
        backgroundColor="rgba(0,0,0,0.95)"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f4', // leve cinza de fundo
    paddingTop: 24,
  },
  header: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    color: '#000000', // preto puro
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    height: 50,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#000000',
    elevation: 2,
  },
  searchButton: {
    backgroundColor: '#000000', // botão preto
    padding: 12,
    borderRadius: 8,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginVertical: 7,
    marginHorizontal: 16,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  statusBadge: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  badgeSuccess: {
    backgroundColor: '#c8f7c5', // verde claro discreto
  },
  badgeWarning: {
    backgroundColor: '#ffe5b4', // laranja claro discreto
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
  },
  cardCliente: {
    fontSize: 15,
    color: '#000000',
    marginBottom: 4,
  },
  cardSubInfo: {
    fontSize: 13,
    color: '#333333',
    marginBottom: 2,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 24,
    width: '88%',
  },
  closeButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 1,
  },
  notaTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 6,
  },
  notaLabel: {
    fontSize: 15,
    color: '#000000',
    marginBottom: 3,
  },
  canhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 9,
    borderRadius: 8,
    marginRight: 4,
  },
  cardFooterCol: {
    flexDirection: 'column',
  },
  cardValor: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
});




