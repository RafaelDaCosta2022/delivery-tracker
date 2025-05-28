import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { API, authHeader } from './config';

export default function VendedorScreen() {
  const [relatorio, setRelatorio] = useState([]);
  const [filtroData, setFiltroData] = useState(new Date().toISOString().slice(0, 10));
  const [carregando, setCarregando] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [imagemSelecionada, setImagemSelecionada] = useState(null);

  useEffect(() => {
    carregarRelatorio();
  }, [filtroData]);

  const carregarRelatorio = async () => {
    setCarregando(true);
    try {
      const headers = await authHeader();
      const res = await fetch(`${API.RELATORIO_VENDEDOR}?data=${filtroData}`, { headers });
      const json = await res.json();
      setRelatorio(json?.detalhes || []);
    } catch {
      alert('Erro ao buscar entregas');
    }
    setCarregando(false);
  };

  const resumoPorMotorista = relatorio.reduce((acc, entrega) => {
    const nome = entrega.motorista_nome || 'Não atribuído';
    if (!acc[nome]) acc[nome] = { total: 0, valor: 0, pendentes: 0, entregues: 0 };
    acc[nome].total++;
    acc[nome].valor += entrega.valor_total;
    if (entrega.status === 'ENTREGUE') acc[nome].entregues++;
    else acc[nome].pendentes++;
    return acc;
  }, {});

  const totalDia = relatorio.reduce((acc, item) => acc + item.valor_total, 0);

  const abrirImagem = (path) => {
    setImagemSelecionada(`${API.BASE}/canhoto/${path.split('/').pop()}`);
    setModalVisible(true);
  };

  const renderResumo = () => (
    <View>
      <Text style={styles.titulo}>📊 Painel do Vendedor</Text>
      <Text style={styles.totalDia}>💰 Total do Dia: R$ {totalDia.toFixed(2)}</Text>

      <Text style={styles.label}>📅 Data:</Text>
      <TextInput
        style={styles.input}
        value={filtroData}
        onChangeText={setFiltroData}
        placeholder="AAAA-MM-DD"
      />

      <Text style={styles.subtitulo}>🚚 Resumo por Motorista</Text>
      {Object.entries(resumoPorMotorista).map(([nome, dados]) => (
        <View key={nome} style={styles.cardResumo}>
          <Text style={styles.motorista}>{nome}</Text>
          <Text>Total de notas: {dados.total}</Text>
          <Text>Valor total: R$ {dados.valor.toFixed(2)}</Text>
          <Text>Entregues: ✅ {dados.entregues}  |  Pendentes: 🚚 {dados.pendentes}</Text>
          {dados.pendentes > 0 ? (
            <Text style={styles.statusRua}>📦 {nome} está na rua</Text>
          ) : (
            <Text style={styles.statusOk}>✅ {nome} finalizou tudo</Text>
          )}
        </View>
      ))}

      <Text style={styles.subtitulo}>📋 Entregas</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {carregando ? (
        <ActivityIndicator size="large" color="#007bff" style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          ListHeaderComponent={renderResumo}
          data={relatorio}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.cardEntrega}>
              <Text style={styles.nota}>📦 Nota: {item.nota}</Text>
              <Text>Cliente: {item.cliente_nome}</Text>
              <Text>Valor: R$ {item.valor_total.toFixed(2)}</Text>
              <Text>Status: {item.status}</Text>
              <Text>Motorista: {item.motorista_nome || 'Não atribuído'}</Text>

              {item.canhoto_path ? (
                <TouchableOpacity onPress={() => abrirImagem(item.canhoto_path)}>
                  <Image
                    source={{ uri: `${API.BASE}/canhoto/${item.canhoto_path.split('/').pop()}` }}
                    style={styles.imgMini}
                  />
                  <Text style={{ color: '#007bff', marginTop: 4 }}>Ver Canhoto</Text>
                </TouchableOpacity>
              ) : (
                <Text style={{ color: '#e67e22', marginTop: 6 }}>⚠️ Sem canhoto</Text>
              )}
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalFechar}>
            <Text style={styles.fecharTexto}>Fechar</Text>
          </TouchableOpacity>
          {imagemSelecionada && (
            <Image source={{ uri: imagemSelecionada }} style={styles.imagemGrande} />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  titulo: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  totalDia: { fontSize: 16, color: '#333', textAlign: 'center', marginBottom: 10 },
  subtitulo: { fontSize: 18, fontWeight: '600', marginTop: 20, marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  label: { fontWeight: 'bold', marginBottom: 4 },
  cardResumo: {
    backgroundColor: '#eaf4fc',
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  motorista: { fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  statusRua: { color: '#e67e22', fontWeight: 'bold', marginTop: 6 },
  statusOk: { color: '#2ecc71', fontWeight: 'bold', marginTop: 6 },
  cardEntrega: {
    backgroundColor: '#fefefe',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 10,
  },
  nota: { fontWeight: 'bold', marginBottom: 4 },
  imgMini: { width: 100, height: 100, marginTop: 10, borderRadius: 8 },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000000cc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagemGrande: {
    width: '90%',
    height: '70%',
    resizeMode: 'contain',
    borderRadius: 12,
  },
  modalFechar: {
    position: 'absolute',
    top: 50,
    right: 30,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    zIndex: 99,
  },
  fecharTexto: {
    fontWeight: 'bold',
    color: '#333',
  },
});
