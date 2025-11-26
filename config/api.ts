
const SERVER_PORT = 3000;

/**
 * Obtiene la URL base según la plataforma
 */
// ACTUALIZAR PARA DEMOSTRACION
const LOCAL_PC_IP = '192.168.1.207'; 

const getBaseUrl = (): string => {

  const isDevelopment = __DEV__;
  

  return `http://${LOCAL_PC_IP}:${SERVER_PORT}`;
};


export const useServerUrl = () => {
  const url = getBaseUrl();
  return { 
    url, 
    isLoading: false, 
    error: null 
  };
};

export const API_URL = getBaseUrl();
