# ProAgro


App móvil para pequeños agricultores de Ciudad Bolívar: clima y alertas, Mi Cultivo, Riego (FAO-56),
AgroBot con IA (texto y fotos), Estadísticas y Mercado sin intermediarios.

```
proagro/
├── backend/   API Node.js + Express + Prisma + PostgreSQL
└── mobile/    App React Native con Expo (Expo Router)
```

## Tecnologías (todas gratis)

| Capa | Tecnología | Nota |
|---|---|---|
| Móvil | React Native + **Expo SDK 54** + Expo Router | Se prueba en el celular escaneando un QR |
| Backend | Node.js 20+ · Express 5 · Prisma 6 | |
| Base de datos | PostgreSQL 16 | Gratis en [Neon](https://neon.tech) o [Supabase](https://supabase.com) |
| IA | Google Gemini 2.5 Flash | Llave gratis en [AI Studio](https://aistudio.google.com/apikey) |
| Clima | [Open-Meteo](https://open-meteo.com) | Sin API key. Trae ET0 FAO-56 para el riego |
| Push | Expo Push | Gratis |
| Hosting API | [Render](https://render.com) o [Railway](https://railway.app) | Plan gratis |

---

| CU-07 Pantalla principal | `(app)/inicio.js` | — |
| CU-08 a CU-12 Mis cultivos | `(app)/mi-cultivo/*`, `agregar.js` | `cultivos.js` |
| CU-13 AgroBot | `(app)/agrobot.js` | `agrobot.js` |
| Administrador | (panel por hacer) | `admin.js` |

La seguridad está explicada en [SEGURIDAD.md](SEGURIDAD.md).
