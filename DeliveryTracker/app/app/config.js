import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { decode } from 'base-64'; // Polyfill para atob

// Polyfill para atob no React Native
if (typeof atob === 'undefined') {
  global.atob = decode;
}

// Função para normalizar a URL
const normalizeUrl = (url: string): string => {
  if (!url) return '';
  let normalized = url.trim().replace(/\/+$/, '');
  
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized;
  }
  
  return normalized;
};

// Validação robusta de URL ngrok
const isValidNgrokUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    const isValidProtocol = parsed.protocol === 'https:';
    const isNgrok = parsed.hostname.endsWith('.ngrok-free.app');
    const isLocalTunnel = parsed.hostname.endsWith('.loca.lt');
    const isValidPath = !parsed.pathname || parsed.pathname === '/';

    return isValidProtocol && (isNgrok || isLocalTunnel) && isValidPath;
  } catch {
    return false;
  }
};

// IP padrão inicial
export const DEFAULT_IP = normalizeUrl('41de-2804-1b3-9201-1324-e1bb-57b0-2095-dfae.ngrok-free.app');
let customIP: string | null = null;
let ipInicializado = false;

// Inicializa o IP salvo no app
export const initIP = async (): Promise<string> => {
  if (ipInicializado && customIP) return customIP;
  
  try {
    const savedIP = await AsyncStorage.getItem('ip_backend');
    customIP = savedIP ? normalizeUrl(savedIP) : DEFAULT_IP;
    ipInicializado = true;
    return customIP;
  } catch (error) {
    console.error('Erro ao carregar IP:', error);
    customIP = DEFAULT_IP;
    ipInicializado = true;
    return DEFAULT_IP;
  }
};

// Atualiza o IP do backend
export const updateIP = async (newIP: string): Promise<boolean> => {
  try {
    const normalized = normalizeUrl(newIP);

    if (!isValidNgrokUrl(normalized)) {
      Alert.alert(
        'URL inválida', 
        'Use um link válido no formato:\nhttps://seu-link.ngrok-free.app\nou\nhttps://seu-link.loca.lt'
      );
      return false;
    }

    await AsyncStorage.setItem('ip_backend', normalized);
    customIP = normalized;
    await AsyncStorage.removeItem('usuario');
    return true;
  } catch (error) {
    console.error('Erro ao atualizar IP:', error);
    Alert.alert('Erro', 'Falha ao atualizar o endereço do servidor');
    return false;
  }
};

// Retorna o IP atual em uso
export const getBaseURL = (): string => {
  return customIP || DEFAULT_IP;
};

// Endpoints com IP dinâmico
export const API = {
  BASE: () => getBaseURL(),
  LOGIN: () => `${getBaseURL()}/login`,
  CADASTRO: () => `${getBaseURL()}/cadastro`,
  ENTREGAS: () => `${getBaseURL()}/entregas`,
  UPLOAD_NOTA: () => `${getBaseURL()}/upload-nota`,
  CANHOTO: (id?: number) => id ? `${getBaseURL()}/canhoto/${id}` : `${getBaseURL()}/canhoto`,
  MINHAS_ENTREGAS: () => `${getBaseURL()}/minhas-entregas`,
  ATRIBUIR_MOTORISTA: () => `${getBaseURL()}/atribuir-motorista`,
  USUARIOS: () => `${getBaseURL()}/usuarios`,
  BUSCAR_NOTAS: () => `${getBaseURL()}/buscar-notas`,
  DISTRIBUIR_ENTREGAS:()=> `${getBaseURL()}/distribuir-entregas`,
};

// Limpeza segura de credenciais
export const clearAuthData = async (): Promise<void> => {
  await AsyncStorage.multiRemove(['usuario', 'credenciais']);
};

// Verifica se o token é válido
const isTokenValid = (token: string): boolean => {
  try {
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) return false;
    
    const payload = JSON.parse(atob(tokenParts[1]));
    const exp = payload.exp * 1000;
    return Date.now() < exp;
  } catch {
    return false;
  }
};

// Cabeçalho de autenticação com token (única declaração)
export const authHeader = async (): Promise<Record<string, string>> => {
  try {
    const user = await AsyncStorage.getItem('usuario');
    if (!user) return {};

    const parsed = JSON.parse(user);
    let token = parsed.token;

    if (!token) return {};
    
    // Verificação de estrutura
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3 || !isTokenValid(token)) {
      await clearAuthData();
      return {};
    }

    // Sanitização segura
    token = token.trim();

    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  } catch (error) {
    console.error('Erro ao gerar authHeader:', error);
    await clearAuthData();
    return {};
  }
};