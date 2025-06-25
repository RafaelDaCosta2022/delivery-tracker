import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, TouchableOpacity,
  TextInput, ScrollView, RefreshControl, Alert, Modal
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { MaterialIcons, Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import ImageViewing from 'react-native-image-viewing';
import { useFocusEffect } from '@react-navigation/native';

import { API, authHeader } from './config';
import ProtectedRoute from './ProtectedRoute';
import { useAuth } from './ProtectedRoute';

const COLORS = {
  primary: '#4361ee',
  secondary: '#3a0ca3',
  accent: '#4895ef',
  success: '#4cc9f0',
  danger: '#f72585',
  warning: '#f8961e',
  light: '#f8f9fa',
  dark: '#212529',
  background: '#f0f8ff',
  card: '#ffffff',
  text: '#343a40',
  border: '#dee2e6'
};

const STATUS_OPTIONS = [
  { label: 'Todos status', value: 'TODOS' },
  { label: 'Pendentes', value: 'PENDENTE' },
  { label: 'Concluídas', value: 'CONCLUIDA' },
  { label: 'Canceladas', value: 'CANCELADA' }
];

const CentralControleScreen = () => {
  const { usuario } = useAuth();
  const [state, setState] = useState({
    entregas: [] as any[],
    filtradas: [] as any[],
    motoristas: [] as any[],
    carregando: true,
    refreshing: false,
    busca: '',
    motoristaSelecionado: '',
    statusSelecionado: 'TODOS',
    inicio: new Date(new Date().setDate(new Date().getDate() - 7)),
    fim: new Date(),
    mostrarCalendario: false,
    tipoCalendario: 'inicio' as 'inicio' | 'fim',
    entregaSelecionada: null as any,
    modalImagemVisivel: false,
    imagemSelecionada: null as string | null,
    modalAtribuirVisivel: false,
    motoristaAtribuicaoId: '',
    atribuindo: false,
    distribuindo: false,
    entregasParaDistribuir: [] as number[],
    modalDistribuirVisivel: false,
    filtrosAbertos: false,
    filtroAtivo: false,
  });

  // Atualiza apenas as propriedades necessárias
  const setStatePartial = (partial: any) => setState(prev => ({ ...prev, ...partial }));

  // Carrega dados ao focar na tela
  useFocusEffect(
    useCallback(() => {
      carregarDados();
    }, [])
  );

  // Carrega dados iniciais
  const carregarDados = async () => {
  try {
    setStatePartial({ carregando: true });

    const hoje = new Date();
    const trintaDiasAtras = new Date();
    trintaDiasAtras.setDate(hoje.getDate() - 30);

    // Aplica filtro PENDENTE e intervalo de 30 dias
    setState(prev => ({
      ...prev,
      inicio: trintaDiasAtras,
      fim: hoje,
      statusSelecionado: 'PENDENTE'
    }));

    await carregarMotoristas();

    // Espera um pequeno delay para garantir que o state foi atualizado
    setTimeout(() => {
      buscarEntregas(); // chama após filtros aplicados
    }, 100);
    
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
    Alert.alert('Erro', 'Falha ao carregar dados iniciais');
  } finally {
    setStatePartial({ carregando: false });
  }
};


  // Carrega lista de motoristas
  const carregarMotoristas = async () => {
  try {
    const headers = await authHeader();
    const res = await fetch(API.USUARIOS(), { method: 'GET', headers });

    if (!res.ok) {
      const textoErro = await res.text();
      throw new Error(`Erro ${res.status}: ${textoErro}`);
    }

    const lista = await res.json();
    const motoristasFiltrados = lista.filter((m: any) => m.tipo === 'motorista');

    setStatePartial({ motoristas: motoristasFiltrados });
  } catch (error: any) {
    console.error('❌ Erro ao carregar motoristas:', error);
    Alert.alert('Erro', error.message || 'Falha ao carregar motoristas');
    setStatePartial({ motoristas: [] });
  }
};




  // Busca entregas com filtros
  const buscarEntregas = async () => {
    try {
      setStatePartial({ refreshing: true });
      const headers = await authHeader();

      // Construir parâmetros de filtro CORRETOS
      const params = new URLSearchParams();
      params.append('dataInicio', formatarDataAPI(state.inicio));
      params.append('dataFim', formatarDataAPI(state.fim));
      
      if (state.motoristaSelecionado) {
        params.append('motorista', state.motoristaSelecionado);
      }
      
      // Corrigir mapeamento de status
      let statusBackend = state.statusSelecionado;
      if (statusBackend === 'CONCLUIDA') statusBackend = 'ENTREGUE';
      if (statusBackend !== 'TODOS') {
        params.append('status', statusBackend);
      }
      
      if (state.busca) {
        params.append('busca', state.busca);
      }

      const url = `${API.ENTREGAS()}?${params.toString()}`;
      console.log('URL de busca:', url); // DEBUG

      const response = await fetch(url, { headers });

      console.log('Status:', response.status); // DEBUG
      
      if (!response.ok) {
        const erroTexto = await response.text();
        console.error('Erro na resposta:', erroTexto); // DEBUG
        throw new Error(`Erro ${response.status}: ${erroTexto}`);
      }

      const data = await response.json();
      console.log('Entregas recebidas:', data); // DEBUG
      
      // Ordenar por data de lançamento (mais recentes primeiro)
      const entregasOrdenadas = data.sort((a: any, b: any) => 
        new Date(b.data_lancamento).getTime() - new Date(a.data_lancamento).getTime()
      );
      
      setStatePartial({ 
        entregas: entregasOrdenadas,
        filtradas: entregasOrdenadas,
        refreshing: false
      });
    } catch (error: any) {
      console.error('Erro completo ao buscar:', error); // DEBUG
      Alert.alert('Erro', error.message || 'Falha ao buscar entregas');
      setStatePartial({ refreshing: false });
    }
  };

  // Formata data para API
  const formatarDataAPI = (data: Date) => {
    return data.toISOString().split('T')[0];
  };

  // Formata data para exibição
  const formatarDataExibicao = (data: Date) => {
    return data.toLocaleDateString('pt-BR');
  };

  // Atualiza filtros com debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      buscarEntregas();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [state.busca, state.inicio, state.fim, state.motoristaSelecionado, state.statusSelecionado]);

  // Limpar todos os filtros
  const limparFiltros = () => {
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    
    setStatePartial({
      busca: '',
      motoristaSelecionado: '',
      statusSelecionado: 'TODOS',
      inicio: inicioMes,
      fim: hoje,
      filtroAtivo: false
    });
  };

  // Gera relatório PDF
  const gerarPDF = async () => {
    try {
      const { entregas } = state;
      const totalEntregas = entregas.length;
      const entregues = entregas.filter((e: any) => 
        e.status === 'CONCLUIDA' || e.status === 'ENTREGUE'
      ).length;
      const pendentes = totalEntregas - entregues;
      
      const html = `
        <html>
          <head>
            <style>
              body { font-family: sans-serif; padding: 20px; }
              h1 { color: ${COLORS.primary}; text-align: center; }
              .stats { display: flex; justify-content: space-around; margin: 20px 0; }
              .stat-card { background: #f0f8ff; padding: 15px; border-radius: 10px; text-align: center; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th { background-color: ${COLORS.primary}; color: white; padding: 10px; }
              tr:nth-child(even) { background-color: #f2f2f2; }
              td { padding: 8px; border-bottom: 1px solid #ddd; }
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
            <table>
              <tr>
                <th>Cliente</th>
                <th>Nota</th>
                <th>Cidade</th>
                <th>Data</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Motorista</th>
              </tr>
              ${state.entregas.map((e: any) => `
                <tr>
                  <td>${e.cliente_nome}</td>
                  <td>${e.nota}</td>
                  <td>${e.cidade}</td>
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

      const file = await Print.printToFileAsync({ html });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri);
      } else {
        Alert.alert('Sucesso', 'PDF gerado com sucesso');
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Falha ao gerar o PDF');
    }
  };

  // Reatribuir motorista para uma entrega específica
  const reatribuirMotorista = async () => {
    if (state.atribuindo || !state.entregaSelecionada) return;
    
    setStatePartial({ atribuindo: true });
    try {
      const headers = await authHeader();
      const token = headers.Authorization;
      
      if (!token) {
        throw new Error('Token não encontrado');
      }

      const response = await fetch(API.ATRIBUIR_MOTORISTA(), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
        },
        body: JSON.stringify({
          entregaId: state.entregaSelecionada.id,
          motoristaId: state.motoristaAtribuicaoId ? parseInt(state.motoristaAtribuicaoId) : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha na reatribuição');
      }

      // Atualização otimista
      setStatePartial(prev => {
        const novasEntregas = prev.entregas.map((e: any) => 
          e.id === state.entregaSelecionada.id 
            ? { 
                ...e, 
                status: 'PENDENTE',
                motorista_id: state.motoristaAtribuicaoId ? parseInt(state.motoristaAtribuicaoId) : null,
                nome_motorista: state.motoristaAtribuicaoId 
                  ? prev.motoristas.find((m: any) => m.id == state.motoristaAtribuicaoId)?.nome || null
                  : null
              } 
            : e
        );
        
        return { 
          entregas: novasEntregas,
          filtradas: novasEntregas
        };
      });
      
      if (state.motoristaAtribuicaoId) {
        Alert.alert('✅ Sucesso', `Entrega reatribuída para ${state.motoristas.find((m: any) => m.id == state.motoristaAtribuicaoId)?.nome}`);
      } else {
        Alert.alert('✅ Sucesso', 'Motorista removido da entrega');
      }
    } catch (error: any) {
      Alert.alert('❌ Erro', error.message || 'Falha na operação');
    } finally {
      setStatePartial({ 
        atribuindo: false,
        modalAtribuirVisivel: false,
        entregaSelecionada: null,
        motoristaAtribuicaoId: ''
      });
    }
  };

  // Distribuir múltiplas entregas para um motorista
  const distribuirEntregas = async () => {
    if (state.distribuindo || !state.motoristaAtribuicaoId || state.entregasParaDistribuir.length === 0) return;
    
    setStatePartial({ distribuindo: true });
    try {
      const headers = await authHeader();
      const token = headers.Authorization;
      
      if (!token) {
        throw new Error('Token não encontrado');
      }

      // Enviar todas as entregas para o servidor de uma vez
      const response = await fetch(API.DISTRIBUIR_ENTREGAS, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
        },
        body: JSON.stringify({
          entregasIds: state.entregasParaDistribuir,
          motoristaId: parseInt(state.motoristaAtribuicaoId),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha na distribuição');
      }

      // Atualização otimista
      setStatePartial(prev => {
        const motorista = prev.motoristas.find((m: any) => m.id == state.motoristaAtribuicaoId);
        const nomeMotorista = motorista ? motorista.nome : null;
        
        const novasEntregas = prev.entregas.map((e: any) => 
          prev.entregasParaDistribuir.includes(e.id)
            ? { 
                ...e, 
                status: 'PENDENTE',
                motorista_id: parseInt(state.motoristaAtribuicaoId),
                nome_motorista: nomeMotorista
              } 
            : e
        );
        
        return { 
          entregas: novasEntregas,
          filtradas: novasEntregas,
          entregasParaDistribuir: []
        };
      });
      
      Alert.alert('✅ Sucesso', `${state.entregasParaDistribuir.length} entregas atribuídas para ${nomeMotorista}`);
    } catch (error: any) {
      Alert.alert('❌ Erro', error.message || 'Falha na distribuição');
    } finally {
      setStatePartial({ 
        distribuindo: false,
        modalDistribuirVisivel: false,
        motoristaAtribuicaoId: ''
      });
    }
  };

  // Selecionar entrega para distribuição em massa
  const selecionarEntrega = (id: number) => {
    setStatePartial(prev => {
      const novasSelecoes = [...prev.entregasParaDistribuir];
      const index = novasSelecoes.indexOf(id);
      
      if (index > -1) {
        novasSelecoes.splice(index, 1);
      } else {
        novasSelecoes.push(id);
      }
      
      return { entregasParaDistribuir: novasSelecoes };
    });
  };

  // Função para reenviar o canhoto
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

    // Perguntar se deseja enviar após visualização
    Alert.alert(
      'Confirmar envio',
      'Deseja enviar esta foto como canhoto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Enviar', 
          onPress: async () => {
            try {
              const headers = await authHeader();
              const token = headers.Authorization;
              
              if (!token) {
                throw new Error('Token não encontrado');
              }

              // CORREÇÃO: URL CORRETA E MÉTODO POST
              const formData = new FormData();
              formData.append('file', {
                uri: imagem.assets[0].uri,
                name: `canhoto_${entregaId}.jpg`,
                type: 'image/jpeg',
              } as any);

              // URL CORRIGIDA
              const res = await fetch(API.CANHOTO(entregaId), {
                method: 'POST', // MÉTODO POST CORRETO
                body: formData,
                headers: {
                  Authorization: token,
                },
              });

              if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Falha no envio do canhoto');
              }

              Alert.alert('✅ Sucesso', 'Canhoto enviado com sucesso');
              buscarEntregas();
            } catch (error: any) {
              Alert.alert('⚠️ Erro', error.message || 'Falha na operação');
            }
          }
        }
      ]
    );
  } catch (error: any) {
    Alert.alert('❌ Erro', error.message || 'Falha ao processar a imagem');
  }
};

  // Função para marcar entrega como entregue
  const marcarComoEntregue = (entrega: any) => {
    if (entrega.status !== 'PENDENTE') return;

    if (!entrega.canhoto_path) {
      Alert.alert(
        'Sem Canhoto',
        'Essa entrega ainda não possui canhoto. Tem certeza que deseja marcar como concluída?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Confirmar', onPress: () => concluirEntrega(entrega.id) }
        ]
      );
    } else {
      concluirEntrega(entrega.id);
    }
  };

  // Concluir entrega
  const concluirEntrega = async (id: number) => {
    try {
      const headers = await authHeader();
      const token = headers.Authorization;
      
      if (!token) {
        throw new Error('Token não encontrado');
      }

      const response = await fetch(`${API.ENTREGAS}/concluir/${id}`, {
        method: 'PUT',
        headers: { Authorization: token },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao atualizar entrega');
      }

      // Atualização otimista
      setStatePartial(prev => {
        const novasEntregas = prev.entregas.map((e: any) => 
          e.id === id ? { ...e, status: 'CONCLUIDA' } : e
        );
        
        return { 
          entregas: novasEntregas,
          filtradas: novasEntregas
        };
      });

      Alert.alert('✅ Sucesso', 'Entrega marcada como concluída');
    } catch (error: any) {
      Alert.alert('❌ Erro', error.message || 'Falha ao atualizar entrega');
    }
  };

// Componente de card de entrega
const EntregaCard = React.memo(({ entrega, selecionavel }: { entrega: any, selecionavel?: boolean }) => {
  const statusConfig = {
    'CONCLUIDA': { color: COLORS.success, label: 'Concluída' },
    'ENTREGUE': { color: COLORS.success, label: 'Entregue' },
    'PENDENTE': { color: COLORS.warning, label: 'Pendente' },
    'CANCELADA': { color: COLORS.danger, label: 'Cancelada' }
  };

  const status = statusConfig[entrega.status] || statusConfig.PENDENTE;
  const selecionada = state.entregasParaDistribuir.includes(entrega.id);

  return (
  <View style={[
    styles.card,
    { borderLeftColor: status.color, borderLeftWidth: 5 },
    selecionada && styles.cardSelecionada
  ]}>
    
    {/* CheckBox lateral esquerda */}
    {selecionavel && (
      <TouchableOpacity 
        style={styles.selecionador}
        onPress={() => selecionarEntrega(entrega.id)}
      >
        <MaterialCommunityIcons 
          name={selecionada ? "checkbox-marked" : "checkbox-blank-outline"} 
          size={24} 
          color={selecionada ? COLORS.primary : COLORS.border} 
        />
      </TouchableOpacity>
    )}

    {/* Nome do cliente e status na linha de cima */}
    <View style={styles.cardHeader}>
      <Text style={styles.cardTitle}>{entrega.cliente_nome}</Text>
    </View>

    <View style={styles.cardContent}>

      {/* Linha da Nota com destaque e status na mesma linha */}
      <View style={[styles.infoRowDestaque, { justifyContent: 'space-between' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Feather name="file-text" size={18} color={COLORS.primary} />
          <Text style={styles.infoTextDestaque}>Nota: {entrega.nota}</Text>
        </View>
        <View style={{ backgroundColor: `${status.color}20`, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 2 }}>
          <Text style={{ color: status.color, fontWeight: 'bold' }}>{status.label}</Text>
        </View>
      </View>

      {/* Cidade da entrega */}
      <View style={styles.row}>
        <Feather name="map-pin" size={16} color={COLORS.text} />
        <Text style={styles.infoText}>{entrega.cidade || '---'}</Text>
      </View>

      {/* Data de emissão */}
      <View style={styles.row}>
        <MaterialCommunityIcons name="calendar-month-outline" size={18} color={COLORS.text} />
        <Text style={styles.infoText}>
          {new Date(entrega.data_emissao).toLocaleDateString('pt-BR')}
        </Text>
      </View>

      {/* Valor total */}
      <View style={styles.row}>
        <MaterialCommunityIcons name="cash-multiple" size={18} color={COLORS.text} />
        <Text style={styles.infoText}>R$ {parseFloat(entrega.valor_total).toFixed(2)}</Text>
      </View>

      {/* Nome do motorista (se houver) */}
      <View style={styles.row}>
        <MaterialCommunityIcons name="truck-delivery-outline" size={18} color={COLORS.text} />
        <Text style={styles.infoText}>{entrega.nome_motorista || 'Não atribuído'}</Text>
      </View>
    </View>

    {/* Canhoto (esquerda) */}
    <View style={styles.canhotoContainer}>
      {entrega.canhoto_path ? (
        <TouchableOpacity 
          style={styles.canhotoButton}
          onPress={() => {
            const url = `${API.BASE()}/uploads/${entrega.canhoto_path.split('/').pop()}`;
            setStatePartial({ 
              imagemSelecionada: url,
              modalImagemVisivel: true
            });
          }}
        >
          <Feather name="eye" size={20} color="#007AFF" />
          <Text style={styles.canhotoText}>Ver Canhoto</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.canhotoMissing}>
          <Feather name="alert-circle" size={16} color="orange" />
          <Text style={styles.canhotoMissingText}>Sem canhoto</Text>
        </View>
      )}
    </View>

    {/* Botões inferiores: atribuir, canhoto, concluir */}
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 10 }}>
      
      {/* Botão: Atribuir */}
      <TouchableOpacity 
        style={[styles.actionButton, { flex: 1, alignSelf: 'flex-start' }]} 
        onPress={() => {
          setStatePartial({ 
            entregaSelecionada: entrega, 
            motoristaAtribuicaoId: entrega.motorista_id ? entrega.motorista_id.toString() : '', 
            modalAtribuirVisivel: true 
          });
        }}
      >
        <Ionicons name="person-add" size={16} color={COLORS.primary} />
        <Text style={styles.actionText}>Atribuir</Text>
      </TouchableOpacity>

      {/* Botão: Canhoto (somente admin) */}
      {usuario?.tipo === 'admin' && (
        <TouchableOpacity 
          style={[styles.actionButton, { flex: 1, alignSelf: 'center' }]} 
          onPress={() => reenviarCanhoto(entrega.id)}
        >
          <Ionicons name="camera" size={16} color={COLORS.accent} />
          <Text style={styles.actionText}>Canhoto</Text>
        </TouchableOpacity>
      )}

      {/* Botão: Concluir */}
      {entrega.status === 'PENDENTE' && (
        <TouchableOpacity 
          style={[styles.actionButton, { flex: 1, alignSelf: 'flex-end' }]} 
          onPress={() => marcarComoEntregue(entrega)}
        >
          <Feather name="check-circle" size={16} color={COLORS.success} />
          <Text style={styles.actionText}>Concluir</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

});


  // Agrupa entregas por status
  const entregasAgrupadas = useMemo(() => {
    const grupos = {
      pendentes: [] as any[],
      concluidas: [] as any[],
      canceladas: [] as any[]
    };

    state.filtradas.forEach((e: any) => {
      if (e.status === 'PENDENTE') {
        grupos.pendentes.push(e);
      } else if (e.status === 'CONCLUIDA' || e.status === 'ENTREGUE') {
        grupos.concluidas.push(e);
      } else if (e.status === 'CANCELADA') {
        grupos.canceladas.push(e);
      }
    });

    return grupos;
  }, [state.filtradas]);

  if (!usuario) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }
  // 🔍 Modal de imagem de canhoto
const renderModalImage = () => (
  <Modal
    visible={state.modalImagemVisivel}
    transparent={true}
    animationType="slide"
    onRequestClose={() => setStatePartial({ modalImagemVisivel: false })}
  >
    <View style={styles.modalBackground}>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => setStatePartial({ modalImagemVisivel: false })}
      >
        <Text style={styles.closeButtonText}>Fechar</Text>
      </TouchableOpacity>

      {state.imagemSelecionada ? (
        <ImageViewing
          images={[{ uri: state.imagemSelecionada }]}
          imageIndex={0}
          visible={true}
          onRequestClose={() => setStatePartial({ modalImagemVisivel: false })}
        />
      ) : (
        <View style={styles.semImagemContainer}>
          <Text style={styles.semImagemTexto}>Imagem não disponível</Text>
        </View>
      )}
    </View>
  </Modal>
);


  return (
    
    <ProtectedRoute permitido={['admin']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Controle de Entregas</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              onPress={() => setStatePartial({ modalDistribuirVisivel: true })}
              style={styles.distribuirButton}
            >
              <MaterialCommunityIcons name="truck-plus" size={24} color="#fff" />
              <Text style={styles.distribuirText}>Distribuir</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={gerarPDF} style={styles.pdfButton}>
              <MaterialIcons name="picture-as-pdf" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Barra de busca aprimorada */}
        <View style={styles.searchContainer}>
          <TextInput
            placeholder="Buscar cliente, nota, cidade ou CNPJ"
            placeholderTextColor="#95a5a6"
            value={state.busca}
            onChangeText={(text) => setStatePartial({ 
              busca: text,
              filtroAtivo: text.length > 0 || 
                state.motoristaSelecionado !== '' || 
                state.statusSelecionado !== 'TODOS'
            })}
            style={styles.searchInput}
          />
          <Feather 
            name="search" 
            size={20} 
            color={COLORS.primary} 
            style={styles.searchIcon} 
          />
          {(state.busca || state.motoristaSelecionado || state.statusSelecionado !== 'TODOS') && (
            <TouchableOpacity
              onPress={limparFiltros}
              style={styles.clearFiltersButton}
            >
              <Feather name="x-circle" size={24} color={COLORS.danger} />
            </TouchableOpacity>
          )}
        </View>

        {/* Painel de filtros com indicador visual */}
        <TouchableOpacity 
          onPress={() => setStatePartial({ filtrosAbertos: !state.filtrosAbertos })}
          style={styles.filtrosHeader}
        >
          <Text style={styles.filtrosHeaderText}>
            <Feather name="filter" size={16} /> FILTROS {state.filtroAtivo ? '• ATIVOS' : ''}
          </Text>
          <Feather 
            name={state.filtrosAbertos ? "chevron-up" : "chevron-down"} 
            size={20} 
            color={COLORS.primary} 
          />
        </TouchableOpacity>

        {state.filtrosAbertos && (
          <View style={styles.filtersPanel}>
            <View style={styles.filterRow}>
              <TouchableOpacity 
                style={styles.dateButton}
                onPress={() => setStatePartial({ 
                  mostrarCalendario: true,
                  tipoCalendario: 'inicio'
                })}
              >
                <Feather name="calendar" size={16} color={COLORS.primary} />
                <Text style={styles.dateButtonText}>
                  Início: {formatarDataExibicao(state.inicio)}
                </Text>
              </TouchableOpacity>
              
              <Text style={{ marginHorizontal: 8, color: COLORS.text }}>—</Text>
              
              <TouchableOpacity 
                style={styles.dateButton}
                onPress={() => setStatePartial({ 
                  mostrarCalendario: true,
                  tipoCalendario: 'fim'
                })}
              >
                <Feather name="calendar" size={16} color={COLORS.primary} />
                <Text style={styles.dateButtonText}>
                  Fim: {formatarDataExibicao(state.fim)}
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.filterRow}>
  <View style={styles.pickerContainer}>
    <Picker
      selectedValue={state.motoristaSelecionado}
      onValueChange={(value) => {
        setStatePartial({ 
          motoristaSelecionado: value,
          filtroAtivo: value !== '' || 
            state.busca !== '' || 
            state.statusSelecionado !== 'TODOS'
        });
      }}
      dropdownIconColor={COLORS.primary}
      style={styles.picker}
    >
      <Picker.Item label="Todos motoristas" value="" />
      <Picker.Item label="Não atribuídas" value="SEM_MOTORISTA" />
      {state.motoristas.map((m: any) => (
        <Picker.Item key={m.id} label={m.nome} value={m.id} />
      ))}
    </Picker>
  </View>

  <View style={styles.pickerContainer}>
    <Picker
      selectedValue={state.statusSelecionado}
      onValueChange={(value) => {
        setStatePartial({ 
          statusSelecionado: value,
          filtroAtivo: value !== 'TODOS' || 
            state.busca !== '' || 
            state.motoristaSelecionado !== ''
        });
      }}
      dropdownIconColor={COLORS.primary}
      style={styles.picker}
    >
      {STATUS_OPTIONS.map((option) => (
        <Picker.Item 
          key={option.value} 
          label={option.label} 
          value={option.value} 
        />
      ))}
    </Picker>
  </View>
</View>

{/* ESPAÇO EXTRA PRA EVITAR CORTE */}
<View style={{ height: 32 }} />
</View>
        )}

        {/* Lista de entregas */}
       <ScrollView
  contentContainerStyle={{ paddingBottom: 140 }}
  keyboardShouldPersistTaps="handled"
  showsVerticalScrollIndicator={false}
>
          {state.carregando ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
          ) : state.filtradas.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons 
                name="truck-remove" 
                size={60} 
                color={COLORS.border} 
              />
              <Text style={styles.emptyText}>Nenhuma entrega encontrada</Text>
              <Text style={styles.emptySubtext}>
                Ajuste os filtros ou tente novamente
              </Text>
            </View>
          ) : (
            <>
              {/* Seção Pendentes */}
              {entregasAgrupadas.pendentes.length > 0 && (
                <>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>🚚 Pendentes</Text>
                    <View style={styles.sectionBadge}>
                      <Text style={styles.sectionBadgeText}>
                        {entregasAgrupadas.pendentes.length}
                      </Text>
                    </View>
                  </View>
                  {entregasAgrupadas.pendentes.map((e) => (
                    <EntregaCard 
                      key={e.id} 
                      entrega={e} 
                      selecionavel={state.modalDistribuirVisivel}
                    />
                  ))}
                </>
              )}

              {/* Seção Concluídas */}
              {entregasAgrupadas.concluidas.length > 0 && (
                <>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>✅ Concluídas</Text>
                    <View style={styles.sectionBadge}>
                      <Text style={styles.sectionBadgeText}>
                        {entregasAgrupadas.concluidas.length}
                      </Text>
                    </View>
                  </View>
                  {entregasAgrupadas.concluidas.map((e) => (
                    <EntregaCard 
                      key={e.id} 
                      entrega={e} 
                      selecionavel={state.modalDistribuirVisivel}
                    />
                  ))}
                </>
              )}

              {/* Seção Canceladas */}
              {entregasAgrupadas.canceladas.length > 0 && (
                <>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>❌ Canceladas</Text>
                    <View style={styles.sectionBadge}>
                      <Text style={styles.sectionBadgeText}>
                        {entregasAgrupadas.canceladas.length}
                      </Text>
                    </View>
                  </View>
                  {entregasAgrupadas.canceladas.map((e) => (
                    <EntregaCard 
                      key={e.id} 
                      entrega={e} 
                      selecionavel={state.modalDistribuirVisivel}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </ScrollView>

       {/* Modal de visualização de imagem */}
{state.imagemSelecionada && state.modalImagemVisivel && (
  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }}>
    {/* Botão X para fechar */}
    <TouchableOpacity
      style={{
        position: 'absolute',
        top: 40,
        right: 20,
        backgroundColor: '#fff',
        padding: 8,
        borderRadius: 20,
        zIndex: 9999
      }}
      onPress={() => setStatePartial({ modalImagemVisivel: false })}
    >
      <Feather name="x" size={24} color="#333" />
    </TouchableOpacity>

    {/* Modal de imagem */}
    <ImageViewing
      images={[{ uri: state.imagemSelecionada }]}
      imageIndex={0}
      visible={true}
      onRequestClose={() => setStatePartial({ modalImagemVisivel: false })}
      backgroundColor="rgba(0,0,0,0.9)"
    />
  </View>
)}




        {/* Modal para atribuir motorista a uma entrega */}
        <Modal 
  visible={state.modalAtribuirVisivel} 
  transparent 
  animationType="slide"
  onRequestClose={() => setStatePartial({ modalAtribuirVisivel: false })}
>
  <View style={styles.modalOverlayDark}>
    <View style={styles.modalCardModern}>
      <View style={styles.modalHeaderModern}>
        <Text style={styles.modalTitleModern}>Atribuição de Motorista</Text>
        <TouchableOpacity 
          style={styles.closeIconModern}
          onPress={() => setStatePartial({ modalAtribuirVisivel: false })}
        >
          <Feather name="x" size={24} color={COLORS.dark} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.modalBodyModern}>
        <View style={styles.infoCardModern}>
          <Text style={styles.infoLabelModern}>CLIENTE</Text>
          <Text style={styles.infoValueModern} numberOfLines={1}>
            {state.entregaSelecionada?.cliente_nome}
          </Text>
          
          <View style={styles.dividerModern} />
          
          <View style={styles.rowSpaceBetween}>
            <View>
              <Text style={styles.infoLabelModern}>NOTA</Text>
              <Text style={styles.infoValueModern}>
                {state.entregaSelecionada?.nota}
              </Text>
            </View>
            
            <View>
              <Text style={styles.infoLabelModern}>VALOR</Text>
              <Text style={styles.infoValueModern}>
                R$ {parseFloat(state.entregaSelecionada?.valor_total || 0).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>
        
        <Text style={styles.seletorTituloModern}>ATRIBUIR MOTORISTA</Text>
        
        <View style={styles.pickerContainerModern}>
          <Picker
            selectedValue={state.motoristaAtribuicaoId}
            onValueChange={(value) => setStatePartial({ motoristaAtribuicaoId: value })}
            dropdownIconColor={COLORS.primary}
            style={styles.pickerModern}
          >
            <Picker.Item 
              label="NENHUM MOTORISTA" 
              value="" 
              style={styles.pickerItemRemover} 
            />
            {state.motoristas.map((m: any) => (
              <Picker.Item 
                key={m.id} 
                label={m.nome} 
                value={m.id} 
                style={styles.pickerItem}
              />
            ))}
          </Picker>
        </View>
      </View>
      
      <View style={styles.modalFooterModern}>
        <TouchableOpacity 
          style={[styles.modalButtonModern, styles.cancelButtonModern]}
          onPress={() => setStatePartial({ modalAtribuirVisivel: false })}
        >
          <Text style={styles.buttonTextModern}>Cancelar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.modalButtonModern, styles.assignButtonModern]}
          onPress={reatribuirMotorista}
          disabled={state.atribuindo}
        >
          {state.atribuindo ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonTextModern}>
              {state.motoristaAtribuicaoId ? 'Confirmar' : 'Remover Atribuição'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>

        {/* Modal para distribuir várias entregas */}
        <Modal 
          visible={state.modalDistribuirVisivel} 
          transparent 
          animationType="slide"
          onRequestClose={() => setStatePartial({ 
            modalDistribuirVisivel: false,
            entregasParaDistribuir: [] 
          })}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Distribuir Entregas</Text>
              
              <Text style={styles.modalSubtitle}>
                {state.entregasParaDistribuir.length} entregas selecionadas
              </Text>

              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={state.motoristaAtribuicaoId}
                  onValueChange={(value) => setStatePartial({ motoristaAtribuicaoId: value })}
                  dropdownIconColor={COLORS.primary}
                >
                  <Picker.Item label="Selecione um motorista..." value="" />
                  {state.motoristas.map((m: any) => (
                    <Picker.Item key={m.id} label={m.nome} value={m.id} />
                  ))}
                </Picker>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setStatePartial({ 
                    modalDistribuirVisivel: false,
                    entregasParaDistribuir: [] 
                  })}
                >
                  <Text style={styles.buttonText}>Cancelar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.modalButton, styles.assignButton]}
                  onPress={distribuirEntregas}
                  disabled={!state.motoristaAtribuicaoId || state.distribuindo}
                >
                  {state.distribuindo ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Distribuir</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Seletor de datas */}
        {state.mostrarCalendario && (
          <DateTimePicker
            value={state.tipoCalendario === 'inicio' ? state.inicio : state.fim}
            mode="date"
            display="calendar"
            onChange={(_, data) => {
              setStatePartial({ mostrarCalendario: false });
              if (data) {
                state.tipoCalendario === 'inicio' 
                  ? setStatePartial({ inicio: data }) 
                  : setStatePartial({ fim: data });
              }
            }}
            minimumDate={new Date(2023, 0, 1)}
            maximumDate={new Date(2050, 11, 31)}
          />
        )}
      </View>
    </ProtectedRoute>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distribuirButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    padding: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  distribuirText: {
    color: '#fff',
    marginLeft: 4,
    fontWeight: '500',
  },
  pdfButton: {
    backgroundColor: COLORS.danger,
    padding: 8,
    borderRadius: 20,
  },
  searchContainer: {
    position: 'relative',
    margin: 16,
  },
  searchInput: {
    backgroundColor: '#fff',
    padding: 12,
    paddingLeft: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 16,
    elevation: 2,
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    top: 14,
  },
  clearFiltersButton: {
    position: 'absolute',
    right: 10,
    top: 10,
    padding: 8
  },
  filtrosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef'
  },
  filtrosHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary
  },
  filtersPanel: {
  backgroundColor: '#fff',
  marginHorizontal: 16,
  borderRadius: 12,
  padding: 16,
  elevation: 3,
  zIndex: 10, // muito importante para sobreposição
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
    padding: 10,
    borderRadius: 8,
    flex: 1,
  },
  dateButtonText: {
    marginLeft: 6,
    color: COLORS.text,
    fontWeight: '500',
  },
  pickerContainer: {
    flex: 1,
  marginHorizontal: 4,
  borderWidth: 1,
  borderColor: '#ccc',
  borderRadius: 8,
  paddingHorizontal: 10,
  backgroundColor: '#fff',
  justifyContent: 'center',
  minHeight: 48, // 👈 GARANTE ALTURA SUFICIENTE
  },
  picker: {
    height: 55,
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
    textAlign: 'center',
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
    marginBottom: 12,
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
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    position: 'relative',
  },
  cardSelecionada: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  selecionador: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: COLORS.dark,
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardContent: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoRowDestaque: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#eef2ff',
    padding: 8,
    borderRadius: 8
  },
  infoTextDestaque: {
    marginLeft: 8,
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 16
  },
  infoText: {
    marginLeft: 8,
    color: COLORS.text,
    fontSize: 15,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
  },
  acoesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  acoesBotoes: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flex: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f4f8',
    padding: 8,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  actionText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
  },
  canhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F0FF',
    padding: 8,
    borderRadius: 8,
  },
  canhotoText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  canhotoMissing: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF4E6',
    padding: 8,
    borderRadius: 8,
  },
  canhotoMissingText: {
    marginLeft: 6,
    fontSize: 14,
    color: 'orange',
  },
  assignModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  assignModalContent: {
    backgroundColor: '#ffffff',
    width: '95%',
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary
  },
  modalBody: {
    padding: 20
  },
  infoDestaqueContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    flexWrap: 'wrap'
  },
  infoDestaque: {
    minWidth: '30%',
    marginBottom: 15
  },
  infoDestaqueLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.7
  },
  infoDestaqueValue: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.dark,
    marginTop: 4
  },
  localizacaoContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 20
  },
  localizacaoTextos: {
    marginLeft: 12
  },
  localizacaoCidade: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark
  },
  localizacaoEndereco: {
    fontSize: 14,
    color: COLORS.text,
    marginTop: 4
  },
  seletorTitulo: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 10,
    textTransform: 'uppercase'
  },
  pickerModalContainer: {
    backgroundColor: COLORS.light,
    borderRadius: 10,
    marginVertical: 16,
    overflow: 'hidden',
  },
  pickerModal: {
    height: 50,
  },
  pickerItem: {
    fontSize: 16,
    color: COLORS.dark
  },
  pickerItemRemover: {
    fontSize: 16,
    color: COLORS.danger,
    fontWeight: '600'
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef'
  },
  modalButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 6
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  modalSubtitle: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  canhotoContainer: {
  flex: 1,
  
},



  cardHeaderModern: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardNota: {
    fontSize: 14,
    color: COLORS.text,
    opacity: 0.8,
  },
  cardContentModern: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  acoesDistribuidas: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  
  // MODAL MODERNO
  modalOverlayDark: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalCardModern: {
    backgroundColor: '#ffffff',
    width: '90%',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 10,
  },
  modalHeaderModern: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  modalTitleModern: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary
  },
  closeIconModern: {
    padding: 5,
  },
  modalBodyModern: {
    padding: 20,
  },
  infoCardModern: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoLabelModern: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    opacity: 0.7,
    marginBottom: 4,
  },
  infoValueModern: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
  },
  dividerModern: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  rowSpaceBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  seletorTituloModern: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 10,
  },
  pickerContainerModern: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    overflow: 'hidden',
  },
  pickerModern: {
    height: 50,
  },
  modalFooterModern: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef'
  },
  modalButtonModern: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 6
  },
  cancelButtonModern: {
    backgroundColor: '#f1f3f5',
  },
  assignButtonModern: {
    backgroundColor: COLORS.primary,
  },
  buttonTextModern: {
    fontWeight: 'bold',
    fontSize: 16,
  },

});

export default CentralControleScreen;