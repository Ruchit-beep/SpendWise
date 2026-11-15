// Integration test: boots the API against an in-memory MongoDB. Run with `npm test` in /server.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-123456';

let mongo, a, b, app;
const today = new Date().toISOString().slice(0, 10);
const tx = (o = {}) => ({ title: 'Lunch', amount: 250, type: 'expense', category: 'Food', date: today, paymentMethod: 'UPI', ...o });

before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  const { createApp } = await import('../src/app.js');
  app = createApp();
  a = request.agent(app);
  b = request.agent(app);
});
after(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

test('registration validates input and hashes passwords', async () => {
  assert.equal((await a.post('/api/auth/register').send({ name: 'A', email: 'bad', password: 'abc12345' })).status, 400);
  assert.equal((await a.post('/api/auth/register').send({ name: 'A', email: 'a@x.com', password: 'short' })).status, 400);
  const r = await a.post('/api/auth/register').send({ name: 'Asha', email: 'a@x.com', password: 'password1' });
  assert.equal(r.status, 201);
  assert.equal(r.body.user.passwordHash, undefined);
  const raw = await mongoose.connection.collection('users').findOne({ email: 'a@x.com' });
  assert.notEqual(raw.passwordHash, 'password1');
  assert.equal((await a.post('/api/auth/register').send({ name: 'A2', email: 'a@x.com', password: 'password1' })).status, 409);
  await b.post('/api/auth/register').send({ name: 'Bob', email: 'b@x.com', password: 'password2' });
});

test('protected routes need a session; login and logout work', async () => {
  assert.equal((await request(app).get('/api/transactions')).status, 401);
  assert.equal((await request(app).post('/api/auth/login').send({ email: 'a@x.com', password: 'wrongpass1' })).status, 401);
  assert.equal((await a.get('/api/auth/me')).body.user.email, 'a@x.com');
  await a.post('/api/auth/logout');
  assert.equal((await a.get('/api/auth/me')).status, 401);
  assert.equal((await a.post('/api/auth/login').send({ email: 'a@x.com', password: 'password1' })).status, 200);
});

test('transaction CRUD updates dashboard totals', async () => {
  const income = await a.post('/api/transactions').send(tx({ title: 'Salary', amount: 50000, type: 'income', category: 'Salary' }));
  assert.equal(income.status, 201);
  const e = await a.post('/api/transactions').send(tx({ amount: 1000 }));
  assert.equal((await a.post('/api/transactions').send(tx({ amount: -5 }))).status, 400);
  assert.equal((await a.post('/api/transactions').send(tx({ category: 'Salary' }))).status, 400); // wrong category for type
  let d = (await a.get('/api/analytics/dashboard')).body;
  assert.equal(d.cards.expense.value, 1000);
  assert.equal(d.cards.balance.value, 49000);
  await a.put(`/api/transactions/${e.body.transaction._id}`).send(tx({ amount: 1500 }));
  d = (await a.get('/api/analytics/dashboard')).body;
  assert.equal(d.cards.expense.value, 1500);
  await a.delete(`/api/transactions/${e.body.transaction._id}`);
  d = (await a.get('/api/analytics/dashboard')).body;
  assert.equal(d.cards.expense.value, 0);
  const list = await a.get('/api/transactions?q=sal&type=income&sort=amount');
  assert.equal(list.body.total, 1);
});

test("users cannot read or change each other's data", async () => {
  const mine = await a.post('/api/transactions').send(tx({ title: 'Private' }));
  const id = mine.body.transaction._id;
  assert.equal((await b.get('/api/transactions')).body.total, 0);
  assert.equal((await b.put(`/api/transactions/${id}`).send(tx())).status, 404);
  assert.equal((await b.delete(`/api/transactions/${id}`)).status, 404);
});

test('budgets track spending and goals accept contributions', async () => {
  const month = today.slice(0, 7);
  await a.post('/api/budgets').send({ month, category: 'Overall', limit: 10000 });
  const bud = (await a.get('/api/budgets')).body.budgets[0];
  assert.equal(bud.limit, 10000);
  assert.equal(bud.spent, 250); // the 'Private' lunch from the previous test
  const g = await a.post('/api/goals').send({ name: 'Laptop', targetAmount: 60000, targetDate: '' });
  assert.equal(g.status, 201);
  const c = await a.post(`/api/goals/${g.body.goal._id}/contribute`).send({ amount: 5000 });
  assert.equal(c.body.goal.savedAmount, 5000);
  assert.equal((await a.post(`/api/goals/${g.body.goal._id}/contribute`).send({ amount: 0 })).status, 400);
});

test('reports and exports use real records; demo data is removable', async () => {
  const rep = await a.get(`/api/analytics/report?from=${today.slice(0, 7)}-01&to=${today}`);
  assert.equal(rep.status, 200);
  assert.equal(rep.body.summary.expense, 250);
  const csv = await a.get('/api/analytics/export.csv');
  assert.match(csv.text, /Private/);
  const pdf = await a.get('/api/analytics/export.pdf').buffer(true).parse((res, cb) => { const c = []; res.on('data', (x) => c.push(x)); res.on('end', () => cb(null, Buffer.concat(c))); });
  assert.equal(pdf.body.slice(0, 4).toString(), '%PDF');
  assert.equal((await a.post('/api/demo')).status, 201);
  assert.equal((await a.get('/api/analytics/dashboard')).body.hasDemo, true);
  await a.delete('/api/demo');
  const d = (await a.get('/api/analytics/dashboard')).body;
  assert.equal(d.hasDemo, false);
  assert.ok(d.cards.balance.value !== 0); // real records survived
});

test('forgot and reset password: generic reply, one-time token, old sessions revoked', async () => {
  process.env.APP_URL = 'http://localhost:5173';
  const post = (path, body) => request(app).post(path).send(body);
  globalThis.__lastMail = undefined;
  const unknown = await post('/api/auth/forgot', { email: 'nobody@x.com' });
  const known = await post('/api/auth/forgot', { email: 'b@x.com' });
  assert.equal(unknown.status, 200);
  assert.equal(unknown.body.message, known.body.message); // no account enumeration
  await new Promise((r) => setTimeout(r, 150)); // the email is sent without blocking the response
  assert.equal(globalThis.__lastMail.to, 'b@x.com');
  const token = globalThis.__lastMail.text.match(/token=([a-f0-9]+)/)[1];
  const raw = await mongoose.connection.collection('users').findOne({ email: 'b@x.com' });
  assert.notEqual(raw.resetTokenHash, token); // only a hash is stored

  assert.equal((await post('/api/auth/reset', { token: 'f'.repeat(64), password: 'newpass123' })).status, 400);
  assert.equal((await post('/api/auth/reset', { token, password: 'short' })).status, 400);
  assert.equal((await b.get('/api/auth/me')).status, 200);
  await new Promise((r) => setTimeout(r, 1100)); // JWT times have 1-second resolution
  assert.equal((await post('/api/auth/reset', { token, password: 'newpass123' })).status, 200);
  assert.equal((await post('/api/auth/reset', { token, password: 'another123' })).status, 400); // single use
  assert.equal((await b.get('/api/auth/me')).status, 401); // old session revoked
  assert.equal((await post('/api/auth/login', { email: 'b@x.com', password: 'password2' })).status, 401);
  assert.equal((await post('/api/auth/login', { email: 'b@x.com', password: 'newpass123' })).status, 200);
});

test('google sign-in is off until configured', async () => {
  delete process.env.GOOGLE_CLIENT_ID;
  assert.equal((await request(app).get('/api/auth/config')).body.googleClientId, null);
  assert.equal((await request(app).post('/api/auth/google').send({ credential: 'x'.repeat(40) })).status, 503);
});
