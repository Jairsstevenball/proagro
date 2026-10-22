import { Stack } from 'expo-router';
import { colores } from '../../src/tema';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colores.crema } }} />;
}
