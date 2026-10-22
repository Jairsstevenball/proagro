// Revisa que todo lo externo funcione y muestra el error EXACTO si algo falla.
// Uso:  npm run diagnostico
import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import sharp from 'sharp';

const ok = (m) => console.log(`  ✅ ${m}`);
const mal = (m) => console.log(`  ❌ ${m}`);

console.log('\n=== DIAGNÓSTICO PROAGRO ===\n');

// 1. Variables
console.log('1) Archivo .env');
const key = process.env.GEMINI_API_KEY || '';
const modelo = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
if (!key) mal('GEMINI_API_KEY está vacía');
else ok(`GEMINI_API_KEY presente (${key.slice(0, 6)}...${key.slice(-4)})`);
ok(`GEMINI_MODEL = ${modelo}`);

// 2. Gemini
console.log('\n2) Conexión con Gemini (AgroBot)');
if (key) {
  const ai = new GoogleGenAI({ apiKey: key });
  try {
    const r = await ai.models.generateContent({ model: modelo, contents: 'Responde solo: OK' });
    ok(`Gemini respondió: "${r.text?.trim()}"`);
  } catch (e) {
    mal(`Gemini falló con el modelo "${modelo}"`);
    console.log(`     status: ${e.status}`);
    console.log(`     mensaje: ${String(e.message).slice(0, 500)}`);
    try {
      const lista = await ai.models.list();
      const nombres = [];
      for await (const m of lista) if (/flash/i.test(m.name)) nombres.push(m.name.replace('models/', ''));
      console.log(`     Modelos "flash" disponibles para tu llave:\n       ${nombres.slice(0, 15).join('\n       ')}`);
    } catch (e2) {
      console.log(`     (no se pudo listar modelos: ${String(e2.message).slice(0, 200)})`);
    }
  }
}

// 3. Clima
console.log('\n3) Conexión con Open-Meteo (clima)');
try {
  const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=4.45&longitude=-74.16&current=temperature_2m', { signal: AbortSignal.timeout(10000) });
  const j = await r.json();
  ok(`Clima responde: ${j.current?.temperature_2m} °C en Pasquilla`);
} catch (e) {
  mal(`No se pudo consultar el clima: ${e.message}`);
}

// 4. Procesador de imágenes
console.log('\n4) Procesador de fotos (sharp)');
try {
  const img = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#3a3' } }).jpeg().toBuffer();
  await sharp(img).metadata();
  ok('sharp funciona');
} catch (e) {
  mal(`sharp no funciona: ${e.message}`);
}

console.log('\n=== FIN ===\n');
