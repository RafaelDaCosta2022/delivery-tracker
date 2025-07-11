import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native'; // ✅ Corrigido
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import ImageViewing from 'react-native-image-viewing';
import { useAuth } from './AuthContext';
import { API } from './config';

export default function BuscarNotasScreen() {
  const { authHeader, usuario } = useAuth();

  if (!usuario) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Carregando usuário...</Text>
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
  const navigation = useNavigation();

  const buscarNotas = async () => {
    if (!busca || busca.length < 1) {
      Alert.alert('Busca inválida', 'Digite pelo menos 1 caractere para buscar');
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
    setImagemCanhoto(`${API.BASE()}/uploads/${path.split('/').pop()}`);

    setModalCanhoto(true);
  };

  const baixarOuCompartilharPDF = async (pdfPath: string | null | undefined) => {
  if (!pdfPath) {
    Alert.alert('Nota sem PDF disponível!');
    return;
  }

  setBaixandoPDF(true);

  try {
    const pdfPathNormalizado = pdfPath.replace(/\\/g, '/');
    const url = `${API.BASE()}/uploads/${pdfPathNormalizado}`;

    console.log('📥 Baixando do URL:', url);

    const fileName = pdfPathNormalizado.split('/').pop() || 'nota.pdf';
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    // Faz download
    const downloadResum = await FileSystem.downloadAsync(url, fileUri);

    console.log('✅ PDF salvo em:', downloadResum.uri);

    // Compartilhar nativo
    await Sharing.shareAsync(downloadResum.uri);

  } catch (err: any) {
    console.error('❌ Erro no download/compartilhar:', err);
    Alert.alert('Erro', err.message || 'Não foi possível baixar/enviar o PDF');
  } finally {
    setBaixandoPDF(false);
  }
};




  


  const formatarData = (dataString: string) => {
    if (!dataString) return '--/--/----';
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR');
  };

  const formatarValor = (valor: string) => {
    return parseFloat(valor).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const isDelivered = status === 'ENTREGUE' || status === 'CONCLUIDA';
    const statusText = status === 'CONCLUIDA' ? 'ENTREGUE' : status;
    
    return (
      <View style={[
        styles.statusBadge,
        isDelivered ? styles.badgeSuccess : styles.badgeWarning
      ]}>
        <MaterialCommunityIcons 
          name={isDelivered ? 'check-circle' : 'clock'} 
          size={14} 
          color={isDelivered ? "#27ae60" : "#f39c12"} 
        />
        <Text style={styles.statusText}>{statusText}</Text>
      </View>
    );
  };

  const InfoRow = ({ icon, label, value }: { icon: string, label: string, value: string }) => (
    <View style={styles.detailRow}>
      <MaterialIcons name={icon} size={20} color="#7f8c8d" style={styles.detailIcon} />
      <Text style={styles.detailLabel}>{label}:</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );

  const ActionButton = ({ 
    icon, 
    label, 
    color, 
    onPress, 
    loading = false,
    disabled = false
  }: { 
    icon: string, 
    label: string, 
    color: string, 
    onPress: () => void, 
    loading?: boolean,
    disabled?: boolean
  }) => (
    <TouchableOpacity 
      style={[styles.actionButton, { backgroundColor: color }]} 
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <>
          <MaterialIcons name={icon} size={20} color="#fff" />
          <Text style={styles.actionButtonText}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );

  const renderItem = ({ item }: any) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => abrirNota(item)}
      activeOpacity={0.9}
    >
      <View style={styles.cardHeader}>
        <View style={styles.notaContainer}>
          <MaterialIcons name="description" size={24} color="#3498db" />
          <Text style={styles.cardTitle}>Nota Fiscal: {item.nota}</Text>
        </View>
        <StatusBadge status={item.status} />
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <MaterialIcons name="business" size={20} color="#7f8c8d" />
          <Text style={styles.cardCliente}>{item.cliente_nome}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <MaterialIcons name="fingerprint" size={20} color="#7f8c8d" />
          <Text style={styles.cardCNPJ}>CNPJ: {item.cliente_cnpj || '--'}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Ionicons name="location-sharp" size={20} color="#e74c3c" />
          <View>
            <Text style={styles.cardEndereco}>
              {item.cidade || '--'} – {item.endereco || '--'}
            </Text>
            <Text style={styles.cardCep}>CEP: {item.cep || '--'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.infoRow}>
          <Ionicons name="calendar" size={20} color="#9b59b6" />
          <Text style={styles.cardData}>{formatarData(item.data_emissao)}</Text>
        </View>
        
        <View style={styles.valorContainer}>
          <Text style={styles.valorLabel}>Valor Total</Text>
          <Text style={styles.cardValor}>
            {formatarValor(item.valor_total)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Buscar Notas Fiscais</Text>
        <Text style={styles.headerSubtitle}>
          {usuario.nome} • {usuario.empresa || 'Transportes'}
        </Text>
      </View>
      
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
            <MaterialIcons name="search" size={24} color="#fff" />
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
              <MaterialCommunityIcons name="file-document-outline" size={60} color="#bdc3c7" />
              <Text style={styles.emptyText}>Nenhuma nota encontrada</Text>
              <Text style={styles.emptySubtext}>
                Busque por número, nome do cliente ou CNPJ
              </Text>
            </View>
          ) : (
            <View style={styles.loadingContent}>
              <ActivityIndicator size="large" color="#3498db" />
              <Text style={styles.loadingText}>Buscando notas...</Text>
            </View>
          )
        }
      />

      {/* Modal de detalhes */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalhes da Nota Fiscal</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#2c3e50" />
              </TouchableOpacity>
            </View>

            {notaSelecionada && (
              <ScrollView 
                style={styles.modalBody}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.notaHeader}>
                  <MaterialIcons name="description" size={28} color="#3498db" />
                  <Text style={styles.notaTitle}>Nota: {notaSelecionada.nota}</Text>
                  <StatusBadge status={notaSelecionada.status} />
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Dados da Nota</Text>
                  <InfoRow icon="event" label="Emissão" value={formatarData(notaSelecionada.data_emissao)} />
                  <InfoRow icon="attach-money" label="Valor Total" value={formatarValor(notaSelecionada.valor_total)} />
                  <InfoRow icon="info" label="Status" value={notaSelecionada.status === 'CONCLUIDA' ? 'ENTREGUE' : notaSelecionada.status} />
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Cliente</Text>
                  <InfoRow icon="business" label="Nome" value={notaSelecionada.cliente_nome} />
                  <InfoRow icon="badge" label="CNPJ" value={notaSelecionada.cliente_cnpj || '--'} />
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Remetente</Text>
                  <InfoRow icon="business" label="Nome" value={notaSelecionada.remetente_nome} />
                  <InfoRow icon="badge" label="CNPJ" value={notaSelecionada.remetente_cnpj || '--'} />
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Destino</Text>
                  <InfoRow icon="location-city" label="Cidade" value={notaSelecionada.cidade || '--'} />
                  <InfoRow icon="place" label="Endereço" value={notaSelecionada.endereco || '--'} />
                  <InfoRow icon="markunread-mailbox" label="CEP" value={notaSelecionada.cep || '--'} />
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Entrega</Text>
                  <InfoRow icon="person" label="Motorista" value={notaSelecionada.motorista_nome || 'Não atribuído'} />
                  {notaSelecionada.data_entrega && (
                    <InfoRow icon="event-available" label="Data Entrega" value={formatarData(notaSelecionada.data_entrega)} />
                  )}
                </View>

                {notaSelecionada.observacao && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Observações</Text>
                    <View style={styles.observacaoContainer}>
                      <MaterialIcons name="notes" size={20} color="#7f8c8d" />
                      <Text style={styles.observacaoText}>{notaSelecionada.observacao}</Text>
                    </View>
                  </View>
                )}

                <View style={styles.actionsContainer}>
                  {notaSelecionada.canhoto_path ? (
                    <ActionButton 
                      icon="receipt" 
                      label="Ver Canhoto" 
                      color="#3498db" 
                      onPress={() => abrirCanhoto(notaSelecionada.canhoto_path)} 
                    />
                  ) : (
                    <View style={styles.actionButtonDisabled}>
                      <Text style={styles.actionButtonTextDisabled}>Sem comprovante</Text>
                    </View>
                  )}

                  {notaSelecionada.pdf_path ? (
                    <ActionButton 
                      icon="picture-as-pdf" 
                      label={Platform.OS === 'web' ? 'Baixar PDF' : 'Compartilhar PDF'} 
                      color="#e74c3c" 
                      onPress={() => baixarOuCompartilharPDF(notaSelecionada.pdf_path)} 
                      loading={baixandoPDF}
                    />
                  ) : (
                    <View style={styles.actionButtonDisabled}>
                      <Text style={styles.actionButtonTextDisabled}>Sem PDF</Text>
                    </View>


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
    backgroundColor: '#f8f9fa',
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#2c3e50',
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2c3e50',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginVertical: 20,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#2c3e50',
  },
  searchButton: {
    width: 56,
    height: '100%',
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginVertical: 8,
    marginHorizontal: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  notaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    marginLeft: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  badgeSuccess: {
    backgroundColor: '#e6f7e6',
  },
  badgeWarning: {
    backgroundColor: '#fff8e6',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginLeft: 6,
  },
  cardBody: {
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardCliente: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginLeft: 10,
  },
  cardCNPJ: {
    fontSize: 14,
    color: '#7f8c8d',
    marginLeft: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 12,
  },
  cardEndereco: {
    fontSize: 14,
    color: '#34495e',
    marginLeft: 10,
  },
  cardCep: {
    fontSize: 13,
    color: '#7f8c8d',
    marginLeft: 10,
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardData: {
    fontSize: 14,
    color: '#7f8c8d',
    marginLeft: 10,
  },
  valorContainer: {
    alignItems: 'flex-end',
  },
  valorLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  cardValor: {
    fontSize: 18,
    fontWeight: '700',
    color: '#27ae60',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContent: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#7f8c8d',
    marginTop: 20,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bdc3c7',
    marginTop: 8,
    textAlign: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    padding: 40,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2c3e50',
  },
  modalBody: {
    padding: 20,
  },
  notaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  notaTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2c3e50',
    marginLeft: 10,
    marginRight: 10,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailIcon: {
    marginRight: 10,
  },
  detailLabel: {
    width: 100,
    fontSize: 14,
    color: '#7f8c8d',
  },
  detailValue: {
    flex: 1,
    fontSize: 16,
    color: '#2c3e50',
  },
  observacaoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  observacaoText: {
    flex: 1,
    fontSize: 16,
    color: '#2c3e50',
    marginLeft: 10,
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    minWidth: '48%',
    marginBottom: 12,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  actionButtonDisabled: {
    backgroundColor: '#ecf0f1',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    minWidth: '48%',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButtonTextDisabled: {
    color: '#95a5a6',
    fontWeight: '600',
  },
});