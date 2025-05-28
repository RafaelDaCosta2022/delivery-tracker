import React, { useState } from 'react';
import { View, Text, TextInput, Button, FlatList } from 'react-native';

// Dados mockados para exemplo
const entregasMock = [
  { id: 1, nota: 'NF123', cliente: 'Mel Bom', data: '2025-05-13' },
  { id: 2, nota: 'NF124', cliente: 'Pólen Top', data: '2025-05-12' },
];

export default function BuscaEntregasScreen() {
  const [busca, setBusca] = useState('');
  const [data, setData] = useState('');
  const [entregas, setEntregas] = useState(entregasMock);

  // Filtro simples por cliente ou nota
  const filtrar = () => {
    setEntregas(
      entregasMock.filter(
        e =>
          e.cliente.toLowerCase().includes(busca.toLowerCase()) ||
          e.nota.toLowerCase().includes(busca.toLowerCase()) ||
          (data && e.data === data)
      )
    );
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>
        Buscar Entregas
      </Text>
      <TextInput
        placeholder="Buscar por cliente, nota..."
        value={busca}
        onChangeText={setBusca}
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          borderRadius: 6,
          padding: 8,
          marginBottom: 8,
        }}
      />
      <TextInput
        placeholder="Data (YYYY-MM-DD)"
        value={data}
        onChangeText={setData}
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          borderRadius: 6,
          padding: 8,
          marginBottom: 8,
        }}
      />
      <Button title="Filtrar" onPress={filtrar} />

      <FlatList
        data={entregas}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <View style={{ padding: 12, borderBottomWidth: 1, borderColor: '#eee' }}>
            <Text>Nota: {item.nota}</Text>
            <Text>Cliente: {item.cliente}</Text>
            <Text>Data: {item.data}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={{ marginTop: 20, textAlign: 'center' }}>Nenhuma entrega encontrada.</Text>}
      />
    </View>
  );
}