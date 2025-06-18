import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  TextInput,
  Image,
  Dimensions,
  Animated,
  Easing,
  ScrollView
} from 'react-native';
import { API, authHeader } from './config';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Animatable from 'react-native-animatable';
import { RefreshControl } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function VendedorScreen() {
  const [relatorio, setRelatorio] = useState([]);
  const [filtroData, setFiltroData] = useState(new Date());
  const [carregando, setCarregando] = useState(true);
  const [modalCanhotoVisible, setModalCanhotoVisible] = useState(false);
  const [modalGraficoVisible, setModalGraficoVisible] = useState(false);
  const [imagemSelecionada, setImagemSelecionada] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('resumo');
  const fadeAnim = useState(new Animated.Value(0))[0];
  const [periodo, setPeriodo] = useState('dia'); // 'dia', 'semana', 'mes'

  // Animação de entrada
 useEffect(() => {
  Animated.timing(fadeAnim, {
    toValue: 1,
    duration: 800,
    easing: Easing.out(Easing.exp),
    useNativeDriver: true,
  }).start();
}, []);

useEffect(() => {
  carregarRelatorio();
}, [periodo, filtroData]);

const handleRefresh = () => {
  setRefreshing(true);
  carregarRelatorio();
};


  // Formatar data para YYYY-MM-DD
  const formattedDate = useMemo(() => {
    return filtroData.toISOString().split('T')[0];
  }, [filtroData]);

  // Carregar relatório
 const carregarRelatorio = async () => {
  setCarregando(true);
  try {
    const usuario = await AsyncStorage.getItem('usuario');
    const { token } = JSON.parse(usuario || '{}');

    const url = `${API.ENTREGAS}?data=${formattedDate}&periodo=${periodo}`;
const res = await fetch(url, {
  headers: { Authorization: token },
});

    const json = await res.json();

    setRelatorio(json || []);
  } catch (err) {
    alert('Erro ao buscar entregas');
  } finally {
    setCarregando(false);
    setRefreshing(false);
  }
};

// 👇 FILTRO igual a Home: só mostra o que tem motorista, pendente ou entregue há no máximo 12h!
  const entregasValidas = useMemo(() => {
  const agora = new Date();
  return relatorio.filter((entrega: any) => {
    if (!entrega.motorista) return false;
    if (entrega.status === 'PENDENTE') return true;
    if (
      (entrega.status === 'ENTREGUE' || entrega.status === 'CONCLUIDA') &&
      entrega.data_entrega
    ) {
      const dataEntrega = new Date(entrega.data_entrega);
      const diffHoras = (agora.getTime() - dataEntrega.getTime()) / (1000 * 60 * 60);
      return diffHoras <= 12;
    }
    return false;
  });
}, [relatorio]);

  // Filtra entregas apenas com motorista atribuído
const entregasComMotorista = useMemo(() => {
  return relatorio.filter((entrega: any) => entrega.motorista && entrega.motorista_nome);
}, [relatorio]);

// Agrupa as entregas válidas por motorista
const entregasAgrupadas = useMemo(() => {
  const grupos: any = {};
  entregasValidas.forEach((e: any) => {
    const nome = 
      (e.motorista_nome && e.motorista_nome.trim())
        ? e.motorista_nome.trim()
        : (e.nome_motorista && e.nome_motorista.trim())
          ? e.nome_motorista.trim()
          : 'Não atribuído';

    if (!grupos[nome]) {
      grupos[nome] = {
        motorista: nome,
        entregas: [],
        total: 0,
        valor: 0,
        pendentes: 0,
        entregues: 0,
      };
    }
    grupos[nome].entregas.push(e);
    grupos[nome].total++;
    grupos[nome].valor += Number(e.valor_total || 0);
    if (e.status === 'PENDENTE') grupos[nome].pendentes++;
    if (e.status === 'ENTREGUE' || e.status === 'CONCLUIDA') grupos[nome].entregues++;
  });
  return grupos;
}, [entregasValidas]);




  // Calcular totais para gráficos
  const { totalGeral, chartData } = useMemo(() => {
  const entregues = entregasValidas.filter((e: any) => e.status === 'ENTREGUE' || e.status === 'CONCLUIDA').length;
  const pendentes = entregasValidas.length - entregues;
  const total = entregasValidas.reduce((acc: number, item: any) => acc + parseFloat(item.valor_total || 0), 0);
  return {
    totalGeral: total,
    chartData: [
      { name: 'Entregues', value: entregues, color: '#2ecc71' },
      { name: 'Pendentes', value: pendentes, color: '#e74c3c' }
    ]
  };
}, [entregasValidas]);


  // Filtrar entregas pela busca
  const filteredRelatorio = useMemo(() => {
  if (!searchText) return entregasValidas;
  return entregasValidas.filter((item: any) =>
    item.cliente_nome?.toLowerCase().includes(searchText.toLowerCase()) ||
    item.nota?.toString().includes(searchText)
  );
}, [entregasValidas, searchText]);


const abrirImagem = (path: string) => {
  setImagemSelecionada(`${API.BASE}/uploads/${path.split('/').pop()}`);
  setModalCanhotoVisible(true); // ✅ abre o modal correto
};

 


  const handleDateChange = (event: any, selectedDate: Date | undefined) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFiltroData(selectedDate);
    }
  };

  // Renderizar card de resumo por motorista
  const renderResumoCard = (nome: string, dados: any) => (
    <Animatable.View 
      animation="fadeInUp"
      duration={600}
      style={[styles.resumoCard, dados.pendentes > 0 ? styles.cardPendente : styles.cardConcluido]}
    >
      <View style={styles.resumoHeader}>
        <FontAwesome5 
          name="truck" 
          size={20} 
          color={dados.pendentes > 0 ? "#e67e22" : "#2ecc71"} 
        />
        <Text style={styles.motoristaNome}>{nome}</Text>
      </View>
      
      <View style={styles.resumoGrid}>
        <View style={styles.resumoItem}>
          <Text style={styles.resumoLabel}>Notas</Text>
          <Text style={styles.resumoValue}>{dados.total}</Text>
        </View>
        <View style={styles.resumoItem}>
          <Text style={styles.resumoLabel}>Valor</Text>
          <Text style={styles.resumoValue}>R$ {dados.valor.toFixed(2)}</Text>
        </View>
        <View style={styles.resumoItem}>
          <Text style={styles.resumoLabel}>✅</Text>
          <Text style={styles.resumoValue}>{dados.entregues}</Text>
        </View>
        <View style={styles.resumoItem}>
          <Text style={styles.resumoLabel}>🔄</Text>
          <Text style={styles.resumoValue}>{dados.pendentes}</Text>
        </View>
      </View>
      
      <View style={styles.statusContainer}>
        {dados.pendentes > 0 ? (
          <Text style={styles.statusRua}>{nome} está em rota</Text>
        ) : (
          <Text style={styles.statusOk}>Todas entregues!</Text>
        )}
      </View>
    </Animatable.View>
  );

  const renderEntregaItem = ({ item }: any) => {
  const nomeMotorista = 
    (item.motorista_nome && item.motorista_nome.trim())
      ? item.motorista_nome.trim()
      : (item.nome_motorista && item.nome_motorista.trim())
        ? item.nome_motorista.trim()
        : (item.motorista || 'Não atribuído');

  return (
    <Animatable.View 
      animation="fadeInRight"
      duration={500}
      style={styles.entregaCard}
    >
      {/* 🟦 Nota */}
      <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1e3d8f' }}>
        📦 Nota: {item.nota}
      </Text>

      {/* 👤 Cliente */}
      <Text style={{ fontSize: 15, fontWeight: '700', color: '#333', marginTop: 2 }}>
        👤 Cliente: {item.cliente_nome}
      </Text>

      {/* 🔢 CNPJ */}
      <Text style={{ fontSize: 14, color: '#777' }}>
        🔢 CNPJ: {item.cliente_cnpj}
      </Text>

      {/* 💰 Valor e 👷 Motorista */}
      <View style={styles.entregaInfo}>
        <Text style={{ fontSize: 15, color: '#27ae60', fontWeight: '600' }}>
          💰 Valor: R$ {parseFloat(item.valor_total).toFixed(2)}
        </Text>
        <Text style={{ fontSize: 14, color: '#666' }}>
          👷 {nomeMotorista}
        </Text>
      </View>

      {/* 📍 Cidade */}
      {item.cidade && (
        <Text style={{ fontSize: 14, color: '#3498db', fontWeight: '600' }}>
          📍 Cidade: {item.cidade}
        </Text>
      )}

      {/* 📄 Canhoto */}
      {item.canhoto_path ? (
        <TouchableOpacity 
          style={styles.canhotoButton}
          onPress={() => abrirImagem(item.canhoto_path)}
        >
          <MaterialIcons name="receipt" size={24} color="#3498db" />
          <Text style={styles.canhotoText}>Visualizar Canhoto</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.semCanhoto}>
          <MaterialIcons name="warning" size={20} color="#e67e22" />
          <Text style={styles.semCanhotoText}>Sem comprovante</Text>
        </View>
      )}
    </Animatable.View>
  );
};



  // Renderizar grupo de motoristas
  const renderMotoristaGroup = (motorista: string, dados: any) => (
    <View key={motorista}>
      <Text style={styles.groupTitle}>{dados.motorista}</Text>
      {dados.entregas.map((entrega: any) => (
        <View key={entrega.id} style={styles.entregaCard}>
          {/* ... conteúdo do card de entrega */}
        </View>
      ))}
    </View>
  );

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={['#2c3e50', '#4a6491']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Painel do Vendedor</Text>
        
        <View style={styles.periodoContainer}>
          <TouchableOpacity 
            style={[styles.periodoButton, periodo === 'dia' && styles.activePeriodo]}
            onPress={() => setPeriodo('dia')}
          >
            <Text style={styles.periodoText}>Dia</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.periodoButton, periodo === 'semana' && styles.activePeriodo]}
            onPress={() => setPeriodo('semana')}
          >
            <Text style={styles.periodoText}>Semana</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.periodoButton, periodo === 'mes' && styles.activePeriodo]}
            onPress={() => setPeriodo('mes')}
          >
            <Text style={styles.periodoText}>Mês</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalValue}>R$ {totalGeral.toFixed(2)}</Text>
        </View>
      </LinearGradient>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'resumo' && styles.activeTab]}
          onPress={() => setActiveTab('resumo')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'resumo' && styles.activeTabText
          ]}>
            Resumo
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'entregas' && styles.activeTab]}
          onPress={() => setActiveTab('entregas')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'entregas' && styles.activeTabText
          ]}>
            Entregas
          </Text>
        </TouchableOpacity>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={filtroData}
          mode="date"
          display="calendar"
          onChange={handleDateChange}
        />
      )}

      {activeTab === 'resumo' ? (
        <ScrollView style={styles.resumoContainer}>
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Distribuição de Entregas</Text>
            <TouchableOpacity
  style={styles.chartButton}
  onPress={() => setModalGraficoVisible(true)} // ✅ novo modal
>
  <Text style={styles.chartTitle}>📊 Ver Gráfico de Entregas</Text>
</TouchableOpacity>

            
            <View style={styles.chartLegendVertical}>
 {chartData.map((item, index) => {
  const total = chartData.reduce((acc, curr) => acc + curr.value, 0);
  const percentual = total > 0
    ? (item.value / total) * 100
    : 0;

  return (
    <View key={index} style={styles.legendRow}>
      <View style={[styles.legendDot, { backgroundColor: item.color }]} />
      <Text style={styles.legendText}>
        {item.name}: {item.value} ({percentual.toFixed(1)}%)
      </Text>
    </View>
  );
})}

</View>

          </View>

          <Text style={styles.sectionTitle}>Resumo por Motorista</Text>
          
         {Object.entries(entregasAgrupadas).map(([key, value]) => (
  <View key={key}>
    <Text style={styles.groupTitle}>{value.motorista}</Text>
    {value.entregas
      .filter((item: any) =>
        item.cliente_nome?.toLowerCase().includes(searchText.toLowerCase()) ||
        item.nota?.toString().includes(searchText)
      )
      .map((entrega: any) => (
        <View key={entrega.id} style={styles.entregaCard}>
          {renderEntregaItem({ item: entrega })}
        </View>
      ))}
  </View>
))}


        </ScrollView>
      ) : (
        <View style={styles.entregasContainer}>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por cliente ou nota..."
              placeholderTextColor="#95a5a6"
              value={searchText}
              onChangeText={setSearchText}
              minLength={3}
            />
            <MaterialIcons name="search" size={24} color="#7f8c8d" />
          </View>
          
          {carregando ? (
            <ActivityIndicator size="large" color="#3498db" style={styles.loader} />
          ) : (
            <FlatList
              data={filteredRelatorio}
              keyExtractor={(item: any) => item.id.toString()}
              renderItem={renderEntregaItem}
              contentContainerStyle={styles.entregasList}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  colors={['#3498db']}
                  tintColor="#3498db"
                />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <MaterialIcons name="inventory" size={60} color="#bdc3c7" />
                  <Text style={styles.emptyText}>Nenhuma entrega encontrada</Text>
                </View>
              }
            />
          )}
        </View>
      )}
      <Modal visible={modalGraficoVisible} transparent animationType="fade">
  <View style={styles.modalOverlay}>
    <View style={styles.modalCard}>
      <TouchableOpacity
        style={styles.closeButtonTopRight}
        onPress={() => setModalGraficoVisible(false)}
      >
        <MaterialIcons name="close" size={28} color="#2c3e50" />
      </TouchableOpacity>

      <Text style={styles.chartTitleModal}>📊 Distribuição de Entregas</Text>

      {/* Gráfico com % no label */}
      {(() => {
        const totalFatia = chartData.reduce((acc, item) => acc + item.value, 0);
const chartDataComPorcentagem = chartData.map(item => {
  const percentual = totalFatia > 0
    ? (item.value / totalFatia) * 100
    : 0;

  return {
    name: `${item.name} (${percentual.toFixed(1)}%)`, // ✅ Agora funciona
    population: item.value,
    color: item.color,
    legendFontColor: '#2c3e50',
    legendFontSize: 14,
  };
});


        return (
          <PieChart
            data={chartDataComPorcentagem}
            width={Dimensions.get('window').width * 0.75}
            height={130}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              color: () => `#2c3e50`,
            }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="-25"
            absolute
          />
        );
      })()}

      {/* Legenda aprimorada */}
      <View style={styles.chartLegendVertical}>
        {chartData.map((item, index) => {
          const totalEntregas = chartData.reduce((acc, item) => acc + item.value, 0);
const percentual = totalEntregas > 0
  ? ((item.value / totalEntregas) * 100).toFixed(1)
  : '0.0';

          return (
            <View key={index} style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={styles.legendText}>
                {item.name}: {item.value} ({percentual}%)
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  </View>
</Modal>

<Modal visible={modalCanhotoVisible} transparent animationType="fade">
  <View style={styles.modalContainer}>
    <TouchableOpacity 
      style={styles.modalBackground}
      activeOpacity={1}
      onPress={() => setModalCanhotoVisible(false)}
    >
      <View style={styles.modalContent}>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => setModalCanhotoVisible(false)}
        >
          <MaterialIcons name="close" size={28} color="white" />
        </TouchableOpacity>

        {imagemSelecionada && (
          <Image 
            source={{ uri: imagemSelecionada }}
            style={styles.fullImage}
            resizeMode="contain"
          />
        )}
      </View>
    </TouchableOpacity>
  </View>
  </Modal>     
  </Animated.View>
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
  },
  periodoContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 15,
  },
  periodoButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 5,
  },
  activePeriodo: {
    backgroundColor: '#3498db',
  },
  periodoText: {
    color: 'white',
    fontWeight: '600',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 12,
    borderRadius: 12,
  },
  totalLabel: {
    color: 'white',
    fontSize: 16,
    marginRight: 10,
  },
  totalValue: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  tabContainer: {
    flexDirection: 'row',
    marginTop: 20,
    marginHorizontal: 16,
    backgroundColor: '#ecf0f1',
    borderRadius: 12,
    overflow: 'hidden',
  },
  tabButton: {
    flex: 1,
    padding: 15,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#3498db',
    borderRadius: 12,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  activeTabText: {
    color: '#fff',
  },
  resumoContainer: {
    flex: 1,
    padding: 16,
  },
  chartContainer: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#2c3e50',
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 15,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#2c3e50',
  },
  resumoList: {
    paddingBottom: 30,
  },
  resumoCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardPendente: {
    borderLeftWidth: 4,
    borderLeftColor: '#e67e22',
  },
  cardConcluido: {
    borderLeftWidth: 4,
    borderLeftColor: '#2ecc71',
  },
  resumoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  motoristaNome: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
    color: '#2c3e50',
  },
  resumoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  resumoItem: {
    alignItems: 'center',
  },
  resumoLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  resumoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c3e50',
  },
  statusContainer: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    alignItems: 'center',
  },
  statusRua: {
    color: '#e67e22',
    fontWeight: '600',
  },
  statusOk: {
    color: '#2ecc71',
    fontWeight: '600',
  },
  entregasContainer: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#2c3e50',
  },
  entregasList: {
    paddingBottom: 30,
  },
  entregaCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  entregaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  entregaNota: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  badgeSuccess: {
    backgroundColor: '#d5f5e3',
  },
  badgeWarning: {
    backgroundColor: '#fdebd0',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  entregaCliente: {
    fontSize: 16,
    color: '#34495e',
    marginBottom: 8,
  },
  entregaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  entregaValor: {
    fontSize: 15,
    fontWeight: '600',
    color: '#27ae60',
  },
  entregaMotorista: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  canhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8f4fc',
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  canhotoText: {
    color: '#3498db',
    fontWeight: '600',
    marginLeft: 8,
  },
  semCanhoto: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#fef9e7',
    marginTop: 8,
  },
  semCanhotoText: {
    color: '#e67e22',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  modalContent: {
    width: '90%',
    height: '80%',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: -40,
    right: 0,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: 5,
  },
  fullImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#bdc3c7',
    marginTop: 16,
  },
  loader: {
    marginTop: 40,
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 10,
    color: '#2c3e50',
    paddingHorizontal: 16,
  },
  chartButton: {
  backgroundColor: '#3498db',
  padding: 12,
  borderRadius: 10,
  alignItems: 'center',
  marginBottom: 12,
},
chartLegendVertical: {
  marginTop: 20,
  width: '100%',
  alignItems: 'flex-start',
  paddingHorizontal: 10,
},
modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.6)',
  justifyContent: 'center',
  alignItems: 'center',
},

