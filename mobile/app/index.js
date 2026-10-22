import { Redirect } from 'expo-router';
import { useAuth } from '../src/auth/AuthContext';

export default function Index() {
  const { estado } = useAuth();
  return <Redirect href={estado === 'dentro' ? '/inicio' : '/bienvenida'} />;
}
