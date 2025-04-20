import React, { useState, useEffect } from 'react';
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
  const [highlightedNumber, setHighlightedNumber] = useState(null);
  
  // process the moves data to determine which cells contain errors
  const getErrorCells = () => {
    const errorCells = {};
    const latestMoves = {};
    
    // find the most recent move for each cell
    moves?.forEach(move => {
      const cellKey = `${move.row}-${move.column}`;
      if (!latestMoves[cellKey] || (move.timestamp || 0) > (latestMoves[cellKey].timestamp || 0)) {
        latestMoves[cellKey] = move;
      }
    });
    
    // mark cells as errors only if their latest move is incorrect
    Object.values(latestMoves).forEach(move => {
      if (move.hasOwnProperty('is_correct') && move.is_correct === false) {
        const cellKey = `${move.row}-${move.column}`;
        errorCells[cellKey] = true;
      }
    });
    
    // check for cleared cells (value = 0)
    Object.keys(errorCells).forEach(key => {
      const [row, col] = key.split('-').map(Number);
      if (currentBoard[row][col] === 0) {
        delete errorCells[key];
      }
    });
    
    return errorCells;
  };
  
  const errorCells = getErrorCells();

  // find player color and correctness status from the moves list
  const getCellData = (cellRow, cellCol) => {
    const cellKey = `${cellRow}-${cellCol}`;
    const hasError = errorCells[cellKey];
    
    // get the most recent move for this cell
    const move = moves?.filter(m => m.row === cellRow && m.column === cellCol)
                      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))[0];
    
    if (move) {
      const player = players.find(p => p.id === move.player?.id || move.player_id);
      
      // important: Check if the current value matches the solution (is now correct)
      // this allows us to display fixed errors as correct
      const isCurrentlyCorrect = move.is_correct === true;
      
      return {
        color: player ? player.color : '#666',
        isCorrect: isCurrentlyCorrect,
        playerId: move.player?.id || move.player_id,
        hasError: hasError
      };
    }
    return { color: '#666', isCorrect: null, playerId: null, hasError: false };
  };

  const handleCellClick = (row, col, isLocked) => {
    // if the cell is locked (initial or correct), only handle highlighting
    if (isLocked) {
      if (highlightedNumber === currentBoard[row][col]) {
        // if already highlighted, turn off highlighting
        setHighlightedNumber(null);
      } else {
        // otherwise, highlight this number
        setHighlightedNumber(currentBoard[row][col]);
      }
      
      // clear selected cell when clicking on a locked cell
      setSelectedCell(null);
    } else {
      // for empty cells, reset the highlighting
      if (currentBoard[row][col] === 0) {
        setHighlightedNumber(null);
        setSelectedCell({ row, col });
      } else {
        // for non-empty cells, handle highlighting
        if (highlightedNumber === currentBoard[row][col]) {
          setHighlightedNumber(null);
        } else {
          setHighlightedNumber(currentBoard[row][col]);
        }
        
        // allow selecting the cell regardless of who placed it
        setSelectedCell({ row, col });
      }
    }
  };

  const handleNumberSelect = (number) => {
    if (selectedCell) {
      const { row, col } = selectedCell;
      
      // get the current cell data to check if it has an error
      const cellData = getCellData(row, col);
      const hasError = cellData.hasError;
      
      // allow editing if:
      // 1. cell is empty, OR
      // 2. cell has an error (any player can fix errors), or
      // 3. cell was placed by current player
      const canEdit = currentBoard[row][col] === 0 || 
                      hasError || 
                      cellData.playerId === playerId;
      
      if (!canEdit) {
        setSelectedCell(null);
        return;
      }
      
      if (number === 0) {
        // handle the delete/clear action (X button)
        // allow any player to delete incorrect values
        if (hasError || cellData.playerId === playerId) {
          onMakeMove(row, col, 0, null);
        }
      } else {
        // check if the move is valid according to Sudoku rules
        const isValid = isValidSudokuMove(currentBoard, row, col, number);
        
        // make the move, include is_correct flag in the move data
        onMakeMove(row, col, number, isValid);
      }
      
      setSelectedCell(null);
    }
    
    // toggle highlighting when clicking a number (except for X/0)
    if (number !== 0) {
      if (highlightedNumber === number) {
        setHighlightedNumber(null);
      } else {
        setHighlightedNumber(number);
        // clear selected cell when highlighting a number
        setSelectedCell(null);
      }
    }
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
              backgroundColor: number === 0 ? '#f8d7da' : undefined,
              color: number === 0 ? '#721c24' : undefined,
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
          row.map((cell, colIndex) => {
            const { color, isCorrect, playerId: cellPlayerId, hasError } = getCellData(rowIndex, colIndex);
            const isOwner = cellPlayerId === playerId;
            
            return (
              <Cell
                key={`${rowIndex}-${colIndex}`}
                value={cell}
                row={rowIndex}
                col={colIndex}
                isInitial={initialBoard[rowIndex][colIndex] !== 0}
                isSelected={selectedCell?.row === rowIndex && selectedCell?.col === colIndex}
                isHighlighted={cell !== 0 && cell === highlightedNumber}
                onCellClick={handleCellClick}
                playerColor={hasError ? 'red' : color}
                hasError={hasError}
                isCorrect={isCorrect === true}
                isOwner={isOwner}
              />
            );
          })
        )}
      </div>
      {renderNumberPad()}
      <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
        <p>Click on a number to highlight all matching numbers on the board</p>
        <p>Correct answers will be locked and displayed in green</p>
        <p>Any player can fix incorrect answers (shown in red)</p>
      </div>
    </div>
  );
};

export default Board;
