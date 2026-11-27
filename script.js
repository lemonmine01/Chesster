const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const cheatBannerEl = document.getElementById('cheatBanner');
const materialBarEl = document.getElementById('materialBar');
const restartBtn = document.getElementById('restartBtn');
const menuBtn = document.getElementById('menuBtn');
const boardOverlayEl = document.getElementById('boardOverlay');

const whitePlayerSelect = document.getElementById('whitePlayerSelect');
const blackPlayerSelect = document.getElementById('blackPlayerSelect');
const cheaterRoleSelect = document.getElementById('cheaterRoleSelect');

const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const applySettingsBtn = document.getElementById('applySettingsBtn');
const uiThemeSelect = document.getElementById('uiThemeSelect');
const difficultySelect = document.getElementById('difficultySelect');
const cheatLevelSelect = document.getElementById('cheatLevelSelect');
const themeSelect = document.getElementById('themeSelect');
const moveAnimSelect = document.getElementById('moveAnimSelect');
const captureAnimSelect = document.getElementById('captureAnimSelect');
const showHintsCheck = document.getElementById('showHintsCheck');
const showMaterialCheck = document.getElementById('showMaterialCheck');
const trashTalkCheck = document.getElementById('trashTalkCheck');
const soundEnabledCheck = document.getElementById('soundEnabledCheck');
const soundVolumeRange = document.getElementById('soundVolumeRange');
const volumeValLabel = document.getElementById('volumeValLabel');

if (soundVolumeRange && volumeValLabel) {
  soundVolumeRange.oninput = () => {
    volumeValLabel.textContent = soundVolumeRange.value + '%';
  };
}

const SOUNDS = {
  win: new Audio(encodeURI('Звук шахмового хода.mp3')),
  move: new Audio(encodeURI('Звук передвижения фигуры в шахматах.mp3')),
  capture: new Audio(encodeURI('Звук взятия фигуры в шахматах происходящий в игре Chess Titans.mp3')),
  smooth: new Audio(encodeURI('Звук двигаем шашку не отрывая от игрового стола.mp3')),
  lose: new Audio(encodeURI('8sec082968824.wav')),
  draw: new Audio(encodeURI('quick-pencil-drawing.mp3'))
};

function playSound(name) {
  if (!settings.soundEnabled) return;
  const snd = SOUNDS[name];
  if (!snd) return;
  snd.volume = settings.soundVolume;
  snd.currentTime = 0;
  snd.play().catch(function() {});
}

const SYMBOLS = { wP:'♟', wR:'♜', wN:'♞', wB:'♝', wQ:'♛', wK:'♚', bP:'♟', bR:'♜', bN:'♞', bB:'♝', bQ:'♛', bK:'♚' };
const VALUES = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 };
const MAT_POINTS = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0 };

let settings = {
  uiTheme: 'ui-dark-gray',
  difficulty: 'medium',
  cheatLevel: 1,
  theme: 'DarkWood',
  moveAnim: 'smooth',
  captureAnim: 'fade',
  showHints: true,
  showMaterial: false,
  trashTalk: false,
  soundEnabled: true,
  soundVolume: 0.8
};

let matchConfig = {
  whiteType: 'you',
  blackType: 'bot',
  cheaterRole: 'black'
};

const STORAGE_KEY = 'chesster_prefs_v1';

function saveAllPrefs() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      settings,
      matchConfig
    }));
  } catch (e) {}
}

function loadAllPrefs() {

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved.settings) Object.assign(settings, saved.settings);
    if (saved.matchConfig) Object.assign(matchConfig, saved.matchConfig);
  } catch (e) {}

  if (uiThemeSelect) uiThemeSelect.value = settings.uiTheme;
  if (difficultySelect) difficultySelect.value = settings.difficulty;
  if (cheatLevelSelect) cheatLevelSelect.value = String(settings.cheatLevel);
  if (themeSelect) themeSelect.value = settings.theme;
  if (moveAnimSelect) moveAnimSelect.value = settings.moveAnim;
  if (captureAnimSelect) captureAnimSelect.value = settings.captureAnim;
  if (showHintsCheck) showHintsCheck.checked = settings.showHints;
  if (showMaterialCheck) showMaterialCheck.checked = settings.showMaterial;
  if (trashTalkCheck) trashTalkCheck.checked = settings.trashTalk;
  if (soundEnabledCheck) soundEnabledCheck.checked = settings.soundEnabled;
  if (soundVolumeRange) {
    const pct = Math.round((settings.soundVolume ?? 0.8) * 100);
    soundVolumeRange.value = String(pct);
    if (volumeValLabel) volumeValLabel.textContent = pct + '%';
  }

    if (whitePlayerSelect) whitePlayerSelect.value = matchConfig.whiteType;
  if (blackPlayerSelect) blackPlayerSelect.value = matchConfig.blackType;
  if (cheaterRoleSelect) cheaterRoleSelect.value = matchConfig.cheaterRole;
}


