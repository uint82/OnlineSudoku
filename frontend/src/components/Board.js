import React, { useState } from 'react';
import Cell from './Cell';
import { isValidSudokuMove } from '../utils/sudokuUtils';

const Board = ({ 
  initialBoard, 
  currentBoard, 
  onMakeMove, 
  players, 
  playerId,
  moves
}) => {
  const [selectedCell, setSelectedCell] = useState(null);
  const [errors, setErrors] = useState({});

  // find player color from the players list
  const getPlayerColor = (cellRow, cellCol) => {
    const move = moves.find(m => m.row === cellRow && m.column === cellCol);
    if (move) {
      const player = players.find(p => p.id === move.player.id);
      return player ? player.color : '#666';
    }
    return '#666';
  };

  const handleCellClick = (row, col) => {
    // don't allow clicking on initial board cells
    if (initialBoard[row][col] !== 0) {
      return;
    }
    
    setSelectedCell({ row, col });
  };

  const handleNumberSelect = (number) => {
    if (!selectedCell) return;
    
    const { row, col } = selectedCell;
    
    // check if the move is valid
    const isValid = number === 0 || isValidSudokuMove(
      currentBoard.map((r, i) => i === row ? 
        r.map((c, j) => j === col ? 0 : c) : r), 
      row, col, number
    );
    
    // update errors state
    if (!isValid && number !== 0) {
      setErrors({ ...errors, [`${row}-${col}`]: true });
      setTimeout(() => {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[`${row}-${col}`];
          return newErrors;
        });
      }, 1000);
      return;
    }
    
    // make the move
    onMakeMove(row, col, number);
    setSelectedCell(null);
  };

  const renderNumberPad = () => {
    return (
      <div className="number-pad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(number => (
          <button
            key={number}
            onClick={() => handleNumberSelect(number)}
            style={{
              width: '40px',
              height: '40px',
              margin: '0 5px',
              fontSize: '16px',
              cursor: 'pointer',
            }}
          >
            {number === 0 ? 'X' : number}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="board-container">
      <div className="sudoku-grid">
        {currentBoard.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <Cell
              key={`${rowIndex}-${colIndex}`}
              value={cell}
              row={rowIndex}
              col={colIndex}
              isInitial={initialBoard[rowIndex][colIndex] !== 0}
              isSelected={selectedCell?.row === rowIndex && selectedCell?.col === colIndex}
              onCellClick={handleCellClick}
              playerColor={getPlayerColor(rowIndex, colIndex)}
              hasError={errors[`${rowIndex}-${colIndex}`]}
            />
          ))
        )}
      </div>
      {renderNumberPad()}
    </div>
  );
};

export default Board;
