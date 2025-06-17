import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ Link ngrok ativo (substitui o IP local)
const IP = 'ca55-2804-1b3-9201-f2c-8901-6a8b-144b-c3f.ngrok-free.app';

export const API = {
  BASE: `https://${IP}`,
  LOGIN: `https://${IP}/login`,
  CADASTRO: `https://${IP}/cadastro`,
  ENTREGAS: `https://${IP}/entregas`,
  ENTREGA_COMPLETA: `https://${IP}/entregas-completa`,
  UPLOAD_NOTA: `https://${IP}/upload-nota`,
  CANHOTO: `https://${IP}/canhoto`,
  MINHAS_ENTREGAS: () => `https://${IP}/minhas-entregas`,
  ATRIBUIR_MOTORISTA: `https://${IP}/atribuir-motorista`,
  USUARIOS: `https://${IP}/usuarios`,
  RELATORIO_VENDEDOR: `https://${IP}/relatorio-vendedor`,
 BUSCAR_NOTAS: `https://${IP}/buscar-notas`,
};

export const authHeader = async () => {
  const user = await AsyncStorage.getItem('usuario');
  const parsed = JSON.parse(user || '{}');
  if (parsed.token) {
    return {
      Authorization: parsed.token,
    };
  }
  return {};
};
