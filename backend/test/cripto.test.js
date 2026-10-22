import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { cifrar, descifrar, hashCiego, igualesSeguro, firmar, limpiarTexto } from '../src/lib/cripto.js';

const clave = crypto.randomBytes(32);

test('cifrar y descifrar devuelve el dato original', () => {
  const c = cifrar('1023456789', clave);
  assert.ok(c.startsWith('v1.'));
  assert.ok(!c.includes('1023456789'));
  assert.equal(descifrar(c, clave), '1023456789');
});

test('el mismo dato cifrado dos veces da resultados distintos (IV aleatorio)', () => {
  assert.notEqual(cifrar('3001234567', clave), cifrar('3001234567', clave));
});

test('un dato alterado o con otra clave no se puede descifrar', () => {
  const c = cifrar('3001234567', clave);
  const partes = c.split('.');
  partes[3] = Buffer.from('3009999999').toString('base64url');
  assert.throws(() => descifrar(partes.join('.'), clave));
  assert.throws(() => descifrar(c, crypto.randomBytes(32)));
});

test('hash ciego es determinista y depende del contexto', () => {
  assert.equal(hashCiego('300', clave, 'celular'), hashCiego('300', clave, 'celular'));
  assert.notEqual(hashCiego('300', clave, 'celular'), hashCiego('300', clave, 'documento'));
});

test('comparación segura', () => {
  assert.ok(igualesSeguro('abc', 'abc'));
  assert.ok(!igualesSeguro('abc', 'abd'));
  assert.ok(!igualesSeguro('abc', 'abcd'));
  assert.ok(!igualesSeguro(firmar('a.jpg', 1, clave), firmar('a.jpg', 2, clave)));
});

test('limpiarTexto quita caracteres de control e invisibles', () => {
  assert.equal(limpiarTexto('  Papa‮gnp.exe\u0000 '), 'Papagnp.exe');
});
