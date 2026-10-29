// Copia las fotos que estaban en la carpeta "uploads" de SU COMPUTADOR a la base de datos.
// Úsenlo una sola vez, en el computador donde tenían el servidor:   npm run fotos:migrar
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const carpeta = path.resolve(process.env.UPLOAD_DIR || 'uploads');
const NOMBRE = /^[a-f0-9]{32}\.jpg$/;

if (!fs.existsSync(carpeta)) {
  console.log(`No existe la carpeta ${carpeta}: no hay fotos que pasar.`);
  process.exit(0);
}

let pasadas = 0;
let omitidas = 0;
for (const nombre of fs.readdirSync(carpeta)) {
  if (!NOMBRE.test(nombre)) continue;
  const ya = await prisma.archivo.findUnique({ where: { nombre }, select: { nombre: true } });
  if (ya) {
    omitidas++;
    continue;
  }
  const datos = fs.readFileSync(path.join(carpeta, nombre));
  await prisma.archivo.create({ data: { nombre, datos, tamano: datos.length } });
  pasadas++;
}
console.log(`✅ Fotos copiadas a la base de datos: ${pasadas}. Ya estaban: ${omitidas}.`);
await prisma.$disconnect();
