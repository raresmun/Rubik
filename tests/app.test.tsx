// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppData } from '../src/lib/storage';

const doubles = vi.hoisted(() => ({
  saved: null as AppData | null,
  saves: [] as AppData[],
  speak: vi.fn<(text: string, key?: string, slow?: boolean) => Promise<string>>(async () => 'ended'),
  stop: vi.fn(),
  solve: vi.fn<(state: string) => Promise<string[]>>(),
}));

// The 3D renderer has geometry tests; these tests exercise React state, buttons,
// workflow transitions, and persistence with the actual cube and lesson engines.
vi.mock('../src/components/CubeScene', () => ({
  CubeScene: ({ state, disabled }: { state: string; disabled?: boolean }) => (
    <div data-testid="cube" data-state={state} data-disabled={String(!!disabled)} />
  ),
}));
vi.mock('../src/lib/audio', () => ({
  narration: {
    speak: doubles.speak,
    stop: doubles.stop,
    status: () => ({ message: 'Vocea de test este pregătită.' }),
  },
}));
vi.mock('../src/cube/solver', () => ({ solveState: doubles.solve, cancelSolverRequests: vi.fn() }));
vi.mock('../src/lib/offline', () => ({
  registerOffline: vi.fn(), verifyOffline: vi.fn(async () => true), applyUpdate: vi.fn(),
}));
vi.mock('../src/lib/storage', async importOriginal => {
  const real = await importOriginal<typeof import('../src/lib/storage')>();
  return {
    ...real,
    loadData: vi.fn(async () => structuredClone(doubles.saved ?? real.defaultData())),
    saveData: vi.fn(async (value: AppData) => {
      doubles.saved = structuredClone(value);
      doubles.saves.push(structuredClone(value));
    }),
    requestPersistentStorage: vi.fn(async () => true),
  };
});

import App from '../src/App';
import { applyMoves, FACE_NAMES, inverse, SOLVED, type Face } from '../src/cube/engine';
import { getLesson, guidedLesson, lessonCheckpoint, lessonStagePrefix } from '../src/content/lessons';
import { defaultData, serializeBackup } from '../src/lib/storage';

