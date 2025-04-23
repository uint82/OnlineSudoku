import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation, useParams } from "react-router-dom";
import axios from "axios";
import "./HomePage.css";

const HomePage = ({ initialMode }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showFindGames, setShowFindGames] = useState(false);
  const [showNameColorForm, setShowNameColorForm] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [playerColor, setPlayerColor] = useState("#e74c3c");
  const [difficulty, setDifficulty] = useState("medium");
  const [availableGames, setAvailableGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedGameId, setSelectedGameId] = useState(null);
  const [joinMode, setJoinMode] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { gameId } = useParams();

  // colors for player selection
  const colorOptions = [
    "#e74c3c",
    "#3498db",
    "#2ecc71",
    "#f39c12",
    "#9b59b6",
    "#1abc9c",
    "#d35400",
    "#34495e",
  ];

  // handle route-based initialization
  useEffect(() => {
    // reset all view states
    setShowCreateForm(false);
    setShowFindGames(false);
    setShowNameColorForm(false);
    setJoinMode(false);

    // set view state based on path
    if (location.pathname === "/create") {
      setShowCreateForm(true);
    } else if (location.pathname === "/create/details") {
      setShowNameColorForm(true);
      setJoinMode(false);
    } else if (location.pathname === "/lobby") {
      setShowFindGames(true);
      fetchAvailableGames();
    } else if (location.pathname.startsWith("/join/")) {
      const gameIdFromUrl = location.pathname.split("/")[2];
      if (gameIdFromUrl) {
        setSelectedGameId(gameIdFromUrl);
        setShowNameColorForm(true);
        setJoinMode(true);
      }
    }
  }, [location.pathname]);

  // initialize based on props if provided
  useEffect(() => {
    if (initialMode === "create") {
      setShowCreateForm(true);
    } else if (initialMode === "find") {
      setShowFindGames(true);
      fetchAvailableGames();
    }
  }, [initialMode]);

  const fetchAvailableGames = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        "http://localhost:8000/api/games/available/"
      );
      // filter hanya game yang belum selesai (is_complete = false)
      const activeGames = response.data.filter((game) => !game.is_complete);
      setAvailableGames(activeGames);
    } catch (error) {
      console.error("Error fetching available games:", error);
      setErrorMessage("Failed to fetch available games");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGame = async (e) => {
    e.preventDefault();

    if (!playerName.trim()) {
      setErrorMessage("Please enter your name");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post("http://localhost:8000/api/games/", {
        difficulty: difficulty,
        player_name: playerName,
        player_color: playerColor,
      });

      // save game info to localStorage
      localStorage.setItem("gameId", response.data.id);
      localStorage.setItem("playerId", response.data.player_id);

      // redirect to the game page
      navigate(`/game/${response.data.id}`);
    } catch (error) {
      console.error("Error creating game:", error);
      setErrorMessage("Failed to create game");
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
      setErrorMessage("Please enter your name");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `http://localhost:8000/api/games/${selectedGameId}/join/`,
        {
          player_name: playerName,
          player_color: playerColor,
        }
      );

      // save game info to localStorage
      localStorage.setItem("gameId", selectedGameId);
      localStorage.setItem("playerId", response.data.player_id);

      // redirect to the game page
      navigate("/");
    } catch (error) {
      console.error("Error joining game:", error);
      setErrorMessage("Failed to join game");
    } finally {
      setLoading(false);
    }
  };

  const handlePrepareCreateGame = () => {
    navigate("/create");
  };

  const handleSelectDifficulty = (e) => {
    e.preventDefault();
    navigate("/create/details");
  };

  const renderMainOptions = () => (
    <div className="home-options">
      <h2>Welcome to Sudoku Multiplayer</h2>
      <p>Play Sudoku with friends in real-time!</p>

      <div className="option-buttons">
        <button className="btn btn-create" onClick={handlePrepareCreateGame}>
          Create New Game
        </button>
        <button className="btn btn-find" onClick={() => navigate("/lobby")}>
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
            onClick={() => navigate("/")}
          >
            Back
          </button>
        </div>
      </form>
    </div>
  );

  const renderFindGames = () => {
    // mengelompokkan game berdasarkan tingkat kesulitan
    const easyGames = availableGames.filter(
      (game) => game.difficulty === "easy"
    );
    const mediumGames = availableGames.filter(
      (game) => game.difficulty === "medium"
    );
    const hardGames = availableGames.filter(
      (game) => game.difficulty === "hard"
    );

    return (
      <div className="find-games">
        <h3>Available Games</h3>

        <div className="lobby-controls">
          <button
            className="btn btn-refresh"
            onClick={fetchAvailableGames}
            disabled={loading}
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="loading">Loading available games...</div>
        ) : availableGames.length > 0 ? (
          <div className="games-list-by-difficulty">
            {/* Easy Games */}
            {easyGames.length > 0 && (
              <div className="difficulty-section">
                <h4 className="difficulty-title">Easy</h4>
                <div className="games-list">
                  {easyGames.map((game) => (
                    <div key={game.id} className="game-item">
                      <div className="game-info">
                        <span className="host">Host: {game.host_name}</span>
                        <span className="players">
                          Players: {game.player_count}/10
                        </span>
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
              </div>
            )}

            {/* Medium Games */}
            {mediumGames.length > 0 && (
              <div className="difficulty-section">
                <h4 className="difficulty-title">Medium</h4>
                <div className="games-list">
                  {mediumGames.map((game) => (
                    <div key={game.id} className="game-item">
                      <div className="game-info">
                        <span className="host">Host: {game.host_name}</span>
                        <span className="players">
                          Players: {game.player_count}/10
                        </span>
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
              </div>
            )}

            {/* Hard Games */}
            {hardGames.length > 0 && (
              <div className="difficulty-section">
                <h4 className="difficulty-title">Hard</h4>
                <div className="games-list">
                  {hardGames.map((game) => (
                    <div key={game.id} className="game-item">
                      <div className="game-info">
                        <span className="host">Host: {game.host_name}</span>
                        <span className="players">
                          Players: {game.player_count}/10
                        </span>
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
              </div>
            )}

            {/* tampilkan pesan jika tidak ada game tersedia di tingkat kesulitan tertentu */}
            {easyGames.length === 0 &&
              mediumGames.length === 0 &&
              hardGames.length === 0 && (
                <div className="no-games-by-difficulty">
                  <p>
                    No games are currently available in any difficulty level.
                  </p>
                </div>
              )}
          </div>
        ) : (
          <div className="no-games">
            <p>No available games found.</p>
          </div>
        )}

        {/* tombol di bagian bawah */}
        <div className="bottom-controls">
          <button className="btn btn-create" onClick={handlePrepareCreateGame}>
            New Game
          </button>

          <button className="btn btn-share" onClick={() => handleShareLobby()}>
            Share Lobby
          </button>
        </div>
      </div>
    );
  };

  // fungsi berbagi lobby
  const handleShareLobby = () => {
    const shareUrl = window.location.href;

    // periksa apakah Web Share API didukung
    if (navigator.share) {
      navigator
        .share({
          title: "Sudoku Multiplayer",
          text: "Let's Play Sudoku Together!",
          url: shareUrl,
        })
        .then(() => console.log("Berhasil membagikan"))
        .catch((error) => console.log("Error membagikan:", error));
    } else {
      // fallback untuk browser yang tidak mendukung Web Share API
      // dialog sederhana untuk menyalin link
      const tempInput = document.createElement("input");
      document.body.appendChild(tempInput);
      tempInput.value = shareUrl;
      tempInput.select();
      document.execCommand("copy");
      document.body.removeChild(tempInput);

      // tampilkan pesan
      setErrorMessage("Link disalin ke clipboard!");
      setTimeout(() => setErrorMessage(null), 2000);
    }
  };

  const renderNameColorForm = () => (
    <div className="name-color-form">
      <h3>{joinMode ? "Join Game" : "Create New Game"}</h3>
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
            {colorOptions.map((color) => (
              <div
                key={color}
                onClick={() => setPlayerColor(color)}
                className={`color-option ${
                  color === playerColor ? "selected" : ""
                }`}
                style={{ backgroundColor: color }}
              ></div>
            ))}
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            {joinMode ? "Join Game" : "Create Game"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              if (joinMode) {
                navigate("/lobby");
              } else {
                navigate("/create");
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
      {errorMessage && <div className="error-message">{errorMessage}</div>}

      {!showCreateForm &&
        !showFindGames &&
        !showNameColorForm &&
        renderMainOptions()}
      {showCreateForm && !showNameColorForm && renderCreateGameForm()}
      {showFindGames && !showNameColorForm && renderFindGames()}
      {showNameColorForm && renderNameColorForm()}
    </div>
  );
};

export default HomePage;
