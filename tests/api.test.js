const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { once } = require('node:events');

test('la API exige sesión y persiste las colecciones del frontend', async (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'erp-animal-'));
  const originalEnv = { ...process.env };
  process.env.ADMIN_PASSWORD = 'contraseña-de-prueba-segura';
  process.env.SESSION_SECRET = 'secreto-de-prueba-con-mas-de-treinta-y-dos-caracteres';
  process.env.DB_PATH = path.join(tempDir, 'erp.db');
  process.env.HOST = '127.0.0.1';
  process.env.PORT = '0';

  const serverPath = require.resolve('../server/index.js');
  delete require.cache[serverPath];
  const { startServer, closeDB } = require('../server/index.js');
  const server = startServer();
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    closeDB();
    fs.rmSync(tempDir, { recursive: true, force: true });
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) delete process.env[key];
    }
    Object.assign(process.env, originalEnv);
  });

  let response = await fetch(`${baseUrl}/api/sync`);
  assert.equal(response.status, 401);

  response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'incorrecta' }),
  });
  assert.equal(response.status, 401);

  response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: process.env.ADMIN_PASSWORD }),
  });
  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie').split(';', 1)[0];

  response = await fetch(`${baseUrl}/api/animals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ id: 'ANI-001', nombre: 'Luna', estado: 'Activo' }),
  });
  assert.equal(response.status, 201);

  response = await fetch(`${baseUrl}/api/vacunas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ id: 'VAC-001', animalId: 'ANI-001', tipo: 'Rabia' }),
  });
  assert.equal(response.status, 201);

  response = await fetch(`${baseUrl}/api/animals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ id: 'ANI-001', estado: 'Vendido' }),
  });
  assert.equal(response.status, 201);

  response = await fetch(`${baseUrl}/api/animals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ id: "x'); alert(1);//", nombre: 'inválido' }),
  });
  assert.equal(response.status, 400);

  response = await fetch(`${baseUrl}/api/sync`, { headers: { Cookie: cookie } });
  const sync = await response.json();
  assert.equal(response.status, 200);
  assert.equal(sync.data.animals[0].nombre, 'Luna');
  assert.equal(sync.data.animals[0].estado, 'Vendido');
  assert.equal(sync.data.vacunas[0].tipo, 'Rabia');
});
