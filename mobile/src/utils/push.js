// Registro para notificaciones push de alertas de clima.
// En Expo Go (SDK 53+) las push de Android NO existen y la librería lanza error apenas se importa.
// Por eso se carga con require() SOLO cuando la app corre como development build o app instalada.
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { authApi } from '../api/servicios';

const enExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export async function registrarPush() {
  if (enExpoGo) return; // en Expo Go se omite: el resto de la app funciona igual

  const Notifications = require('expo-notifications');
  const Device = require('expo-device');
  if (!Device.isDevice) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('alertas', {
      name: 'Alertas de clima',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') ({ status } = await Notifications.requestPermissionsAsync());
  if (status !== 'granted') return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return; // sin proyecto EAS todavía (ver README: eas init)
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  await authApi.pushToken(data);
}