beforeEach(() => {
  window.history.replaceState(null, '', '/');
  doubles.saved = null;
  doubles.saves.length = 0;
  doubles.speak.mockClear();
  doubles.stop.mockClear();
  doubles.solve.mockReset();
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

async function boot() {
  const rendered = render(<App />);
  await screen.findByRole('heading', { name: 'Salut, Erik.' });
  return rendered;
}
function cubeState() { return screen.getByTestId('cube').getAttribute('data-state'); }
async function savedWhen(check: (data: AppData) => void) {
  await waitFor(() => { expect(doubles.saved).not.toBeNull(); check(doubles.saved!); });
}
async function openLesson(id: string, physical = false) {
  fireEvent.click(screen.getByRole('button', { name: physical ? /Cu cubul meu/ : /Învață cu mine/ }));
  fireEvent.click(screen.getByRole('button', { name: new RegExp(getLesson(id)!.title) }));
  await screen.findByRole('heading', { name: getLesson(id)!.title });
}
async function turn(move: string) {
  const name = FACE_NAMES[move[0] as Face];
  fireEvent.click(screen.getByRole('button', { name: `Alege fața ${name}` }));
  const suffix = move.endsWith('2') ? 'de două ori' : move.endsWith("'") ? 'invers' : 'orar';
  const button = screen.getByRole('button', { name: `Întoarce ${name} ${suffix}` });
  await waitFor(() => expect(button).toBeEnabled());
  fireEvent.click(button);
  // Wait for the turn lock to settle; controls disappear when a goal is reached.
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 310)); });
}
async function easyFreeSolve() {
  fireEvent.click(screen.getByRole('button', { name: /Rezolvă singur/ }));
  fireEvent.click(screen.getByRole('button', { name: '3 mișcări' }));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Începe ușor' }));
  expect(cubeState()).toBe(applyMoves(SOLVED, 'R U F'));
}
async function unlockBackups() {
  fireEvent.click(screen.getByRole('button', { name: 'Pentru părinți' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Răspuns pentru părinți' }), { target: { value: '13' } });
  fireEvent.click(screen.getByRole('button', { name: 'Deschide copiile de siguranță' }));
}
function uploadJson(source: string) {
  const file = new File([source], 'progres.json', { type: 'application/json' });
  Object.defineProperty(file, 'text', { value: async () => source });
  fireEvent.change(document.querySelector<HTMLInputElement>('input[type=file]')!, { target: { files: [file] } });
}

describe('learning, solving, and parent workflows', () => {
  it('loads a nested page directly and redirects empty practice to home', async () => {
    window.history.replaceState(null, '', '/parents');
    const rendered = render(<App />);
    expect(await screen.findByRole('heading', { name: 'Pentru părinți.' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/parents');
    rendered.unmount();
    window.history.replaceState(null, '', '/practice');
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Salut, Erik.' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
  });

  it('handles browser Back and Forward without restarting a demonstration or adding history entries', async () => {
    await boot();
    await openLesson('notatie');
    expect(window.location.pathname).toBe('/practice');
    let finishNarration!: (result: string) => void;
    doubles.speak.mockImplementationOnce(() => new Promise(resolve => { finishNarration = resolve; }));
    fireEvent.click(screen.getByRole('button', { name: 'Arată-mi' }));
    const before = cubeState();
    const historyLength = window.history.length;
    act(() => window.history.back());
    await screen.findByRole('heading', { name: 'Micile tale descoperiri.' });
    expect(window.location.pathname).toBe('/lessons');
    await act(async () => finishNarration('ended'));
    await savedWhen(data => {
      expect(data.active?.phase).toBe('demo-paused');
      expect(data.active?.state).toBe(before);
      expect(data.active?.timerRunning).toBe(false);
    });
    act(() => window.history.forward());
    await screen.findByRole('heading', { name: 'Trei semne mici' });
    expect(window.location.pathname).toBe('/practice');
    expect(window.history.length).toBe(historyLength);
    expect(cubeState()).toBe(before);
    expect(screen.getByRole('button', { name: 'Acum încearcă tu' })).toBeInTheDocument();
  });

  it('accepts two quarter turns as an independent alternative to the taught R2', async () => {
    await boot();
    await openLesson('notatie');
    expect(cubeState()).toBe(applyMoves(SOLVED, 'R2'));
    fireEvent.click(screen.getByRole('button', { name: /Știu deja. Încerc singur/ }));
    await turn('R');
    expect(screen.queryByRole('heading', { name: 'Ai reușit, Erik!' })).not.toBeInTheDocument();
    await turn('R');
    expect(screen.getByRole('heading', { name: 'Ai reușit, Erik!' })).toBeInTheDocument();
    expect(cubeState()).toBe(SOLVED);
    await savedWhen(data => {
      expect(data.active?.moves).toEqual(['R', 'R']);
      expect(data.attempts).toHaveLength(1);
      expect(data.attempts[0]).toMatchObject({ lessonId: 'notatie', assisted: false, physical: false });
    });
  });

  it('keeps demonstrations and narration replay out of learner moves and achievements', async () => {
    await boot();
    await openLesson('notatie');
    const setup = cubeState();
    fireEvent.click(screen.getByRole('button', { name: 'Repetă explicația' }));
    expect(cubeState()).toBe(setup);
    expect(doubles.speak).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Arată-mi' }));
    await screen.findByRole('button', { name: 'Acum încearcă tu' }, { timeout: 3000 });
    expect(cubeState()).toBe(SOLVED);
    expect(screen.queryByRole('heading', { name: 'Ai reușit, Erik!' })).not.toBeInTheDocument();
    await savedWhen(data => {
      expect(data.attempts).toEqual([]);
      expect(data.active?.moves).toEqual([]);
      expect(data.active?.cursor).toBe(0);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Repetă explicația' }));
    expect(cubeState()).toBe(SOLVED);
    fireEvent.click(screen.getByRole('button', { name: 'Acum încearcă tu' }));
    expect(cubeState()).toBe(setup);
    expect(screen.getByRole('button', { name: 'Întoarce Dreapta orar' })).toBeEnabled();
    await savedWhen(data => expect(data.attempts).toEqual([]));
  });

  it('cancels an in-flight demonstration when the navigation starts a free solve', async () => {
    await boot();
    await openLesson('notatie');
    let finishNarration!: (result: string) => void;
    doubles.speak.mockImplementationOnce(() => new Promise(resolve => { finishNarration = resolve; }));
    fireEvent.click(screen.getByRole('button', { name: 'Arată-mi' }));
    expect(screen.getByRole('button', { name: 'Întoarce Dreapta orar' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Exersează', exact: true }));
    expect(screen.getByRole('heading', { name: 'Un cub. Posibilități infinite.' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Întoarce Dreapta orar' })).toBeEnabled();
    const newState = cubeState();
    await act(async () => {
      finishNarration('ended');
      await new Promise(resolve => setTimeout(resolve, 650));
    });
    expect(cubeState()).toBe(newState);
    expect(screen.queryByRole('button', { name: 'Acum încearcă tu' })).not.toBeInTheDocument();
    await savedWhen(data => {
      expect(data.active).toMatchObject({ mode: 'free', phase: 'practice', cursor: 0, demoIndex: 0 });
      expect(data.attempts).toEqual([]);
    });
  });

  it('undoes and redoes the exact state, then detects a completed free solve once', async () => {
    await boot();
    await easyFreeSolve();
    const initial = cubeState();
    await turn("F'");
    expect(cubeState()).toBe(applyMoves(SOLVED, 'R U'));
    fireEvent.click(screen.getByRole('button', { name: 'Înapoi', exact: true }));
    expect(cubeState()).toBe(initial);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Refă', exact: true })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Refă', exact: true }));
    expect(cubeState()).toBe(applyMoves(SOLVED, 'R U'));
    await turn("U'");
    await turn("R'");
    expect(cubeState()).toBe(SOLVED);
    expect(screen.getByRole('heading', { name: 'Ai reușit, Erik!' })).toBeInTheDocument();
    await savedWhen(data => {
      expect(data.solves).toHaveLength(1);
      expect(data.solves[0]).toMatchObject({ physical: false, assisted: false });
      expect(data.active?.moves).toEqual(["F'", "U'", "R'"]);
      expect(data.attempts).toEqual([]);
    });
  });

  it.each(['late-start', 'manual-pause', 'uninterrupted'] as const)('labels %s timer records fairly', async scenario => {
    await boot();
    await easyFreeSolve();
    fireEvent.click(screen.getByRole('button', { name: 'Cronometru', exact: true }));
    const timerButton = () => document.querySelector<HTMLButtonElement>('.timer-button')!;
    if (scenario !== 'late-start') fireEvent.click(timerButton());
    await turn("F'");
    if (scenario !== 'uninterrupted') fireEvent.click(timerButton());
    await savedWhen(data => {
      expect(data.active?.timerInterrupted).toBe(scenario !== 'uninterrupted');
      expect(data.active?.timerRunning).toBe(scenario !== 'manual-pause');
    });
    await turn("U'");
    await turn("R'");
    await savedWhen(data => {
      expect(data.solves).toHaveLength(1);
      expect(data.solves[0].durationMs).toBeGreaterThan(0);
      expect(data.solves[0]).toMatchObject({ interrupted: scenario !== 'uninterrupted', physical: false });
      expect(data.active?.timerInterrupted).toBe(scenario !== 'uninterrupted');
    });
    if (scenario !== 'uninterrupted') expect(screen.getByText('Cronometrare întreruptă')).toBeInTheDocument();
  });

  it('marks completion interrupted when a previously saved nonzero timer is stopped', async () => {
    const initial = applyMoves(SOLVED, 'R');
    doubles.saved = { ...defaultData(), active: {
      mode: 'free', phase: 'practice', initial, state: initial, moves: [], cursor: 0,
      assisted: false, step: 0, demoIndex: 0, physicalSetupIndex: 0,
      timerMs: 1000, timerRunning: false, timerInterrupted: false,
    } };
    await boot();
    fireEvent.click(screen.getByRole('button', { name: 'Continuă' }));
    await turn("R'");
    await savedWhen(data => {
      expect(data.solves).toHaveLength(1);
      expect(data.solves[0]).toMatchObject({ durationMs: 1000, interrupted: true, physical: false });
      expect(data.active?.timerInterrupted).toBe(true);
    });
    expect(screen.getByText('Cronometrare întreruptă')).toBeInTheDocument();
  });

  it('demonstrates only the current guided stage and explicitly restores its practice checkpoint', async () => {
    await boot();
    await openLesson('rezolvare-ghidata');
    fireEvent.click(screen.getByRole('button', { name: /Știu deja. Încerc singur/ }));
    for (const move of guidedLesson.steps![0].moves.split(' ')) await turn(move);
    expect(cubeState()).toBe(lessonCheckpoint(guidedLesson, 1));
    fireEvent.click(screen.getByRole('button', { name: 'Următoarea etapă' }));
    expect(screen.getByRole('heading', { name: 'Prima pereche' })).toBeInTheDocument();
    const beforeDemo = cubeState();
    fireEvent.click(screen.getByRole('button', { name: 'Arată-mi etapa' }));
    const confirmation = screen.getByRole('dialog');
    expect(cubeState()).toBe(beforeDemo);
    expect(confirmation).toHaveTextContent('Încercarea va fi marcată cu ajutor.');
    doubles.speak.mockClear();
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Arată-mi etapa' }));
    await screen.findByRole('button', { name: 'Acum încearcă tu' }, { timeout: 4000 });
    expect(cubeState()).toBe(lessonCheckpoint(guidedLesson, 2));
    expect(cubeState()).not.toBe(SOLVED);
    expect(doubles.speak.mock.calls[0][0]).toBe(guidedLesson.steps![1].text);
    expect(doubles.speak).toHaveBeenCalledTimes(guidedLesson.steps![1].moves.split(' ').length + 1);
    await savedWhen(data => {
      expect(data.active?.step).toBe(1);
      expect(data.attempts).toEqual([]);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Acum încearcă tu' }));
    expect(cubeState()).toBe(beforeDemo);
    await savedWhen(data => {
      expect(data.active?.moves).toEqual(lessonStagePrefix(guidedLesson, 1));
      expect(data.active?.assisted).toBe(true);
      expect(data.active?.step).toBe(1);
    });
  }, 10000);

  it('accepts an alternative cross and asks the live solver before suggesting moves for its different next case', async () => {
    await boot();
    await openLesson('rezolvare-ghidata');
    fireEvent.click(screen.getByRole('button', { name: /Știu deja. Încerc singur/ }));
    const alternative = "F2 R2 U D'";
    for (const move of alternative.split(' ')) await turn(move);
    const alternativeState = cubeState()!;
    expect(alternativeState).not.toBe(lessonCheckpoint(guidedLesson, 1));
    expect(screen.getByRole('button', { name: 'Următoarea etapă' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Următoarea etapă' }));
    expect(cubeState()).toBe(alternativeState);
    const honestCoaching = screen.getByText(/Poziția ta este diferită de exemplu/);
    expect(honestCoaching).not.toHaveTextContent(guidedLesson.steps![1].text);
    expect(screen.queryByText(guidedLesson.steps![1].text)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Repetă explicația' }));
    expect(doubles.speak).toHaveBeenLastCalledWith(honestCoaching.textContent, undefined, false);
    expect(cubeState()).toBe(alternativeState);
    const liveSolution = inverse(`${guidedLesson.setup} ${alternative}`).split(' ');
    expect(applyMoves(alternativeState, liveSolution)).toBe(SOLVED);
    doubles.solve.mockResolvedValueOnce(liveSolution);
    fireEvent.click(screen.getByRole('button', { name: 'Un indiciu' }));
    await screen.findByRole('button', { name: /Arată următoarea mișcare/ });
    expect(doubles.solve).toHaveBeenLastCalledWith(alternativeState);
    expect(screen.getByText(/Acesta este un pas calculat spre cubul rezolvat, nu o explicație CFOP/)).toBeInTheDocument();
    expect(cubeState()).toBe(alternativeState);
    fireEvent.click(screen.getByRole('button', { name: 'Revino la exemplul etapei' }));
    const confirmation = screen.getByRole('dialog');
    expect(cubeState()).toBe(alternativeState);
    await savedWhen(data => expect(data.active?.moves).toEqual(alternative.split(' ')));
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Da, revino la exemplu' }));
    expect(cubeState()).toBe(lessonCheckpoint(guidedLesson, 1));
    expect(screen.getByText(guidedLesson.steps![1].text)).toBeInTheDocument();
    await savedWhen(data => {
      expect(data.active?.step).toBe(1);
      expect(data.active?.assisted).toBe(true);
      expect(data.active?.moves).toEqual(lessonStagePrefix(guidedLesson, 1));
      expect(data.active?.cursor).toBe(lessonStagePrefix(guidedLesson, 1).length);
    });
  });

  it('discards a late hint after an unexpected turn and invalidates a displayed hint on undo', async () => {
    await boot();
    await easyFreeSolve();
    const firstState = cubeState()!;
    let finishFirst!: (moves: string[]) => void;
    doubles.solve.mockImplementationOnce(() => new Promise(resolve => { finishFirst = resolve; }));
    fireEvent.click(screen.getByRole('button', { name: 'Un indiciu' }));
    expect(doubles.solve).toHaveBeenLastCalledWith(firstState);
    await turn('R');
    const current = cubeState()!;
    await act(async () => finishFirst(["F'", "U'", "R'"]));
    expect(screen.queryByRole('button', { name: /Arată următoarea mișcare/ })).not.toBeInTheDocument();
    const liveSolution = inverse('R U F R').split(' ');
    expect(applyMoves(current, liveSolution)).toBe(SOLVED);
    doubles.solve.mockResolvedValueOnce(liveSolution);
    fireEvent.click(screen.getByRole('button', { name: 'Un indiciu' }));
    const hint = await screen.findByRole('button', { name: /Arată următoarea mișcare/ });
    expect(doubles.solve).toHaveBeenLastCalledWith(current);
    expect(hint).toHaveTextContent("R'");
    fireEvent.click(screen.getByRole('button', { name: 'Înapoi', exact: true }));
    expect(cubeState()).toBe(firstState);
    expect(screen.queryByRole('button', { name: /Arată următoarea mișcare/ })).not.toBeInTheDocument();
  });

  it('waits for physical acknowledgements and explains that recovery changes only the model', async () => {
    await boot();
    await openLesson('notatie', true);
    expect(cubeState()).toBe(SOLVED);
    fireEvent.click(screen.getByRole('button', { name: 'Cubul este pregătit' }));
    expect(cubeState()).toBe(SOLVED);
    fireEvent.click(screen.getByRole('button', { name: 'Repetă', exact: true }));
    expect(cubeState()).toBe(SOLVED);
    const acknowledgement = screen.getByRole('button', { name: 'Am făcut', exact: true });
    fireEvent.click(acknowledgement);
    fireEvent.click(acknowledgement);
    expect(cubeState()).toBe(applyMoves(SOLVED, 'R2'));
    await savedWhen(data => {
      expect(data.active?.phase).toBe('physical-setup');
      expect(data.active?.physicalSetupIndex).toBe(1);
      expect(data.active?.demoIndex).toBe(0);
    });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Încep exercițiul' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Încep exercițiul' }));
    expect(cubeState()).toBe(applyMoves(SOLVED, 'R2'));
    fireEvent.click(screen.getByRole('button', { name: 'Cubul meu arată altfel' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Acest buton schimbă doar modelul de pe ecran. Cubul real îl rezolvi tu.');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Închide ajutorul' }));
    expect(cubeState()).toBe(applyMoves(SOLVED, 'R2'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Am făcut', exact: true })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Am făcut', exact: true }));
    expect(cubeState()).toBe(SOLVED);
    expect(screen.queryByRole('heading', { name: 'Ai reușit, Erik!' })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Da, am reușit!' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Da, am reușit!' }));
    await savedWhen(data => {
      expect(data.attempts).toHaveLength(1);
      expect(data.attempts[0]).toMatchObject({ physical: true, assisted: true });
      expect(data.solves).toEqual([]);
    });
  });

  it('restores initial state, moves, undo cursor, and redo capability after a reload', async () => {
    const rendered = await boot();
    await easyFreeSolve();
    await turn("F'");
    await turn('U');
    fireEvent.click(screen.getByRole('button', { name: 'Înapoi', exact: true }));
    await savedWhen(data => expect(data.active?.cursor).toBe(1));
    const before = structuredClone(doubles.saved!.active!);
    rendered.unmount();
    expect(window.location.pathname).toBe('/practice');
    render(<App />);
    await screen.findByRole('heading', { name: 'Un cub. Posibilități infinite.' });
    expect(cubeState()).toBe(before.state);
    expect(screen.getByRole('button', { name: 'Refă', exact: true })).toBeEnabled();
    await savedWhen(data => {
      expect(data.active?.initial).toBe(before.initial);
      expect(data.active?.moves).toEqual(before.moves);
      expect(data.active?.cursor).toBe(before.cursor);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Refă', exact: true }));
    expect(cubeState()).toBe(applyMoves(before.initial, before.moves));
  });

  it('protects backup controls with a parent gate and rejects malformed imports without changing progress', async () => {
    await boot();
    fireEvent.click(screen.getByRole('button', { name: 'Pentru părinți' }));
    expect(screen.queryByRole('button', { name: 'Exportă progresul' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Răspuns pentru părinți' }), { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Deschide copiile de siguranță' }));
    expect(screen.getByRole('status')).toHaveTextContent('Mai verifică răspunsul.');
    expect(document.querySelector('input[type=file]')).toBeNull();
    fireEvent.change(screen.getByRole('textbox', { name: 'Răspuns pentru părinți' }), { target: { value: '13' } });
    fireEvent.click(screen.getByRole('button', { name: 'Deschide copiile de siguranță' }));
    expect(screen.getByRole('button', { name: 'Exportă progresul' })).toBeInTheDocument();
    await savedWhen(data => expect(data.lastScreen).toBe('parents'));
    const before = structuredClone(doubles.saved);
    uploadJson('{"app":"unrelated-app","version":1}');
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Fișierul nu este valid.'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(doubles.saved).toEqual(before);
  });

  it('restores a valid backup only after explicit replacement confirmation', async () => {
    await boot();
    await unlockBackups();
    const imported = defaultData();
    imported.preferences.muted = true;
    imported.attempts = [{ lessonId: 'notatie', at: 1, assisted: false, physical: false, sessionId: 'backup-session' }];
    uploadJson(serializeBackup(imported));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Progresul de pe acest dispozitiv va fi înlocuit');
    expect(doubles.saved?.preferences.muted).toBe(false);
    expect(doubles.saved?.attempts).toEqual([]);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Restaurează progresul' }));
    await savedWhen(data => {
      expect(data.preferences.muted).toBe(true);
      expect(data.attempts).toEqual(imported.attempts);
    });
    expect(screen.getByRole('status')).toHaveTextContent('Copia de siguranță a fost restaurată.');
  });
});
