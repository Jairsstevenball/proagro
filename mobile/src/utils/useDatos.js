// Carga datos del backend cada vez que la pantalla se muestra, con estado de carga y error.
import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

export function useDatos(cargar, deps = []) {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const montado = useRef(true);

  const recargar = useCallback(async () => {
    setError(null);
    try {
      const d = await cargar();
      if (montado.current) setDatos(d);
    } catch (e) {
      if (montado.current) setError(e.message);
    } finally {
      if (montado.current) setCargando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useFocusEffect(
    useCallback(() => {
      montado.current = true;
      recargar();
      return () => {
        montado.current = false;
      };
    }, [recargar]),
  );

  return { datos, setDatos, cargando, error, recargar };
}
