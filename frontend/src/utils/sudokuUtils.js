export const isValidSudokuMove = (board, row, col, value) => {
  // check row
  for (let x = 0; x < 9; x++) {
    if (board[row][x] === value) {
      return false;
    }
  }

  // check column
  for (let y = 0; y < 9; y++) {
    if (board[y][col] === value) {
      return false;
    }
  }

  // check 3x3 box
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 3; x++) {
      if (board[boxRow + y][boxCol + x] === value) {
        return false;
      }
    }
  }

  return true;
};

export const isBoardComplete = (board) => {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] === 0) {
        return false;
      }
    }
  }
  return true;
};

export const checkBoardValidity = (board) => {
  // check each row
  for (let row = 0; row < 9; row++) {
    const rowValues = new Set();
    for (let col = 0; col < 9; col++) {
      const value = board[row][col];
      if (value !== 0) {
        if (rowValues.has(value)) {
          return false;
        }
        rowValues.add(value);
      }
    }
  }

  // check each column
  for (let col = 0; col < 9; col++) {
    const colValues = new Set();
    for (let row = 0; row < 9; row++) {
      const value = board[row][col];
      if (value !== 0) {
        if (colValues.has(value)) {
          return false;
        }
        colValues.add(value);
      }
    }
  }

  // check each 3x3 box
  for (let boxRow = 0; boxRow < 3; boxRow++) {
    for (let boxCol = 0; boxCol < 3; boxCol++) {
      const boxValues = new Set();
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const value = board[boxRow * 3 + row][boxCol * 3 + col];
          if (value !== 0) {
            if (boxValues.has(value)) {
              return false;
            }
            boxValues.add(value);
          }
        }
      }
    }
  }

  return true;
};
