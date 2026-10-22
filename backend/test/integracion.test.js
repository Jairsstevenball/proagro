// Pruebas de seguridad de punta a punta contra una base de datos REAL de pruebas.
// Se saltan si no definen TEST_DATABASE_URL (¡usen una BD vacía distinta a la de desarrollo!).
//
//   TEST_DATABASE_URL="postgresql://postgres:proagro@localhost:5432/proagro_test" npm test
//
// Antes, crea las tablas en esa BD:
//   DATABASE_URL="<la misma url>" npx prisma migrate deploy
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const URL_BD = process.env.TEST_DATABASE_URL;
const saltar = !URL_BD && 'define TEST_DATABASE_URL para correr estas pruebas';

let server, base, prisma;

before(async () => {
  if (saltar) return;
  Object.assign(process.env, {
    NODE_ENV: 'test',
    DATABASE_URL: URL_BD,
    JWT_SECRET: crypto.randomBytes(48).toString('base64url'),
    DATA_KEY: crypto.randomBytes(32).toString('base64'),
    INDEX_KEY: crypto.randomBytes(32).toString('base64'),
    FILE_KEY: crypto.randomBytes(32).toString('base64'),
    PASSWORD_PEPPER: crypto.randomBytes(32).toString('base64url'),
    UPLOAD_DIR: 'uploads-test',
  });
  ({ prisma } = await import('../src/lib/prisma.js'));
  const { app } = await import('../src/app.js');
  await prisma.usuario.deleteMany({});
  await new Promise((r) => (server = app.listen(0, r)));
  base = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  if (saltar) return;
  await prisma.usuario.deleteMany({});
  await prisma.$disconnect();
  server.close();
});

