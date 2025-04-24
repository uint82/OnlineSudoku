import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Link,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import HomePage from "./components/HomePage";
import Game from "./components/Game";
import "./App.css";

// komponen AppContent untuk mengakses useLocation
const AppContent = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [gameData, setGameData] = useState({
    gameId: null,
    playerId: null,
  });
  const [isDarkMode, setIsDarkMode] = useState(
    localStorage.getItem("darkMode") === "true"
  );

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

    // redirect ke URL game jika berada di halaman utama dan memiliki saved game
    if (savedGameId && location.pathname === "/") {
      navigate(`/game/${savedGameId}`, { replace: true });
    }
  }, [location.pathname, navigate]);

  // efek untuk menerapkan tema dark mode
  useEffect(() => {
    document.body.classList.toggle("dark-mode", isDarkMode);
    // simpan preferensi pengguna di localStorage
    localStorage.setItem("darkMode", isDarkMode);
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  const handleLeaveGame = () => {
    // hapus data game dari localStorage
    localStorage.removeItem("gameId");
    localStorage.removeItem("playerId");
    localStorage.removeItem("playerName");
    localStorage.removeItem("playerToken");

    // update state
    setGameData({ gameId: null, playerId: null });

    // navigasi ke homepage
    navigate("/", { replace: true });
  };

  const GameRouteContent = () => {
    if (loading) {
      return <div className="loading">Loading...</div>;
    }

    // jika berada di root URL, selalu tampilkan HomePage
    if (location.pathname === "/") {
      return <HomePage isDarkMode={isDarkMode} />;
    }

    // untuk URL game, tampilkan Game component
    if (gameData.gameId && location.pathname.includes("/game/")) {
      return (
        <Game
          gameIdProp={gameData.gameId}
          playerIdProp={gameData.playerId}
          onLeaveGame={handleLeaveGame}
          isDarkMode={isDarkMode}
          toggleDarkMode={toggleDarkMode}
        />
      );
    }

    return <HomePage isDarkMode={isDarkMode} />;
  };

  // cek apakah kita berada di halaman game
  const isGameRoute =
    location.pathname.startsWith("/game/") ||
    location.pathname.startsWith("/join/");

  return (
    <div className={`App ${isDarkMode ? "dark-mode" : ""}`}>
      {/* Hanya tampilkan header ketika tidak dalam permainan */}
      {!isGameRoute && (
        <header className="App-header">
          <div className="header-content">
            <h1>Sudoku Multiplayer</h1>
            <button
              className="dark-mode-toggle-header"
              onClick={toggleDarkMode}
              title={
                isDarkMode ? "Beralih ke Mode Terang" : "Beralih ke Mode Gelap"
              }
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
          <nav>{/* link navigation */}</nav>
        </header>
      )}

      <main>
        <Routes>
          <Route path="/" element={<GameRouteContent />} />
          <Route
            path="/create"
            element={<HomePage initialMode="create" isDarkMode={isDarkMode} />}
          />
          <Route
            path="/create/details"
            element={<HomePage isDarkMode={isDarkMode} />}
          />
          <Route
            path="/lobby"
            element={<HomePage initialMode="find" isDarkMode={isDarkMode} />}
          />
          <Route
            path="/join/:gameId"
            element={
              <Game isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />
            }
          />
          <Route
            path="/game/:gameId"
            element={
              <Game isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer className={isDarkMode ? "dark-footer" : ""}>
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
