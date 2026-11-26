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

const SYMBOLS = {
  wP: '♟', wR: '♜', wN: '♞', wB: '♝', wQ: '♛', wK: '♚',
  bP: '♟', bR: '♜', bN: '♞', bB: '♝', bQ: '♛', bK: '♚'
};

const PIECE_VALUES = {
  P: 10, N: 30, B: 30, R: 50, Q: 90, K: 900
};

let settings = {
  difficulty: 'medium',
  cheatLevel: 1,
  theme: 'slate',
  showHints: true,
  trashTalk: true
};

let board = [];
let turn = 'w';
let selected = null;
let validMoves = [];
let gameOver = false;
let castlingRights = { wK: true, wR_a: true, wR_h: true, bK: true, bR_a: true, bR_h: true };

settingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));
applySettingsBtn.addEventListener('click', () => {
  settings.difficulty = difficultySelect.value;
  settings.cheatLevel = parseInt(cheatLevelSelect.value, 10);
  settings.theme = themeSelect.value;
  settings.showHints = showHintsCheck.checked;
  settings.trashTalk = trashTalkCheck.checked;

  boardEl.className = 'board theme-' + settings.theme;
  settingsModal.classList.add('hidden');
  render();
});

function showCheatMessage(text) {
  if (!settings.trashTalk) return;
  cheatBannerEl.textContent = '⚠️ ЧІТ: ' + text;
  cheatBannerEl.classList.remove('hidden');
  setTimeout(() => cheatBannerEl.classList.add('hidden'), 3500);
}

function initBoard() {
  board = [
    ['bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR'],
    ['bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP'],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ['wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP'],
    ['wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR']
  ];
  turn = 'w';
  selected = null;
  validMoves = [];
  gameOver = false;
  castlingRights = { wK: true, wR_a: true, wR_h: true, bK: true, bR_a: true, bR_h: true };
  cheatBannerEl.classList.add('hidden');
  statusEl.textContent = 'Твій хід (Білі)';
  boardEl.className = 'board theme-' + settings.theme;
  render();
}

function isInside(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function getAt(state, r, c) {
  return state.at(r).at(c);
}

function setAt(state, r, c, val) {
  state.at(r).splice(c, 1, val);
}

function cloneBoard(state) {
  return state.map(row => [...row]);
}

function getPseudoMoves(r, c, state = board, includeCastling = true) {
  const piece = getAt(state, r, c);
  if (!piece) return [];
  const color = piece.charAt(0);
  const type = piece.charAt(1);
  const moves = [];

  const addIfValid = (nr, nc) => {
    if (!isInside(nr, nc)) return false;
    const target = getAt(state, nr, nc);
    if (!target) {
      moves.push({ r: nr, c: nc });
      return true;
    }
    if (target.charAt(0) !== color) {
      moves.push({ r: nr, c: nc });
    }
    return false;
  };

  if (type === 'P') {
    const dir = color === 'w' ? -1 : 1;
    const startRow = color === 'w' ? 6 : 1;
    if (isInside(r + dir, c) && !getAt(state, r + dir, c)) {
      moves.push({ r: r + dir, c });
      if (r === startRow && !getAt(state, r + 2 * dir, c)) {
        moves.push({ r: r + 2 * dir, c });
      }
    }
    for (const dc of [-1, 1]) {
      const nr = r + dir;
      const nc = c + dc;
      if (isInside(nr, nc)) {
        const target = getAt(state, nr, nc);
        if (target && target.charAt(0) !== color) {
          moves.push({ r: nr, c: nc });
        }
      }
    }
  } else if (type === 'N') {
    const jumps = [
      { dr: -2, dc: -1 }, { dr: -2, dc: 1 },
      { dr: -1, dc: -2 }, { dr: -1, dc: 2 },
      { dr: 1, dc: -2 },  { dr: 1, dc: 2 },
      { dr: 2, dc: -1 },  { dr: 2, dc: 1 }
    ];
    for (const j of jumps) addIfValid(r + j.dr, c + j.dc);
  } else if (type === 'K') {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr !== 0 || dc !== 0) addIfValid(r + dr, c + dc);
      }
    }
    if (includeCastling) {
      const row = color === 'w' ? 7 : 0;
      if (r === row && c === 4 && !isKingInCheck(color, state)) {
        if (castlingRights[color + 'K'] && castlingRights[color + 'R_h']) {
          if (!getAt(state, row, 5) && !getAt(state, row, 6) &&
              !isSquareAttacked(row, 5, color, state) &&
              !isSquareAttacked(row, 6, color, state)) {
            moves.push({ r: row, c: 6, castle: 'short' });
          }
        }
        if (castlingRights[color + 'K'] && castlingRights[color + 'R_a']) {
          if (!getAt(state, row, 3) && !getAt(state, row, 2) && !getAt(state, row, 1) &&
              !isSquareAttacked(row, 3, color, state) &&
              !isSquareAttacked(row, 2, color, state)) {
            moves.push({ r: row, c: 2, castle: 'long' });
          }
        }
      }
    }
  } else {
    const dirs = [];
    if (type === 'R' || type === 'Q') {
      dirs.push({ dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 });
    }
    if (type === 'B' || type === 'Q') {
      dirs.push({ dr: -1, dc: -1 }, { dr: -1, dc: 1 }, { dr: 1, dc: -1 }, { dr: 1, dc: 1 });
    }
    for (const d of dirs) {
      let nr = r + d.dr;
      let nc = c + d.dc;
      while (addIfValid(nr, nc)) {
        nr += d.dr;
        nc += d.dc;
      }
    }
  }
  return moves;
}

