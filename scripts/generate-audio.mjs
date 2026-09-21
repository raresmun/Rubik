/** Export exact subtitle text, then synthesize locally. No API key or runtime TTS service. */
import { createServer } from 'vite';
import { writeFile, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true }, appType: 'custom' });
let clips;
try {
  const content = await server.ssrLoadModule('/src/content/lessons.ts');
  const engine = await server.ssrLoadModule('/src/cube/engine.ts');
  const lessons = content.lessons ?? content.LESSONS;
  if (!Array.isArray(lessons)) throw new Error('Lesson export is missing.');
  clips = [
    { key: 'welcome', text: 'Salut, Erik! Învățăm împreună, pas cu pas.' },
    { key: 'voice-test', text: 'Bună, Erik! Aceasta este vocea ta de antrenament. Privim, înțelegem și încercăm împreună.' },
    { key: 'practice', text: 'Acum încearcă tu. Cubul revine la poziția de început. Poți reuși și cu alte mișcări corecte.' },
    { key: 'success', text: 'Ai reușit! Ai înțeles ideea și ai găsit drumul. Bravo, Erik!' },
    { key: 'slower-is-ok', text: 'O tehnică nouă poate fi mai lentă la început. Este normal. Înțelegerea vine înaintea vitezei.' },
    { key: 'physical-orientation', text: 'Pornește cu un cub rezolvat. Ține centrul galben sus și centrul verde spre tine. Apasă Am făcut după fiecare mișcare.' },
    { key: 'physical-recovery', text: 'Dacă nu mai știi poziția cubului, rezolvă-l cu metoda ta. Apoi refacem pregătirea, pas cu pas.' },
    ...engine.FACES.flatMap(face => ['', "'", '2'].map(suffix => ({ key: `move-${face}${suffix === "'" ? '-prime' : suffix}`, text: engine.describeMove(face + suffix) }))),
    ...lessons.flatMap(lesson => [
      { key: lesson.id, text: lesson.explanation },
      ...(lesson.steps ?? []).map((step, i) => ({ key: `${lesson.id}-step-${i}`, text: step.text })),
      { key: `${lesson.id}-hint`, text: lesson.hint },
      { key: `${lesson.id}-notice`, text: lesson.notice },
    ]),
  ].filter(clip => typeof clip.text === 'string' && clip.text.trim());
} finally { await server.close(); }
await mkdir(path.join(root, 'public/audio'), { recursive: true });
await writeFile(path.join(root, 'public/audio/scripts.json'), JSON.stringify(clips, null, 2) + '\n');
console.log(`Exported ${clips.length} Romanian subtitle clips.`);
const python = process.env.PIPER_PYTHON || 'python3';
const result = spawnSync(python, ['scripts/generate-audio.py', ...process.argv.slice(2)], { stdio: 'inherit', env: process.env });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
