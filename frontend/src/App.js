import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Link,
  Navigate,
  useLocation,
} from "react-router-dom";
import HomePage from "./components/HomePage";
import Game from "./components/Game";
import "./App.css";

// komponen AppContent untuk mengakses useLocation
const AppContent = () => {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [gameData, setGameData] = useState({
    gameId: null,
    playerId: null,
  });

  // check for saved game data when component mounts
  useEffect(() => {
    // move localStorage access to useEffect to avoid doing it during render
    const savedGameId = localStorage.getItem("gameId");
    const savedPlayerId = localStorage.getItem("playerId");

    setGameData({
      gameId: savedGameId,
      playerId: savedPlayerId,
    });
    setLoading(false);
  }, []);

  const handleLeaveGame = () => {
    localStorage.removeItem("gameId");
    localStorage.removeItem("playerId");

    setGameData({ gameId: null, playerId: null });

    // tambahkan navigasi ke halaman home
    window.location.href = "/";
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

  // cek apakah kita berada di halaman game
  const isGameRoute =
    gameData.gameId ||
    location.pathname.startsWith("/game/") ||
    location.pathname.startsWith("/join/");

  return (
    <div className="App">
      {/* Hanya tampilkan header ketika tidak dalam permainan */}
      {!isGameRoute && (
        <header className="App-header">
          <h1>Sudoku Multiplayer</h1>
          <nav>{/* link navigation */}</nav>
        </header>
      )}

      <main>
        <Routes>
          <Route path="/" element={<GameRouteContent />} />
          <Route path="/create" element={<HomePage initialMode="create" />} />
          <Route path="/create/details" element={<HomePage />} />
          <Route path="/lobby" element={<HomePage initialMode="find" />} />
          <Route path="/join/:gameId" element={<Game />} />
          <Route path="/game/:gameId" element={<Game />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer>
        <p>&copy; {new Date().getFullYear()} Sudoku Multiplayer</p>
      </footer>
    </div>
  );
};

// komponen App yang membungkus AppContent dengan Router
const App = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;
