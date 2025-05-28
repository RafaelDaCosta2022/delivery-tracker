import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { ROUTES } from './(tabs)/routes';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ProtectedRoute from './ProtectedRoute';

export default function HomeScreen() {
  const navigation = useNavigation();
  const [tipoUsuario, setTipoUsuario] = useState('');

  useEffect(() => {
    const carregarUsuario = async () => {
      const dados = await AsyncStorage.getItem('usuario');
      if (dados) {
        const usuario = JSON.parse(dados);
        setTipoUsuario(usuario.tipo);
      }
    };
    carregarUsuario();
  }, []);

  return (
    <ProtectedRoute>
      <View style={styles.container}>
        <TouchableOpacity
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          style={styles.menuButton}
        >
          <Text style={styles.menuText}>☰ Menu</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Bem-vindo!</Text>

        {tipoUsuario === 'vendedor' && (
          <>
            <TouchableOpacity
              style={styles.button}
              onPress={() => navigation.navigate(ROUTES.LANCAR_NOTA)}
            >
              <Text style={styles.buttonText}>🧾 Lançar Nota</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={() => navigation.navigate(ROUTES.BUSCAR_ENTREGAS)}
            >
              <Text style={styles.buttonText}>📋 Ver Entregas</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={() => navigation.navigate(ROUTES.VENDEDOR)}
            >
              <Text style={styles.buttonText}>📊 Painel do Vendedor</Text>
            </TouchableOpacity>
          </>
        )}

        {tipoUsuario === 'motorista' && (
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate(ROUTES.MINHAS_ENTREGAS)}
          >
            <Text style={styles.buttonText}>🚚 Minhas Entregas</Text>
          </TouchableOpacity>
        )}

        {tipoUsuario === 'admin' && (
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate(ROUTES.CADASTRO_USUARIO)}
          >
            <Text style={styles.buttonText}>➕ Cadastrar Novo Usuário</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#dc3545' }]}
          onPress={async () => {
            await AsyncStorage.removeItem('usuario');
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          }}
        >
          <Text style={styles.buttonText}>🚪 Sair</Text>
        </TouchableOpacity>
      </View>
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#f2f2f2',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#4a90e2',
    padding: 18,
    marginBottom: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  menuButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  menuText: {
    fontSize: 22,
    color: '#333',
  },
});
