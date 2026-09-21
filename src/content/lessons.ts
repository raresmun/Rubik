import { applyMoves, inverse, parseMoves, pieceFacelets, SOLVED, validateState, type LessonGoal, type Move } from '../cube/engine';

export interface LessonStep { title: string; text: string; moves: string; goal: LessonGoal }
export interface Lesson {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  duration: string;
  optional?: boolean;
  explanation: string;
  notice: string;
  hint: string;
  setup: string;
  solution: string;
  goal: LessonGoal;
  highlight: number[];
  focus?: { corners: number[]; edges: number[] };
  steps?: LessonStep[];
}
export const HOLDING = 'Galben sus, alb jos, verde în față și roșu în dreapta.';
const encouragement = 'Când înveți ceva nou, poți fi puțin mai lent. E în regulă: întâi înțelegi, apoi prinzi viteză.';
const defaultNotice = 'Poți găsi și altă soluție. Verificăm piesele, nu dacă ai copiat mișcările.';
type LessonInput = Omit<Lesson, 'setup' | 'highlight' | 'notice' | 'focus'> & { notice?: string; corners?: number[]; edges?: number[] };
function lesson(input: LessonInput): Lesson {
  const { corners = [], edges = [], ...content } = input;
  const setup = inverse(content.solution);
  const state = applyMoves(SOLVED, setup);
  return { ...content, notice: content.notice ?? defaultNotice, setup, highlight: pieceFacelets(state, corners, edges), focus: { corners: [...corners], edges: [...edges] } };
}

export const ALGORITHMS = {
  pairReady: "R U' R'",
  pairSeparated: "R U R'",
  cornerTrapped: "R U' R' U R U' R'",
  whiteUp: "R U2 R' U' R U R'",
  pairLeft: "L' U L",
  ollLine: "F R U R' U' F'",
  ollL: "F U R U' R' F'",
  sune: "R U R' U R U2 R'",
  antiSune: "R U2 R' U' R U' R'",
  tPerm: "R U R' U' R' F R2 U' R' U' R U R' F'",
  uaPerm: "R U' R U R U R U' R' U' R2",
  ubPerm: "R2 U R U R' U' R' U' R' U R'",
};

