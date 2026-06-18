import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useMqtt from '../hooks/useMqtt';
import { TOPICS } from '../config/mqtt';

// ==========================================
// COMPONENTE: Tarjeta de Sensores
// ==========================================
function SensorCard({ titulo, valor, unidad, icono, color, accentColor }: any) {
  const displayVal = valor !== undefined ? parseFloat(valor).toFixed(1) : '--';
  const rawNum = valor !== undefined ? parseFloat(valor) : 0;
  
  // Limitar para la barra de progreso
  const progress = Math.min(Math.max(rawNum, 0), 100) / 100;

  return (
    <View style={[styles.sensorCard, { borderTopColor: color }]}>
      <View style={styles.sensorCardHeader}>
        <Text style={styles.sensorCardIcon}>{icono}</Text>
        <Text style={styles.sensorCardTitle}>{titulo}</Text>
      </View>
      <View style={styles.sensorCardValueContainer}>
        <Text style={styles.sensorCardValue}>{displayVal}</Text>
        <Text style={styles.sensorCardUnit}>{unidad}</Text>
      </View>
      {/* Barra de progreso */}
      <View style={styles.progressBar}>
        <View 
          style={[
            styles.progressBarFill, 
            { 
              backgroundColor: color, 
              width: `${progress * 100}%` 
            }
          ]} 
        />
      </View>
    </View>
  );
}

