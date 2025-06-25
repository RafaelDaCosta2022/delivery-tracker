// 🚀 HomeScreen.tsx - Versão Aprimorada
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Image,
  Alert,
  Animated,
  Easing
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { API, authHeader } from './config';
import moment from 'moment';
import 'moment/locale/pt-br';

// Paleta de cores profissional refinada
const COLORS = {
  primary: '#2c3e50',     // Azul escuro
  secondary: '#3498db',   // Azul principal
  accent: '#27ae60',      // Verde para sucesso
  lightAccent: '#2ecc71', // Verde claro
  background: '#f8f9fa',  // Fundo claro
  cardBackground: '#ffffff', // Fundo de cards
  text: '#34495e',        // Texto principal
  textLight: '#7f8c8d',   // Texto secundário
  danger: '#e74c3c',      // Vermelho para alertas
  warning: '#f39c12',     // Amarelo
  border: '#ecf0f1',      // Borda suave
};

export default function HomeScreen({ navigation }) {
  const [resumo, setResumo] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [valorTotalDia, setValorTotalDia] = useState(0);
  const [pendentesTotal, setPendentesTotal] = useState(0);
  const [entreguesTotal, setEntreguesTotal] = useState(0);
  const [error, setError] = useState('');
  
  const hoje = moment().locale('pt-br').format('dddd, D [de] MMMM [de] YYYY');
  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(0.95))[0];

  // Carrega dados automaticamente ao entrar
useEffect(() => {
  // ⚡ Já carrega ao montar
  verificarToken();

  const unsubscribe = navigation.addListener('focus', () => {
    verificarToken();
  });

  // Animação de entrada
  Animated.parallel([
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
      easing: Easing.out(Easing.quad)
    }),
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 6,
      useNativeDriver: true
    })
  ]).start();

  return () => {
    unsubscribe();
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.95);
  };
}, []);


  const verificarToken = async () => {
    try {
      setCarregando(true);
      const user = await AsyncStorage.getItem('usuario');
      const parsedUser = user ? JSON.parse(user) : {};
      
      if (!parsedUser.token) {
        navigation.replace('Login');
        return;
      }
      
      await carregarResumo();
    } catch (err) {
      console.error('Erro ao verificar token:', err);
      navigation.replace('Login');
    }
  };

