import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Link, Navigate } from 'react-router-dom';
import HomePage from './components/HomePage';
import Game from './components/Game';
import './App.css';

const App = () => {
  const [loading, setLoading] = useState(true);
  const [gameData, setGameData] = useState({
    gameId: null,
    playerId: null
  });

  // check for saved game data when component mounts
  useEffect(() => {
    // move localStorage access to useEffect to avoid doing it during render
    const savedGameId = localStorage.getItem('gameId');
    const savedPlayerId = localStorage.getItem('playerId');
    
    setGameData({
      gameId: savedGameId,
      playerId: savedPlayerId
    });
    setLoading(false);
  }, []);

  
  const handleLeaveGame = () => {
    
    localStorage.removeItem('gameId');
    localStorage.removeItem('playerId');
    
    
    setGameData({ gameId: null, playerId: null });
  };

  
  const GameRouteContent = () => {
    if (loading) {
      return <div className="loading">Loading...</div>;
    }
    
    if (gameData.gameId) {
      return (
        <Game 
          gameIdProp={gameData.gameId} 
          playerIdProp={gameData.playerId} 
          onLeaveGame={handleLeaveGame}
        />
      );
    }
    
    return <HomePage />;
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
            <Route path="/" element={<GameRouteContent />} />
            <Route path="/join/:gameId" element={<Game />} />
            <Route path="*" element={<Navigate to="/" replace />} />
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
