const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const cheatBannerEl = document.getElementById('cheatBanner');
const restartBtn = document.getElementById('restartBtn');

const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const applySettingsBtn = document.getElementById('applySettingsBtn');
const difficultySelect = document.getElementById('difficultySelect');
const cheatLevelSelect = document.getElementById('cheatLevelSelect');
const themeSelect = document.getElementById('themeSelect');
const showHintsCheck = document.getElementById('showHintsCheck');
const trashTalkCheck = document.getElementById('trashTalkCheck');

const SYMBOLS = { wP:'♟', wR:'♜', wN:'♞', wB:'♝', wQ:'♛', wK:'♚', bP:'♟', bR:'♜', bN:'♞', bB:'♝', bQ:'♛', bK:'♚' };
const VALUES = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 };

let settings = { difficulty: 'medium', cheatLevel: 1, theme: 'slate', showHints: true, trashTalk: true };
let board = [], turn = 'w', selected = null, validMoves = [], gameOver = false, lastMove = null;
let castling = { wK: true, wRa: true, wRh: true, bK: true, bRa: true, bRh: true };

settingsBtn.onclick = () => settingsModal.classList.remove('hidden');
closeSettingsBtn.onclick = () => settingsModal.classList.add('hidden');
applySettingsBtn.onclick = () => {
  settings.difficulty = difficultySelect.value;
  settings.cheatLevel = parseInt(cheatLevelSelect.value, 10);
  settings.theme = themeSelect.value;
  settings.showHints = showHintsCheck.checked;
  settings.trashTalk = trashTalkCheck.checked;
  boardEl.className = 'board theme-' + settings.theme;
  settingsModal.classList.add('hidden');
  render();
};

function showCheat(msg) {
  if (!settings.trashTalk || !msg) return;
  cheatBannerEl.textContent = '⚠️ ЧІТ: ' + msg;
  cheatBannerEl.classList.remove('hidden');
  clearTimeout(window.cheatTimer);
  window.cheatTimer = setTimeout(() => cheatBannerEl.classList.add('hidden'), 4000);
}

function initBoard() {
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
  turn = 'w'; selected = null; validMoves = []; gameOver = false; lastMove = null;
  castling = { wK: true, wRa: true, wRh: true, bK: true, bRa: true, bRh: true };
  cheatBannerEl.classList.add('hidden');
  statusEl.textContent = 'Твій хід (Білі)';
  boardEl.className = 'board theme-' + settings.theme;
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
  const isCheater1 = (col === 'b' && settings.cheatLevel >= 1);
  const isCheater2 = (col === 'b' && settings.cheatLevel >= 2);

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

// Ланцюгове знищення цілі та всіх її білих захисників (для 3-го рівня читера)
function chainDestroyTargetAndDefenders(targetR, targetC, st = board) {
  const queue = [{ r: targetR, c: targetC }];
  let destroyedCount = 0;

  while (queue.length > 0) {
    const curr = queue.shift();
    const victim = getAt(st, curr.r, curr.c);
    if (!victim || victim.charAt(0) !== 'w' || victim === 'wK') continue;

    // Знаходимо всіх білих захисників цієї клітинки перед її знищенням
    const defenders = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (r === curr.r && c === curr.c) continue;
        const p = getAt(st, r, c);
        if (p && p.charAt(0) === 'w' && p !== 'wK') {
          const canDefend = getPseudo(r, c, st, false).some(m => m.r === curr.r && m.c === curr.c);
          if (canDefend) defenders.push({ r, c });
        }
      }
    }

    setAt(st, curr.r, curr.c, null);
    destroyedCount++;
    for (const d of defenders) queue.push(d);
  }
  return destroyedCount;
}

