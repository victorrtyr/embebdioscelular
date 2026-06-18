import { useState, useEffect, useCallback, useRef } from 'react';
import mqtt from 'mqtt';
import { DEFAULT_MQTT_HOST, MQTT_OPTIONS, SUBSCRIBE_TOPICS } from '../config/mqtt';

/**
 * Hook personalizado para gestionar la conexión MQTT en React Native.
 * Expone el estado de la conexión, los datos de los sensores y la función para publicar.
 */
export default function useMqtt() {
  const clientRef = useRef<any>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');
  const [sensorData, setSensorData] = useState<Record<string, string>>({});
  const [brokerUrl, setBrokerUrl] = useState<string>(DEFAULT_MQTT_HOST);

  const connectToBroker = useCallback((url: string) => {
    // Cerrar cliente anterior si existe
    if (clientRef.current) {
      console.log('[MQTT] Cerrando conexión anterior a:', clientRef.current.options.host);
      clientRef.current.end(true);
      clientRef.current = null;
    }

    if (!url) {
      setConnectionStatus('disconnected');
      return;
    }

    setConnectionStatus('connecting');
    setBrokerUrl(url);

    console.log('[MQTT] Intentando conectar a:', url);
    try {
      // mqtt.connect se encarga de la conexión WebSocket cuando se pasa ws:// o wss://
      const client = mqtt.connect(url, MQTT_OPTIONS);
      clientRef.current = client;

      client.on('connect', () => {
        console.log('[MQTT] Conectado al bróker:', url);
        setConnectionStatus('connected');

        // Suscribirse a todos los tópicos configurados
        SUBSCRIBE_TOPICS.forEach((topic) => {
          client.subscribe(topic, { qos: 0 }, (err: any) => {
            if (err) console.error(`[MQTT] Error suscribiéndose a ${topic}:`, err);
            else console.log(`[MQTT] Suscrito a: ${topic}`);
          });
        });
      });

      client.on('message', (topic: string, payload: any) => {
        const value = payload.toString();
        console.log(`[MQTT] ${topic}: ${value}`);
        setSensorData((prev) => ({
          ...prev,
          [topic]: value,
        }));
      });

      client.on('reconnect', () => {
        console.log('[MQTT] Reconectando...');
        setConnectionStatus('connecting');
      });

      client.on('close', () => {
        console.log('[MQTT] Conexión cerrada');
        setConnectionStatus('disconnected');
      });

      client.on('error', (err: any) => {
        console.error('[MQTT] Error:', err.message);
        setConnectionStatus('error');
      });
    } catch (err) {
      console.error('[MQTT] Error al inicializar MQTT:', err);
      setConnectionStatus('error');
    }
  }, []);

  // Conexión automática inicial
  useEffect(() => {
    connectToBroker(brokerUrl);

    return () => {
      if (clientRef.current) {
        clientRef.current.end(true);
        clientRef.current = null;
      }
    };
  }, [connectToBroker]);

  const publish = useCallback((topic: string, message: string, options = {}) => {
    const client = clientRef.current;
    if (client && client.connected) {
      client.publish(topic, String(message), { qos: 0, retain: true, ...options }, (err: any) => {
        if (err) console.error(`[MQTT] Error publicando en ${topic}:`, err);
        else console.log(`[MQTT] Publicado en ${topic}: ${message}`);
      });
    } else {
      console.warn('[MQTT] No se puede publicar, cliente desconectado');
    }
  }, []);

  return { connectionStatus, sensorData, publish, brokerUrl, connectToBroker };
}