const carregarResumo = async () => {
  setRefreshing(true);
  setError('');

  try {
    const user = await AsyncStorage.getItem('usuario');
    const parsedUser = user ? JSON.parse(user) : {};
    const token = parsedUser.token;

    if (!token) {
      navigation.replace('Login');
      return;
    }
      const res = await fetch(API.ENTREGAS(), {
  headers: await authHeader(),
});


    if (!res.ok) {
      const msg = await res.text();
      throw new Error('Erro ao buscar entregas: ' + msg);
    }

    let entregas = await res.json();
    const agora = new Date();

    // 🔥 Só entrega COM motorista atribuído aparece!
    entregas = entregas.filter((entrega) => {
      if (!entrega.motorista) return false; // <-- usa 'motorista'!
      if (entrega.status === 'PENDENTE') return true;
      if (
        (entrega.status === 'ENTREGUE' || entrega.status === 'CONCLUIDA') &&
        entrega.data_entrega
      ) {
        const dataEntrega = new Date(entrega.data_entrega);
        const diffHoras =
          (agora.getTime() - dataEntrega.getTime()) / (1000 * 60 * 60);
        return diffHoras <= 12;
      }
      return false;
    });

    // Agrupa por motorista (campo 'motorista')
    const resumoPorMotorista = [];
    const ids = new Set();
    entregas.forEach((e) => {
      if (!ids.has(e.motorista)) {
        const entregasMotorista = entregas.filter(
          (x) => x.motorista === e.motorista
        );
        resumoPorMotorista.push({
          motorista_id: e.motorista,
          motorista_nome: e.nome_motorista,
          total_notas: entregasMotorista.length,
          valor_total: entregasMotorista.reduce(
            (sum, x) => sum + Number(x.valor_total || 0),
            0
          ),
          pendentes: entregasMotorista.filter(
            (x) => x.status === 'PENDENTE'
          ).length,
          entregues: entregasMotorista.filter(
            (x) =>
              x.status === 'CONCLUIDA' || x.status === 'ENTREGUE'
          ).length,
        });
        ids.add(e.motorista);
      }
    });

    setResumo(resumoPorMotorista);

    // Totais do painel
    let totalValor = 0;
    let totalPendentes = 0;
    let totalEntregues = 0;
    resumoPorMotorista.forEach((item) => {
      totalValor += item.valor_total || 0;
      totalPendentes += item.pendentes || 0;
      totalEntregues += item.entregues || 0;
    });
    setValorTotalDia(totalValor);
    setPendentesTotal(totalPendentes);
    setEntreguesTotal(totalEntregues);

  } catch (err) {
    setError(err.message || 'Erro ao carregar dados');
    Alert.alert('Erro', err.message || 'Não foi possível carregar suas entregas.');
  } finally {
    setCarregando(false);
    setRefreshing(false);
  }
};






  const handleLogout = async () => {
    await AsyncStorage.removeItem('usuario');
    navigation.replace('Login');
  };

  // Renderiza cada motorista
  const renderMotorista = useCallback(({ item }: { item: any }) => (
    <Animated.View 
      style={[styles.card, { opacity: fadeAnim }]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.avatarPlaceholder}>
          <Icon name="person" size={20} color="#fff" />
        </View>
        
        <View style={styles.motoristaInfo}>
          <Text style={styles.motoristaNome} numberOfLines={1}>{item.motorista_nome || 'Motorista'}</Text>
          <Text style={styles.motoristaId}>ID: {item.motorista_id || 'N/A'}</Text>
        </View>
        
        <View style={[
          styles.statusBadge, 
          item.pendentes > 0 ? styles.statusPendente : styles.statusEntregue
        ]}>
          <Text style={styles.statusText}>
            {item.pendentes > 0 ? 'PENDENTE' : 'CONCLUÍDO'}
          </Text>
        </View>
      </View>
      
      <View style={styles.divider} />
      
      <View style={styles.cardBody}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Total de Notas</Text>
          <Text style={styles.metricValue}>{item.total_notas}</Text>
        </View>
        
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Valor Total</Text>
          <Text style={[styles.metricValue, styles.metricValueMoney]}>
            {Number(item.valor_total || 0).toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
              minimumFractionDigits: 0
            })}
          </Text>
        </View>
      </View>
      
      <View style={styles.cardFooter}>
        <View style={styles.statusItem}>
          <Icon name="check-circle" size={16} color={COLORS.accent} />
          <Text style={styles.statusCount}>{item.entregues}</Text>
          <Text style={styles.statusLabel}>Entregues</Text>
        </View>
        
        <View style={styles.statusItem}>
          <Icon name="pending" size={16} color={COLORS.danger} />
          <Text style={styles.statusCount}>{item.pendentes}</Text>
          <Text style={styles.statusLabel}>Pendentes</Text>
        </View>
      </View>
    </Animated.View>
  ), []);

  // Renderiza o estado vazio
  const renderEmptyState = () => (
    <Animated.View 
      style={[
        styles.emptyContainer, 
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
      ]}
    >
      <Icon name="directions-car" size={50} color={COLORS.textLight} />
      <Text style={styles.emptyText}>Nenhum motorista em operação hoje</Text>
      <Text style={styles.emptyDate}>{hoje}</Text>
      <Text style={styles.emptySubtitle}>
        Valor total do dia: {Number(valorTotalDia).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        })}
      </Text>
    </Animated.View>
  );

  return (
    <Animated.View 
      style={[
        styles.container, 
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
      ]}
    >
      {/* Cabeçalho */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Painel de Operações</Text>
          <Text style={styles.subtitle}>{hoje}</Text>
        </View>
        
        <TouchableOpacity 
          onPress={handleLogout}
          style={styles.logoutButton}
        >
          <Icon name="exit-to-app" size={24} color={COLORS.textLight} />
        </TouchableOpacity>
      </View>
      
      {/* Resumo */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.resumoContainer}
      >
        <Animated.View 
          style={[
            styles.resumoCard,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
          ]}
        >
          <Icon name="attach-money" size={24} color={COLORS.secondary} style={styles.resumoIcon} />
          <Text style={styles.resumoLabel}>Valor Total</Text>
          <Text style={styles.resumoValue}>
            {Number(valorTotalDia).toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })}
          </Text>
        </Animated.View>
        
        <Animated.View 
          style={[
            styles.resumoCard,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
          ]}
        >
          <Icon name="check-circle" size={24} color={COLORS.accent} style={styles.resumoIcon} />
          <Text style={styles.resumoLabel}>Entregues</Text>
          <Text style={styles.resumoValue}>{entreguesTotal}</Text>
        </Animated.View>
        
        <Animated.View 
          style={[
            styles.resumoCard,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
          ]}
        >
          <Icon name="warning" size={24} color={COLORS.danger} style={styles.resumoIcon} />
          <Text style={styles.resumoLabel}>Pendentes</Text>
          <Text style={styles.resumoValue}>{pendentesTotal}</Text>
        </Animated.View>
      </ScrollView>
      
      {/* Lista de Motoristas */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Motoristas em Operação</Text>
        <Text style={styles.sectionSubtitle}>{resumo.length} motoristas ativos hoje</Text>
      </View>
      
      {error ? (
        <Animated.View 
          style={[
            styles.errorContainer,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
          ]}
        >
          <Icon name="error-outline" size={40} color={COLORS.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={carregarResumo}
          >
            <Text style={styles.retryButtonText}>Tentar Novamente</Text>
          </TouchableOpacity>
        </Animated.View>
      ) : carregando ? (
        <Animated.View 
          style={[
            styles.loadingContainer,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
          ]}
        >
          <ActivityIndicator size="large" color={COLORS.secondary} />
          <Text style={styles.loadingText}>Carregando dados...</Text>
        </Animated.View>
      ) : resumo.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={resumo}
          renderItem={renderMotorista}
          keyExtractor={(item) => item.motorista_id?.toString() || Math.random().toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={carregarResumo}
              colors={[COLORS.secondary]}
              tintColor={COLORS.secondary}
            />
          }
        />
      )}
      
      {/* Botão de Atualização */}
      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={carregarResumo}
      >
        <Icon name="refresh" size={24} color="#FFF" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textLight,
  },
  logoutButton: {
    padding: 8,
    marginTop: 4,
  },
  resumoContainer: {
    paddingBottom: 8,
  },
  resumoCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: 20,
    width: 150,
    marginRight: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  resumoIcon: {
    marginBottom: 12,
  },
  resumoLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 6,
    textAlign: 'center',
  },
  resumoValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  sectionHeader: {
    marginTop: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  motoristaInfo: {
    flex: 1,
  },
  motoristaNome: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  motoristaId: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  statusBadge: {
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  statusEntregue: {
    backgroundColor: 'rgba(39, 174, 96, 0.1)',
  },
  statusPendente: {
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metric: {
    flex: 1,
    paddingHorizontal: 8,
  },
  metricLabel: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  metricValueMoney: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusCount: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 6,
    color: COLORS.text,
  },
  statusLabel: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  listContent: {
    paddingBottom: 80,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 20,
    backgroundColor: '#f0f4f8',
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 18,
    color: COLORS.primary,
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  emptyDate: {
    fontSize: 16,
    color: COLORS.text,
    marginTop: 8,
    fontWeight: '500',
  },
  emptySubtitle: {
    fontSize: 16,
    color: COLORS.text,
    marginTop: 12,
    fontWeight: '700',
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    padding: 12,
    borderRadius: 12,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.danger,
    marginTop: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: COLORS.secondary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  retryButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
});