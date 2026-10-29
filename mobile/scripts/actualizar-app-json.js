// Agrega el ícono nuevo de ProAgro a SU app.json sin borrar nada (conserva el projectId de EAS).
// Uso (desde la carpeta mobile):   node scripts/actualizar-app-json.js
const fs = require('fs');
const path = require('path');

const archivo = path.join(__dirname, '..', 'app.json');
const datos = JSON.parse(fs.readFileSync(archivo, 'utf8'));
const e = datos.expo;

e.icon = './assets/icon.png';
e.android = e.android || {};
e.android.adaptiveIcon = { foregroundImage: './assets/adaptive-icon.png', backgroundColor: '#F3E4DA' };
delete e.newArchEnabled; // ya no se usa en el SDK 57

// Sube la versión: 1.0.0 -> 1.1.0 (así el celular sabe que es una app nueva)
const [a, b] = String(e.version || '1.0.0').split('.').map(Number);
e.version = `${a || 1}.${(b || 0) + 1}.0`;

fs.writeFileSync(archivo, `${JSON.stringify(datos, null, 2)}\n`);
console.log(`✅ app.json listo. Versión ${e.version}. projectId de EAS: ${e.extra?.eas?.projectId || '(no tenía)'}`);