// ==========================================
// PANTALLA PRINCIPAL: HomeScreen
// ==========================================
export default function HomeScreen() {
  const { connectionStatus, sensorData, publish, brokerUrl, connectToBroker } = useMqtt();
  
  const [inputUrl, setInputUrl] = useState(brokerUrl);
  const [umbralInput, setUmbralInput] = useState('');
  const [pumpUmbralInput, setPumpUmbralInput] = useState(''); // Nuevo

  // Sincronizar URL del bróker cuando cambie en el hook
  useEffect(() => {
    setInputUrl(brokerUrl);
  }, [brokerUrl]);

  // Datos de sensores recibidos
  const temperatura = sensorData[TOPICS.TEMPERATURA];
  const humedad = sensorData[TOPICS.HUMEDAD];
  const fanEstado = sensorData[TOPICS.FAN_ESTADO];
  const fanUmbral = sensorData[TOPICS.FAN_UMBRAL];
  const pumpEstado = sensorData[TOPICS.PUMP_ESTADO];
  const pumpUmbral = sensorData[TOPICS.HUMEDAD_UMBRAL]; // Nuevo

  const fanRunning = fanEstado === 'ON';
  const pumpRunning = pumpEstado === 'ON';

  // Animación: Ventilador Girando (🌀)
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (fanRunning) {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinValue.setValue(0);
      spinValue.stopAnimation();
    }
  }, [fanRunning]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Animación: Parpadeo de riego
  const blinkValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (pumpRunning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(blinkValue, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(blinkValue, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      blinkValue.setValue(1);
      blinkValue.stopAnimation();
    }
  }, [pumpRunning]);

  // Manejar conexión dinámica
  const handleConnect = () => {
    if (inputUrl.trim()) {
      connectToBroker(inputUrl.trim());
    }
  };

  // Enviar nuevo umbral de temperatura al ESP32
  const handleSendUmbral = () => {
    const val = parseFloat(umbralInput);
    if (!isNaN(val)) {
      publish(TOPICS.FAN_UMBRAL, val.toFixed(1));
      setUmbralInput('');
    }
  };

  // Enviar nuevo umbral de humedad al ESP32
  const handleSendPumpUmbral = () => {
    const val = parseFloat(pumpUmbralInput);
    if (!isNaN(val)) {
      publish(TOPICS.HUMEDAD_UMBRAL, val.toFixed(0)); // Redondear humedad a entero
      setPumpUmbralInput('');
    }
  };

  // Enviar parada de emergencia al ESP32
  const handleEmergencyStop = () => {
    publish(TOPICS.PARAR, 'STOP'); // Simula tecla D
  };

  // Obtener estilos según el estado de la conexión
  const getStatusStyle = () => {
    switch (connectionStatus) {
      case 'connected':
        return { text: 'Conectado', bg: '#052e16', textCol: '#4ade80', dot: '#22c55e' };
      case 'connecting':
        return { text: 'Conectando...', bg: '#451a03', textCol: '#fb923c', dot: '#f97316' };
      default:
        return { text: 'Desconectado', bg: '#450a0a', textCol: '#f87171', dot: '#ef4444' };
    }
  };

  const status = getStatusStyle();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#050814" />
      
      {/* Background Glow Orbs */}
      <View style={styles.bgGlowContainer}>
        <View style={[styles.glowOrb, styles.glowOrb1]} />
        <View style={[styles.glowOrb, styles.glowOrb2]} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerLogoRow}>
            <Text style={styles.headerLogo}>🌱</Text>
            <View>
              <Text style={styles.headerTitle}>Invernadero IoT</Text>
              <Text style={styles.headerSubtitle}>App Móvil — ESP32 + FreeRTOS</Text>
            </View>
          </View>
        </View>

        {/* HEADER ACTIONS ROW */}
        <View style={styles.headerActionsRow}>
          <View style={[styles.statusBadge, { backgroundColor: status.bg, borderColor: status.textCol + '22' }]}>
            <View style={[styles.statusDot, { backgroundColor: status.dot }]} />
            <Text style={[styles.statusText, { color: status.textCol }]}>
              {status.text} {brokerUrl ? `(${brokerUrl.replace('ws://', '').replace('wss://', '')})` : ''}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.emergencyButton} 
            onPress={handleEmergencyStop}
            activeOpacity={0.85}
          >
            <Text style={styles.emergencyButtonText}>🚨 Parada de Emergencia</Text>
          </TouchableOpacity>
        </View>

        {/* BROKER CONFIGURATION */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderIcon}>🔌</Text>
            <Text style={styles.cardHeaderTitle}>Conexión del Bróker MQTT</Text>
          </View>
          <View style={styles.brokerForm}>
            <TextInput
              style={styles.input}
              placeholder="ws://localhost:9001 o wss://..."
              placeholderTextColor="#64748b"
              value={inputUrl}
              onChangeText={setInputUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity style={styles.button} onPress={handleConnect}>
              <Text style={styles.buttonText}>Conectar</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.helpText}>
            Usa ws:// para local y wss:// para túneles seguros de ngrok.
          </Text>
        </View>

        {/* SENSOR TILES */}
        <View style={styles.sensorsGrid}>
          <SensorCard
            titulo="Temperatura"
            valor={temperatura}
            unidad="°C"
            icono="🌡️"
            color="#ff6b6b"
          />
          <SensorCard
            titulo="Humedad del Suelo"
            valor={humedad}
            unidad="%"
            icono="💧"
            color="#51cf66"
          />
        </View>

        {/* CONTROLS */}
        <View style={styles.controlsContainer}>
          {/* FAN CONTROL CARD */}
          <View style={[styles.card, styles.controlCard, { borderTopColor: '#339af0' }]}>
            <View style={styles.cardHeader}>
              <Animated.Text style={[styles.cardHeaderIcon, { transform: [{ rotate: spin }] }]}>
                🌀
              </Animated.Text>
              <Text style={styles.cardHeaderTitle}>Control de Ventilador</Text>
            </View>

            <View style={styles.stateContainer}>
              <View style={[styles.stateBadge, fanRunning ? styles.stateBadgeOn : styles.stateBadgeOff]}>
                <View style={[styles.stateBadgeDot, { backgroundColor: fanRunning ? '#22c55e' : '#ef4444' }]} />
                <Text style={[styles.stateBadgeText, { color: fanRunning ? '#4ade80' : '#f87171' }]}>
                  {fanRunning ? 'ENCENDIDO' : 'APAGADO'}
                </Text>
              </View>
            </View>

            <View style={styles.thresholdForm}>
              <Text style={styles.thresholdLabel}>Ajustar Umbral de Temp:</Text>
              <View style={styles.thresholdInputRow}>
                <TextInput
                  style={styles.thresholdInput}
                  keyboardType="numeric"
                  placeholder="30.0"
                  placeholderTextColor="#64748b"
                  value={umbralInput}
                  onChangeText={setUmbralInput}
                />
                <Text style={styles.thresholdUnit}>°C</Text>
                <TouchableOpacity style={styles.thresholdButton} onPress={handleSendUmbral}>
                  <Text style={styles.thresholdButtonText}>Aplicar</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.currentThresholdText}>
                Umbral activo: <Text style={styles.activeValue}>{fanUmbral !== undefined ? `${fanUmbral} °C` : '--'}</Text>
              </Text>
            </View>
          </View>

          {/* PUMP CONTROL CARD */}
          <View style={[styles.card, styles.controlCard, { borderTopColor: '#51cf66' }]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardHeaderIcon}>💦</Text>
              <Text style={styles.cardHeaderTitle}>Sistema de Riego</Text>
            </View>

            <View style={styles.stateContainer}>
              <Animated.View 
                style={[
                  styles.stateBadge, 
                  pumpRunning ? styles.stateBadgeOn : styles.stateBadgeOff,
                  { opacity: blinkValue }
                ]}
              >
                <View style={[styles.stateBadgeDot, { backgroundColor: pumpRunning ? '#22c55e' : '#64748b' }]} />
                <Text style={[styles.stateBadgeText, { color: pumpRunning ? '#4ade80' : '#94a3b8' }]}>
                  {pumpRunning ? 'REGANDO' : 'EN ESPERA'}
                </Text>
              </Animated.View>
            </View>

            <View style={styles.thresholdForm}>
              <Text style={styles.thresholdLabel}>Ajustar Umbral de Riego:</Text>
              <View style={styles.thresholdInputRow}>
                <TextInput
                  style={styles.thresholdInput}
                  keyboardType="numeric"
                  placeholder="40"
                  placeholderTextColor="#64748b"
                  value={pumpUmbralInput}
                  onChangeText={setPumpUmbralInput}
                />
                <Text style={styles.thresholdUnit}>%</Text>
                <TouchableOpacity style={[styles.thresholdButton, { backgroundColor: '#51cf66' }]} onPress={handleSendPumpUmbral}>
                  <Text style={styles.thresholdButtonText}>Aplicar</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.currentThresholdText}>
                Umbral activo: <Text style={[styles.activeValue, { color: '#51cf66' }]}>{pumpUmbral !== undefined ? `${pumpUmbral} %` : '--'}</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* FOOTER */}
        <Text style={styles.footer}>
          Sistemas Embebidos — Tercera Unidad — Invernadero
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ==========================================
// ESTILOS (Premium Dark Glassmorphism)
// ==========================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050814',
  },
  bgGlowContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: 0,
  },
  glowOrb: {
    position: 'absolute',
    borderRadius: 999,
    width: 250,
    height: 250,
    opacity: 0.15,
  },
  glowOrb1: {
    backgroundColor: '#3b82f6',
    top: -50,
    left: -50,
  },
  glowOrb2: {
    backgroundColor: '#a855f7',
    bottom: 50,
    right: -50,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    zIndex: 1,
  },
  header: {
    marginBottom: 16,
    marginTop: 8,
  },
  headerLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerLogo: {
    fontSize: 36,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 30,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  headerActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
    gap: 10,
  },
  emergencyButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 30,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 3,
  },
  emergencyButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 20,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  cardHeaderIcon: {
    fontSize: 22,
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  brokerForm: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 20, 0.8)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1.5,
    borderRadius: 8,
    color: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  button: {
    backgroundColor: '#8b5cf6',
    borderRadius: 8,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  helpText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 8,
  },
  sensorsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  sensorCard: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderTopWidth: 3,
    padding: 16,
    justifyContent: 'space-between',
    minHeight: 120,
  },
  sensorCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sensorCardIcon: {
    fontSize: 18,
  },
  sensorCardTitle: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sensorCardValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: 12,
  },
  sensorCardValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -1,
  },
  sensorCardUnit: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 2,
    fontWeight: '600',
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  controlsContainer: {
    gap: 16,
  },
  controlCard: {
    borderTopWidth: 3,
    marginBottom: 0,
  },
  stateContainer: {
    marginBottom: 16,
  },
  stateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  stateBadgeOn: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderColor: 'rgba(34, 197, 94, 0.25)',
  },
  stateBadgeOff: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  stateBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  stateBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  thresholdForm: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 16,
  },
  thresholdLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
    marginBottom: 10,
  },
  thresholdInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  thresholdInput: {
    width: 70,
    backgroundColor: 'rgba(5, 8, 20, 0.8)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1.5,
    borderRadius: 8,
    color: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  thresholdUnit: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  thresholdButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginLeft: 'auto',
  },
  thresholdButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  currentThresholdText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 10,
  },
  activeValue: {
    color: '#3b82f6',
    fontWeight: '700',
  },
  pumpInfoText: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
  },
  footer: {
    textAlign: 'center',
    color: '#475569',
    fontSize: 10,
    marginTop: 30,
    marginBottom: 10,
  },
});
