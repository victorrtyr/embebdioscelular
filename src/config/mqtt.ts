// =============================================
// Configuración MQTT para la App Móvil (React Native)
// =============================================

// Default host (el usuario lo podrá cambiar en caliente desde la app)
export const DEFAULT_MQTT_HOST = 'ws://localhost:9001';

export const TOPICS = {
  TEMPERATURA:    'casa/ambiente/temperatura',
  HUMEDAD:        'casa/ambiente/humedad',
  FAN_ESTADO:     'casa/ambiente/ventilador/estado',
  FAN_UMBRAL:     'casa/ambiente/ventilador/umbral',
  PUMP_ESTADO:    'casa/ambiente/bomba/estado',
  HUMEDAD_UMBRAL: 'casa/ambiente/bomba/umbral',
  PARAR:          'casa/ambiente/parar',
};

// Todos los tópicos a los que suscribirse al conectar
export const SUBSCRIBE_TOPICS = [
  TOPICS.TEMPERATURA,
  TOPICS.HUMEDAD,
  TOPICS.FAN_ESTADO,
  TOPICS.FAN_UMBRAL,
  TOPICS.PUMP_ESTADO,
  TOPICS.HUMEDAD_UMBRAL,
];

// Opciones de conexión con autenticación para el bróker
export const MQTT_OPTIONS = {
  clientId: `mobile-app-${Math.random().toString(16).slice(2, 8)}`,
  clean: true,
  reconnectPeriod: 5000,
  connectTimeout: 10000,
  username: 'ecp',
  password: 'zerglin123',
};
