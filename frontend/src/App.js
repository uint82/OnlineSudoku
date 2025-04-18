import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Link, Navigate } from 'react-router-dom';
import axios from 'axios';
import Board from './components/Board';
import Invite from './components/Invite';
import GameControls from './components/GameControls';
import SharedGame from './components/SharedGame';
import './App.css';

const App = () => {
  const [game, setGame] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [showForm, setShowForm] = useState(true);
  const [socket, setSocket] = useState(null);

  const handleCreateGame = async (e) => {
    e.preventDefault();
    
    if (!playerName.trim()) {
      alert('Please enter your name');
      return;
    }
    
    try {
      const response = await axios.post('http://localhost:8000/api/games/', {
        difficulty: difficulty,
        player_name: playerName,
      });
      
      setGame(response.data);
      setPlayerId(response.data.player_id);
      setShowForm(false);
      
      // connect to WebSocket
      connectWebSocket(response.data.id, response.data.player_id);
      
    } catch (error) {
      console.error('Error creating game:', error);
      alert('Failed to create game');
    }
  };

  const connectWebSocket = (gameId, playerId) => {
    // change to secure webSocket in production
    const ws = new WebSocket(`ws://localhost:8000/ws/game/${gameId}/`);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
    };
    
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      
      if (data.type === 'move') {
        // update board with new move
        handleRemoteMove(data.move);
      } else if (data.type === 'join') {
        // handle new player joining
        handlePlayerJoin(data.player);
      }
    };
    
    ws.onerror = (e) => {
      console.error('WebSocket error:', e);
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };
    
    setSocket(ws);
  };

  const handleRemoteMove = (move) => {
    // update game state with the new move
    setGame(prevGame => {
      const newBoard = [...prevGame.current_board];
      newBoard[move.row][move.column] = move.value;
      
      const newMoves = [...prevGame.moves, move];
      
      return {
        ...prevGame,
        current_board: newBoard,
        moves: newMoves
      };
    });
  };

  const handlePlayerJoin = (player) => {
    // add new player to the game state
    setGame(prevGame => {
      const playerExists = prevGame.players.some(p => p.id === player.id);
      
      if (playerExists) {
        return prevGame;
      }
      
      return {
        ...prevGame,
        players: [...prevGame.players, player]
      };
    });
  };

  const handleMakeMove = (row, col, value) => {
    if (!socket || !playerId) return;
    
    // send move through websocket
    socket.send(JSON.stringify({
      type: 'move',
      player_id: playerId,
      row: row,
      column: col,
      value: value
    }));
  };

  // create Game Form
  const renderCreateGameForm = () => (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px' }}>
      <h2>Create New Sudoku Game</h2>
      <form onSubmit={handleCreateGame}>
        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="playerName" style={{ display: 'block', marginBottom: '5px' }}>
            Your Name:
          </label>
          <input
            type="text"
            id="playerName"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            style={{ width: '100%', padding: '8px' }}
            required
          />
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="difficulty" style={{ display: 'block', marginBottom: '5px' }}>
            Difficulty:
          </label>
          <select
            id="difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            style={{ width: '100%', padding: '8px' }}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        
        <button 
          type="submit" 
          style={{
            backgroundColor: '#4CAF50',
            color: 'white',
            padding: '10px 15px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Create Game
        </button>
      </form>
    </div>
  );

  // home component - create Game or render board
  const Home = () => {
    if (showForm) {
      return renderCreateGameForm();
    }
    
    if (!game) {
      return <div>Loading...</div>;
    }
    
    // get the current player
    const currentPlayer = game.players.find(p => p.id === playerId) || {};
    
    return (
      <div style={{ textAlign: 'center' }}>
        <h2>Multiplayer Sudoku</h2>
        
        <GameControls 
          difficulty={game.difficulty} 
          playerName={currentPlayer.name || 'Player'} 
          isHost={currentPlayer.is_host || false}
        />
        
        {/* Players list */}
        <div style={{ margin: '20px 0' }}>
          <h3>Players:</h3>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
            {game.players.map(player => (
              <div 
                key={player.id} 
                style={{ 
                  padding: '5px 10px', 
                  backgroundColor: player.color || '#3498db', 
                  color: '#fff',
                  borderRadius: '5px',
                  fontWeight: player.id === playerId ? 'bold' : 'normal'
                }}
              >
                {player.name} {player.is_host ? '(Host)' : ''}
              </div>
            ))}
          </div>
        </div>
        
        <Board
          initialBoard={game.initial_board}
          currentBoard={game.current_board}
          onMakeMove={handleMakeMove}
          players={game.players}
          playerId={playerId}
          moves={game.moves || []}
        />
        
        <Invite gameId={game.id} />
      </div>
    );
  };

  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>Sudoku Multiplayer</h1>
          <nav>
            <Link to="/">Home</Link>
          </nav>
        </header>
        
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/join/:gameId" element={<SharedGame />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
        
        <footer>
          <p>&copy; {new Date().getFullYear()} Sudoku Multiplayer</p>
        </footer>
      </div>
    </Router>
  );
};

export default App;