modalCard: {
  width: '90%',
  backgroundColor: 'white',
  borderRadius: 20,
  padding: 20,
  alignItems: 'center',
  elevation: 5,
},
closeButtonTopRight: {
  position: 'absolute',
  top: 10,
  right: 10,
  zIndex: 1,
},

chartTitleModal: {
  fontSize: 18,
  fontWeight: '700',
  marginBottom: 10,
  color: '#2c3e50',
},


legendDot: {
  width: 14,
  height: 14,
  borderRadius: 7,
  marginRight: 8,
},

legendText: {
  fontSize: 20,
  color: '#2c3e50',
},


entregaNotaDestaque: {
  fontSize: 18,
  fontWeight: '800',
  color: '#1e3a8a',
  marginBottom: 6,
},
entregaClienteDestaque: {
  fontSize: 16,
  fontWeight: '700',
  color: '#2c3e50',
},
entregaInfoSecundaria: {
  fontSize: 14,
  color: '#444',
  marginTop: 2,
},
entregaValorSecundaria: {
  fontSize: 15,
  fontWeight: '600',
  color: '#27ae60',
  marginTop: 4,
},
entregaCidadeSecundaria: {
  fontSize: 14,
  fontWeight: '500',
  color: '#1976d2',
  marginTop: 2,
},


});