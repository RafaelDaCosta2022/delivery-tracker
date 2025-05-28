import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ Link ngrok ativo (substitui o IP local)
const IP = '753f-2804-1b3-9200-e122-7c2d-2d77-12fa-a636.ngrok-free.app';

export const API = {
  LOGIN: `https://${IP}/login`,
  CADASTRO: `https://${IP}/cadastro`,
  ENTREGAS: `https://${IP}/entregas`,
  ENTREGA_COMPLETA: `https://${IP}/entregas-completa`,
  UPLOAD_NOTA: `https://${IP}/upload-nota`,
  CANHOTO: `https://${IP}/canhoto`,
  MINHAS_ENTREGAS: () => `https://${IP}/minhas-entregas`,
  ATRIBUIR_MOTORISTA: `https://${IP}/atribuir-motorista`,
  USUARIOS: `https://${IP}/usuarios`,
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
