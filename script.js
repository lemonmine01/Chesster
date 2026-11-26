const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const restartBtn = document.getElementById('restartBtn');

const SYMBOLS = {
  wP: '♟', wR: '♜', wN: '♞', wB: '♝', wQ: '♛', wK: '♚',
  bP: '♟', bR: '♜', bN: '♞', bB: '♝', bQ: '♛', bK: '♚'
};

let board = [];
let turn = 'w';
let selected = null;
let validMoves = [];
let gameOver = false;

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
  statusEl.textContent = 'Твій хід (Білі)';
  render();
}

function isInside(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function getPseudoMoves(r, c, state = board) {
  const piece = state[r][c];
  if (!piece) return [];
  const color = piece.charAt(0);
  const type = piece.charAt(1);
  const moves = [];

  const addIfValid = (nr, nc) => {
    if (!isInside(nr, nc)) return false;
    const target = state[nr][nc];
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
    if (isInside(r + dir, c) && !state[r + dir][c]) {
      moves.push({ r: r + dir, c });
      if (r === startRow && !state[r + 2 * dir][c]) {
        moves.push({ r: r + 2 * dir, c });
      }
    }
    for (const dc of [-1, 1]) {
      const nr = r + dir;
      const nc = c + dc;
      if (isInside(nr, nc) && state[nr][nc] && state[nr][nc].charAt(0) !== color) {
        moves.push({ r: nr, c: nc });
      }
    }
  } else if (type === 'N') {
    const jumps = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], ,  [2, -1],  [2, 1]
    ];
    for (const [dr, dc] of jumps) addIfValid(r + dr, c + dc);
  } else if (type === 'K') {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr !== 0 || dc !== 0) addIfValid(r + dr, c + dc);
      }
    }
  } else {
    const dirs = [];
    if (type === 'R' || type === 'Q') {
      dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
    }
    if (type === 'B' || type === 'Q') {
      dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
    }
    for (const [dr, dc] of dirs) {
      let nr = r + dr;
      let nc = c + dc;
      while (addIfValid(nr, nc)) {
        nr += dr;
        nc += dc;
      }
    }
  }
  return moves;
}

function makeMove(fromR, fromC, toR, toC) {
  const movingPiece = board[fromR][fromC];
  const captured = board[toR][toC];

  board[toR][toC] = movingPiece;
  board[fromR][fromC] = null;

  if (movingPiece === 'wP' && toR === 0) board[toR][toC] = 'wQ';
  if (movingPiece === 'bP' && toR === 7) board[toR][toC] = 'bQ';

  if (captured === 'bK') {
    gameOver = true;
    statusEl.textContent = 'Перемога! Ти здолав читера!';
  } else if (captured === 'wK') {
    gameOver = true;
    statusEl.textContent = 'Поразка! Читер переміг!';
  }
}

function botTurn() {
  if (gameOver) return;
  const allMoves = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] && board[r][c].charAt(0) === 'b') {
        const moves = getPseudoMoves(r, c);
        for (const m of moves) {
          allMoves.push({ fromR: r, fromC: c, toR: m.r, toC: m.c, target: board[m.r][m.c] });
        }
      }
    }
  }

  if (allMoves.length === 0) {
    gameOver = true;
    statusEl.textContent = 'Нічия або пат!';
    return;
  }

  const captures = allMoves.filter(m => m.target !== null);
  const chosen = captures.length > 0
    ? captures[Math.floor(Math.random() * captures.length)]
    : allMoves[Math.floor(Math.random() * allMoves.length)];

  makeMove(chosen.fromR, chosen.fromC, chosen.toR, chosen.toC);
  if (!gameOver) {
    turn = 'w';
    statusEl.textContent = 'Твій хід (Білі)';
  }
  render();
}

function onCellClick(r, c) {
  if (gameOver || turn !== 'w') return;

  const move = validMoves.find(m => m.r === r && m.c === c);
  if (selected && move) {
    makeMove(selected.r, selected.c, r, c);
    selected = null;
    validMoves = [];
    render();

    if (!gameOver) {
      turn = 'b';
      statusEl.textContent = 'Хід суперника (Чорні)...';
      setTimeout(botTurn, 400);
    }
    return;
  }

  const piece = board[r][c];
  if (piece && piece.charAt(0) === 'w') {
    selected = { r, c };
    validMoves = getPseudoMoves(r, c);
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
        if (board[r][c]) cell.classList.add('valid-capture');
        else cell.classList.add('valid-move');
      }

      const piece = board[r][c];
      if (piece) {
        const span = document.createElement('span');
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