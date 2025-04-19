import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './HomePage.css'

const HomePage = () => {
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

  // colors for player selection
  const colorOptions = [
    '#e74c3c', '#3498db', '#2ecc71', '#f39c12', 
    '#9b59b6', '#1abc9c', '#d35400', '#34495e'
  ];

  // fetch available games when "Find Game" is clicked
  useEffect(() => {
    if (showFindGames) {
      fetchAvailableGames();
    }
  }, [showFindGames]);

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
      window.location.href = '/';
      
    } catch (error) {
      console.error('Error creating game:', error);
      setErrorMessage('Failed to create game');
    } finally {
      setLoading(false);
    }
  };

  const handlePrepareJoinGame = (gameId) => {
    setSelectedGameId(gameId);
    setJoinMode(true);
    setShowNameColorForm(true);
    setShowFindGames(false);
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
      window.location.href = '/';
      
    } catch (error) {
      console.error('Error joining game:', error);
      setErrorMessage('Failed to join game');
    } finally {
      setLoading(false);
    }
  };

  const handlePrepareCreateGame = () => {
    setShowCreateForm(true);
    setShowFindGames(false);
    setErrorMessage('');
  };

  const handleSelectDifficulty = (e) => {
    e.preventDefault();
    setJoinMode(false);
    setShowCreateForm(false);
    setShowNameColorForm(true);
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
          onClick={() => {
            setShowFindGames(true);
            setShowCreateForm(false);
            setErrorMessage('');
          }}
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
            onClick={() => setShowCreateForm(false)}
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
        onClick={() => setShowFindGames(false)}
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
              setShowNameColorForm(false);
              if (joinMode) {
                setShowFindGames(true);
              } else {
                setShowCreateForm(true);
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