let board = [], turn = 'w', selected = null, validMoves = [], gameOver = false, lastMove = null, isAnimating = false, gameStarted = false;
let castling = { wK: true, wRa: true, wRh: true, bK: true, bRa: true, bRh: true };
let botTimer = null;

function hasCheaterRole(col) {
  if (matchConfig.cheaterRole === 'both') return true;
  if (matchConfig.cheaterRole === 'white' && col === 'w') return true;
  if (matchConfig.cheaterRole === 'black' && col === 'b') return true;
  return false;
}

function getEffectiveCheatLevel(col) {
  return hasCheaterRole(col) ? settings.cheatLevel : 0;
}

function isBotTurn(col) {
  return col === 'w' ? matchConfig.whiteType === 'bot' : matchConfig.blackType === 'bot';
}

function getTurnLabel(col, check) {
  const sideName = col === 'w' ? 'Білі' : 'Чорні';
  const ctrlName = isBotTurn(col) ? 'Bot' : 'You';
  const roleTag = hasCheaterRole(col) ? ' 🎭Читер' : '';
  return 'Хід: ' + sideName + ' (' + ctrlName + roleTag + ')' + (check ? ' — ШАХ!' : '');
}

settingsBtn.onclick = () => settingsModal.classList.remove('hidden');
closeSettingsBtn.onclick = () => settingsModal.classList.add('hidden');
applySettingsBtn.onclick = () => {
  settings.uiTheme = uiThemeSelect.value;
  settings.difficulty = difficultySelect.value;
  settings.cheatLevel = parseInt(cheatLevelSelect.value, 10);
  settings.theme = themeSelect.value;
  settings.moveAnim = moveAnimSelect.value;
  settings.captureAnim = captureAnimSelect.value;
  if (showHintsCheck) settings.showHints = showHintsCheck.checked;
  if (showMaterialCheck) settings.showMaterial = showMaterialCheck.checked;
  if (trashTalkCheck) settings.trashTalk = trashTalkCheck.checked;
  if (soundEnabledCheck) settings.soundEnabled = soundEnabledCheck.checked;
  if (soundVolumeRange) settings.soundVolume = parseInt(soundVolumeRange.value, 10) / 100;

    saveAllPrefs();
  document.body.className = settings.uiTheme;
  boardEl.className = 'board theme-' + settings.theme;
  settingsModal.classList.add('hidden');
  updateMaterialUI();
  render();

  document.body.className = settings.uiTheme;
  boardEl.className = 'board theme-' + settings.theme;
  settingsModal.classList.add('hidden');
  updateMaterialUI();
  render();
};

function showCheat(msg) {
  if (!settings.trashTalk || !msg) return;
  cheatBannerEl.textContent = '⚠️ ЧІТ: ' + msg;
  cheatBannerEl.classList.remove('hidden');
  clearTimeout(window.cheatTimer);
  window.cheatTimer = setTimeout(() => cheatBannerEl.classList.add('hidden'), 4000);
}

function updateMaterialUI() {
  if (!settings.showMaterial) {
    materialBarEl.classList.add('hidden');
    return;
  }
  materialBarEl.classList.remove('hidden');
  let wScore = 0, bScore = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = getAt(board, r, c);
      if (!p) continue;
      if (p.charAt(0) === 'w') wScore += MAT_POINTS[p.charAt(1)];
      else bScore += MAT_POINTS[p.charAt(1)];
    }
  }
  const diff = wScore - bScore;
  materialBarEl.className = 'material-bar';
  if (diff > 0) {
    materialBarEl.textContent = 'Матеріал: +' + diff;
    materialBarEl.classList.add('mat-plus');
  } else if (diff < 0) {
    materialBarEl.textContent = 'Матеріал: ' + diff;
    materialBarEl.classList.add('mat-minus');
  } else {
    materialBarEl.textContent = 'Матеріал: 0';
  }
}

function initBoard() {
  clearTimeout(botTimer);
  board = [
    ['bR','bN','bB','bQ','bK','bB','bN','bR'],
    ['bP','bP','bP','bP','bP','bP','bP','bP'],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    ['wP','wP','wP','wP','wP','wP','wP','wP'],
    ['wR','wN','wB','wQ','wK','wB','wN','wR']
  ];
  turn = 'w'; selected = null; validMoves = []; gameOver = false; lastMove = null; isAnimating = false;
  castling = { wK: true, wRa: true, wRh: true, bK: true, bRa: true, bRh: true };
  cheatBannerEl.classList.add('hidden');
  document.body.className = settings.uiTheme;
  boardEl.className = 'board theme-' + settings.theme;
  statusEl.textContent = gameStarted ? getTurnLabel('w', false) : 'Налаштуй матч і тисни «Почати партію»';
  updateMaterialUI();
  render();
}

const inBounds = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
const getAt = (st, r, c) => st.at(r).at(c);
const setAt = (st, r, c, v) => st.at(r).splice(c, 1, v);
const cloneSt = (st) => st.map(row => [...row]);