function findSafeSquareNear(prefR, prefC, st = board) {
  let best = null, bestDist = 999;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (!getAt(st, r, c) && !isAttacked(r, c, 'b', st)) {
        const dist = Math.abs(r - prefR) + Math.abs(c - prefC) + (r * 0.2);
        if (dist < bestDist) { bestDist = dist; best = { r, c }; }
      }
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
  return getPseudo(r, c, st, true).filter(m => {
const sim = applySimMove(st, { fromR: r, fromC: c, toR: m.r, toC: m.c, castle: m.castle });
return !inCheck(col, sim);
});
}
function getAllLegal(col, st = board) {
const all = [];
for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
if (getAt(st, r, c) && getAt(st, r, c).charAt(0) === col) {
getLegal(r, c, st).forEach(m => all.push({ fromR: r, fromC: c, toR: m.r, toC: m.c, castle: m.castle, cheat: m.cheat, target: getAt(st, m.r, m.c) }));
}
}
return all;
}
function evaluateBoard(st) {
let score = 0;
for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
const p = getAt(st, r, c);
if (!p) continue;
const val = VALUES[p.charAt(1)];
const centerBonus = ((r === 3 || r === 4) && (c === 3 || c === 4)) ? 25 : 0;
const advanceBonus = p.charAt(0) === 'b' ? r * 4 : (7 - r) * 4;
score += p.charAt(0) === 'b' ? (val + centerBonus + advanceBonus) : -(val + centerBonus + advanceBonus);
}
return score;
}
function minimax(st, depth, alpha, beta, isMax) {
const col = isMax ? 'b' : 'w';
const moves = getAllLegal(col, st);
if (!moves.length) {
if (inCheck(col, st)) return isMax ? -99999 - depth * 100 : 99999 + depth * 100;
return 0;
}
if (depth === 0) return evaluateBoard(st);
if (isMax) {
let maxEval = -Infinity;
for (const m of moves) {
const ev = minimax(applySimMove(st, m), depth - 1, alpha, beta, false);
if (ev > maxEval) maxEval = ev;
if (ev > alpha) alpha = ev;
if (beta <= alpha) break;
}
return maxEval;
} else {
let minEval = Infinity;
for (const m of moves) {
const ev = minimax(applySimMove(st, m), depth - 1, alpha, beta, true);
if (ev < minEval) minEval = ev;
if (ev < beta) beta = ev;
if (beta <= alpha) break;
}
return minEval;
}
}
function pickBotMove(moves) {
if (settings.difficulty === 'easy') {
const cheatMoves = moves.filter(m => m.cheat);
if (cheatMoves.length && Math.random() < 0.5) return cheatMoves.at(Math.floor(Math.random() * cheatMoves.length));
return moves.at(Math.floor(Math.random() * moves.length));
}
const depth = settings.difficulty === 'hard' ? 2 : 1;
let bestScore = -Infinity, bestList = [];
for (const m of moves) {
const sim = applySimMove(board, m);
let score = minimax(sim, depth - 1, -Infinity, Infinity, false);
if (m.cheat) score += 35;
score += Math.random() * 8;
if (score > bestScore) { bestScore = score; bestList = [m]; }
else if (Math.abs(score - bestScore) < 5) bestList.push(m);
}
return bestList.at(Math.floor(Math.random() * bestList.length));
}
function makeMove(fromR, fromC, toR, toC, castle = null, cheatMsg = null) {
const p = getAt(board, fromR, fromC), col = p.charAt(0);
const capturedPiece = getAt(board, toR, toC);
const wasBlackInCheck = (col === 'b' && inCheck('b'));
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
// РІВЕНЬ 3 (ПРАВИЛО №2): Якщо білі побили чорну фігуру -> вона ухиляється у безпечну зону і винищує нападника + усіх захисників!
if (col === 'w' && settings.cheatLevel >= 3 && capturedPiece && capturedPiece !== 'bK') {
const safe = findSafeSquareNear(toR, toC, board);
if (safe) {
const wiped = chainDestroyTargetAndDefenders(toR, toC, board);
setAt(board, safe.r, safe.c, capturedPiece);
lastMove = { fromR: toR, fromC: toC, toR: safe.r, toC: safe.c };
showCheat('Анти-Мат! Охоронець знищив матуючого та весь захист (' + wiped + ' шт.) і став біля короля!');
}
}
// РІВЕНЬ 3 (ПРАВИЛО №1): Якщо чорні поставили блок від шаху -> фігура-блокувальник винищує нападника + захисників і повертається на місце блоку!
if (col === 'b' && settings.cheatLevel >= 3 && wasBlackInCheck && p !== 'bK' && !capturedPiece) {
const bKing = findKingPos('b', board);
if (bKing) {
let attackerPos = null;
for (let r = 0; r < 8; r++) {
for (let c = 0; c < 8; c++) {
const wp = getAt(board, r, c);
if (wp && wp.charAt(0) === 'w' && wp !== 'wK') {
if (getPseudo(r, c, board, false).some(m => m.r === toR && m.c === toC)) {
attackerPos = { r, c };
break;
}
}
}
if (attackerPos) break;
}
if (attackerPos) {
const wiped = chainDestroyTargetAndDefenders(attackerPos.r, attackerPos.c, board);
showCheat('Блок із ланцюговою помстою! Знищено атакуючого та захисників (' + wiped + ' шт.)!');
}
}
}
const next = col === 'w' ? 'b' : 'w';
let nextMoves = getAllLegal(next), check = inCheck(next);
// РІВЕНЬ 3 (ПРАВИЛО №3): Якщо білі поставили ШАХ І МАТ читеру -> фігура-охоронець знищує матуючого + захисників і стає біля короля!
if (next === 'b' && settings.cheatLevel >= 3 && !nextMoves.length && check) {
const bKing = findKingPos('b', board);
if (bKing) {
let materPos = null;
for (let r = 0; r < 8; r++) {
for (let c = 0; c < 8; c++) {
const wp = getAt(board, r, c);
if (wp && wp.charAt(0) === 'w') {
if (getPseudo(r, c, board, false).some(m => m.r === bKing.r && m.c === bKing.c)) {
materPos = { r, c };
break;
}
}
}
if (materPos) break;
}
// Шукаємо найсильнішу чорну фігуру для порятунку короля
let guardPos = null, bestVal = -1;
for (let r = 0; r < 8; r++) {
for (let c = 0; c < 8; c++) {
const bp = getAt(board, r, c);
if (bp && bp.charAt(0) === 'b' && bp !== 'bK') {
const v = VALUES[bp.charAt(1)];
if (v > bestVal) { bestVal = v; guardPos = { r, c, piece: bp }; }
}
}
}
if (materPos && guardPos) {
const wiped = chainDestroyTargetAndDefenders(materPos.r, materPos.c, board);
// Шукаємо вільну клітинку біля чорного короля для повернення охоронця
let nearKing = { r: guardPos.r, c: guardPos.c };
for (const d of DIRS8) {
const nr = bKing.r + d.dr, nc = bKing.c + d.dc;
if (inBounds(nr, nc) && !getAt(board, nr, nc)) {
nearKing = { r: nr, c: nc };
break;
}
}
setAt(board, guardPos.r, guardPos.c, null);
setAt(board, nearKing.r, nearKing.c, guardPos.piece);
lastMove = { fromR: guardPos.r, fromC: guardPos.c, toR: nearKing.r, toC: nearKing.c };
showCheat('Анти-Мат! Охоронець знищив матуючого та весь захист (' + wiped + ' шт.) і став біля короля!');
nextMoves = getAllLegal('b');
check = inCheck('b');
}
}
}
if (!nextMoves.length) {
gameOver = true;
statusEl.textContent = check ? (col === 'w' ? 'Шах і мат! Ти переміг!' : 'Шах і мат! Читер переміг!') : 'Пат! Нічия!';
return;
}
statusEl.textContent = next === 'w' ? (check ? 'Твій хід (Білі) — ШАХ!' : 'Твій хід (Білі)') : (check ? 'Хід суперника — ШАХ!' : 'Хід суперника...');
}
function botTurn() {
if (gameOver) return;
const moves = getAllLegal('b');
if (!moves.length) return;
const chosen = pickBotMove(moves);
makeMove(chosen.fromR, chosen.fromC, chosen.toR, chosen.toC, chosen.castle, chosen.cheat);
if (!gameOver) turn = 'w';
render();
}
function onCellClick(r, c) {
if (gameOver || turn !== 'w') return;
const mv = validMoves.find(m => m.r === r && m.c === c);
if (selected && mv) {
makeMove(selected.r, selected.c, r, c, mv.castle);
selected = null; validMoves = []; render();
if (!gameOver) { turn = 'b'; setTimeout(botTurn, 350); }
return;
}
const p = getAt(board, r, c);
if (p && p.charAt(0) === 'w') { selected = { r, c }; validMoves = getLegal(r, c); }
else { selected = null; validMoves = []; }
render();
}
function render() {
boardEl.innerHTML = '';
for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
const cell = document.createElement('div');
cell.className = 'cell ' + ((r + c) % 2 === 0 ? 'light' : 'dark');
if (selected && selected.r === r && selected.c === c) cell.classList.add('selected');
if (lastMove && ((lastMove.fromR === r && lastMove.fromC === c) || (lastMove.toR === r && lastMove.toC === c))) cell.classList.add('last-move');
if (settings.showHints && validMoves.some(m => m.r === r && m.c === c)) cell.classList.add(getAt(board, r, c) ? 'valid-capture' : 'valid-move');
const p = getAt(board, r, c);
if (p) { const span = document.createElement('span'); span.textContent = SYMBOLS[p]; span.className = p.charAt(0) === 'w' ? 'piece-white' : 'piece-black'; cell.appendChild(span); }
cell.onclick = () => onCellClick(r, c);
boardEl.appendChild(cell);
}
}
restartBtn.onclick = initBoard;
initBoard();