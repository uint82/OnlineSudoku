import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Board from './Board';
import GameControls from './GameControls';

const SharedGame = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [playerColor, setPlayerColor] = useState('#e74c3c');
  const [playerId, setPlayerId] = useState(null);
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // colors for player selection
  const colorOptions = [
    '#e74c3c', '#3498db', '#2ecc71', '#f39c12', 
    '#9b59b6', '#1abc9c', '#d35400', '#34495e'
  ];

  useEffect(() => {
    // check if user is already part of this game or a different game
    const savedGameId = localStorage.getItem('gameId');
    const savedPlayerId = localStorage.getItem('playerId');
    
    if (savedGameId && savedPlayerId) {
      if (savedGameId === gameId) {
        // user is already part of this game
        setPlayerId(savedPlayerId);
      } else {
        // user is part of another game - confirm before switching
        const confirmSwitch = window.confirm(
          "You're already in another game. Do you want to leave that game and join this one?"
        );
        
        if (confirmSwitch) {
          // clear existing game data
          localStorage.removeItem('gameId');
          localStorage.removeItem('playerId');
        } else {
          // redirect back to their current game
          navigate('/');
          return;
        }
      }
    }
    
    if (gameId) {
      fetchGameDetails();
    }
  }, [gameId, navigate]);

  useEffect(() => {
    if (playerId && game) {
      // connect to websocket
      connectWebSocket();
    }

    return () => {
      // clean up websocket connection when component unmounts
      if (socket) {
        socket.close();
      }
    };
  }, [playerId, game]);

  const fetchGameDetails = async () => {
    try {
      const response = await axios.get(`http://localhost:8000/api/games/${gameId}/`);
      setGame(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching game:', error);
      setError('Game not found or has expired');
      setLoading(false);
    }
  };

  const handleJoinGame = async (e) => {
    e.preventDefault();
    
    if (!playerName.trim()) {
      alert('Please enter your name');
      return;
    }
    
    try {
      const response = await axios.post(`http://localhost:8000/api/games/${gameId}/join/`, {
        player_name: playerName,
        player_color: playerColor
      });
      
      // save game data to localStorage
      localStorage.setItem('gameId', gameId);
      localStorage.setItem('playerId', response.data.player_id);
      
      // set player ID from response
      setPlayerId(response.data.player_id);
      
      // update game data
      setGame(response.data);
      
    } catch (error) {
      console.error('Error joining game:', error);
      setError('Failed to join the game');
    }
  };

  const connectWebSocket = () => {
    // close existing socket if any
    if (socket) {
      socket.close();
    }
    
    // change to secure websocket in production
    const ws = new WebSocket(`ws://localhost:8000/ws/game/${gameId}/`);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      
      // announce player join
      ws.send(JSON.stringify({
        type: 'join',
        player_id: playerId
      }));
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
    
    ws.onclose = (e) => {
      console.log('WebSocket disconnected', e.reason);
      // try to reconnect after a delay if we still have game data
      if (game && playerId) {
        setTimeout(() => {
          connectWebSocket();
        }, 3000);
      }
    };
    
    setSocket(ws);
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
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.log("WebSocket not ready, can't send move");
      // optionally show an error to the user
      alert("Connection not ready. Please try again in a moment.");
      return;
    }
    
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
    if (socket) {
      socket.close();
    }
    localStorage.removeItem('gameId');
    localStorage.removeItem('playerId');
    navigate('/');
  };

  if (loading) {
    return <div className="loading">Loading game...</div>;
  }

  if (error) {
    return (
      <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px', textAlign: 'center' }}>
        <div className="error">{error}</div>
        <button
          onClick={() => navigate('/')}
          style={{
            backgroundColor: '#3498db',
            color: 'white',
            padding: '10px 15px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '20px'
          }}
        >
          Go Home
        </button>
      </div>
    );
  }

  // if user hasn't joined yet, show join form
  if (!playerId) {
    return (
      <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px' }}>
        <h2>Join Sudoku Game</h2>
        <form onSubmit={handleJoinGame}>
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
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Choose your color:
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {colorOptions.map(color => (
                <div
                  key={color}
                  onClick={() => setPlayerColor(color)}
                  style={{
                    width: '30px',
                    height: '30px',
                    backgroundColor: color,
                    borderRadius: '50%',
                    cursor: 'pointer',
                    border: color === playerColor ? '2px solid black' : 'none'
                  }}
                ></div>
              ))}
            </div>
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
            Join Game
          </button>
        </form>
      </div>
    );
  }

  // find current player in players list
  const currentPlayer = game.players.find(p => p.id === playerId);

  return (
    <div style={{ textAlign: 'center' }}>
      <h2>Multiplayer Sudoku</h2>
      
      <GameControls 
        difficulty={game.difficulty} 
        playerName={currentPlayer?.name || 'Player'} 
        isHost={currentPlayer?.is_host || false}
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
                backgroundColor: player.color, 
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

export default SharedGame;
