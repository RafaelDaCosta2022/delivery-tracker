import React from 'react';
import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export const StatusEntrega = ({ status }) => {
  const statusConfig = {
    CONCLUIDA: { text: 'Entregue', color: '#27AE60', icon: 'check-circle' },
    PENDENTE: { text: 'Pendente', color: '#F39C12', icon: 'access-time' },
    CANCELADA: { text: 'Cancelada', color: '#E74C3C', icon: 'cancel' },
  };

  const config = statusConfig[status] || { 
    text: status, 
    color: '#7F8C8D', 
    icon: 'help' 
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <MaterialIcons name={config.icon} size={18} color={config.color} />
      <Text style={{ 
        color: config.color, 
        fontWeight: '600',
        marginLeft: 4 
      }}>
        {config.text}
      </Text>
    </View>
  );
};