async function api(metodo, ruta, { token, body } = {}) {
  const res = await fetch(base + ruta, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const texto = await res.text();
  return { status: res.status, body: texto ? JSON.parse(texto) : null };
}

const persona = (n) => ({
  documento: `10000000${n}`,
  nombre: 'Ana',
  primerApellido: 'Rojas',
  ubicacion: 'Pasquilla',
  celular: `300000000${n}`,
  contrasena: 'Siembra2026',
  aceptaTerminos: true,
});

test('flujo de seguridad completo', { skip: saltar }, async (t) => {
  const a = await api('POST', '/auth/registro', { body: persona(1) });
  assert.equal(a.status, 201, JSON.stringify(a.body));
  const b = await api('POST', '/auth/registro', { body: persona(2) });
  assert.equal(b.status, 201);

  await t.test('los datos personales quedan cifrados en la BD', async () => {
    const fila = await prisma.usuario.findFirst({ where: { id: a.body.usuario.id } });
    assert.ok(!JSON.stringify(fila).includes('3000000001'));
    assert.ok(!JSON.stringify(fila).includes('100000001'));
    assert.ok(fila.contrasena.startsWith('$argon2id$'));
  });

  await t.test('no se puede colar el rol ADMIN al registrarse', async () => {
    const r = await api('POST', '/auth/registro', { body: { ...persona(3), rol: 'ADMIN' } });
    assert.equal(r.status, 400);
  });

  await t.test('contraseña débil rechazada', async () => {
    const r = await api('POST', '/auth/registro', { body: { ...persona(4), contrasena: '12345678' } });
    assert.equal(r.status, 400);
  });

  await t.test('un usuario no puede ver el cultivo de otro (IDOR)', async () => {
    const c = await api('POST', '/cultivos', { token: a.body.accessToken, body: { tipoCultivo: 'Papa', areaM2: 100 } });
    assert.equal(c.status, 201, JSON.stringify(c.body));
    assert.equal((await api('GET', `/cultivos/${c.body.idCultivo}`, { token: b.body.accessToken })).status, 404);
    assert.equal((await api('DELETE', `/cultivos/${c.body.idCultivo}`, { token: b.body.accessToken })).status, 404);
    assert.equal((await api('GET', `/cultivos/${c.body.idCultivo}`, { token: a.body.accessToken })).status, 200);
  });

  await t.test('sin token o con token falso: 401', async () => {
    assert.equal((await api('GET', '/cultivos')).status, 401);
    assert.equal((await api('GET', '/cultivos', { token: 'abc.def.ghi' })).status, 401);
  });

  await t.test('un agricultor no entra al panel de admin', async () => {
    assert.equal((await api('GET', '/admin/resumen', { token: a.body.accessToken })).status, 403);
  });

  await t.test('refresh rota y detecta reutilización de un token robado', async () => {
    const r1 = await api('POST', '/auth/refresh', { body: { refreshToken: b.body.refreshToken } });
    assert.equal(r1.status, 200);
    assert.notEqual(r1.body.refreshToken, b.body.refreshToken);
    // El "ladrón" usa el token viejo => se revocan todas las sesiones
    const robo = await api('POST', '/auth/refresh', { body: { refreshToken: b.body.refreshToken } });
    assert.equal(robo.status, 401);
    assert.equal(robo.body.codigo, 'SESION_REVOCADA');
    // Ni el token nuevo ni el access token sirven ya
    assert.equal((await api('POST', '/auth/refresh', { body: { refreshToken: r1.body.refreshToken } })).status, 401);
    assert.equal((await api('GET', '/auth/me', { token: r1.body.accessToken })).status, 401);
  });

  await t.test('cerrar sesión invalida el access token al instante', async () => {
    const l = await api('POST', '/auth/login', { body: { usuario: '3000000002', contrasena: 'Siembra2026' } });
    assert.equal(l.status, 200);
    assert.equal((await api('POST', '/auth/logout', { token: l.body.accessToken })).status, 204);
    assert.equal((await api('GET', '/auth/me', { token: l.body.accessToken })).status, 401);
  });

  await t.test('bloqueo tras 5 intentos fallidos', async () => {
    for (let i = 0; i < 5; i++) {
      assert.equal((await api('POST', '/auth/login', { body: { usuario: '3000000002', contrasena: 'MalaClave99' } })).status, 401);
    }
    const r = await api('POST', '/auth/login', { body: { usuario: '3000000002', contrasena: 'Siembra2026' } });
    assert.equal(r.status, 429);
    assert.equal(r.body.codigo, 'CUENTA_BLOQUEADA');
  });

  await t.test('usuario inexistente: mismo mensaje que contraseña errada', async () => {
    const r = await api('POST', '/auth/login', { body: { usuario: '3209999999', contrasena: 'Siembra2026' } });
    assert.equal(r.status, 401);
    assert.equal(r.body.error, 'Celular o contraseña incorrectos');
  });

  await t.test('fotos sin firma válida: 403', async () => {
    const r = await fetch(`${base}/archivos/${'a'.repeat(32)}.jpg?exp=9999999999&sig=falsa`);
    assert.equal(r.status, 403);
    const r2 = await fetch(`${base}/archivos/..%2F..%2F.env`);
    assert.equal(r2.status, 403);
  });

  await t.test('marketplace: sin teléfonos en el texto y sin contactarse a sí mismo', async () => {
    const tok = a.body.accessToken;
    const malo = await api('POST', '/mercado', {
      token: tok,
      body: { tipo: 'COSECHA', categoria: 'Papa', titulo: 'Papa llama 300 123 4567', precio: 80000, unidad: 'bulto', cantidad: 10 },
    });
    assert.equal(malo.status, 400);
    const p = await api('POST', '/mercado', {
      token: tok,
      body: { tipo: 'COSECHA', categoria: 'Papa', titulo: 'Papa pastusa', precio: 80000, unidad: 'bulto', cantidad: 10 },
    });
    assert.equal(p.status, 201, JSON.stringify(p.body));
    assert.equal((await api('POST', `/mercado/${p.body.idProducto}/contacto`, { token: tok })).status, 400);
    // El listado no expone el celular del vendedor
    const lista = await api('GET', '/mercado', { token: tok });
    assert.ok(!JSON.stringify(lista.body).includes('3000000001'));
  });
});
