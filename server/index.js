import express from 'express';
import cors from 'cors';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const PORT = process.env.PORT || 4000;
const appRoot = fileURLToPath(new URL('..', import.meta.url));
app.use(cors());
app.use(express.json());

function configuredStaffPin() {
  return process.env.STAFF_PIN || (process.env.NODE_ENV === 'production' ? '' : '2468');
}
function staffPinMatches(value) {
  const configured = configuredStaffPin();
  if (!configured || typeof value !== 'string') return false;
  const expectedHash = createHash('sha256').update(configured).digest();
  const receivedHash = createHash('sha256').update(value).digest();
  return timingSafeEqual(expectedHash, receivedHash);
}
function requireStaff(req, res, next) {
  if (!configuredStaffPin()) return res.status(503).json({ error: 'Staff controls are not configured on this server.' });
  if (!staffPinMatches(req.get('x-staff-pin'))) return res.status(401).json({ error: 'Enter the correct staff PIN to use these controls.' });
  next();
}

const offices = [
  { id: 'examination', name: 'Examination Cell', short: 'Exam cell', icon: 'FileCheck2', location: 'Admin block · Room 104', color: 'violet', description: 'Forms, hall tickets & results' },
  { id: 'admin', name: 'Admin Office', short: 'Admin office', icon: 'Building2', location: 'Main building · Ground floor', color: 'blue', description: 'Certificates, records & enquiries' },
  { id: 'hod', name: 'HOD Office', short: 'HOD office', icon: 'GraduationCap', location: 'Academic block · Room 201', color: 'orange', description: 'Academic guidance & approvals' },
  { id: 'library', name: 'Library', short: 'Library', icon: 'BookOpen', location: 'Central library · Main desk', color: 'green', description: 'Borrowing, returns & membership' },
  { id: 'canteen', name: 'Canteen', short: 'Canteen', icon: 'Utensils', location: 'Student center · Food court', color: 'pink', description: 'Order pickup & meal services' },
];

// In-memory demo data: restart the server to reset all queues.
const queues = Object.fromEntries(offices.map((office, index) => [office.id, {
  nextNumber: 38 + index * 3,
  serving: { number: 37 + index * 3, name: 'Walk-in', startedAt: new Date(Date.now() - 4 * 60_000).toISOString() },
  waiting: Array.from({ length: [4, 2, 5, 1, 3][index] }, (_, i) => ({ id: randomUUID(), number: 33 + index * 3 + i, name: ['Aarav M.', 'Priya S.', 'Kabir R.', 'Meera K.', 'Dev A.'][i % 5], joinedAt: new Date(Date.now() - (i + 2) * 3 * 60_000).toISOString() })),
  completed: 24 + index * 7,
}]));

function getOffice(id) { return offices.find((office) => office.id === id); }
function snapshot(id) {
  const office = getOffice(id);
  const queue = queues[id];
  if (!office || !queue) return null;
  const serving = queue.serving ? { number: queue.serving.number, startedAt: queue.serving.startedAt } : null;
  const waiting = queue.waiting.map(({ number }) => ({ number }));
  return { ...office, currentToken: queue.serving?.number ?? null, serving, waitingCount: queue.waiting.length, waiting, completed: queue.completed, estimatedWait: queue.waiting.length * 4, nextToken: queue.nextNumber };
}

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/api/offices', (_req, res) => res.json(offices.map((office) => snapshot(office.id))));
app.get('/api/offices/:id', (req, res) => {
  const office = snapshot(req.params.id);
  if (!office) return res.status(404).json({ error: 'Office not found' });
  res.json(office);
});
app.post('/api/offices/:id/tokens', (req, res) => {
  const queue = queues[req.params.id];
  if (!queue) return res.status(404).json({ error: 'Office not found' });
  const name = String(req.body?.name || '').trim().slice(0, 40);
  if (!name) return res.status(400).json({ error: 'Please enter your name' });
  const token = { id: randomUUID(), number: queue.nextNumber++, name, joinedAt: new Date().toISOString() };
  queue.waiting.push(token);
  res.status(201).json({ token, office: snapshot(req.params.id), position: queue.waiting.length });
});
app.post('/api/staff/unlock', (req, res) => {
  if (!configuredStaffPin()) return res.status(503).json({ error: 'Set STAFF_PIN in the hosting service settings before using staff controls.' });
  if (!staffPinMatches(req.get('x-staff-pin'))) return res.status(401).json({ error: 'That staff PIN did not match.' });
  res.json({ ok: true });
});
app.post('/api/offices/:id/next', requireStaff, (req, res) => {
  const queue = queues[req.params.id];
  if (!queue) return res.status(404).json({ error: 'Office not found' });
  if (queue.serving) queue.completed++;
  const next = queue.waiting.shift();
  queue.serving = next ? { ...next, startedAt: new Date().toISOString() } : null;
  res.json(snapshot(req.params.id));
});
app.post('/api/offices/:id/complete', requireStaff, (req, res) => {
  const queue = queues[req.params.id];
  if (!queue) return res.status(404).json({ error: 'Office not found' });
  if (queue.serving) queue.completed++;
  queue.serving = null;
  res.json(snapshot(req.params.id));
});

app.use(express.static(path.join(appRoot, 'dist')));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'API route not found' });
  res.sendFile(path.join(appRoot, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => console.log(`CampusLine server ready on port ${PORT}`));
