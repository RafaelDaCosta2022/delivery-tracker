import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, TouchableOpacity,
  TextInput, ScrollView, RefreshControl, Alert, Modal // Importe Modal aqui
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { MaterialIcons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import ImageViewing from 'react-native-image-viewing';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';

import { API, authHeader } from './config';
import ProtectedRoute from './ProtectedRoute';
import { useAuth } from './ProtectedRoute';

// Paleta de cores premium
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
    inicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    fim: new Date(),
    mostrarCalendario: false,
    tipoCalendario: 'inicio' as 'inicio' | 'fim',
    entregaSelecionada: null as any,
    modalImagemVisivel: false,
    imagemSelecionada: null as string | null,
    modalAtribuirVisivel: false,
    motoristaAtribuicaoId: '',
    atribuindo: false
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
      await carregarMotoristas();
      await buscarEntregas();
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
      const res = await fetch(API.USUARIOS(), { headers });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Erro ${res.status}: ${errorText}`);
      }
      
      const lista = await res.json();
      
      if (!Array.isArray(lista)) {
        throw new Error('Resposta da API não é um array');
      }
      
      const motoristasFiltrados = lista.filter((m: any) => m.tipo === 'motorista');
      setStatePartial({ motoristas: motoristasFiltrados });
    } catch (error: any) {
      console.error('Erro ao carregar motoristas:', error);
      Alert.alert('Erro', error.message || 'Falha ao carregar motoristas');
      setStatePartial({ motoristas: [] });
    }
  };

  // Busca entregas com filtros
  const buscarEntregas = async () => {
    try {
      setStatePartial({ refreshing: true });
      const headers = await authHeader();

      if (!headers.Authorization) {
        throw new Error('Autenticação necessária');
      }

      const params = new URLSearchParams();
      params.append('inicio', formatarDataAPI(state.inicio));
      params.append('fim', formatarDataAPI(state.fim));
      
      if (state.motoristaSelecionado) {
        params.append('motorista', state.motoristaSelecionado);
      }
      
      if (state.statusSelecionado !== 'TODOS') {
        params.append('status', state.statusSelecionado);
      }
      
      if (state.busca) {
        params.append('busca', state.busca);
      }

      const response = await fetch(`${API.ENTREGAS()}?${params.toString()}`, { headers });

      if (!response.ok) {
        const erroTexto = await response.text();
        throw new Error(`Erro ${response.status}: ${erroTexto}`);
      }

      const data = await response.json();
      
      // Filtra entregas recentes
      const agora = new Date();
      const entregasFiltradas = data.filter((e: any) => {
        if (e.status === 'PENDENTE') return true;
        if (e.status === 'ENTREGUE' && e.data_entrega) {
          const dataEntrega = new Date(e.data_entrega);
          const diffHoras = (agora.getTime() - dataEntrega.getTime()) / (1000 * 60 * 60);
          return diffHoras <= 24;
        }
        return false;
      });

      setStatePartial({ 
        entregas: data,
        filtradas: entregasFiltradas,
        refreshing: false
      });
    } catch (error: any) {
      console.error('Erro ao buscar entregas:', error);
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
                <th>Data</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Motorista</th>
              </tr>
              ${state.entregas.map((e: any) => `
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

  // Reatribuir motorista
  const reatribuirMotorista = async () => {
    if (state.atribuindo || !state.motoristaAtribuicaoId || !state.entregaSelecionada) return;
    
    setStatePartial({ atribuindo: true });
    try {
      const headers = await authHeader();
      const token = headers.Authorization;
      
      if (!token) {
        throw new Error('Token não encontrado');
      }

      const response = await fetch(API.ATRIBUIR_MOTORISTA, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
        },
        body: JSON.stringify({
          entregaId: state.entregaSelecionada.id,
          motoristaId: parseInt(state.motoristaAtribuicaoId),
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
                motorista_id: parseInt(state.motoristaAtribuicaoId),
                nome_motorista: prev.motoristas.find((m: any) => m.id == state.motoristaAtribuicaoId)?.nome || e.nome_motorista
              } 
            : e
        );
        
        return { 
          entregas: novasEntregas,
          filtradas: novasEntregas.filter((e: any) => {
            if (e.status === 'PENDENTE') return true;
            if (e.status === 'ENTREGUE' && e.data_entrega) {
              const dataEntrega = new Date(e.data_entrega);
              const agora = new Date();
              const diffHoras = (agora.getTime() - dataEntrega.getTime()) / (1000 * 60 * 60);
              return diffHoras <= 24;
            }
            return false;
          })
        };
      });
      
      Alert.alert('✅ Sucesso', `Entrega reatribuída para ${state.motoristas.find((m: any) => m.id == state.motoristaAtribuicaoId)?.nome}`);
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

  // Marcar entrega como concluída
  const marcarComoEntregue = async (entrega: any) => {
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
          filtradas: novasEntregas.filter((e: any) => {
            if (e.status === 'PENDENTE') return true;
            if (e.status === 'ENTREGUE' && e.data_entrega) {
              const dataEntrega = new Date(e.data_entrega);
              const agora = new Date();
              const diffHoras = (agora.getTime() - dataEntrega.getTime()) / (1000 * 60 * 60);
              return diffHoras <= 24;
            }
            return false;
          })
        };
      });

      Alert.alert('✅ Sucesso', 'Entrega marcada como concluída');
    } catch (error: any) {
      Alert.alert('❌ Erro', error.message || 'Falha ao atualizar entrega');
    }
  };

  // Componente de card de entrega
  const EntregaCard = React.memo(({ entrega }: { entrega: any }) => {
    const statusConfig = {
      'CONCLUIDA': { color: COLORS.success, label: 'Concluída' },
      'ENTREGUE': { color: COLORS.success, label: 'Entregue' },
      'PENDENTE': { color: COLORS.warning, label: 'Pendente' },
      'CANCELADA': { color: COLORS.danger, label: 'Cancelada' }
    };
    
    const status = statusConfig[entrega.status] || statusConfig.PENDENTE;
    
    return (
      <View style={[
        styles.card,
        { borderLeftColor: status.color, borderLeftWidth: 5 }
      ]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1} ellipsizeMode="tail">
            {entrega.cliente_nome}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: `${status.color}20` }]}>
            <Text style={[styles.badgeText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.row}>
            <MaterialCommunityIcons name="file-document-outline" size={18} color={COLORS.text} />
            <Text style={styles.infoText}>Nota: {entrega.nota}</Text>
          </View>

          <View style={styles.row}>
            <MaterialCommunityIcons name="calendar-month-outline" size={18} color={COLORS.text} />
            <Text style={styles.infoText}>
              {new Date(entrega.data_emissao).toLocaleDateString('pt-BR')}
            </Text>
          </View>

          <View style={styles.row}>
            <MaterialCommunityIcons name="cash-multiple" size={18} color={COLORS.text} />
            <Text style={styles.infoText}>R$ {parseFloat(entrega.valor_total).toFixed(2)}</Text>
          </View>

          <View style={styles.row}>
            <MaterialCommunityIcons name="truck-delivery-outline" size={18} color={COLORS.text} />
            <Text style={styles.infoText}>{entrega.nome_motorista || 'Não atribuído'}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          {entrega.canhoto_path && (
            <TouchableOpacity 
              style={styles.canhotoButton}
              onPress={() => {
                const url = `${API.BASE()}/uploads/${entrega.canhoto_path.split('/').pop()}`;
                setStatePartial({ imagemSelecionada: url, modalImagemVisivel: true });
              }}
            >
              <MaterialCommunityIcons name="file-image" size={18} color={COLORS.primary} />
              <Text style={styles.canhotoText}>Canhoto</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => {
              setStatePartial({ 
                entregaSelecionada: entrega, 
                modalAtribuirVisivel: true 
              });
            }}
          >
            <MaterialCommunityIcons name="account-switch-outline" size={18} color={COLORS.primary} />
            <Text style={styles.actionText}>Atribuir</Text>
          </TouchableOpacity>

          {entrega.status === 'PENDENTE' && (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => marcarComoEntregue(entrega)}
            >
              <MaterialCommunityIcons name="check-circle-outline" size={18} color={COLORS.success} />
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

  return (
    <ProtectedRoute permitido={['admin']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Controle de Entregas</Text>
          <TouchableOpacity onPress={gerarPDF} style={styles.pdfButton}>
            <MaterialIcons name="picture-as-pdf" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Barra de busca */}
        <View style={styles.searchContainer}>
          <TextInput
            placeholder="Buscar cliente, nota ou CNPJ"
            placeholderTextColor="#95a5a6"
            value={state.busca}
            onChangeText={(text) => setStatePartial({ busca: text })}
            style={styles.searchInput}
          />
          <Feather 
            name="search" 
            size={20} 
            color={COLORS.primary} 
            style={styles.searchIcon} 
          />
        </View>

        {/* Painel de filtros */}
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
                onValueChange={(value) => setStatePartial({ motoristaSelecionado: value })}
                dropdownIconColor={COLORS.primary}
                style={styles.picker}
              >
                <Picker.Item label="Todos motoristas" value="" />
                {state.motoristas.map((m: any) => (
                  <Picker.Item key={m.id} label={m.nome} value={m.id} />
                ))}
              </Picker>
            </View>
            
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={state.statusSelecionado}
                onValueChange={(value) => setStatePartial({ statusSelecionado: value })}
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
        </View>

        {/* Lista de entregas */}
        <ScrollView
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={state.refreshing}
              onRefresh={buscarEntregas}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
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
                    <EntregaCard key={e.id} entrega={e} />
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
                    <EntregaCard key={e.id} entrega={e} />
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
                    <EntregaCard key={e.id} entrega={e} />
                  ))}
                </>
              )}
            </>
          )}
        </ScrollView>

        {/* Modal de visualização de imagem */}
        {state.imagemSelecionada && (
          <ImageViewing
            images={[{ uri: state.imagemSelecionada }]}
            imageIndex={0}
            visible={state.modalImagemVisivel}
            onRequestClose={() => setStatePartial({ modalImagemVisivel: false })}
            backgroundColor="rgba(0,0,0,0.9)"
          />
        )}

        {/* Modal para atribuir motorista */}
        <Modal 
          visible={state.modalAtribuirVisivel} 
          transparent 
          animationType="slide"
          onRequestClose={() => setStatePartial({ modalAtribuirVisivel: false })}
        >
          <View style={styles.assignModal}>
            <View style={styles.assignModalContent}>
              <Text style={styles.modalTitle}>Atribuir Motorista</Text>
              
              <View style={styles.assignmentInfo}>
                <Text style={styles.infoLabel}>Cliente:</Text>
                <Text style={styles.infoValue} numberOfLines={1}>
                  {state.entregaSelecionada?.cliente_nome}
                </Text>
              </View>
              
              <View style={styles.assignmentInfo}>
                <Text style={styles.infoLabel}>Nota:</Text>
                <Text style={styles.infoValue}>{state.entregaSelecionada?.nota}</Text>
              </View>
              
              <View style={styles.pickerModalContainer}>
                <Picker
                  selectedValue={state.motoristaAtribuicaoId}
                  onValueChange={(value) => setStatePartial({ motoristaAtribuicaoId: value })}
                  dropdownIconColor={COLORS.primary}
                  style={styles.pickerModal}
                >
                  <Picker.Item label="Selecione um motorista..." value="" />
                  {state.motoristas.map((m: any) => (
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
                  onPress={() => setStatePartial({ modalAtribuirVisivel: false })}
                >
                  <Text style={styles.buttonText}>Cancelar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.modalButton, styles.assignButton]}
                  onPress={reatribuirMotorista}
                  disabled={!state.motoristaAtribuicaoId || state.atribuindo}
                >
                  {state.atribuindo ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={[styles.buttonText, styles.assignButtonText]}>Atribuir</Text>
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

// Estilos otimizados
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
    backgroundColor: COLORS.light,
    borderRadius: 8,
    marginHorizontal: 4,
    overflow: 'hidden',
  },
  picker: {
    height: 46,
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
  infoText: {
    marginLeft: 8,
    color: COLORS.text,
    fontSize: 15,
  },
  canhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  canhotoText: {
    marginLeft: 8,
    color: COLORS.primary,
    fontWeight: '500',
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
    paddingHorizontal: 8,
  },
  actionText: {
    marginLeft: 6,
    fontWeight: '500',
    fontSize: 14,
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
    borderRadius: 16,
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
    borderRadius: 10,
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
    borderRadius: 10,
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

export default CentralControleScreen;