const starters: Lesson[] = [
  lesson({
    id: 'orientare', title: 'Cubul are o hartă', subtitle: 'Cum îl ții și cum îl privești', category: 'Start', duration: '2 min', optional: true,
    explanation: 'Ține galbenul sus și verdele spre tine. Centrele arată unde trebuie să ajungă fiecare culoare. În modul Privește, miști doar camera. Ca să rezolvi, rotești o față. Acum întoarce fața de sus până când culorile se potrivesc din nou.',
    notice: 'Știi deja asta? Poți alege direct prima lecție F2L.', hint: 'Fața de sus se numește U. Privește-o de sus: un sfert de tură în sensul ceasului repară poziția.',
    solution: 'U', goal: 'solved', edges: [0, 1, 2, 3],
  }),
  lesson({
    id: 'notatie', title: 'Trei semne mici', subtitle: 'R, R prim și R2', category: 'Start', duration: '2 min', optional: true,
    explanation: 'R înseamnă dreapta. R cu apostrof întoarce dreapta în sens invers. R doi înseamnă o jumătate de tură. Sensul se vede privind direct fața pe care o rotești. Încearcă două sferturi de tură sau o singură jumătate de tură.',
    hint: 'Fața roșie este în dreapta. Două apăsări în același sens fac aceeași mișcare ca R2.',
    solution: 'R2', goal: 'solved', corners: [0, 3, 4, 7],
  }),
  lesson({
    id: 'f2l-pereche', title: 'Doi prieteni, un loc', subtitle: 'Introdu prima pereche F2L', category: 'F2L', duration: '3 min',
    explanation: 'Uite colțul alb, verde și roșu și muchia verde cu roșu. Sunt deja împreună, sus. Le punem în locul dintre centrele verde și roșu. Deschidem dreapta, aducem perechea deasupra locului ei și închidem. Crucea albă rămâne întreagă.',
    notice: encouragement, hint: 'Perechea este sus, spre față și stânga. Urmărește cele două abțibilduri verzi: merg împreună.',
    solution: ALGORITHMS.pairReady, goal: 'f2l', corners: [4], edges: [8],
  }),
  lesson({
    id: 'f2l-separate', title: 'Găsește-i și unește-i', subtitle: 'Colțul și muchia sunt separate', category: 'F2L', duration: '3 min',
    explanation: 'Acum colțul alb, verde și roșu este sus, în față-dreapta. Muchia lui este sus, în spate. Culorile verzi privesc în sus. Deschidem locul din dreapta, apropiem piesele cu partea de sus și închidem. Observă cum ajung împreună în locul potrivit.',
    hint: 'Nu rezolva doar colțul. Caută și muchia cu aceleași două culori: verde și roșu.',
    solution: ALGORITHMS.pairSeparated, goal: 'f2l', corners: [4], edges: [8],
  }),
  lesson({
    id: 'f2l-colt-prins', title: 'Un colț prins jos', subtitle: 'Scoate, unește, pune la loc', category: 'F2L', duration: '4 min',
    explanation: 'Colțul potrivit este în locul din față-dreapta, dar este răsucit. Muchia verde cu roșu îl așteaptă sus. Scoatem colțul fără să stricăm celelalte perechi. Potrivim piesele sus, apoi le punem împreună la loc.',
    hint: 'Privește abțibildul alb al colțului. Nu este încă spre podea. Mai întâi trebuie să scoatem colțul.',
    solution: ALGORITHMS.cornerTrapped, goal: 'f2l', corners: [4], edges: [8],
  }),
  lesson({
    id: 'f2l-alb-sus', title: 'Albul privește în sus', subtitle: 'Pregătește o pereche nouă', category: 'F2L', duration: '4 min',
    explanation: 'Colțul are albul în sus. Muchia verde cu roșu este lângă el, dar cele două piese nu formează încă perechea corectă. Le despărțim puțin, întoarcem colțul prin deschiderea locului și le reunim. Urmărește piesele, nu încerca să memorezi tot dintr-o dată.',
    hint: 'Lângă nu înseamnă mereu potrivit. Compară verdele de pe colț cu verdele de pe muchie.',
    solution: ALGORITHMS.whiteUp, goal: 'f2l', corners: [4], edges: [8],
  }),
  lesson({
    id: 'f2l-stanga', title: 'Și în stânga e la fel', subtitle: 'Același gând, altă pereche', category: 'F2L', duration: '3 min',
    explanation: 'Căutăm acum colțul alb, verde și portocaliu și muchia verde cu portocaliu. Perechea lor intră între centrele verde și portocaliu. Deschidem stânga, aducem perechea și închidem. Aceeași idee te ajută în toate cele patru locuri.',
    hint: 'Perechea este sus, în față-dreapta. Destinația ei este jos, în față-stânga.',
    solution: ALGORITHMS.pairLeft, goal: 'f2l', corners: [5], edges: [9],
  }),
  lesson({
    id: 'cruce-priveste', title: 'Vezi înainte să rotești', subtitle: 'Planifică ultima muchie a crucii', category: 'Cruce', duration: '3 min',
    explanation: 'Crucea albă se construiește jos. Caută muchia alb cu verde. Mai întâi imaginează-ți drumul ei până lângă centrul alb. O jumătate de tură a feței verzi o duce la loc. Verifică și culorile de pe laterale: trebuie să se potrivească cu centrele.',
    hint: 'Muchia alb cu verde este sus, în față. Nu este suficient ca toate alburile să fie jos: și verdele trebuie să fie lângă centrul verde.',
    solution: 'F2', goal: 'cross', edges: [4, 5, 6, 7],
  }),
  lesson({
    id: 'cruce-plan', title: 'Un plan de trei mișcări', subtitle: 'Gândește, apoi încearcă', category: 'Cruce', duration: '3 min',
    explanation: 'Privește cele patru muchii albe înainte de prima mișcare. În această poziție folosim fața verde, apoi dreapta, apoi aliniem partea de jos. Încearcă să urmărești în minte unde ajunge fiecare muchie. Nu pornim cronometrul: exersăm planul.',
    hint: 'Planul acestei poziții este: fața verde jumătate de tură, dreapta jumătate de tură, apoi jos în sens invers.',
    solution: "F2 R2 D'", goal: 'cross', edges: [4, 5, 6, 7],
  }),
  lesson({
    id: 'oll-linie', title: 'Din linie, o cruce', subtitle: 'OLL în doi pași · muchiile', category: 'OLL', duration: '3 min',
    explanation: 'Primele două straturi sunt gata. Pe galben vezi o linie de la stânga la dreapta. Ține linia așa. Deschidem fața verde, facem mișcările din dreapta și de sus, apoi închidem verdele. Scopul este crucea galbenă. Colțurile pot încă să fie răsucite.',
    hint: 'Uită-te numai la cele patru muchii galbene. Linia trebuie să treacă prin centrul galben, de la stânga la dreapta.',
    solution: ALGORITHMS.ollLine, goal: 'oll-cross', edges: [0, 1, 2, 3],
  }),
  lesson({
    id: 'oll-l', title: 'Micul L galben', subtitle: 'Alt drum spre crucea galbenă', category: 'OLL', duration: '3 min',
    explanation: 'Acum cele două muchii galbene formează un L în spate și în stânga. Ține verdele în față. Acest șir scurt de mișcări orientează celelalte două muchii. Primele două straturi trebuie să rămână rezolvate.',
    hint: 'Cele două brațe galbene sunt spre spate și spre stânga. Colțurile nu decid dacă avem cruce.',
    solution: ALGORITHMS.ollL, goal: 'oll-cross', edges: [0, 1, 2, 3],
  }),
  lesson({
    id: 'oll-sune', title: 'Peștișorul galben', subtitle: 'OLL în doi pași · colțurile', category: 'OLL', duration: '4 min',
    explanation: 'Crucea galbenă este gata. Un singur colț are galbenul în sus, în față-stânga. Acest caz se numește Sune. Urmărește ritmul: deschide, mută sus, închide; mută sus; deschide, mută sus de două ori, închide. La sfârșit, toată fața de sus devine galbenă.',
    hint: 'Ține colțul cu galben în sus în față-stânga. Dacă poziția ta s-a schimbat, folosește Înapoi sau refă exercițiul.',
    solution: ALGORITHMS.sune, goal: 'oll', corners: [0, 1, 2, 3],
  }),
  lesson({
    id: 'oll-antisune', title: 'Peștișorul se întoarce', subtitle: 'Recunoaște cazul oglindit', category: 'OLL', duration: '4 min',
    explanation: 'Acesta seamănă cu Sune, dar colțurile sunt răsucite în celălalt sens. Colțul galben orientat este în spate-dreapta. Începem cu dreapta și o jumătate de tură sus. Observă diferența înainte să rotești. Fața galbenă se termină fără să stricăm straturile de jos.',
    hint: 'Nu alege algoritmul doar fiindcă vezi un peștișor. Verifică unde este colțul galben și în ce direcție privesc celelalte abțibilduri galbene.',
    solution: ALGORITHMS.antiSune, goal: 'oll', corners: [0, 1, 2, 3],
  }),
  lesson({
    id: 'pll-colturi', title: 'Colțurile își găsesc locul', subtitle: 'PLL în doi pași · cazul T', category: 'PLL', duration: '5 min',
    explanation: 'Galbenul este gata, dar piesele de pe margine nu sunt la loc. În această poziție, cele două colțuri din dreapta trebuie schimbate. Cazul T le schimbă și mută două muchii. Urmărește bucățelele scurte ale demonstrației. După colțuri, vom verifica muchiile.',
    hint: 'Pe partea stângă, cele două colțuri de sus au aceeași culoare. Ține această pereche în stânga.',
    notice: 'Acesta este un caz din PLL. Îl învățăm separat; nu este nevoie să memorezi toate cazurile acum.',
    solution: ALGORITHMS.tPerm, goal: 'pll-corners', corners: [0, 1, 2, 3],
  }),
  lesson({
    id: 'pll-ua', title: 'Trei muchii în cerc', subtitle: 'PLL în doi pași · Ua', category: 'PLL', duration: '4 min',
    explanation: 'Colțurile sunt gata. Muchia de sus din spate este deja corectă. Celelalte trei muchii își schimbă locurile în cerc. Ține verdele spre tine și urmărește muchiile, nu colțurile. După acest pas, toate culorile se potrivesc.',
    hint: 'Fața albastră din spate este completă. Las-o în spate în timp ce exersezi acest caz.',
    solution: ALGORITHMS.uaPerm, goal: 'solved', edges: [0, 1, 2],
  }),
  lesson({
    id: 'pll-ub', title: 'Cercul în celălalt sens', subtitle: 'Compară Ua cu Ub', category: 'PLL', duration: '4 min',
    explanation: 'Și acum sunt trei muchii de mutat, dar cercul merge în celălalt sens. Muchia albastră din spate rămâne corectă. Compară cele două cazuri înainte de prima mișcare. Nu trebuie să grăbești mâinile: recunoașterea te ajută mult.',
    hint: 'Uită-te la muchia de sus din față: are portocaliu spre tine. În cazul precedent avea roșu.',
    solution: ALGORITHMS.ubPerm, goal: 'solved', edges: [0, 1, 2],
  }),
  lesson({
    id: 'lookahead', title: 'Ochii caută mai departe', subtitle: 'Două perechi, fără grabă', category: 'F2L', duration: '4 min',
    explanation: 'Rezolvăm două perechi. Întâi pe cea alb, verde și roșu. În timp ce o pui la loc, încearcă să observi colțul alb, verde și portocaliu. Fă o pauză dacă ai nevoie. Scopul este să știi ce cauți după aceea, nu să rotești mai repede.',
    notice: 'Pauzele sunt normale. Viteza vine din înțelegere și mișcări confortabile.',
    hint: 'Prima pereche intră în față-dreapta. A doua intră în față-stânga. Păstrează verdele spre tine.',
    solution: `${ALGORITHMS.pairReady} ${ALGORITHMS.pairLeft}`, goal: 'f2l', corners: [4, 5], edges: [8, 9],
  }),
];