const KNIGHT_JUMPS = [
  {dr:-2,dc:-1},{dr:-2,dc:1},{dr:-1,dc:-2},{dr:-1,dc:2},
  {dr:1,dc:-2},{dr:1,dc:2},{dr:2,dc:-1},{dr:2,dc:1}
];
const DIRS8 = [
  {dr:-1,dc:0},{dr:1,dc:0},{dr:0,dc:-1},{dr:0,dc:1},
  {dr:-1,dc:-1},{dr:-1,dc:1},{dr:1,dc:-1},{dr:1,dc:1}
];

function getPseudo(r, c, st = board, allowCastle = true) {
  const p = getAt(st, r, c);
  if (!p) return [];
  const col = p.charAt(0), type = p.charAt(1), moves = [];
  const lvl = getEffectiveCheatLevel(col);
  const isCheater1 = lvl >= 1;
  const isCheater2 = lvl >= 2;
  const isCheater3 = lvl >= 3;

  const addUnique = (nr, nc, extra = {}) => {
    if (!moves.some(m => m.r === nr && m.c === nc)) moves.push({ r: nr, c: nc, ...extra });
  };

  const pushOk = (nr, nc, extra = {}) => {
    if (!inBounds(nr, nc)) return false;
    const t = getAt(st, nr, nc);
    if (!t) { addUnique(nr, nc, extra); return true; }
    if (t.charAt(0) !== col) addUnique(nr, nc, extra);
    return false;
  };

  const addKingSteps = (label) => {
    for (const d of DIRS8) pushOk(r + d.dr, c + d.dc, { cheat: label });
  };

  if (type === 'P') {
    const dir = col === 'w' ? -1 : 1, start = col === 'w' ? 6 : 1;
    if (inBounds(r + dir, c) && !getAt(st, r + dir, c)) {
      addUnique(r + dir, c);
      if ((r === start || isCheater2) && inBounds(r + 2 * dir, c) && !getAt(st, r + 2 * dir, c)) {
        addUnique(r + 2 * dir, c, { cheat: r !== start ? 'Пішак зробив подвійний ривок вперед!' : null });
      }
    }
    for (const dc of [-1, 1]) {
      const nr = r + dir, nc = c + dc;
      if (inBounds(nr, nc)) {
        const t = getAt(st, nr, nc);
        if (t && t.charAt(0) !== col) addUnique(nr, nc);
        else if (!t && isCheater1) addUnique(nr, nc, { cheat: 'Пішак пішов по діагоналі!' });
      }
      if (isCheater1 && inBounds(r, c + dc)) {
        const sideT = getAt(st, r, c + dc);
        if (!sideT || sideT.charAt(0) !== col) addUnique(r, c + dc, { cheat: 'Пішак крокував убік!' });
      }
    }
  } else if (type === 'N') {
    KNIGHT_JUMPS.forEach(j => pushOk(r + j.dr, c + j.dc));
    if (isCheater1) addKingSteps('Кінь походив як король!');
  } else if (type === 'K') {
    const maxSteps = (isCheater1 && allowCastle && inCheck(col, st)) ? 2 : 1;
    for (const d of DIRS8) {
      for (let s = 1; s <= maxSteps; s++) {
        if (!pushOk(r + d.dr * s, c + d.dc * s, { cheat: s === 2 ? 'Король відійшов на 2 клітинки!' : null })) break;
      }
    }
    if (allowCastle) {
      const row = col === 'w' ? 7 : 0;
      if (r === row && c === 4 && !inCheck(col, st)) {
if (castling[col+'K'] && castling[col+'Rh'] && !getAt(st,row,5) && !getAt(st,row,6) && !isAttacked(row,5,col,st) && !isAttacked(row,6,col,st)) addUnique(row, 6, { castle: 'short' });
if (castling[col+'K'] && castling[col+'Ra'] && !getAt(st,row,3) && !getAt(st,row,2) && !getAt(st,row,1) && !isAttacked(row,3,col,st) && !isAttacked(row,2,col,st)) addUnique(row, 2, { castle: 'long' });
}
}
} else {
const dirs = [];
if (type === 'R' || type === 'Q') dirs.push({dr:-1,dc:0},{dr:1,dc:0},{dr:0,dc:-1},{dr:0,dc:1});
if (type === 'B' || type === 'Q') dirs.push({dr:-1,dc:-1},{dr:-1,dc:1},{dr:1,dc:-1},{dr:1,dc:1});
for (const d of dirs) {
let nr = r + d.dr, nc = c + d.dc, jumped = false;
while (inBounds(nr, nc)) {
const t = getAt(st, nr, nc);
if (!t) {
addUnique(nr, nc, { cheat: jumped ? 'Фігура перестрибнула перешкоду!' : null });
} else {
if (t.charAt(0) !== col) addUnique(nr, nc, { cheat: jumped ? 'Атака зі стрибком через фігуру!' : null });
if (isCheater2 && !jumped) jumped = true;
else break;
}
nr += d.dr;
nc += d.dc;
}
}
if (isCheater1 && type === 'R') addKingSteps('Тура походила як король!');
if (isCheater1 && type === 'B') addKingSteps('Слон походив як король!');
if (isCheater1 && type === 'Q') KNIGHT_JUMPS.forEach(j => pushOk(r + j.dr, c + j.dc, { cheat: 'Валькірія стрибнула як кінь!' }));
}
// ФИЧА 3-ГО РІВНЯ: Обмін місцями із союзною фігурою, до якої поточна фігура «дістає»
if (isCheater3 && allowCastle) {
const canReachAlly = (tr, tc) => {
const dr = tr - r, dc = tc - c;
const isKnightJump = (Math.abs(dr) === 2 && Math.abs(dc) === 1) || (Math.abs(dr) === 1 && Math.abs(dc) === 2);
const isOneStep = Math.abs(dr) <= 1 && Math.abs(dc) <= 1;
if (type === 'N') return isKnightJump || isOneStep;
if (type === 'K') return isOneStep;
if (type === 'P') {
const dir = col === 'w' ? -1 : 1;
return (dr === dir && Math.abs(dc) <= 1) || (dr === 0 && Math.abs(dc) === 1);
}
const isStraight = dr === 0 || dc === 0;
const isDiag = Math.abs(dr) === Math.abs(dc);
if (type === 'R' && !isStraight) return isOneStep;
if (type === 'B' && !isDiag) return isOneStep;
if (type === 'Q') {
if (isKnightJump) return true;
if (!isStraight && !isDiag) return false;
}
const stepR = dr === 0 ? 0 : (dr > 0 ? 1 : -1);
const stepC = dc === 0 ? 0 : (dc > 0 ? 1 : -1);
let cr = r + stepR, cc = c + stepC, jumped = false;
while (cr !== tr || cc !== tc) {
if (getAt(st, cr, cc)) {
if (!jumped) jumped = true;
else return false;
}
cr += stepR;
cc += stepC;
}
return true;
};
for (let ar = 0; ar < 8; ar++) {
for (let ac = 0; ac < 8; ac++) {
if (ar === r && ac === c) continue;
const ally = getAt(st, ar, ac);
if (ally && ally.charAt(0) === col && canReachAlly(ar, ac)) {
addUnique(ar, ac, { swap: true, cheat: 'Обмін місцями! Фігури миттєво помінялися позиціями!' });
}
}
}
}
return moves;
}
function isAttacked(tr, tc, defCol, st = board) {
const atk = defCol === 'w' ? 'b' : 'w';
for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
const p = getAt(st, r, c);
if (p && p.charAt(0) === atk && getPseudo(r, c, st, false).some(m => m.r === tr && m.c === tc)) return true;
}
return false;
}
function inCheck(col, st = board) {
for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (getAt(st, r, c) === col + 'K') return isAttacked(r, c, col, st);
return false;
}
function collectChainTargetsAndDefenders(targetR, targetC, enemyCol, st = board) {
const sim = cloneSt(st);
const queue = [{ r: targetR, c: targetC }];
const steps = [];
const enemyKing = enemyCol + 'K';
while (queue.length > 0) {
const curr = queue.shift();
const victim = getAt(sim, curr.r, curr.c);
if (!victim || victim.charAt(0) !== enemyCol || victim === enemyKing) continue;
const defenders = [];
for (let r = 0; r < 8; r++) {
for (let c = 0; c < 8; c++) {
if (r === curr.r && c === curr.c) continue;
const p = getAt(sim, r, c);
if (p && p.charAt(0) === enemyCol && p !== enemyKing) {
if (getPseudo(r, c, sim, false).some(m => m.r === curr.r && m.c === curr.c)) {
defenders.push({ r, c });
}
}
}
}
setAt(sim, curr.r, curr.c, null);
steps.push({ r: curr.r, c: curr.c, victim });
for (const d of defenders) queue.push(d);
}
return steps;
}
function playStepSequence(piece, waypoints, onDone) {
if (!waypoints.length) {
onDone();
return;
}
const step = waypoints.shift();
render();
animatePieceMove(step.fromR, step.fromC, step.toR, step.toC, piece, () => {
if (step.capturePiece) {
playSound('capture');
setAt(board, step.toR, step.toC, null);
render();
spawnCaptureFade(step.toR, step.toC, step.capturePiece);
}
if (step.placeAtEnd) {
setAt(board, step.toR, step.toC, piece);
lastMove = { fromR: step.fromR, fromC: step.fromC, toR: step.toR, toC: step.toC };
}
updateMaterialUI();
render();
playStepSequence(piece, waypoints, onDone);
});
}
function findSafeSquareNear(prefR, prefC, defCol, st = board) {
let best = null, bestDist = 999;
for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
if (!getAt(st, r, c) && !isAttacked(r, c, defCol, st)) {
const dist = Math.abs(r - prefR) + Math.abs(c - prefC);
if (dist < bestDist) { bestDist = dist; best = { r, c }; }
}
}
return best;
}
function findKingPos(col, st = board) {
for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (getAt(st, r, c) === col + 'K') return { r, c };
return null;
}
function applySimMove(st, m) {
const sim = cloneSt(st);
const p = getAt(sim, m.fromR, m.fromC);
if (m.swap) {
const ally = getAt(sim, m.toR, m.toC);
setAt(sim, m.toR, m.toC, p);
setAt(sim, m.fromR, m.fromC, ally);
return sim;
}
setAt(sim, m.toR, m.toC, p);
setAt(sim, m.fromR, m.fromC, null);
if (m.castle === 'short') { setAt(sim, m.fromR, 5, getAt(sim, m.fromR, 7)); setAt(sim, m.fromR, 7, null); }
if (m.castle === 'long') { setAt(sim, m.fromR, 3, getAt(sim, m.fromR, 0)); setAt(sim, m.fromR, 0, null); }
if (p === 'wP' && m.toR === 0) setAt(sim, m.toR, m.toC, 'wQ');
if (p === 'bP' && m.toR === 7) setAt(sim, m.toR, m.toC, 'bQ');
return sim;
}
function getLegal(r, c, st = board) {
const p = getAt(st, r, c);
if (!p) return [];
const col = p.charAt(0);
const enemyKing = (col === 'w' ? 'b' : 'w') + 'K';
return getPseudo(r, c, st, true).filter(m => {
if (!m.swap && getAt(st, m.r, m.c) === enemyKing) return false;
const sim = applySimMove(st, { fromR: r, fromC: c, toR: m.r, toC: m.c, castle: m.castle, swap: m.swap });
return !inCheck(col, sim);
});
}
function getAllLegal(col, st = board) {
const all = [];
for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
if (getAt(st, r, c) && getAt(st, r, c).charAt(0) === col) {
getLegal(r, c, st).forEach(m => all.push({ fromR: r, fromC: c, toR: m.r, toC: m.c, castle: m.castle, swap: m.swap, cheat: m.cheat, target: m.swap ? null : getAt(st, m.r, m.c) }));
}
}
return all;
}
function evaluateBoard(st, botCol) {
let score = 0;
for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
const p = getAt(st, r, c);
if (!p) continue;
const val = VALUES[p.charAt(1)];
const centerBonus = ((r === 3 || r === 4) && (c === 3 || c === 4)) ? 25 : 0;
const advanceBonus = p.charAt(0) === 'b' ? r * 4 : (7 - r) * 4;
const pts = val + centerBonus + advanceBonus;
score += p.charAt(0) === botCol ? pts : -pts;
}
return score;
}
function minimax(st, depth, alpha, beta, isMax, botCol) {
const oppCol = botCol === 'w' ? 'b' : 'w';
const curCol = isMax ? botCol : oppCol;
const moves = getAllLegal(curCol, st);
if (!moves.length) {
if (inCheck(curCol, st)) return isMax ? -99999 - depth * 100 : 99999 + depth * 100;
return 0;
}
if (depth === 0) return evaluateBoard(st, botCol);
if (isMax) {
let maxEval = -Infinity;
for (const m of moves) {
const ev = minimax(applySimMove(st, m), depth - 1, alpha, beta, false, botCol);
if (ev > maxEval) maxEval = ev;
if (ev > alpha) alpha = ev;
if (beta <= alpha) break;
}
return maxEval;
} else {
let minEval = Infinity;
for (const m of moves) {
const ev = minimax(applySimMove(st, m), depth - 1, alpha, beta, true, botCol);
if (ev < minEval) minEval = ev;
if (ev < beta) beta = ev;
if (beta <= alpha) break;
}
return minEval;
}
}
function pickBotMove(moves, botCol) {
if (settings.difficulty === 'easy') {
const cheatMoves = moves.filter(m => m.cheat);
if (cheatMoves.length && Math.random() < 0.5) return cheatMoves.at(Math.floor(Math.random() * cheatMoves.length));
return moves.at(Math.floor(Math.random() * moves.length));
}
const depth = settings.difficulty === 'hard' ? 2 : 1;
let bestScore = -Infinity, bestList = [];
for (const m of moves) {
const sim = applySimMove(board, m);
let score = minimax(sim, depth - 1, -Infinity, Infinity, false, botCol);
if (m.cheat) score += 35;
score += Math.random() * 8;
if (score > bestScore) { bestScore = score; bestList = [m]; }
else if (Math.abs(score - bestScore) < 5) bestList.push(m);
}
return bestList.at(Math.floor(Math.random() * bestList.length));
}
function spawnCaptureFade(r, c, piece) {
if (settings.captureAnim !== 'fade' || !piece) return;
const ghost = document.createElement('div');
ghost.className = 'captured-fade-ghost ' + (piece.charAt(0) === 'w' ? 'piece-white' : 'piece-black');
ghost.textContent = SYMBOLS[piece];
ghost.style.left = (c * 60) + 'px';
ghost.style.top = (r * 60) + 'px';
boardEl.appendChild(ghost);
setTimeout(() => ghost.remove(), 340);
}
function animatePieceMove(fromR, fromC, toR, toC, piece, onComplete) {
if (settings.moveAnim === 'instant' || !piece) {
onComplete();
return;
}
if (settings.moveAnim === 'smooth') {
playSound('smooth');
}
isAnimating = true;
if (settings.moveAnim === 'smooth') {
const ghost = document.createElement('div');
ghost.className = 'moving-piece-ghost ' + (piece.charAt(0) === 'w' ? 'piece-white' : 'piece-black');
ghost.textContent = SYMBOLS[piece];
ghost.style.left = (fromC * 60) + 'px';
ghost.style.top = (fromR * 60) + 'px';
boardEl.appendChild(ghost);
const cells = boardEl.querySelectorAll('.cell');
const startCell = cells.item(fromR * 8 + fromC);
if (startCell && startCell.firstChild) startCell.firstChild.style.opacity = '0';
requestAnimationFrame(() => {
const dx = (toC - fromC) * 60;
const dy = (toR - fromR) * 60;
ghost.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
});
setTimeout(() => {
ghost.remove();
isAnimating = false;
onComplete();
}, 250);
} else if (settings.moveAnim === 'step') {
const steps = [];
let cr = fromR, cc = fromC;
const dr = toR - fromR, dc = toC - fromC;
if ((Math.abs(dr) === 2 && Math.abs(dc) === 1) || (Math.abs(dr) === 1 && Math.abs(dc) === 2)) {
if (Math.abs(dr) === 2) {
const stepR = dr > 0 ? 1 : -1;
steps.push({ r: cr + stepR, c: cc });
steps.push({ r: cr + 2 * stepR, c: cc });
steps.push({ r: toR, c: toC });
} else {
const stepC = dc > 0 ? 1 : -1;
steps.push({ r: cr, c: cc + stepC });
steps.push({ r: cr, c: cc + 2 * stepC });
steps.push({ r: toR, c: toC });
}
} else {
while (cr !== toR || cc !== toC) {
if (cr < toR) cr++;
else if (cr > toR) cr--;
if (cc < toC) cc++;
else if (cc > toC) cc--;
steps.push({ r: cr, c: cc });
}
}
const ghost = document.createElement('div');
ghost.className = 'moving-piece-ghost ' + (piece.charAt(0) === 'w' ? 'piece-white' : 'piece-black');
ghost.style.transition = 'none';
ghost.textContent = SYMBOLS[piece];
ghost.style.left = (fromC * 60) + 'px';
ghost.style.top = (fromR * 60) + 'px';
boardEl.appendChild(ghost);
const cells = boardEl.querySelectorAll('.cell');
const startCell = cells.item(fromR * 8 + fromC);
if (startCell && startCell.firstChild) startCell.firstChild.style.opacity = '0';
let idx = 0;
const stepInterval = setInterval(() => {
if (idx >= steps.length) {
clearInterval(stepInterval);
ghost.remove();
isAnimating = false;
onComplete();
return;
}
const st = steps.at(idx);
ghost.style.left = (st.c * 60) + 'px';
ghost.style.top = (st.r * 60) + 'px';
idx++;
}, 100);
}
}
function finishGameToMenuButton(text) {
gameOver = true;
gameStarted = false;
clearTimeout(botTimer);
statusEl.textContent = text;
menuBtn.classList.remove('hidden');
render();
}
function checkGameEndAndContinue(lastMoverCol) {
const wKing = findKingPos('w', board);
const bKing = findKingPos('b', board);
if (!wKing || !bKing) {
const loserCol = !wKing ? 'w' : 'b';
const humanWon = (loserCol === 'b' && matchConfig.whiteType === 'you') || (loserCol === 'w' && matchConfig.blackType === 'you');
const humanLost = (loserCol === 'w' && matchConfig.whiteType === 'you') || (loserCol === 'b' && matchConfig.blackType === 'you');
playSound(humanLost && !humanWon ? 'lose' : 'win');
for (let r = 0; r < 8; r++) {
for (let c = 0; c < 8; c++) {
const p = getAt(board, r, c);
if (p && p.charAt(0) === loserCol) {
spawnCaptureFade(r, c, p);
setAt(board, r, c, null);
}
}
}
updateMaterialUI();
finishGameToMenuButton(loserCol === 'b' ? 'Короля Чорних знищено! Білі перемогли!' : 'Короля Білих знищено! Чорні перемогли!');
return;
}
const next = lastMoverCol === 'w' ? 'b' : 'w';
const nextMoves = getAllLegal(next);
const check = inCheck(next);
updateMaterialUI();
if (!nextMoves.length) {
if (!check) {
playSound('draw');
} else {
const humanWon = (lastMoverCol === 'w' && matchConfig.whiteType === 'you') || (lastMoverCol === 'b' && matchConfig.blackType === 'you');
const humanLost = (lastMoverCol === 'b' && matchConfig.whiteType === 'you') || (lastMoverCol === 'w' && matchConfig.blackType === 'you');
playSound(humanLost && !humanWon ? 'lose' : 'win');
}
const winMsg = lastMoverCol === 'w' ? 'Шах і мат! Білі перемогли!' : 'Шах і мат! Чорні перемогли!';
finishGameToMenuButton(check ? winMsg : 'Пат! Нічия!');
return;
}
turn = next;
statusEl.textContent = getTurnLabel(next, check);
render();
if (isBotTurn(next) && gameStarted && !gameOver) {
botTimer = setTimeout(() => runBotTurn(next), 320);
}
}
function finalizeMoveLogic(fromR, fromC, toR, toC, castle = null, cheatMsg = null, isSwap = false) {
const p = getAt(board, fromR, fromC);
const moverCol = p.charAt(0);
const oppCol = moverCol === 'w' ? 'b' : 'w';
if (isSwap) {
const allyPiece = getAt(board, toR, toC);
setAt(board, toR, toC, p);
setAt(board, fromR, fromC, allyPiece);
lastMove = { fromR, fromC, toR, toC };
if (cheatMsg) showCheat(cheatMsg);
if (settings.moveAnim !== 'smooth') playSound('move');
checkGameEndAndContinue(moverCol);
return;
}
const capturedPiece = getAt(board, toR, toC);
setAt(board, toR, toC, p);
setAt(board, fromR, fromC, null);
lastMove = { fromR, fromC, toR, toC };
if (cheatMsg) showCheat(cheatMsg);
if (castle === 'short') { setAt(board, fromR, 5, getAt(board, fromR, 7)); setAt(board, fromR, 7, null); }
if (castle === 'long') { setAt(board, fromR, 3, getAt(board, fromR, 0)); setAt(board, fromR, 0, null); }
if (p === 'wK') castling.wK = false;
if (p === 'bK') castling.bK = false;
if (fromR === 7 && fromC === 0) castling.wRa = false;
if (fromR === 7 && fromC === 7) castling.wRh = false;
if (fromR === 0 && fromC === 0) castling.bRa = false;
if (fromR === 0 && fromC === 7) castling.bRh = false;
if (p === 'wP' && toR === 0) setAt(board, toR, toC, 'wQ');
if (p === 'bP' && toR === 7) setAt(board, toR, toC, 'bQ');
if (capturedPiece) {
playSound('capture');
render();
spawnCaptureFade(toR, toC, capturedPiece);
} else if (settings.moveAnim !== 'smooth') {
playSound('move');
}
if (capturedPiece && capturedPiece !== oppCol + 'K' && getEffectiveCheatLevel(oppCol) >= 3) {
const safe = findSafeSquareNear(toR, toC, oppCol, board);
if (safe) {
const chain = collectChainTargetsAndDefenders(toR, toC, moverCol, board);
const waypoints = [{ fromR: toR, fromC: toC, toR: safe.r, toC: safe.c }];
let curR = safe.r, curC = safe.c;
for (const item of chain) {
waypoints.push({ fromR: curR, fromC: curC, toR: item.r, toC: item.c, capturePiece: item.victim });
curR = item.r; curC = item.c;
}
waypoints.push({ fromR: curR, fromC: curC, toR: safe.r, toC: safe.c, placeAtEnd: true });
showCheat('Ухилення Читера! Фігура втекла та знищила нападника і захисників (' + chain.length + ' шт.)!');
playStepSequence(capturedPiece, waypoints, () => checkGameEndAndContinue(moverCol));
return;
}
}
const next = oppCol;
const nextMoves = getAllLegal(next);
const check = inCheck(next);
if (getEffectiveCheatLevel(next) >= 3 && !nextMoves.length && check) {
const defKing = findKingPos(next, board);
if (defKing) {
      let guardPos = null, bestVal = -1;
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const dp = getAt(board, r, c);
          if (dp && dp.charAt(0) === next) {
            const v = dp === next + 'K' ? 1 : VALUES[dp.charAt(1)];
            if (v > bestVal) { bestVal = v; guardPos = { r, c, piece: dp }; }
          }
        }
      }
if (guardPos) {
const simBoard = cloneSt(board);
const allChain = [];
let safetyLoop = 0;
while (inCheck(next, simBoard) && safetyLoop < 12) {
safetyLoop++;
let found = false;
for (let r = 0; r < 8; r++) {
for (let c = 0; c < 8; c++) {
const ap = getAt(simBoard, r, c);
if (ap && ap.charAt(0) === moverCol && ap !== moverCol + 'K') {
if (getPseudo(r, c, simBoard, false).some(m => m.r === defKing.r && m.c === defKing.c)) {
const sub = collectChainTargetsAndDefenders(r, c, moverCol, simBoard);
for (const s of sub) { setAt(simBoard, s.r, s.c, null); allChain.push(s); }
found = true; break;
}
}
}
if (found) break;
}
if (!found) break;
}
if (allChain.length > 0) {
let nearKing = { r: guardPos.r, c: guardPos.c };
for (const d of DIRS8) {
const nr = defKing.r + d.dr, nc = defKing.c + d.dc;
if (inBounds(nr, nc) && !getAt(simBoard, nr, nc)) { nearKing = { r: nr, c: nc }; break; }
}
setAt(board, guardPos.r, guardPos.c, null);
const waypoints = [];
let curR = guardPos.r, curC = guardPos.c;
for (const item of allChain) {
waypoints.push({ fromR: curR, fromC: curC, toR: item.r, toC: item.c, capturePiece: item.victim });
curR = item.r; curC = item.c;
}
waypoints.push({ fromR: curR, fromC: curC, toR: nearKing.r, toC: nearKing.c, placeAtEnd: true });
showCheat('Анти-Мат Читера! Охоронець знищив матуючих та захист (' + allChain.length + ' шт.) і став біля короля!');
playStepSequence(guardPos.piece, waypoints, () => checkGameEndAndContinue(moverCol));
return;
}
}
}
}
checkGameEndAndContinue(moverCol);
}
function executeMoveAnimated(fromR, fromC, toR, toC, castle = null, cheatMsg = null, isSwap = false) {
const piece = getAt(board, fromR, fromC);
animatePieceMove(fromR, fromC, toR, toC, piece, () => {
finalizeMoveLogic(fromR, fromC, toR, toC, castle, cheatMsg, isSwap);
});
}
function runBotTurn(botCol) {
if (gameOver || !gameStarted || turn !== botCol) return;
if (hasCheaterRole(botCol) && Math.random() < 0.02) {
const enemyCol = botCol === 'w' ? 'b' : 'w';
const enemyKing = findKingPos(enemyCol, board);
if (enemyKing) {
for (let r = 0; r < 8; r++) {
for (let c = 0; c < 8; c++) {
const bp = getAt(board, r, c);
if (bp && bp.charAt(0) === botCol) {
const canHitKing = getPseudo(r, c, board, false).some(m => m.r === enemyKing.r && m.c === enemyKing.c);
if (canHitKing) {
executeMoveAnimated(r, c, enemyKing.r, enemyKing.c, null, 'Фатальний чіт (2%)! Читер миттєво знищив ворожого короля!', false);
return;
}
}
}
}
}
}
const moves = getAllLegal(botCol);
if (!moves.length) return;
const chosen = pickBotMove(moves, botCol);
executeMoveAnimated(chosen.fromR, chosen.fromC, chosen.toR, chosen.toC, chosen.castle, chosen.cheat, chosen.swap);
}
function onCellClick(r, c) {
if (!gameStarted || gameOver || isAnimating || isBotTurn(turn)) return;
const mv = validMoves.find(m => m.r === r && m.c === c);
if (selected && mv) {
const sR = selected.r, sC = selected.c;
selected = null; validMoves = [];
render();
executeMoveAnimated(sR, sC, r, c, mv.castle, mv.cheat, mv.swap);
return;
}
const p = getAt(board, r, c);
if (p && p.charAt(0) === turn) {
selected = { r, c };
validMoves = getLegal(r, c);
} else {
selected = null;
validMoves = [];
}
render();
}
function render() {
boardEl.innerHTML = '';
for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
const cell = document.createElement('div');
cell.className = 'cell ' + ((r + c) % 2 === 0 ? 'light' : 'dark');
if (selected && selected.r === r && selected.c === c) cell.classList.add('selected');
if (lastMove && ((lastMove.fromR === r && lastMove.fromC === c) || (lastMove.toR === r && lastMove.toC === c))) cell.classList.add('last-move');
if (settings.showHints && validMoves.some(m => m.r === r && m.c === c)) {
const targetP = getAt(board, r, c);
cell.classList.add(targetP && targetP.charAt(0) !== turn ? 'valid-capture' : 'valid-move');
}
const p = getAt(board, r, c);
if (p) { const span = document.createElement('span'); span.textContent = SYMBOLS[p]; span.className = p.charAt(0) === 'w' ? 'piece-white' : 'piece-black'; cell.appendChild(span); }
cell.onclick = () => onCellClick(r, c);
boardEl.appendChild(cell);
}
}
restartBtn.onclick = () => {
matchConfig.whiteType = whitePlayerSelect.value;
matchConfig.blackType = blackPlayerSelect.value;
matchConfig.cheaterRole = cheaterRoleSelect.value;
saveAllPrefs();
gameStarted = true;
boardOverlayEl.classList.add('hidden');
restartBtn.classList.add('hidden');
settingsBtn.classList.add('hidden');
initBoard();
if (isBotTurn('w')) {
botTimer = setTimeout(() => runBotTurn('w'), 350);
}
};
menuBtn.onclick = () => {
  gameStarted = false;
  clearTimeout(botTimer);
  menuBtn.classList.add('hidden');
  boardOverlayEl.classList.remove('hidden');
  restartBtn.classList.remove('hidden');
  settingsBtn.classList.remove('hidden');
  initBoard();
};
