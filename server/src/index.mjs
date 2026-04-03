import express from 'express';
import cors from 'cors';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const dataDir = path.join(repoRoot, 'data', 'exams');

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

async function loadJson(filename) {
  const fullPath = path.join(dataDir, filename);
  const file = await fs.readFile(fullPath, 'utf8');
  return JSON.parse(file);
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'math-staar-ishaan-api' });
});

app.get('/api/manifest', async (_req, res) => {
  try {
    const manifest = await loadJson('manifest.json');
    res.json(manifest);
  } catch (error) {
    res.status(500).json({ error: 'Unable to load exam manifest.' });
  }
});

app.get('/api/exams/:slug', async (req, res) => {
  try {
    const manifest = await loadJson('manifest.json');
    const entry = manifest.years.find((year) => year.slug === req.params.slug);

    if (!entry || !entry.dataFile) {
      return res.status(404).json({ error: 'Exam not found.' });
    }

    const exam = await loadJson(entry.dataFile);
    res.json(exam);
  } catch (error) {
    res.status(500).json({ error: 'Unable to load exam bundle.' });
  }
});

app.listen(port, () => {
  console.log(`Math STAAR Ishaan API listening on http://localhost:${port}`);
});