const guidedSteps: LessonStep[] = [
  { title: 'Crucea albă', text: 'Începem cu un plan scurt: verde de două ori, dreapta de două ori, apoi jos invers. Verificăm cele patru muchii albe și culorile lor de lângă centre.', moves: "F2 R2 D'", goal: 'cross' },
  { title: 'Prima pereche', text: 'Găsește colțul alb, verde și roșu și muchia verde cu roșu. Le introducem în față-dreapta. Crucea trebuie să rămână corectă.', moves: ALGORITHMS.pairReady, goal: { type: 'pieces', corners: [4], edges: [4, 5, 6, 7, 8] } },
  { title: 'A doua pereche', text: 'Acum urmărim alb, verde și portocaliu. Perechea intră în față-stânga. La sfârșit, ambele perechi din față și crucea sunt la loc.', moves: ALGORITHMS.pairLeft, goal: { type: 'pieces', corners: [4, 5], edges: [4, 5, 6, 7, 8, 9] } },
  { title: 'Perechea din spate-dreapta', text: 'Găsește piesele cu alb, albastru și roșu. Intră în spate-dreapta. Poți folosi Privește ca să le vezi, apoi revino la vederea cu verde în față.', moves: "R' U' R", goal: { type: 'pieces', corners: [4, 5, 7], edges: [4, 5, 6, 7, 8, 9, 11] } },
  { title: 'Ultima pereche F2L', text: 'Mai avem perechea alb, albastru și portocaliu, în spate-stânga. O punem la loc. Acum primele două straturi sunt rezolvate.', moves: "L U L'", goal: 'f2l' },
  { title: 'Crucea galbenă', text: 'Sus avem o linie galbenă de la stânga la dreapta. Folosim cazul cu linie pentru a face crucea. Păstrăm toate perechile de jos.', moves: ALGORITHMS.ollLine, goal: 'oll-cross' },
  { title: 'Toată fața galbenă', text: 'A apărut cazul Sune. Colțul orientat este în față-stânga. Rotim colțurile până când toată fața de sus este galbenă.', moves: ALGORITHMS.sune, goal: 'oll' },
  { title: 'Colțurile la loc', text: 'Galbenul rămâne sus. Folosim cazul T ca să punem colțurile la loc. Nu ne îngrijorăm încă pentru cele trei muchii care mai rămân.', moves: ALGORITHMS.tPerm, goal: 'pll-corners' },
  { title: 'Ultimele trei muchii', text: 'Muchia albastră din spate este corectă. Cazul Ua mută celelalte trei muchii. Verifică fiecare față. Ai legat toate etapele unei rezolvări CFOP!', moves: ALGORITHMS.uaPerm, goal: 'solved' },
];
export const guidedLesson: Lesson = lesson({
  id: 'rezolvare-ghidata', title: 'O rezolvare, cap-coadă', subtitle: 'Leagă crucea, F2L, OLL și PLL', category: 'Împreună', duration: '10 min',
  explanation: 'Rezolvăm împreună un cub pregătit pentru antrenament. Trecem prin cruce, patru perechi, fața galbenă și ultimele piese. Fiecare etapă are un scop. Poți lua o pauză oricând; păstrăm locul unde ai ajuns.',
  notice: 'Aceasta este o rezolvare pregătită pentru învățare. Alte amestecuri pot avea alte cazuri și alte soluții.',
  hint: 'Lucrează la scopul etapei curente. Dacă faci alte mișcări, verificăm poziția reală înainte să oferim ajutor.',
  solution: guidedSteps.map(step => step.moves).join(' '), goal: 'solved', edges: [4, 5, 6, 7], steps: guidedSteps,
});
export const lessons: Lesson[] = [...starters, guidedLesson];
export function getLesson(id: string | undefined): Lesson | undefined { return lessons.find(item => item.id === id); }


