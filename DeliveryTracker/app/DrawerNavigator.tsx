// app/DrawerNavigator.js
import React, { useEffect, useState } from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';

import HomeScreen from './HomeScreen';
import LoginScreen from './LoginScreen';
import CadastroUsuarioScreen from './CadastroUsuarioScreen';
import LancamentoScreen from './LancamentoScreen';
import BuscaEntregasScreen from './BuscaEntregasScreen';
import MinhasEntregasScreen from './MinhasEntregasScreen';
import VendedorScreen from './VendedorScreen';
import EntregasScreen from './EntregasScreen';
import RelatorioEntregasScreen from './RelatorioEntregasScreen';

const Drawer = createDrawerNavigator();

export default function DrawerNavigator() {
  const [tipoUsuario, setTipoUsuario] = useState('');

  useEffect(() => {
    const buscarTipo = async () => {
      const user = await AsyncStorage.getItem('usuario');
      const { tipo } = JSON.parse(user || '{}');
      setTipoUsuario(tipo);
    };
    buscarTipo();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer.Navigator initialRouteName="Home">
        <Drawer.Screen
          name="Login"
          component={LoginScreen}
          options={{ drawerItemStyle: { display: 'none' }, headerShown: false }}
        />
        <Drawer.Screen name="Home" component={HomeScreen} />
        <Drawer.Screen name="Cadastro de Usuário" component={CadastroUsuarioScreen} />

        {tipoUsuario === 'admin' && (
          <Drawer.Screen name="Lançar Nota" component={LancamentoScreen} />
        )}

        <Drawer.Screen name="Buscar Entregas" component={BuscaEntregasScreen} />
        <Drawer.Screen name="Minhas Entregas" component={MinhasEntregasScreen} />
        <Drawer.Screen name="Painel do Vendedor" component={VendedorScreen} />
        <Drawer.Screen name="Entregas" component={EntregasScreen} />
        <Drawer.Screen name="Relatório" component={RelatorioEntregasScreen} />
      </Drawer.Navigator>
    </GestureHandlerRootView>
  );
}
