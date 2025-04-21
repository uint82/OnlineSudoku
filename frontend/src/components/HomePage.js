import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import axios from 'axios';
import './HomePage.css'

const HomePage = ({ initialMode }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showFindGames, setShowFindGames] = useState(false);
  const [showNameColorForm, setShowNameColorForm] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [playerColor, setPlayerColor] = useState('#e74c3c');
  const [difficulty, setDifficulty] = useState('medium');
  const [availableGames, setAvailableGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedGameId, setSelectedGameId] = useState(null);
  const [joinMode, setJoinMode] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { gameId } = useParams();

  // colors for player selection
  const colorOptions = [
    '#e74c3c', '#3498db', '#2ecc71', '#f39c12', 
    '#9b59b6', '#1abc9c', '#d35400', '#34495e'
  ];

  // handle route-based initialization
  useEffect(() => {
    // reset all view states
    setShowCreateForm(false);
    setShowFindGames(false);
    setShowNameColorForm(false);
    setJoinMode(false);
    
    // set view state based on path
    if (location.pathname === '/create') {
      setShowCreateForm(true);
    } else if (location.pathname === '/create/details') {
      setShowNameColorForm(true);
      setJoinMode(false);
    } else if (location.pathname === '/lobby') {
      setShowFindGames(true);
      fetchAvailableGames();
    } else if (location.pathname.startsWith('/join/')) {
      const gameIdFromUrl = location.pathname.split('/')[2];
      if (gameIdFromUrl) {
        setSelectedGameId(gameIdFromUrl);
        setShowNameColorForm(true);
        setJoinMode(true);
      }
    }
  }, [location.pathname]);

  // initialize based on props if provided
  useEffect(() => {
    if (initialMode === 'create') {
      setShowCreateForm(true);
    } else if (initialMode === 'find') {
      setShowFindGames(true);
      fetchAvailableGames();
    }
  }, [initialMode]);

  const fetchAvailableGames = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:8000/api/games/available/');
      setAvailableGames(response.data);
    } catch (error) {
      console.error('Error fetching available games:', error);
      setErrorMessage('Failed to fetch available games');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGame = async (e) => {
    e.preventDefault();
    
    if (!playerName.trim()) {
      setErrorMessage('Please enter your name');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:8000/api/games/', {
        difficulty: difficulty,
        player_name: playerName,
        player_color: playerColor
      });
      
      // save game info to localStorage
      localStorage.setItem('gameId', response.data.id);
      localStorage.setItem('playerId', response.data.player_id);
      
      // redirect to the game page
      navigate(`/game/${response.data.id}`);
      
    } catch (error) {
      console.error('Error creating game:', error);
      setErrorMessage('Failed to create game');
    } finally {
      setLoading(false);
    }
  };

  const handlePrepareJoinGame = (gameId) => {
    navigate(`/join/${gameId}`);
  };

  const joinGame = async (e) => {
    e.preventDefault();
    
    if (!playerName.trim()) {
      setErrorMessage('Please enter your name');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(`http://localhost:8000/api/games/${selectedGameId}/join/`, {
        player_name: playerName,
        player_color: playerColor
      });
      
      // save game info to localStorage
      localStorage.setItem('gameId', selectedGameId);
      localStorage.setItem('playerId', response.data.player_id);
      
      // redirect to the game page
      navigate('/');
      
    } catch (error) {
      console.error('Error joining game:', error);
      setErrorMessage('Failed to join game');
    } finally {
      setLoading(false);
    }
  };

  const handlePrepareCreateGame = () => {
    navigate('/create');
  };

  const handleSelectDifficulty = (e) => {
    e.preventDefault();
    navigate('/create/details');
  };

  const renderMainOptions = () => (
    <div className="home-options">
      <h2>Welcome to Sudoku Multiplayer</h2>
      <p>Play Sudoku with friends in real-time!</p>
      
      <div className="option-buttons">
        <button 
          className="btn btn-create"
          onClick={handlePrepareCreateGame}
        >
          Create New Game
        </button>
        <button 
          className="btn btn-find"
          onClick={() => navigate('/lobby')}
        >
          Find Game
        </button>
      </div>
    </div>
  );

  const renderCreateGameForm = () => (
    <div className="create-game-form">
      <h3>Create New Sudoku Game</h3>
      <form onSubmit={handleSelectDifficulty}>
        <div className="form-group">
          <label htmlFor="difficulty">Difficulty:</label>
          <select
            id="difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            Continue
          </button>
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={() => navigate('/')}
          >
            Back
          </button>
        </div>
      </form>
    </div>
  );

  const renderFindGames = () => (
    <div className="find-games">
      <h3>Available Games</h3>
      
      {loading ? (
        <div className="loading">Loading available games...</div>
      ) : availableGames.length > 0 ? (
        <div className="games-list">
          {availableGames.map(game => (
            <div key={game.id} className="game-item">
              <div className="game-info">
                <span className="host">Host: {game.host_name}</span>
                <span className="difficulty">Difficulty: {game.difficulty}</span>
                <span className="players">Players: {game.player_count}/10</span>
              </div>
              <button 
                className="btn btn-join"
                onClick={() => handlePrepareJoinGame(game.id)}
                disabled={loading}
              >
                Join
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-games">
          <p>No available games found.</p>
        </div>
      )}
      
      <button 
        className="btn btn-refresh"
        onClick={fetchAvailableGames}
        disabled={loading}
      >
        Refresh
      </button>
      <button 
        className="btn btn-secondary"
        onClick={() => navigate('/')}
      >
        Back
      </button>
    </div>
  );

  const renderNameColorForm = () => (
    <div className="name-color-form">
      <h3>{joinMode ? 'Join Game' : 'Create New Game'}</h3>
      <form onSubmit={joinMode ? joinGame : handleCreateGame}>
        <div className="form-group">
          <label htmlFor="playerName">Your Name:</label>
          <input
            type="text"
            id="playerName"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            required
          />
        </div>
        
        <div className="form-group">
          <label>Choose your color:</label>
          <div className="color-options">
            {colorOptions.map(color => (
              <div
                key={color}
                onClick={() => setPlayerColor(color)}
                className={`color-option ${color === playerColor ? 'selected' : ''}`}
                style={{ backgroundColor: color }}
              ></div>
            ))}
          </div>
        </div>
        
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            {joinMode ? 'Join Game' : 'Create Game'}
          </button>
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={() => {
              if (joinMode) {
                navigate('/lobby');
              } else {
                navigate('/create');
              }
            }}
          >
            Back
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <div className="home-page">
      {errorMessage && (
        <div className="error-message">
          {errorMessage}
        </div>
      )}
      
      {!showCreateForm && !showFindGames && !showNameColorForm && renderMainOptions()}
      {showCreateForm && !showNameColorForm && renderCreateGameForm()}
      {showFindGames && !showNameColorForm && renderFindGames()}
      {showNameColorForm && renderNameColorForm()}
    </div>
  );
};

export default HomePage;