function isSquareAttacked(targetR, targetC, defenderColor, state = board) {
  const attackerColor = defenderColor === 'w' ? 'b' : 'w';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = getAt(state, r, c);
      if (p && p.charAt(0) === attackerColor) {
        const moves = getPseudoMoves(r, c, state, false);
        if (moves.some(m => m.r === targetR && m.c === targetC)) return true;
      }
    }
  }
  return false;
}

function isKingInCheck(color, state = board) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (getAt(state, r, c) === color + 'K') {
        return isSquareAttacked(r, c, color, state);
      }
    }
  }
  return false;
}

function getLegalMoves(r, c, state = board) {
  const piece = getAt(state, r, c);
  if (!piece) return [];
  const color = piece.charAt(0);
  const pseudo = getPseudoMoves(r, c, state, true);

  return pseudo.filter(move => {
    const sim = cloneBoard(state);
    setAt(sim, move.r, move.c, getAt(sim, r, c));
    setAt(sim, r, c, null);
    if (move.castle === 'short') {
      setAt(sim, r, 5, getAt(sim, r, 7));
      setAt(sim, r, 7, null);
    } else if (move.castle === 'long') {
      setAt(sim, r, 3, getAt(sim, r, 0));
      setAt(sim, r, 0, null);
    }
    return !isKingInCheck(color, sim);
  });
}

function getAllLegalMoves(color, state = board) {
  const all = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = getAt(state, r, c);
      if (p && p.charAt(0) === color) {
        const moves = getLegalMoves(r, c, state);
        for (const m of moves) {
          all.push({ fromR: r, fromC: c, toR: m.r, toC: m.c, castle: m.castle, target: getAt(state, m.r, m.c) });
        }
      }
    }
  }
  return all;
}

function tryCheatBeforeTurn() {
  const lvl = settings.cheatLevel;
  if (lvl === 0) return false;

  // Рівень 3: Телепорт короля від шаху або спавн нового ферзя
  if (lvl >= 3 && isKingInCheck('b') && Math.random() < 0.7) {
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 8; c++) {
        if (!getAt(board, r, c) && !isSquareAttacked(r, c, 'b', board)) {
          for (let kr = 0; kr < 8; kr++) {
            for (let kc = 0; kc < 8; kc++) {
              if (getAt(board, kr, kc) === 'bK') {
                setAt(board, kr, kc, null);
                setAt(board, r, c, 'bK');
                showCheatMessage('«Який шах? Мій король телепортувався!»');
                return false;
              }
            }
          }
        }
      }
    }
  }

  // Рівень 2+: Еволюція випадкового чорного пішака в коня або туру
  if (lvl >= 2 && Math.random() < 0.25) {
    const pawns = [];
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 8; c++) {
        if (getAt(board, r, c) === 'bP') pawns.push({ r, c });
      }
    }
    if (pawns.length > 0) {
      const p = pawns.at(Math.floor(Math.random() * pawns.length));
      const newType = lvl === 3 ? 'bQ' : 'bN';
      setAt(board, p.r, p.c, newType);
      showCheatMessage(lvl === 3 ? '«Мій пішак прокачався до Ферзя!»' : '«Мій пішак осідлав коня!»');
    }
  }

  // Рівень 1+: Непомітний підсув пішака вперед на 1 клітинку
  if (lvl >= 1 && Math.random() < 0.3) {
    for (let r = 1; r < 6; r++) {
      for (let c = 0; c < 8; c++) {
        if (getAt(board, r, c) === 'bP' && !getAt(board, r + 1, c)) {
          setAt(board, r, c, null);
          setAt(board, r + 1, c, 'bP');
          showCheatMessage('«Ой, рука здригнулася...»');
          return false;
        }
      }
    }
  }

  return false;
}

function makeMove(fromR, fromC, toR, toC, castle = null) {
  const movingPiece = getAt(board, fromR, fromC);
  const color = movingPiece.charAt(0);

  setAt(board, toR, toC, movingPiece);
  setAt(board, fromR, fromC, null);

  if (castle === 'short') {
        span.textContent = SYMBOLS[piece];
        span.className = piece.charAt(0) === 'w' ? 'piece-white' : 'piece-black';
        cell.appendChild(span);
      }

      cell.addEventListener('click', () => onCellClick(r, c));
      boardEl.appendChild(cell);
    }
  }
}

restartBtn.addEventListener('click', initBoard);
initBoard();
