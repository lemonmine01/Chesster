const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const restartBtn = document.getElementById('restartBtn');

const SYMBOLS = {
  wP: '♟', wR: '♜', wN: '♞', wB: '♝', wQ: '♛', wK: '♚',
  bP: '♟', bR: '♜', bN: '♞', bB: '♝', bQ: '♛', bK: '♚'
};

const PIECE_VALUES = {
  P: 10, N: 30, B: 30, R: 50, Q: 90, K: 900
};

let board = [];
let turn = 'w';
let selected = null;
let validMoves = [];
let gameOver = false;
let castlingRights = { wK: true, wR_a: true, wR_h: true, bK: true, bR_a: true, bR_h: true };

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
  statusEl.textContent = 'Твій хід (Білі)';
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
    for (const j of jumps) {
      addIfValid(r + j.dr, c + j.dc);
    }
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
        if (moves.some(m => m.r === targetR && m.c === targetC)) {
          return true;
        }
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

function makeMove(fromR, fromC, toR, toC, castle = null) {
  const movingPiece = getAt(board, fromR, fromC);
  const color = movingPiece.charAt(0);

  setAt(board, toR, toC, movingPiece);
  setAt(board, fromR, fromC, null);

  if (castle === 'short') {
    setAt(board, fromR, 5, getAt(board, fromR, 7));
    setAt(board, fromR, 7, null);
  } else if (castle === 'long') {
    setAt(board, fromR, 3, getAt(board, fromR, 0));
    setAt(board, fromR, 0, null);
  }

  if (movingPiece === 'wK') castlingRights.wK = false;
  if (movingPiece === 'bK') castlingRights.bK = false;
  if (fromR === 7 && fromC === 0) castlingRights.wR_a = false;
  if (fromR === 7 && fromC === 7) castlingRights.wR_h = false;
  if (fromR === 0 && fromC === 0) castlingRights.bR_a = false;
  if (fromR === 0 && fromC === 7) castlingRights.bR_h = false;

  if (movingPiece === 'wP' && toR === 0) setAt(board, toR, toC, 'wQ');
  if (movingPiece === 'bP' && toR === 7) setAt(board, toR, toC, 'bQ');

  const nextColor = color === 'w' ? 'b' : 'w';
  const nextMoves = getAllLegalMoves(nextColor);
  const inCheck = isKingInCheck(nextColor);

  if (nextMoves.length === 0) {
    gameOver = true;
    if (inCheck) {
      statusEl.textContent = color === 'w' ? 'Шах і мат! Ти переміг!' : 'Шах і мат! Чорні перемогли!';
    } else {
      statusEl.textContent = 'Пат! Нічия!';
    }
    return;
  }

  if (nextColor === 'w') {
    statusEl.textContent = inCheck ? 'Твій хід (Білі) — ШАХ!' : 'Твій хід (Білі)';
  } else {
    statusEl.textContent = inCheck ? 'Хід суперника — ШАХ!' : 'Хід суперника (Чорні)...';
  }
}

function botTurn() {
  if (gameOver) return;
  const allMoves = getAllLegalMoves('b');
  if (allMoves.length === 0) return;

  let bestScore = -9999;
  let bestMoves = [];

  for (const m of allMoves) {
    let score = Math.random() * 4;
    if (m.target) {
      score += PIECE_VALUES[m.target.charAt(1)] * 10;
    }
    if ((m.toR === 3 || m.toR === 4) && (m.toC === 3 || m.toC === 4)) {
      score += 3;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [m];
    } else if (Math.abs(score - bestScore) < 0.5) {
      bestMoves.push(m);
    }
  }

  const chosen = bestMoves[Math.floor(Math.random() * bestMoves.length)];
  makeMove(chosen.fromR, chosen.fromC, chosen.toR, chosen.toC, chosen.castle);
  if (!gameOver) {
    turn = 'w';
  }
  render();
}

function onCellClick(r, c) {
  if (gameOver || turn !== 'w') return;

  const move = validMoves.find(m => m.r === r && m.c === c);
  if (selected && move) {
    makeMove(selected.r, selected.c, r, c, move.castle);
    selected = null;
    validMoves = [];
    render();

    if (!gameOver) {
      turn = 'b';
      setTimeout(botTurn, 400);
    }
    return;
  }

  const piece = getAt(board, r, c);
  if (piece && piece.charAt(0) === 'w') {
    selected = { r, c };
    validMoves = getLegalMoves(r, c);
  } else {
    selected = null;
    validMoves = [];
  }
  render();
}

function render() {
  boardEl.innerHTML = '';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell ' + ((r + c) % 2 === 0 ? 'light' : 'dark');

      if (selected && selected.r === r && selected.c === c) {
        cell.classList.add('selected');
      }

      const isMove = validMoves.some(m => m.r === r && m.c === c);
      if (isMove) {
        if (getAt(board, r, c)) cell.classList.add('valid-capture');
        else cell.classList.add('valid-move');
      }

      const piece = getAt(board, r, c);
      if (piece) {
        const span = document.createElement('span');
