import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Link, Navigate } from 'react-router-dom';
import axios from 'axios';
import Board from './components/Board';
import Invite from './components/Invite';
import GameControls from './components/GameControls';
import SharedGame from './components/SharedGame';
import { setupWebSocketWithHeartbeat } from './utils/websocketUtils';
import './App.css';

const App = () => {
  const [game, setGame] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [showForm, setShowForm] = useState(true);
  const [socket, setSocket] = useState(null);
  const [socketCleanup, setSocketCleanup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socketState, setSocketState] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);


  // check for saved game data when component mounts
  useEffect(() => {
    const savedGameId = localStorage.getItem('gameId');
    const savedPlayerId = localStorage.getItem('playerId');
    
    if (savedGameId && savedPlayerId) {
      fetchSavedGame(savedGameId, savedPlayerId);
    } else {
      setLoading(false);
    }
    
    // clean up socket on unmount
    return () => {
      if (socketCleanup) {
        socketCleanup();
      }
    };
  }, []);

  // fetch saved game from API
  const fetchSavedGame = async (gameId, playerId) => {
    try {
      const response = await axios.get(`http://localhost:8000/api/games/${gameId}/`);
      setGame(response.data);
      setPlayerId(playerId);
      setShowForm(false);
      connectWebSocket(gameId, playerId);
    } catch (error) {
      console.error('Error fetching saved game:', error);
      // clear saved game data if it's invalid
      localStorage.removeItem('gameId');
      localStorage.removeItem('playerId');
    } finally {
      setLoading(false);
    }
  };

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
      
      // save game info to localStorage
      localStorage.setItem('gameId', response.data.id);
      localStorage.setItem('playerId', response.data.player_id);
      
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
    // clean up existing socket if any
    if (socketCleanup) {
      socketCleanup();
    }
    
    // change to secure webSocket in production
    const websocketUrl = `ws://localhost:8000/ws/game/${gameId}/`;
    
    const onOpen = () => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        // announce join when connecting
        socket.send(JSON.stringify({
          type: 'join',
          player_id: playerId
        }));
      }
    };
    
    const onMessage = (e) => {
      const data = JSON.parse(e.data);
      
      // skip heartbeat messages as they're handled in the utility
      if (data.type === 'heartbeat') return;
      
      if (data.type === 'move') {
        // update board with new move
        handleRemoteMove(data.move);
      } else if (data.type === 'join') {
        // handle new player joining
        handlePlayerJoin(data.player);
      }
    };
    
    const onError = (e) => {
      console.error('WebSocket error:', e);
    };
    
    const onClose = (e) => {
      console.log('WebSocket disconnected', e.reason);
      // auto-reconnect after a delay
      if (game && playerId) {
        setTimeout(() => {
          connectWebSocket(gameId, playerId);
        }, 3000);
      }
    };
    
    const { socket: ws, cleanup, isReady, getConnectionState } = setupWebSocketWithHeartbeat(
      websocketUrl,
      onOpen,
      onMessage,
      onError,
      onClose
    );
    
    setSocket(ws);
    setSocketCleanup(() => cleanup);
    setSocketState({ isReady, getConnectionState });
  };

  const handleRemoteMove = (move) => {
    // update game state with the new move
    setGame(prevGame => {
      if (!prevGame) return null;
      
      const newBoard = [...prevGame.current_board];
      newBoard[move.row][move.column] = move.value;
      
      const newMoves = [...(prevGame.moves || []), move];
      
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
      if (!prevGame) return null;
      
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
    const isReady = socketState && socketState.isReady();

    if (!isReady) {
      console.log("WebSocket not ready, can't send move");
      setErrorMessage("Connection not ready. Please wait a moment...");
      
      // auto-hide the error after 3 seconds
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }
    
    // clear any previous error
    setErrorMessage(null);
    
    // send move through websocket
    socket.send(JSON.stringify({
      type: 'move',
      player_id: playerId,
      row: row,
      column: col,
      value: value
    }));
  };

  const handleLeaveGame = () => {
    // clean up when leaving the game
    if (socketCleanup) {
      socketCleanup();
    }
    localStorage.removeItem('gameId');
    localStorage.removeItem('playerId');
    setGame(null);
    setPlayerId(null);
    setShowForm(true);
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
    if (loading) {
      return <div>Loading your game...</div>;
    }
    
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
        
        <div style={{ marginTop: '20px' }}>
          <button 
            onClick={handleLeaveGame} 
            style={{
              backgroundColor: '#e74c3c',
              color: 'white',
              padding: '8px 15px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Leave Game
          </button>
        </div>
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
