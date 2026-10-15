const { test, before, after } = require('node:test');
const assert = require('node:assert');
const server = require('./index');

let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve) => {
    server.close(resolve);
  });
});

test('GET / returns 200 and contains "App running"', async () => {
  const res = await fetch(`${baseUrl}/`);
  assert.strictEqual(res.status, 200);
  const text = await res.text();
  assert.ok(text.includes('App running'), 'Response should contain "App running"');
});

test('GET / includes current NODE_ENV text', async () => {
  const currentEnv = process.env.NODE_ENV || 'development';
  const res = await fetch(`${baseUrl}/`);
  assert.strictEqual(res.status, 200);
  const text = await res.text();
  assert.ok(
    text.includes(currentEnv),
    `Response "${text}" should contain NODE_ENV "${currentEnv}"`
  );
});

test('GET /health returns 200 with status ok and uptime', async () => {
  const res = await fetch(`${baseUrl}/health`);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.headers.get('content-type'), 'application/json; charset=utf-8');
  const data = await res.json();
  assert.strictEqual(data.status, 'ok');
  assert.strictEqual(typeof data.uptime, 'number');
  assert.ok(data.uptime >= 0);
});

test('GET unknown path returns 404 JSON', async () => {
  const res = await fetch(`${baseUrl}/non-existent-route`);
  assert.strictEqual(res.status, 404);
  assert.strictEqual(res.headers.get('content-type'), 'application/json; charset=utf-8');
  const data = await res.json();
  assert.deepStrictEqual(data, { error: 'Not found' });
});
