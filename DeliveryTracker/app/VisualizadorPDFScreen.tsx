import { RouteProp, useRoute } from '@react-navigation/native';
import React from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

export default function VisualizadorPDFScreen() {
  const route = useRoute<RouteProp<{ params: { pdfUrl: string } }, 'params'>>();
  const { pdfUrl } = route.params;

  return (
    <View style={{ flex: 1 }}>
      <WebView
        source={{ uri: pdfUrl }}
        startInLoadingState // mostra loading até carregar
        style={{ flex: 1 }}
      />
    </View>
  );
}
