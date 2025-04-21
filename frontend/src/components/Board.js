import React, { useState, useEffect } from 'react';
import Cell from './Cell';
import { isValidSudokuMove } from '../utils/sudokuUtils';
import { Pencil, EyeOff, MessageCircle, Eraser } from 'lucide-react';
import './Board.css';

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
  const [pencilMode, setPencilMode] = useState(false);
  const [pencilNotes, setPencilNotes] = useState({});
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  
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
      const cellKey = `${move.row}-${move.column}`;
      
      // check if the cell is empty in the current board (value = 0)
      const [row, col] = cellKey.split('-').map(Number);
      const isEmpty = currentBoard[row][col] === 0;
      
      if (move.hasOwnProperty('is_correct') && move.is_correct === false) {
        // only mark as error if the cell still has a value
        errorCells[cellKey] = !isEmpty;
      } else if (move.hasOwnProperty('is_correct') && move.is_correct === true) {
        // explicitly mark correct cells to ensure they're not in error state
        errorCells[cellKey] = false;
      }
    });
    
    return errorCells;
  };
  
  const errorCells = getErrorCells();

  // find player color and correctness status from the moves list
  const getCellData = (cellRow, cellCol) => {
    const cellKey = `${cellRow}-${cellCol}`;
    const isError = errorCells[cellKey] === true;
    
    // get the most recent move for this cell
    const move = moves?.filter(m => m.row === cellRow && m.column === cellCol)
                      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))[0];
    
    if (move) {
      const player = players.find(p => p.id === move.player?.id || move.player_id);
      
      // A cell is correct if:
      // 1. The most recent move is marked as correct, OR
      // 2. The cell has a value and is not marked as an error
      const isCurrentlyCorrect = move.is_correct === true || 
                                (currentBoard[cellRow][cellCol] !== 0 && !isError);
      
      return {
        color: player ? player.color : '#666',
        isCorrect: isCurrentlyCorrect,
        playerId: move.player?.id || move.player_id,
        hasError: isError
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
      
      if (pencilMode) {
        // handle pencil mode
        const cellKey = `${row}-${col}`;
        const currentNotes = pencilNotes[cellKey] || [];
        
        // toggle the number in pencil notes
        const newNotes = currentNotes.includes(number)
          ? currentNotes.filter(n => n !== number)
          : [...currentNotes, number].sort();
        
        setPencilNotes({
          ...pencilNotes,
          [cellKey]: newNotes
        });
      } else if (number === 0) {
        // check if there are pencil notes to clear
        const cellKey = `${row}-${col}`;
        const hasPencilNotes = pencilNotes[cellKey] && pencilNotes[cellKey].length > 0;
        
        // Allow erasing if:
        // 1. The cell has pencil notes, OR
        // 2. The cell has an error, OR
        // 3. The cell was placed by the current player
        if (hasPencilNotes || hasError || cellData.playerId === playerId) {
          // Only make a move if there's an actual value to clear
          if (currentBoard[row][col] !== 0) {
            onMakeMove(row, col, 0, null);
          }
          
          // Clear pencil notes regardless
          if (hasPencilNotes) {
            const updatedNotes = { ...pencilNotes };
            delete updatedNotes[cellKey];
            setPencilNotes(updatedNotes);
          }
        }
      } else {
        // check if the move is valid according to Sudoku rules
        const isValid = isValidSudokuMove(currentBoard, row, col, number);
        
        // make the move, include is_correct flag in the move data
        onMakeMove(row, col, number, isValid);
        
        // clear pencil notes for this cell when placing a number
        const cellKey = `${row}-${col}`;
        if (pencilNotes[cellKey]) {
          const updatedNotes = { ...pencilNotes };
          delete updatedNotes[cellKey];
          setPencilNotes(updatedNotes);
        }
      }
      
      // only clear selected cell if not in pencil mode
      if (!pencilMode) {
        setSelectedCell(null);
      }
    }
    
    // toggle highlighting when clicking a number (except for X/0)
    if (!pencilMode && number !== 0) {
      if (highlightedNumber === number) {
        setHighlightedNumber(null);
      } else {
        setHighlightedNumber(number);
        // clear selected cell when highlighting a number
        if (!pencilMode) {
          setSelectedCell(null);
        }
      }
    }
  };

  const handleHint = () => {
    if (selectedCell) {
      const { row, col } = selectedCell;
      // in a real implementation, this would call an API or use a solver
      // to get the correct value for the selected cell
      // for now, we'll show a placeholder message
      alert("Hint functionality would provide the correct value for this cell");
      
      // in a real implementation, i'll do something like:
      // const correctValue = getSolution(row, col);
      // onMakeMove(row, col, correctValue, true);
    } else {
      alert("Please select a cell first to get a hint");
    }
  };

  const togglePencilMode = () => {
    setPencilMode(!pencilMode);
  };

  const toggleChat = () => {
    setShowChat(!showChat);
  };

  const sendMessage = () => {
    if (newMessage.trim()) {
      const message = {
        id: Date.now(),
        text: newMessage,
        sender: playerId,
        timestamp: new Date().toISOString()
      };
      
      setMessages([...messages, message]);
      setNewMessage('');
      
      // chat function is on development
    }
  };

  const renderNumberPad = () => {
    return (
      <div className="number-pad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(number => (
          <button
            key={number}
            onClick={() => handleNumberSelect(number)}
            className={pencilMode ? "pencil-mode" : ""}
          >
            {number}
          </button>
        ))}
      </div>
    );
  };

  const renderControlButtons = () => {
    return (
      <div className="control-buttons">
        {/* Pencil Button */}
        <div className={`control-button ${pencilMode ? 'active' : ''}`}>
          <button
            onClick={togglePencilMode}
            title="Pencil Mode"
          >
            <Pencil size={24} />
          </button>
          <span>Pencil</span>
        </div>
        
        {/* Hint Button */}
        <div className="control-button">
          <button
            onClick={handleHint}
            title="Get Hint"
          >
            <EyeOff size={24} />
          </button>
          <span>Hint</span>
        </div>
        
        {/* Chat Button */}
        <div className={`control-button ${showChat ? 'active' : ''}`}>
          <button
            onClick={toggleChat}
            title="Chat"
          >
            <MessageCircle size={24} />
          </button>
          <span>Chat</span>
        </div>
        
        {/* Eraser Button */}
        <div className="control-button eraser-button">
          <button
            onClick={() => handleNumberSelect(0)}
            title="Erase"
          >
            <Eraser size={24} />
          </button>
          <span>Eraser</span>
        </div>
      </div>
    );
  };

  const renderChat = () => {
    if (!showChat) return null;
    
    return (
      <div className="chat-container">
        <div className="chat-header">
          Game Chat
        </div>
        
        <div className="chat-messages">
          {messages.map(msg => {
            const sender = players.find(p => p.id === msg.sender);
            return (
              <div key={msg.id} className="chat-message">
                <div className="message-header">
                  <div 
                    className="player-indicator"
                    style={{ backgroundColor: sender?.color || '#666' }}
                  ></div>
                  <span className="message-sender">
                    {sender?.name || 'Player'} • {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="message-content">{msg.text}</div>
              </div>
            );
          })}
          {messages.length === 0 && (
            <div className="empty-messages">
              No messages yet
            </div>
          )}
        </div>
        
        <div className="chat-input">
          <input 
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                sendMessage();
              }
            }}
          />
          <button onClick={sendMessage}>
            Send
          </button>
        </div>
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
            const cellKey = `${rowIndex}-${colIndex}`;
            const cellNotes = pencilNotes[cellKey] || [];
            
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
                pencilNotes={cellNotes}
              />
            );
          })
        )}
      </div>
      
      {renderControlButtons()}
      {renderNumberPad()}
      {renderChat()}
      
      <div className="instructions">
        <p>Click on a number to highlight all matching numbers on the board</p>
        <p>Use the pencil tool to add notes to cells</p>
        <p>Correct answers will be locked and displayed in green</p>
        <p>Any player can fix incorrect answers (shown in red)</p>
      </div>
    </div>
  );
};

export default Board;
