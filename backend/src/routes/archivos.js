// Sirve fotos SOLO con URL firmada y vigente: /api/archivos/<nombre>.jpg?exp=...&sig=...
// Así nadie puede recorrer las fotos de otros agricultores adivinando nombres.
import { Router } from 'express';
import path from 'node:path';
import { UPLOAD_DIR } from '../middleware/upload.js';
import { verificarFirma } from '../lib/proteccion.js';

const router = Router();

router.get('/:nombre', (req, res) => {
  const { nombre } = req.params;
  const { exp, sig } = req.query;
  if (typeof exp !== 'string' || typeof sig !== 'string' || !verificarFirma(nombre, exp, sig)) {
    return res.status(403).json({ error: 'Enlace inválido o vencido' });
  }
  res.set({
    'Content-Type': 'image/jpeg',
    'Cache-Control': 'private, max-age=3600',
    'X-Content-Type-Options': 'nosniff',
    'Content-Disposition': 'inline',
  });
  // nombre ya validado con regex estricta: no hay forma de salir de la carpeta (../)
  res.sendFile(path.join(UPLOAD_DIR, nombre), { dotfiles: 'deny' }, (err) => {
    if (err && !res.headersSent) res.status(404).json({ error: 'No encontrado' });
  });
});

export default router;
