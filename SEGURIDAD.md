# Seguridad de ProAgro

Defensa en capas: si una falla, la siguiente sigue protegiendo. Cada punto dice **dónde está en el código**
para que lo puedan mostrar en la sustentación.

## 1. Cuentas y contraseñas
| Medida | Qué evita | Dónde |
|---|---|---|
| **Argon2id** (19 MiB, 2 iteraciones) + *pepper* secreto del servidor | Que roben la BD y descifren las contraseñas | `backend/src/services/password.js` |
| Política: 8+ caracteres, letras y números, sin contraseñas comunes ni la cédula o el celular | Contraseñas fáciles de adivinar | `password.js` → `problemaContrasena` |
| **Bloqueo progresivo**: 5 intentos fallidos → 15 min, luego 30, 60… hasta 24 h | Fuerza bruta contra una cuenta | `routes/auth.js` POST /login |
| Límite por IP: 10 intentos de login cada 15 min, 5 registros por hora | Fuerza bruta masiva y creación de cuentas falsas | `middleware/seguridad.js` |
| Mismo mensaje y **mismo tiempo de respuesta** exista o no el usuario | Averiguar qué celulares están registrados | `verificarContrasena` con hash falso |
| Cambiar la contraseña exige la actual y cierra las demás sesiones | Que alguien con el teléfono desbloqueado se quede con la cuenta | `PUT /auth/contrasena` |
| Google/Microsoft: el servidor verifica firma, emisor, audiencia, vencimiento y *nonce* del token | Tokens falsificados enviados por una app modificada | `services/oauth.js` |

## 2. Sesiones
| Medida | Qué evita | Dónde |
|---|---|---|
| **Access token JWT de 15 min** con algoritmo fijo (HS256), `iss` y `aud` | Que un token robado sirva por mucho tiempo y el ataque `alg: none` | `services/tokens.js` |
| **Refresh token rotativo** (256 bits aleatorios, en BD solo su SHA-256) | Que un refresh robado de la BD sirva | `rotarSesion` |
| **Detección de reutilización**: si alguien usa un refresh viejo, se cierran TODAS las sesiones | Robo de sesión: el ladrón y la víctima no pueden usar el mismo token | `rotarSesion` → evento `REUSO_TOKEN` |
| Cada petición verifica en BD que la sesión siga viva, la cuenta activa y el `tokenVersion` | Que cerrar sesión o suspender una cuenta tarde 15 min en aplicar | `middleware/auth.js` |
| El rol sale de la BD, no del token | Que alguien conserve permisos de admin después de que se los quiten | `middleware/auth.js` |
| Sesión máxima absoluta de 90 días | Sesiones eternas | `SESION_MAX_DIAS` |
| Ver y cerrar sesiones por dispositivo, o cerrar en todos | Teléfono perdido o robado | `GET/DELETE /auth/sesiones` |

## 3. Datos personales (Ley 1581 de 2012, Habeas Data)
| Medida | Dónde |
|---|---|
| Cédula, celular y correo **cifrados con AES-256-GCM** (IV aleatorio y autenticación de integridad) | `lib/cripto.js`, `lib/proteccion.js` |
| "Hash ciego" HMAC-SHA256 para buscar y exigir que sean únicos **sin guardarlos en claro** | `hashCelular`, `hashDocumento`… |
| El usuario es un UUID interno: la cédula nunca viaja en URLs ni en tokens | `prisma/schema.prisma` |
| Se registra el consentimiento con versión y fecha de los términos | `Usuario.terminosVersion/Fecha` |
| **Derecho a la supresión**: el usuario borra su cuenta y TODO (cultivos, fotos, chats, publicaciones) | `DELETE /auth/me` |
| El admin ve los celulares enmascarados (300****567) | `routes/admin.js` |
| A Gemini (Google) **no** se le envía nombre, cédula ni celular: solo vereda, cultivos y clima | `services/agrobot.js` |
| Los logs ocultan automáticamente contraseñas, tokens y datos personales | `lib/logger.js` |
| La auditoría guarda un HMAC de la IP, no la IP real | `lib/auditoria.js` |

## 4. API
| Medida | Qué evita | Dónde |
|---|---|---|
| **Validación estricta con zod** en cada ruta: los campos desconocidos se rechazan | *Mass assignment* (colar `rol: "ADMIN"`), tipos inesperados | `lib/http.js` → `validar` |
| Limpieza de caracteres de control e invisibles (RTL override, etc.) | Textos engañosos, inyecciones raras | `limpiarTexto` |
| Todas las consultas filtran por el dueño (`idUsuario`) y responden 404 igual si no existe o es ajeno | **IDOR**: ver o borrar cultivos de otro cambiando el id | `cultivoDelUsuario`, `productoPropio` |
| Prisma usa consultas parametrizadas | Inyección SQL | todo el backend |
| Helmet: HSTS, CSP `default-src 'none'`, `nosniff`, sin `X-Powered-By`, `no-referrer` | Ataques del navegador y *fingerprinting* | `middleware/seguridad.js` |
| HTTPS obligatorio en producción y el servidor no arranca con claves débiles o `http://` | Robo de datos en el WiFi | `config.js`, `soloHttps` |
| Límites: JSON de 100 KB, 120 peticiones/min por IP, tiempos máximos contra *slowloris* | Denegación de servicio | `app.js`, `index.js` |
| CORS cerrado (la app móvil no lo necesita) | Que una web ajena use la API desde el navegador de la víctima | `app.js` |
| Errores sin detalles internos (ni stack ni SQL), con un id para rastrearlos | Fuga de información | `errorHandler` |
| `Cache-Control: no-store` en la API | Datos sensibles en caché | `sinCache` |

