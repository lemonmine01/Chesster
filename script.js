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
const VALUES = { P:10, N:30, B:30, R:50, Q:90, K:900 };

let settings = { difficulty: 'medium', cheatLevel: 1, theme: 'slate', showHints: true, trashTalk: true };
let board = [], turn = 'w', selected = null, validMoves = [], gameOver = false;
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
  if (!settings.trashTalk) return;
  cheatBannerEl.textContent = '⚠️ ЧІТ: ' + msg;
  cheatBannerEl.classList.remove('hidden');
  setTimeout(() => cheatBannerEl.classList.add('hidden'), 3500);
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
  turn = 'w'; selected = null; validMoves = []; gameOver = false;
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

function getPseudo(r, c, st = board, allowCastle = true) {
  const p = getAt(st, r, c);
  if (!p) return [];
  const col = p.charAt(0), type = p.charAt(1), moves = [];
  const isCheater = (col === 'b' && settings.cheatLevel >= 1);

  const addUnique = (nr, nc, extra = {}) => {
    if (!moves.some(m => m.r === nr && m.c === nc)) {
      moves.push({ r: nr, c: nc, ...extra });
    }
  };

  const pushOk = (nr, nc) => {
    if (!inBounds(nr, nc)) return false;
    const t = getAt(st, nr, nc);
    if (!t) { addUnique(nr, nc); return true; }
    if (t.charAt(0) !== col) addUnique(nr, nc);
    return false;
  };

  const addKingSteps = (radius = 1) => {
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        if (dr !== 0 || dc !== 0) pushOk(r + dr, c + dc);
      }
    }
  };

  if (type === 'P') {
    const dir = col === 'w' ? -1 : 1, start = col === 'w' ? 6 : 1;
    if (inBounds(r + dir, c) && !getAt(st, r + dir, c)) {
      addUnique(r + dir, c);
      if (r === start && !getAt(st, r + 2 * dir, c)) addUnique(r + 2 * dir, c);
    }
    for (const dc of [-1, 1]) {
      const nr = r + dir, nc = c + dc;
      if (inBounds(nr, nc)) {
        const t = getAt(st, nr, nc);
        if (t && t.charAt(0) !== col) addUnique(nr, nc);
        else if (!t && isCheater) addUnique(nr, nc, { cheat: 'Пішак пішов по діагоналі!' });
      }
      if (isCheater && inBounds(r, c + dc)) {
        const sideT = getAt(st, r, c + dc);
        if (!sideT || sideT.charAt(0) !== col) addUnique(r, c + dc, { cheat: 'Пішак крокував убік!' });
      }
    }
  } else if (type === 'N') {
    KNIGHT_JUMPS.forEach(j => pushOk(r + j.dr, c + j.dc));
    if (isCheater) addKingSteps(1);
  } else if (type === 'K') {
    const maxSteps = (isCheater && allowCastle && inCheck(col, st)) ? 2 : 1;
    const dirs8 = [
      {dr:-1,dc:0}, {dr:1,dc:0}, {dr:0,dc:-1}, {dr:0,dc:1},
      {dr:-1,dc:-1}, {dr:-1,dc:1}, {dr:1,dc:-1}, {dr:1,dc:1}
    ];
    for (const d of dirs8) {
      for (let step = 1; step <= maxSteps; step++) {
        if (!pushOk(r + d.dr * step, c + d.dc * step)) break;
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
    for (const d of dirs) { let nr = r + d.dr, nc = c + d.dc; while (pushOk(nr, nc)) { nr += d.dr; nc += d.dc; } }
    if (isCheater && (type === 'R' || type === 'B')) addKingSteps(1);
    if (isCheater && type === 'Q') KNIGHT_JUMPS.forEach(j => pushOk(r + j.dr, c + j.dc));
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

function getLegal(r, c, st = board) {
  const p = getAt(st, r, c);
  if (!p) return [];
  const col = p.charAt(0);
  return getPseudo(r, c, st, true).filter(m => {
    const sim = cloneSt(st);
    setAt(sim, m.r, m.c, getAt(sim, r, c)); setAt(sim, r, c, null);
    if (m.castle === 'short') { setAt(sim, r, 5, getAt(sim, r, 7)); setAt(sim, r, 7, null); }
    if (m.castle === 'long') { setAt(sim, r, 3, getAt(sim, r, 0)); setAt(sim, r, 0, null); }
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

function makeMove(fromR, fromC, toR, toC, castle = null) {
  const p = getAt(board, fromR, fromC), col = p.charAt(0);
  const wasInCheck = (col === 'b' && inCheck('b'));
  setAt(board, toR, toC, p); setAt(board, fromR, fromC, null);

  if (p === 'bK' && wasInCheck && (Math.abs(toR - fromR) > 1 || Math.abs(toC - fromC) > 1)) {
    showCheat('Король читера відскочив на 2 клітинки з-під шаху!');
  }

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

  const next = col === 'w' ? 'b' : 'w';
  const nextMoves = getAllLegal(next), check = inCheck(next);
  if (!nextMoves.length) {
    gameOver = true;
    statusEl.textContent = check ? (col === 'w' ? 'Шах і мат! Ти переміг!' : 'Шах і мат! Читер переміг!') : 'Пат! Нічия!';
    return;
  }
  statusEl.textContent = next === 'w' ? (check ? 'Твій хід (Білі) — ШАХ!' : 'Твій хід (Білі)') : (check ? 'Хід суперника — ШАХ!' : 'Хід суперника...');
}

function pickBotMove(moves) {
  if (settings.difficulty === 'easy') return moves.at(Math.floor(Math.random() * moves.length));
  let best = -99999, list = [];
  for (const m of moves) {
    let sc = Math.random() * 3 + (m.target ? VALUES[m.target.charAt(1)] * 10 : 0);
    if ((m.toR === 3 || m.toR === 4) && (m.toC === 3 || m.toC === 4)) sc += 4;
    if (settings.difficulty === 'hard') {
      const sim = cloneSt(board), mv = getAt(sim, m.fromR, m.fromC);
      setAt(sim, m.toR, m.toC, mv); setAt(sim, m.fromR, m.fromC, null);
      if (isAttacked(m.toR, m.toC, 'b', sim)) sc -= VALUES[mv.charAt(1)] * 8;
      if (inCheck('w', sim)) sc += 15;
    }
    if (sc > best) { best = sc; list = [m]; }
    else if (Math.abs(sc - best) < 0.5) list.push(m);
  }
  return list.at(Math.floor(Math.random() * list.length));
}

function botTurn() {
  if (gameOver) return;
  const moves = getAllLegal('b');
  if (!moves.length) return;
  const chosen = pickBotMove(moves);
  makeMove(chosen.fromR, chosen.fromC, chosen.toR, chosen.toC, chosen.castle);
  if (!gameOver) turn = 'w';
  render();
}

function onCellClick(r, c) {
if (gameOver || turn !== 'w') return;
const mv = validMoves.find(m => m.r === r && m.c === c);
if (selected && mv) {
makeMove(selected.r, selected.c, r, c, mv.castle);
selected = null; validMoves = []; render();
if (!gameOver) { turn = 'b'; setTimeout(botTurn, 400); }
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
if (settings.showHints && validMoves.some(m => m.r === r && m.c === c)) cell.classList.add(getAt(board, r, c) ? 'valid-capture' : 'valid-move');
const p = getAt(board, r, c);
if (p) { const span = document.createElement('span'); span.textContent = SYMBOLS[p]; span.className = p.charAt(0) === 'w' ? 'piece-white' : 'piece-black'; cell.appendChild(span); }
cell.onclick = () => onCellClick(r, c);
boardEl.appendChild(cell);
}
}
restartBtn.onclick = initBoard;
initBoard();
