import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Board from './Board';
import Invite from './Invite';
import GameControls from './GameControls';
import { setupWebSocketWithHeartbeat } from '../utils/websocketUtils';

const Game = ({ gameIdProp, playerIdProp, onLeaveGame }) => {
  const params = useParams();
  const navigate = useNavigate();
  
  // use URL parameter if provided, otherwise use prop
  const gameId = params.gameId || gameIdProp;
  
  const [game, setGame] = useState(null);
  const [playerId, setPlayerId] = useState(playerIdProp || null);
  const [socket, setSocket] = useState(null);
  const [socketCleanup, setSocketCleanup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [socketState, setSocketState] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  
  // join form
  const [playerName, setPlayerName] = useState('');
  const [playerColor, setPlayerColor] = useState('#e74c3c');

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
        // if user is already part of this game
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
    
    // clean up socket on unmount
    return () => {
      if (socketCleanup) {
        socketCleanup();
      }
    };
  }, [gameId, navigate]);

  useEffect(() => {
    if (playerId && game) {
      // connect to websocket
      connectWebSocket();
      
      // set up a polling interval for player list updates
      // this serves as a backup in case WebSocket messages are missed
      const playerListInterval = setInterval(() => {
        if (socketState && socketState.isReady()) {
          socketState.sendMessage(JSON.stringify({
            type: 'request_player_list'
          }));
        }
      }, 5000); // check every 5 seconds
      
      return () => {
        clearInterval(playerListInterval);
      };
    }
  }, [playerId, game]);

  useEffect(() => {
    // if connection status changes to disconnected, attempt to reconnect
    if (connectionStatus === 'disconnected' && socketState && socketState.reconnect) {
      const reconnectTimer = setTimeout(() => {
        console.log('Attempting to reconnect...');
        socketState.reconnect();
      }, 2000); // reconnect after 2 seconds
      
      return () => clearTimeout(reconnectTimer);
    }
  }, [connectionStatus, socketState]);

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
      setErrorMessage('Please enter your name');
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
      setErrorMessage('Failed to join the game');
    }
  };

  const connectWebSocket = () => {
    // clean up existing socket if any
    if (socketCleanup) {
      socketCleanup();
    }
    
    // change to secure websocket in production
    const websocketUrl = `ws://localhost:8000/ws/game/${gameId}/`;
    
    const onOpen = () => {
      setConnectionStatus('connected');
      setTimeout(() => {
        if (socket && socket.readyState === WebSocket.OPEN) {
          console.log('Announcing player join:', playerId);
          socket.send(JSON.stringify({
            type: 'join',
            player_id: playerId
          }));
          
          // request a fresh player list
          socket.send(JSON.stringify({
            type: 'request_player_list'
          }));
        }
      }, 500);
    };

    const onMessage = (e) => {
      const data = JSON.parse(e.data);
      
      // skip heartbeat messages as they're handled in the utility
      if (data.type === 'heartbeat') return;

      console.log('WebSocket message received:', data); // For debugging
      
      if (data.type === 'move') {
        // update board with new move
        handleRemoteMove(data.move);
      } else if (data.type === 'join') {
        // Handle new player joining
        handlePlayerJoin(data.player);
        
        // when we receive a join message, also request a fresh player list
        // ensures that our player list stays in sync
        if (socketState && socketState.isReady()) {
          socketState.sendMessage(JSON.stringify({
            type: 'request_player_list'
          }));
        }
      } else if (data.type === 'player_list_update') {
        // handle complete player list update
        updatePlayerList(data.players);
      } else if (data.type === 'error') {
        // Display error messages from the server
        setErrorMessage(data.message);
        setTimeout(() => setErrorMessage(null), 3000);
      }
    };

    const onError = (e) => {
      console.error('WebSocket error:', e);
      setConnectionStatus('error');
    };
    
    const onClose = (e) => {
      console.log('WebSocket disconnected', e.reason);
      setConnectionStatus('disconnected');
    };

    // set up the websocket with heartbeat
    const { socket: ws, cleanup, isReady, getConnectionState, sendMessage, reconnect } = setupWebSocketWithHeartbeat(
      websocketUrl,
      onOpen,
      onMessage,
      onError,
      onClose
    );

    // set all these values separately
    setSocket(ws);
    setSocketCleanup(() => cleanup);
    
    // store all utility functions in socketState
    setSocketState({
      isReady,
      getConnectionState,
      sendMessage,
      reconnect
    });
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

    // log player join for debugging
    console.log(`Player joined: ${player.name}`);
  };

  const updatePlayerList = (players) => {
    console.log('Updating player list with:', players);
    
    // use a more reliable state update approach
    setGame(prevGame => {
      if (!prevGame) return null;
      
      // deep comparison to check if player list has changed
      const currentPlayers = JSON.stringify(prevGame.players.map(p => p.id).sort());
      const newPlayers = JSON.stringify(players.map(p => p.id).sort());
      
      if (currentPlayers !== newPlayers) {
        console.log('Player list changed, updating state');
        return {
          ...prevGame,
          players: players
        };
      }
      
      return prevGame;
    });
  };

  const handleMakeMove = (row, col, value, isCorrect = null) => {
    // create the move message with is_correct flag
    // we pass null for is_correct and let the server handle validation
    const moveMessage = JSON.stringify({
      type: 'move',
      player_id: playerId,
      row: row,
      column: col,
      value: value,
      is_correct: isCorrect  // This will be null initially and validated by server
    });
    
    // use enhanced sendMessage function that handles queuing
    const messageSent = socketState && socketState.sendMessage(moveMessage);
    
    // if connection is down but message was queued, show a less intrusive notification
    if (!messageSent) {
      // only show the message if there isn't already one displayed
      if (!errorMessage) {
        setErrorMessage("Move queued - reconnecting...");
        
        // auto-hide the error after 1.5 seconds
        setTimeout(() => setErrorMessage(null), 1500);
      }
      return;
    }
    
    // clear any previous error if message was sent successfully
    if (errorMessage) {
      setErrorMessage(null);
    }
  };

  const handleLeaveGame = () => {
    // clean up when leaving the game
    if (socketCleanup) {
      socketCleanup();
    }
    localStorage.removeItem('gameId');
    localStorage.removeItem('playerId');
    
    // use provided callback if available, otherwise navigate home
    if (onLeaveGame) {
      onLeaveGame();
    } else {
      navigate('/');
    }
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
  const currentPlayer = game.players.find(p => p.id === playerId) || {};

  return (
    <div style={{ textAlign: 'center' }}>
      <h2>Multiplayer Sudoku</h2>
      
      {/* Connection status indicator */}
      <div 
        style={{ 
          display: 'inline-block',
          margin: '10px 0',
          padding: '5px 10px',
          borderRadius: '5px',
          backgroundColor: connectionStatus === 'connected' ? '#2ecc71' : connectionStatus === 'disconnected' ? '#e74c3c' : '#f39c12',
          color: 'white',
          fontSize: '14px'
        }}
      >
        {connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'disconnected' ? 'Reconnecting...' : 'Connection Error'}
      </div>
      
      <GameControls 
        difficulty={game.difficulty} 
        playerName={currentPlayer.name || 'Player'} 
        isHost={currentPlayer.is_host || false}
      />
      
      {/* Players list */}
      <div style={{ margin: '20px 0' }}>
        <h3>Players:</h3>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
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
      
      {/* Error message display */}
      {errorMessage && (
        <div style={{ 
          margin: '10px 0', 
          padding: '10px', 
          backgroundColor: '#f8d7da',
          color: '#721c24',
          borderRadius: '4px'
        }}>
          {errorMessage}
        </div>
      )}

      <Board
        initialBoard={game.initial_board}
        currentBoard={game.current_board}
        onMakeMove={handleMakeMove}
        players={game.players}
        playerId={playerId}
        moves={game.moves || []}
      />
      
      {/* Always show the invite link */}
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

export default Game;
