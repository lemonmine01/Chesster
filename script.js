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
      let nr = r + d.dr, nc = c + d.dc;
      let jumped = false;
      while (inBounds(nr, nc)) {
        const t = getAt(st, nr, nc);
        if (!t) {
          addUnique(nr, nc, { cheat: jumped ? 'Фігура перестрибнула перешкоду!' : null });
        } else {
          if (t.charAt(0) !== col) {
            addUnique(nr, nc, { cheat: jumped ? 'Атака зі стрибком через фігуру!' : null });
          }
          if (isCheater2 && !jumped) {
            jumped = true;
          } else {
            break;
          }
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