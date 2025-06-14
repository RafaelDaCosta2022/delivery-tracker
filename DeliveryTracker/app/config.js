import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ Link ngrok ativo (substitui o IP local)
const IP = '94ff-2804-1b3-9201-f2c-b90d-3a76-182d-7910.ngrok-free.app';

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