## 5. Fotos
1. Máximo 6 MB y una foto, procesada **en memoria**.
2. `sharp` decodifica la imagen: un archivo que no sea imagen real (por ejemplo un `.exe` renombrado) se rechaza.
3. Se **re-codifica a JPEG**: se borran el EXIF y la **ubicación GPS de la finca**, y se eliminan archivos "políglotas" y código escondido.
4. Se guarda con un nombre aleatorio de 128 bits y permisos `600`.
5. Solo se ve con una **URL firmada (HMAC) que vence en 1 hora**. Sin firma da 403 y no hay forma de recorrer carpetas (`../`).
6. Si la petición falla, la foto se borra. Al borrar un cultivo o la cuenta también.

`backend/src/middleware/upload.js`, `routes/archivos.js`

## 6. AgroBot (IA)
- **Cupo diario** por agricultor (30 por defecto) y máximo 6 mensajes por minuto: protegen la cuota gratuita de Gemini.
- Defensa contra *prompt injection*: el mensaje va delimitado como dato y las instrucciones prohíben cambiar de rol, revelar el prompt o pedir datos personales.
- La llave de Gemini vive **solo en el servidor**; la app nunca la ve.
- Respuesta limitada en largo y con aviso de "confirma con un técnico de la UMATA".

## 7. Marketplace
- El celular del vendedor **no aparece en el listado**: solo se entrega al pulsar "Contactar" (25 contactos por día por usuario) y cada contacto queda registrado.
- **No se permiten enlaces ni teléfonos en el texto**: así los estafadores no pueden sacar al comprador de la app.
- Con **3 reportes** de personas distintas la publicación se oculta sola hasta que un admin la revise. Nadie puede reportar dos veces la misma publicación ni la suya propia.
- Hay límites de publicaciones por día y de publicaciones activas.
- La app solo abre enlaces que empiecen por `https://wa.me/`, aunque el servidor devuelva otra cosa.
- En la pantalla de cada publicación se muestran consejos de seguridad.

## 8. App móvil
| Medida | Dónde |
|---|---|
| Refresh token en **Keychain/Keystore** (`expo-secure-store`, solo con el teléfono desbloqueado y sin respaldo a otro dispositivo) | `src/auth/almacen.js` |
| Access token **solo en memoria** (nunca AsyncStorage) | `src/api/cliente.js` |
| Desbloqueo con **huella o rostro** y bloqueo tras 2 min en segundo plano | `src/auth/AuthContext.js` |
| Bloqueo de capturas de pantalla en el login, el registro y la seguridad | `usePreventScreenCapture` |
| Se niega a usar `http://` en producción (además de ATS en iOS) | `cliente.js`, `app.config.js` |
| `allowBackup: false` en Android y permisos de micrófono y ubicación bloqueados | `app.config.js` |
| Fotos reducidas y sin EXIF desde el teléfono | `src/utils/fotos.js` |
| Si el servidor cierra la sesión (robo detectado, cuenta suspendida), la app borra todo al instante | `alPerderSesion` |
| Documento y celular se muestran parcialmente en el perfil | `perfil/index.js` |
| Ninguna clave secreta dentro de la app | `.env` solo con `EXPO_PUBLIC_*` públicas |

## 9. Operación
- `npm run claves` genera claves con `crypto.randomBytes`. Usen claves distintas en desarrollo y en producción.
- `.env`, `uploads/` y los keystores están en `.gitignore`. **Nunca suban secretos a GitHub.**
- `npm run seguridad` (`npm audit`) revisa vulnerabilidades en las dependencias. Córranlo antes de cada entrega.
- La tabla `auditoria` registra: registro, logins exitosos y fallidos, bloqueos, reutilización de tokens, cambios de contraseña y de contacto, eliminación de cuentas y acciones de admin y del Marketplace.

## Pendiente (fase 2)
- Segundo factor (OTP por SMS o correo). Hoy no hay un proveedor de SMS gratuito confiable en Colombia.
- *Certificate pinning* en la app (requiere un módulo nativo).
- Límites de peticiones en Redis si despliegan varias instancias del servidor.
- Detección de teléfonos con root o jailbreak.
- Pagos en línea en el Marketplace (Wompi o Mercado Pago) con su propia revisión de seguridad.
