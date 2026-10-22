import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { validar, paramsId } from '../lib/http.js';

const router = Router();

router.get('/', async (req, res) => {
  const notificaciones = await prisma.notificacionAlerta.findMany({
    where: { idUsuario: req.user.id },
    orderBy: { fecha: 'desc' },
    take: 50,
    select: {
      idNotificacion: true, idCultivo: true, tipoAlerta: true, nivel: true, titulo: true,
      mensaje: true, estado: true, fecha: true, cultivo: { select: { tipoCultivo: true } },
    },
  });
  res.json(notificaciones);
});

router.get('/no-leidas', async (req, res) => {
  const total = await prisma.notificacionAlerta.count({ where: { idUsuario: req.user.id, estado: 'NO_LEIDA' } });
  res.json({ total });
});

router.patch('/leer-todas', async (req, res) => {
  await prisma.notificacionAlerta.updateMany({
    where: { idUsuario: req.user.id, estado: 'NO_LEIDA' },
    data: { estado: 'LEIDA' },
  });
  res.status(204).end();
});

router.patch('/:id/leida', validar({ params: paramsId() }), async (req, res) => {
  // El filtro por idUsuario impide marcar notificaciones de otra persona.
  await prisma.notificacionAlerta.updateMany({
    where: { idNotificacion: req.datos.params.id, idUsuario: req.user.id },
    data: { estado: 'LEIDA' },
  });
  res.status(204).end();
});

export default router;
