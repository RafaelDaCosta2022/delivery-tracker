//DrawerNavigator.tsx
// Navegação com Drawer usando React Navigation

import { FontAwesome5, Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useAuth } from './AuthContext';
import BuscaNotasScreen from './BuscarNotasScreen';
import CadastroUsuarioScreen from './CadastroUsuarioScreen';
import CentralControleScreen from './CentralControleScreen';
import ConfiguracaoScreen from './ConfiguracaoScreen';
import CustomDrawerContent from './CustomDrawerContent';
import HomeScreen from './HomeScreen';
import MinhasEntregasScreen from './MinhasEntregasScreen';
import VendedorScreen from './VendedorScreen';
import VisualizadorPDFScreen from './VisualizadorPDFScreen';

const Drawer = createDrawerNavigator();

export default function DrawerNavigator() {
  const navigation = useNavigation();
  const { usuario, logout } = useAuth(); // ✅ usa contexto real

  const handleLogout = async () => {
  await logout();
  // 👇 Não precisa redirecionar manualmente!
};


  if (!usuario) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f9ff' }}>
        <ActivityIndicator size="large" color="#4a6cff" />
        <Text style={{ marginTop: 15, color: '#4a6cff', fontSize: 16 }}>Carregando perfil...</Text>
      </View>
    );
  }

  const accentColors = {
    admin: '#4a6cff',
    vendedor: '#ff6b6b',
    motorista: '#6bcebb',
    default: '#9c7bff'
  };

  const color = accentColors[usuario.tipo] || accentColors.default;




  return (
    <Drawer.Navigator
      drawerContent={(props) => (
        <CustomDrawerContent
          {...props}
          usuario={usuario}
          accentColor={color}
          onLogout={handleLogout}
        />
      )}
      screenOptions={({ route }) => ({
        drawerLabelStyle: {
          fontSize: 16,
          fontFamily: 'Inter-Medium',
          marginLeft: -10,
        },
        drawerItemStyle: {
          paddingVertical: 4,
          borderRadius: 10,
          marginHorizontal: 10,
          marginVertical: 2,
        },
        drawerIcon: ({ focused, color: iconColor }) => {
          const iconStyle = { marginRight: 15, width: 24 };
          if (route.name === 'Home') {
            return <Ionicons name={focused ? "home" : "home-outline"} size={24} color={iconColor} style={iconStyle} />;
          }
          if (route.name === 'Central de Controle') {
            return <MaterialIcons name="dashboard" size={24} color={iconColor} style={iconStyle} />;
          }
          if (route.name === 'Cadastro de Usuário') {
            return <FontAwesome5 name="user-plus" size={22} color={iconColor} style={iconStyle} />;
          }
          if (route.name === 'Painel do Vendedor') {
            return <MaterialCommunityIcons name="point-of-sale" size={24} color={iconColor} style={iconStyle} />;
          }
          if (route.name === 'Minhas Entregas') {
            return <FontAwesome5 name="truck" size={22} color={iconColor} style={iconStyle} />;
          }
          if (route.name === 'Buscar Notas') {
            return <MaterialIcons name="search" size={24} color={iconColor} style={iconStyle} />;
          }
          if (route.name === '🔧 Configuração de IP') {
            return <Ionicons name="settings" size={22} color={iconColor} style={iconStyle} />;
          }
        },
        drawerActiveBackgroundColor: color + '15',
        drawerActiveTintColor: color,
        drawerInactiveTintColor: '#5a5a75',
        drawerStyle: {
          width: 300,
          backgroundColor: '#ffffff',
        },
        headerStyle: {
          backgroundColor: '#ffffff',
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: '#2d2d42',
        headerTitleStyle: {
          fontFamily: 'Inter-SemiBold',
          fontSize: 18,
        },
      })}
    >
      <Drawer.Screen name="Home" component={HomeScreen} />

      {usuario?.tipo === 'admin' && (
        <>
          <Drawer.Screen name="Central de Controle" component={CentralControleScreen} />
          <Drawer.Screen name="Cadastro de Usuário" component={CadastroUsuarioScreen} />
          <Drawer.Screen name="Buscar Notas" component={BuscaNotasScreen} />
          <Drawer.Screen name="Painel do Vendedor" component={VendedorScreen} />
          <Drawer.Screen name="🔧 Configuração de IP" component={ConfiguracaoScreen} />
        </>
      )}

      {usuario?.tipo === 'vendedor' && (
        <>
          <Drawer.Screen name="Painel do Vendedor" component={VendedorScreen} />
          <Drawer.Screen name="Buscar Notas" component={BuscaNotasScreen} />
        </>
      )}

      {usuario?.tipo === 'motorista' && (
        <Drawer.Screen name="Minhas Entregas" component={MinhasEntregasScreen} />
      )}
      <Drawer.Screen
  name="VisualizadorPDF"
  component={VisualizadorPDFScreen}
  options={{ drawerItemStyle: { display: 'none' } }} // Oculta no Drawer
/>
    </Drawer.Navigator>
    
  );
}