/** A regular lesson is one stage; the guided solve has cumulative CFOP stages. */
export function lessonStageCount(item: Lesson): number { return item.steps?.length || 1; }
function checkStageIndex(item: Lesson, step: number, allowEnd: boolean): void {
  const count = lessonStageCount(item);
  if (!Number.isInteger(step) || step < 0 || step > count || (!allowEnd && step === count)) {
    throw new RangeError('Etapa lecției nu este validă.');
  }
}
/** The narration, moves and goal for only the current teaching idea. */
export function lessonStage(item: Lesson, step = 0): LessonStep {
  checkStageIndex(item, step, false);
  return item.steps?.[step] ?? { title: item.title, text: item.explanation, moves: item.solution, goal: item.goal };
}
/** Canonical history before this stage. Useful for an explicitly confirmed checkpoint restore. */
export function lessonStagePrefix(item: Lesson, step = 0): Move[] {
  checkStageIndex(item, step, true);
  const moves: Move[] = [];
  for (let index = 0; index < step; index++) moves.push(...parseMoves(lessonStage(item, index).moves));
  return moves;
}
/** Returns the prepared example state; it NEVER changes a user's cube by itself. */
export function lessonCheckpoint(item: Lesson, step = 0): string {
  return applyMoves(applyMoves(SOLVED, item.setup), lessonStagePrefix(item, step));
}
/**
 * A goal-valid alternative may produce a different next case. Never continue the
 * script from it: null means offer live solver help or an explicit checkpoint
 * restore. [] means this exact example stage has already reached its endpoint.
 */
export function lessonStageContinuation(item: Lesson, step: number, state: string): Move[] | null {
  const stage = lessonStage(item, step);
  if (!validateState(state)) return null;
  const moves = parseMoves(stage.moves);
  let checkpoint = lessonCheckpoint(item, step);
  for (let index = 0; index <= moves.length; index++) {
    if (state === checkpoint) return moves.slice(index);
    if (index < moves.length) checkpoint = applyMoves(checkpoint, moves[index]);
  }
  return null;
}


/** Follow the lesson's physical cubies, even after unexpected turns or undo. */
export function lessonHighlights(item: Lesson, state: string): number[] {
  return item.focus ? pieceFacelets(state, item.focus.corners, item.focus.edges) : [...item.highlight];
}
