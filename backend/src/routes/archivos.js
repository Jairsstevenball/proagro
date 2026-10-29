// Sirve fotos SOLO con URL firmada y vigente: /api/archivos/<nombre>.jpg?exp=...&sig=...
// Así nadie puede recorrer las fotos de otros agricultores adivinando nombres.
// Las fotos se leen de la base de datos (tabla archivo), no del disco.
import { Router } from 'express';
import { leerImagen } from '../middleware/upload.js';
import { verificarFirma } from '../lib/proteccion.js';

const router = Router();

router.get('/:nombre', async (req, res) => {
  const { nombre } = req.params;
  const { exp, sig } = req.query;
  if (typeof exp !== 'string' || typeof sig !== 'string' || !verificarFirma(nombre, exp, sig)) {
    return res.status(403).json({ error: 'Enlace inválido o vencido' });
  }
  const foto = await leerImagen(nombre);
  if (!foto) return res.status(404).json({ error: 'No encontrado' });

  // El nombre es aleatorio y la foto nunca cambia: el celular la puede guardar hasta que venza el enlace.
  const restante = Math.max(0, Number(exp) - Math.floor(Date.now() / 1000));
  res.set({
    'Content-Type': 'image/jpeg',
    'Content-Length': String(foto.length),
    'Cache-Control': `private, max-age=${restante}, immutable`,
    'X-Content-Type-Options': 'nosniff',
    'Content-Disposition': 'inline',
  });
  res.end(foto);
});

export default router;
