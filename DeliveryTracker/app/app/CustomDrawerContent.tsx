// CustomDrawerContent.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import {
  DrawerContentScrollView,
  DrawerItemList,
} from '@react-navigation/drawer';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';

export default function CustomDrawerContent(props) {
  const { usuario, accentColor, onLogout, ...rest } = props;
  const nome = usuario?.nome || 'Usuário';
  const tipo = usuario?.tipo || 'tipo';
  
  // Formatar tipo de usuário
  const formatTipo = {
    admin: 'Administrador',
    vendedor: 'Vendedor',
    motorista: 'Motorista'
  }[tipo] || tipo;

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={accentColor} barStyle="light-content" />
      
      {/* Header com gradiente */}
      <Animatable.View 
        style={[styles.header, { backgroundColor: accentColor }]}
        animation="fadeInDown"
        duration={800}
      >
        <View style={styles.profileContainer}>
          <View style={[styles.avatar, { borderColor: '#fff' }]}>
            <MaterialCommunityIcons 
              name="account" 
              size={48} 
              color="#fff" 
            />
          </View>
          
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>{nome}</Text>
            <View style={[styles.userBadge, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
              <Text style={styles.userType}>{formatTipo}</Text>
            </View>
          </View>
        </View>
      </Animatable.View>

      <DrawerContentScrollView 
        {...rest} 
        contentContainerStyle={styles.drawerContent}
        showsVerticalScrollIndicator={false}
      >
        <Animatable.View animation="fadeInUp" delay={300}>
          {/* Ajuste de espaçamento para os itens */}
          <DrawerItemList 
            {...rest} 
            itemStyle={styles.drawerItem}
          />
        </Animatable.View>
      </DrawerContentScrollView>

      {/* Footer */}
      <Animatable.View 
        style={styles.footer}
        animation="fadeInUp"
        delay={500}
      >
        <View style={styles.appInfo}>
          <Text style={styles.appName}>📦 DeliveryTracker PRO</Text>
          <Text style={styles.version}>v2.5.1</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={onLogout}
        >
          <Ionicons name="log-out-outline" size={24} color="#ff6b6b" />
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
        
        <Text style={styles.copyright}>© 2025 Delivery Solutions Inc.</Text>
      </Animatable.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 25,
    paddingTop: 45,
    borderBottomRightRadius: 20,
    paddingBottom: 25,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  userInfo: {
    marginLeft: 15,
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#fff',
    marginBottom: 8,
  },
  userBadge: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 15,
    alignSelf: 'flex-start',
  },
  userType: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  drawerContent: {
    paddingTop: 15,
    paddingBottom: 20,
  },
  drawerItem: {
    marginVertical: 4,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f5',
  },
  appInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  appName: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#4a4a6a',
  },
  version: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#a0a0c0',
    backgroundColor: '#f5f7ff',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 12,
    backgroundColor: '#fff5f5',
    marginBottom: 20,
  },
  logoutText: {
    fontSize: 17,
    fontFamily: 'Inter-SemiBold',
    color: '#ff6b6b',
    marginLeft: 15,
  },
  copyright: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#a0a0c0',
    textAlign: 'center',
    marginTop: 5,
  },
});