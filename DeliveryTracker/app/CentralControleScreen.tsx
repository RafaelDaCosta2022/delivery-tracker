// 📦 CentralControleScreen.tsx — VERSÃO PREMIUM
import React, { useState, useEffect, useCallback } from 'react';
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
  Alert,
  RefreshControl,
  Animated,
  Easing
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { Feather, MaterialIcons, FontAwesome, Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

// 🎨 Paleta de cores premium
const COLORS = {
  primary: '#4361ee',
  secondary: '#3f37c9',
  accent: '#4895ef',
  success: '#4cc9f0',
  danger: '#f72585',
  warning: '#f8961e',
  light: '#f8f9fa',
  dark: '#212529',
  background: '#f0f2f5',
  card: '#ffffff',
  text: '#343a40',
  border: '#dee2e6'
};

export default function CentralControleScreen() {
  const hoje = new Date();
  const [inicio, setInicio] = useState(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  const [fim, setFim] = useState(hoje);
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [tipoCalendario, setTipoCalendario] = useState<'inicio' | 'fim'>('inicio');
  const [entregas, setEntregas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [motoristas, setMotoristas] = useState<any[]>([]);
  const [motoristaSelecionado, setMotoristaSelecionado] = useState('');
  const [entregaSelecionada, setEntregaSelecionada] = useState<any>(null);
  const [usuarioTipo, setUsuarioTipo] = useState('');
  const [modalImagemVisivel, setModalImagemVisivel] = useState(false);
  const [imagemSelecionada, setImagemSelecionada] = useState('');
  const [motoristaAtribuicaoId, setMotoristaAtribuicaoId] = useState('');
  const [modalAtribuirVisivel, setModalAtribuirVisivel] = useState(false);
  const [atribuindo, setAtribuindo] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [statusSelecionado, setStatusSelecionado] = useState<string>('TODOS');
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const rotateAnim = useState(new Animated.Value(0))[0];
  
  // Animação para ícone de filtro
  const toggleFiltros = () => {
    setFiltrosAbertos(!filtrosAbertos);
    Animated.timing(rotateAnim, {
      toValue: filtrosAbertos ? 0 : 1,
      duration: 300,
      easing: Easing.linear,
      useNativeDriver: true
    }).start();
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg']
  });

  // ✅ Formatar data no formato DD/MM/AAAA
  const formatarData = (data: Date) => {
    return data.toLocaleDateString('pt-BR');
  };

  // 🔄 Função para buscar entregas com tratamento de cache
  const buscarEntregas = useCallback(async () => {
  setCarregando(true);

  const formatarParaAPI = (data: Date) => {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  };

  let query = `?dataInicio=${formatarParaAPI(inicio)}&dataFim=${formatarParaAPI(fim)}`;
  if (motoristaSelecionado) query += `&motorista=${motoristaSelecionado}`;
  if (busca.length >= 2) query += `&busca=${encodeURIComponent(busca)}`;
// NÃO coloca statusSelecionado na query! Pronto!

  const usuario = await AsyncStorage.getItem('usuario');
  const token = JSON.parse(usuario || '{}').token;




  try {
    const res = await fetch(`${API.ENTREGAS}${query}`, { headers: { Authorization: token } });
    const data = await res.json();
    setEntregas(Array.isArray(data) ? data : []);
  } catch {
    Alert.alert('Erro', 'Falha ao carregar entregas');
  } finally {
    setCarregando(false);
    setRefreshing(false);
  }
}, [inicio, fim, motoristaSelecionado, statusSelecionado, busca]);


  // 🔄 Atualizar puxando a tela para baixo
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    buscarEntregas();
  }, [buscarEntregas]);

  // 📊 Gerar relatório PDF com gráficos
  const gerarPDF = async () => {
    // Calcular estatísticas
    const totalEntregas = entregas.length;
    const entregues = entregas.filter(e => e.status === 'CONCLUIDA').length;
    const pendentes = totalEntregas - entregues;
    
    const html = `
      <html>
        <head>
          <style>
            body { font-family: sans-serif; }
            h1 { color: ${COLORS.primary}; text-align: center; }
            .stats { display: flex; justify-content: space-around; margin: 20px 0; }
            .stat-card { background: #f0f8ff; padding: 15px; border-radius: 10px; text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: ${COLORS.primary}; color: white; padding: 10px; }
            tr:nth-child(even) { background-color: #f2f2f2; }
            td { padding: 8px; border-bottom: 1px solid #ddd; }
            .chart-container { display: flex; margin-top: 30px; height: 200px; align-items: flex-end; }
            .chart-bar { flex: 1; background: ${COLORS.accent}; margin: 0 5px; position: relative; }
            .chart-label { position: absolute; bottom: -25px; width: 100%; text-align: center; }
          </style>
        </head>
        <body>
          <h1>Relatório de Entregas</h1>
          
          <div class="stats">
            <div class="stat-card">
              <h3>Total</h3>
              <p>${totalEntregas}</p>
            </div>
            <div class="stat-card">
              <h3>Entregues</h3>
              <p>${entregues}</p>
            </div>
            <div class="stat-card">
              <h3>Pendentes</h3>
              <p>${pendentes}</p>
            </div>
          </div>
          
          <div class="chart-container">
            <div style="height: ${(entregues / totalEntregas) * 100 || 0}%;" class="chart-bar">
              <div class="chart-label">Entregues</div>
            </div>
            <div style="height: ${(pendentes / totalEntregas) * 100 || 0}%;" class="chart-bar">
              <div class="chart-label">Pendentes</div>
            </div>
          </div>
          
          <table>
            <tr>
              <th>Cliente</th>
              <th>Nota</th>
              <th>Data</th>
              <th>Valor</th>
              <th>Status</th>
              <th>Motorista</th>
            </tr>
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
        </body>
      </html>
    `;

    try {
      const file = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(file.uri);
    } catch (error) {
      Alert.alert('Erro', 'Falha ao gerar o PDF');
    }
  };

  // 👥 Carregar motoristas com cache
  const carregarMotoristas = async () => {
    const usuario = await AsyncStorage.getItem('usuario');
    const parsed = JSON.parse(usuario || '{}');
    setUsuarioTipo(parsed.tipo);
    const token = parsed.token;
    
    try {
      const cacheKey = 'motoristas_lista';
      const cachedData = await AsyncStorage.getItem(cacheKey);
      
      if (cachedData) {
        setMotoristas(JSON.parse(cachedData));
      }
      
      const res = await fetch(API.USUARIOS, { headers: { Authorization: token } });
      const lista = await res.json();
      const motoristasFiltrados = lista.filter((m: any) => m.tipo === 'motorista');
      
      setMotoristas(motoristasFiltrados);
      await AsyncStorage.setItem(cacheKey, JSON.stringify(motoristasFiltrados)); // 1 dia
    } catch (error) {
      console.error('Erro ao carregar motoristas:', error);
    }
  };

  // 🚚 Reatribuir motorista com feedback visual
  const reatribuirMotorista = async () => {
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
        // Atualizar estado com imutabilidade
        setEntregas(prev => prev.map(entrega => 
          entrega.id === entregaSelecionada.id 
            ? { 
                ...entrega, 
                status: 'PENDENTE',
                motorista_id: parseInt(motoristaAtribuicaoId),
                nome_motorista: motoristas.find(m => m.id == motoristaAtribuicaoId)?.nome || entrega.nome_motorista
              } 
            : entrega
        ));
        
        Alert.alert('✅ Sucesso', `Entrega reatribuída para ${motoristas.find(m => m.id == motoristaAtribuicaoId)?.nome}`);
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

  // ✔️ Marcar entrega como concluída
  const marcarComoEntregue = async (id: number) => {
    const usuario = await AsyncStorage.getItem('usuario');
    const token = JSON.parse(usuario || '{}').token;

    try {
      await fetch(`${API.ENTREGAS}/concluir/${id}`, {
        method: 'PUT',
        headers: { Authorization: token },
      });
      
      // Atualização otimista
      setEntregas(prev => prev.map(e => 
        e.id === id ? { ...e, status: 'CONCLUIDA' } : e
      ));
    } catch (error) {
      Alert.alert('Erro', 'Falha ao atualizar entrega');
    }
  }; 

  // 📸 Reenviar canhoto com pré-visualização
  const reenviarCanhoto = async (entregaId: number) => {
    try {
      const permissao = await ImagePicker.requestCameraPermissionsAsync();
      if (permissao.status !== 'granted') {
        Alert.alert('Permissão necessária', 'Precisamos acessar sua câmera para tirar fotos do canhoto');
        return;
      }

      const imagem = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3],
      });
      
      if (imagem.canceled) return;

      setImagemSelecionada(imagem.assets[0].uri);
      setModalImagemVisivel(true);
      
      // Perguntar se deseja enviar após visualização
      Alert.alert(
        'Confirmar envio',
        'Deseja enviar esta foto como canhoto?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Enviar', 
            onPress: async () => {
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
                  'Content-Type': 'multipart/form-data',
                },
              });

              if (res.ok) {
                Alert.alert('✅ Sucesso', 'Canhoto enviado com sucesso');
                buscarEntregas();
              } else {
                const errorData = await res.json();
                Alert.alert('⚠️ Erro', errorData.error || 'Falha no envio do canhoto');
              }
            }
          }
        ]
      );
    } catch (err) {
      console.error('❌ Erro ao reenviar canhoto:', err);
      Alert.alert('Erro', 'Falha ao processar a imagem');
    }
  };

  // 🎨 Componente de card de entrega
  const EntregaCard = ({ entrega }: { entrega: any }) => (
    
    <View style={[
      styles.card,
      entrega.status === 'CONCLUIDA' && styles.cardConcluida,
      entrega.status === 'PENDENTE' && styles.cardPendente,
      entrega.status === 'CANCELADA' && styles.cardCancelada
    ]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{entrega.cliente_nome}</Text>
        <View style={[
          styles.statusBadge,
          entrega.status === 'CONCLUIDA' && styles.badgeSuccess,
          entrega.status === 'PENDENTE' && styles.badgeWarning,
          entrega.status === 'CANCELADA' && styles.badgeDanger
        ]}>
          <Text style={styles.badgeText}>{entrega.status}</Text>
        </View>
      </View>
      
      
      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Feather name="file-text" size={16} color={COLORS.text} />
          <Text style={styles.infoText}>Nota: {entrega.nota}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Feather name="calendar" size={16} color={COLORS.text} />
          <Text style={styles.infoText}>
            {new Date(entrega.data_emissao).toLocaleDateString('pt-BR')}
          </Text>
        </View>
        
        <View style={styles.infoRow}>
          <Feather name="dollar-sign" size={16} color={COLORS.text} />
          <Text style={styles.infoText}>
            R$ {parseFloat(entrega.valor_total).toFixed(2)}
          </Text>
        </View>
        
        <View style={styles.infoRow}>
          <Ionicons name="person" size={16} color={COLORS.text} />
          <Text style={styles.infoText}>
            {entrega.nome_motorista || 'Não atribuído'}
          </Text>
        </View>
      </View>
      
      {entrega.canhoto_path ? (
        <TouchableOpacity 
          style={styles.canhotoButton}
          onPress={() => {
            const url = `${API.BASE}/uploads/${entrega.canhoto_path.split('/').pop()}`;
            setImagemSelecionada(url);
            setModalImagemVisivel(true);
          }}
        >
          <Feather name="file" size={16} color={COLORS.primary} />
          <Text style={styles.canhotoText}>Ver Canhoto</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.canhotoMissing}>
          <Feather name="alert-circle" size={16} color={COLORS.warning} />
          <Text style={styles.canhotoMissingText}>Canhoto não disponível</Text>
        </View>
      )}
      
      <View style={styles.cardFooter}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => { 
            setEntregaSelecionada(entrega); 
            setModalAtribuirVisivel(true); 
          }}
        >
          <Ionicons name="person-add" size={16} color={COLORS.primary} />
          <Text style={styles.actionText}>Atribuir</Text>
        </TouchableOpacity>

        {usuarioTipo === 'admin' && (
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => reenviarCanhoto(entrega.id)}
          >
            <Ionicons name="camera" size={16} color={COLORS.accent} />
            <Text style={styles.actionText}>Canhoto</Text>
          </TouchableOpacity>
        )}

        {entrega.status === 'PENDENTE' && (
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => marcarComoEntregue(entrega.id)}
          >
            <Feather name="check-circle" size={16} color={COLORS.success} />
            <Text style={styles.actionText}>Concluir</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // Efeitos iniciais
  useEffect(() => {
    buscarEntregas();
    carregarMotoristas();
  }, []);

  // 🔎 Filtra as entregas pelo status selecionado (no frontend)
const entregasFiltradas = statusSelecionado === 'TODOS'
  ? entregas
  : entregas.filter(e => {
      // Corrige nome do status "ENTREGUE" para "CONCLUIDA" se seu backend usa um, o frontend outro
      if (statusSelecionado === 'ENTREGUE') return e.status === 'CONCLUIDA' || e.status === 'ENTREGUE';
      return e.status === statusSelecionado;
    });


  return (
    <ProtectedRoute permitido={['admin']}>
      <StatusBar style="dark" />
      
      {/* Header com título e botão de PDF */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Controle de Entregas</Text>
        <TouchableOpacity onPress={gerarPDF} style={styles.pdfButton}>
          <MaterialIcons name="picture-as-pdf" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Barra de busca */}
            <View style={styles.searchContainer}>
        <Feather name="search" size={20} color={COLORS.text} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar cliente, nota, CNPJ..."
          placeholderTextColor="#999"
          value={busca}
          onChangeText={setBusca}
          returnKeyType="search"
        />
        <TouchableOpacity onPress={() => setBusca('')}>
          <Feather name="x" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Painel de filtros expansível */}
      <View style={styles.filtersPanel}>
  <View style={styles.filterRow}>
    <TouchableOpacity 
      style={styles.dateButton}
      onPress={() => { setTipoCalendario('inicio'); setMostrarCalendario(true); }}>
      <Feather name="calendar" size={18} color={COLORS.primary} />
      <Text style={styles.dateButtonText}>Início: {formatarData(inicio)}</Text>
    </TouchableOpacity>
    <Text style={{marginHorizontal:6}}>-</Text>
    <TouchableOpacity 
      style={styles.dateButton}
      onPress={() => { setTipoCalendario('fim'); setMostrarCalendario(true); }}>
      <Feather name="calendar" size={18} color={COLORS.primary} />
      <Text style={styles.dateButtonText}>Fim: {formatarData(fim)}</Text>
    </TouchableOpacity>
  </View>
  
  <View style={styles.filterRow}>
    <View style={styles.pickerContainer}>
      <Picker
        selectedValue={motoristaSelecionado}
        onValueChange={setMotoristaSelecionado}
        dropdownIconColor={COLORS.primary}
        style={styles.picker}
      >
        <Picker.Item label="Todos motoristas" value="" />
        {motoristas.map((m) => (
          <Picker.Item key={m.id} label={m.nome} value={m.id} />
        ))}
      </Picker>
    </View>
    <View style={styles.pickerContainer}>
      <Picker
        selectedValue={statusSelecionado}
        onValueChange={setStatusSelecionado}
        dropdownIconColor={COLORS.primary}
        style={styles.picker}
      >
        <Picker.Item label="Todos status" value="TODOS" />
        <Picker.Item label="Pendentes" value="PENDENTE" />
        <Picker.Item label="Concluídas" value="ENTREGUE" />
        <Picker.Item label="Canceladas" value="CANCELADA" />
      </Picker>
    </View>
  </View>
</View>

     {mostrarCalendario && (
  <DateTimePicker
    value={tipoCalendario === 'inicio' ? inicio : fim}
    mode="date"
    display="calendar" // <<--- força o calendário moderno cheio
    onChange={(_, data) => {
      setMostrarCalendario(false);
      if (data) {
        tipoCalendario === 'inicio' ? setInicio(data) : setFim(data);
        buscarEntregas();
      }
    }}
    minimumDate={new Date(2023, 0, 1)}
    maximumDate={new Date(2050, 11, 31)}
  />
)}



      {/* Lista de entregas com refresh */}
      <ScrollView
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
          {carregando ? (
  <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
) : entregasFiltradas.length === 0 ? (
  <View style={styles.emptyState}>
    <Feather name="package" size={64} color={COLORS.border} />
    <Text style={styles.emptyText}>Nenhuma entrega encontrada</Text>
    <Text style={styles.emptySubtext}>Ajuste os filtros ou tente novamente mais tarde</Text>
  </View>
) : statusSelecionado === 'TODOS' ? (
  <>
    {/* Agrupa por status usando entregasFiltradas */}
    {entregasFiltradas.filter(e => e.status === 'PENDENTE').length > 0 && (
      <>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🚚 Entregas Pendentes</Text>
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>
              {entregasFiltradas.filter(e => e.status === 'PENDENTE').length}
            </Text>
          </View>
        </View>
        {entregasFiltradas
          .filter(e => e.status === 'PENDENTE')
          .map((e) => (
            <EntregaCard key={e.id} entrega={e} />
          ))}
      </>
    )}

    {entregasFiltradas.filter(e => e.status === 'CONCLUIDA' || e.status === 'ENTREGUE').length > 0 && (
      <>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>✔️ Entregas Concluídas</Text>
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>
              {entregasFiltradas.filter(e => e.status === 'CONCLUIDA' || e.status === 'ENTREGUE').length}
            </Text>
          </View>
        </View>
        {entregasFiltradas
          .filter(e => e.status === 'CONCLUIDA' || e.status === 'ENTREGUE')
          .map((e) => (
            <EntregaCard key={e.id} entrega={e} />
          ))}
      </>
    )}

    {entregasFiltradas.filter(e => e.status === 'CANCELADA').length > 0 && (
      <>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>❌ Canceladas</Text>
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>
              {entregasFiltradas.filter(e => e.status === 'CANCELADA').length}
            </Text>
          </View>
        </View>
        {entregasFiltradas
          .filter(e => e.status === 'CANCELADA')
          .map((e) => (
            <EntregaCard key={e.id} entrega={e} />
          ))}
      </>
    )}
  </>
) : (
  // Se filtro for só de um status, mostra tudo junto
  entregasFiltradas.map((e) => <EntregaCard key={e.id} entrega={e} />)
)}


      </ScrollView>

      {/* Modal de visualização de imagem */}
      <Modal 
        visible={modalImagemVisivel} 
        transparent 
        animationType="fade"
        onRequestClose={() => setModalImagemVisivel(false)}
      >
        <View style={styles.imageModal}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setModalImagemVisivel(false)}
          >
            <Feather name="x" size={28} color="#fff" />
          </TouchableOpacity>
          
          <Image
            source={{ uri: imagemSelecionada }}
            style={styles.fullImage}
            resizeMode="contain"
          />
          
          <TouchableOpacity
            style={styles.downloadButton}
            onPress={() => Sharing.shareAsync(imagemSelecionada)}
          >
            <Feather name="download" size={20} color="#fff" />
            <Text style={styles.downloadText}>Salvar Imagem</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Modal para atribuir motorista */}
      <Modal 
        visible={modalAtribuirVisivel} 
        transparent 
        animationType="slide"
        onRequestClose={() => setModalAtribuirVisivel(false)}
      >
        <View style={styles.assignModal}>
          <View style={styles.assignModalContent}>
            <Text style={styles.modalTitle}>Atribuir Motorista</Text>
            
            <View style={styles.assignmentInfo}>
              <Text style={styles.infoLabel}>Cliente:</Text>
              <Text style={styles.infoValue}>{entregaSelecionada?.cliente_nome}</Text>
            </View>
            
            <View style={styles.assignmentInfo}>
              <Text style={styles.infoLabel}>Nota:</Text>
              <Text style={styles.infoValue}>{entregaSelecionada?.nota}</Text>
            </View>
            
            <View style={styles.assignmentInfo}>
              <Text style={styles.infoLabel}>Valor:</Text>
              <Text style={styles.infoValue}>
                R$ {parseFloat(entregaSelecionada?.valor_total || 0).toFixed(2)}
              </Text>
            </View>

            <View style={styles.pickerModalContainer}>
              <Picker
                selectedValue={motoristaAtribuicaoId}
                onValueChange={setMotoristaAtribuicaoId}
                dropdownIconColor={COLORS.primary}
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
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalAtribuirVisivel(false)}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.assignButton]}
                onPress={reatribuirMotorista}
                disabled={!motoristaAtribuicaoId || atribuindo}
              >
                {atribuindo ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.buttonText, styles.assignButtonText]}>Atribuir</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  // 🎨 Estilos premium
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  pdfButton: {
    backgroundColor: COLORS.danger,
    padding: 10,
    borderRadius: 50,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  filterButton: {
    padding: 5,
  },
  filtersPanel: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
 dateButton: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: COLORS.light,
  padding: 12,
  borderRadius: 10,
  marginHorizontal: 3,
  elevation: 2,
},
  dateButtonText: {
  marginLeft: 6,
  color: COLORS.text,
  fontWeight: '500',
  fontSize: 15,
  
},
  pickerContainer: {
    flex: 1,
    backgroundColor: COLORS.light,
    borderRadius: 8,
    marginHorizontal: 4,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: COLORS.text,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loader: {
    marginTop: 40,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  sectionBadge: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 10,
  },
  sectionBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardConcluida: {
    borderLeftWidth: 6,
    borderLeftColor: COLORS.success,
  },
  cardPendente: {
    borderLeftWidth: 6,
    borderLeftColor: COLORS.warning,
  },
  cardCancelada: {
    borderLeftWidth: 6,
    borderLeftColor: COLORS.danger,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark,
    flexShrink: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeSuccess: {
    backgroundColor: '#e8f5e9',
  },
  badgeWarning: {
    backgroundColor: '#fff8e1',
  },
  badgeDanger: {
    backgroundColor: '#ffebee',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardBody: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoText: {
    marginLeft: 8,
    color: COLORS.text,
  },
  canhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    marginBottom: 12,
  },
  canhotoText: {
    marginLeft: 8,
    color: COLORS.primary,
    fontWeight: '500',
  },
  canhotoMissing: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff8e1',
    borderRadius: 8,
    marginBottom: 12,
  },
  canhotoMissingText: {
    marginLeft: 8,
    color: COLORS.warning,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    marginLeft: 6,
    fontWeight: '500',
  },
  imageModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  fullImage: {
    width: '100%',
    height: '70%',
  },
  downloadButton: {
    position: 'absolute',
    bottom: 50,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
  },
  downloadText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  assignModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  assignModalContent: {
    backgroundColor: '#fff',
    width: '90%',
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 20,
    textAlign: 'center',
  },
  assignmentInfo: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  infoLabel: {
    fontWeight: 'bold',
    color: COLORS.text,
    width: 80,
  },
  infoValue: {
    flex: 1,
    color: COLORS.text,
  },
  pickerModalContainer: {
    backgroundColor: COLORS.light,
    borderRadius: 12,
    marginVertical: 16,
    overflow: 'hidden',
  },
  pickerModal: {
    height: 50,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 6,
  },
  cancelButton: {
    backgroundColor: COLORS.light,
  },
  assignButton: {
    backgroundColor: COLORS.primary,
  },
  buttonText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  assignButtonText: {
    color: '#fff',
  },
});