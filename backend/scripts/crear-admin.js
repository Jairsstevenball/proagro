// Convierte en ADMINISTRADOR a un usuario ya registrado.  Uso: npm run admin -- 3001234567
// No existe ninguna ruta de la API para volverse admin: solo se hace desde el servidor.
import { prisma } from '../src/lib/prisma.js';
import { hashCelular } from '../src/lib/proteccion.js';

const celular = process.argv[2];
if (!celular) {
  console.error('Uso: npm run admin -- <celular del usuario>');
  process.exit(1);
}
const u = await prisma.usuario.findUnique({ where: { celularHash: hashCelular(celular) } });
if (!u) {
  console.error('No hay un usuario con ese celular. Primero regístrate en la app.');
  process.exit(1);
}
await prisma.usuario.update({ where: { id: u.id }, data: { rol: 'ADMIN', tokenVersion: { increment: 1 } } });
console.log(`✔ ${u.nombre} ${u.primerApellido} ahora es ADMIN. Debe volver a iniciar sesión.`);
await prisma.$disconnect();
