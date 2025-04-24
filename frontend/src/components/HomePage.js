import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation, useParams } from "react-router-dom";
import axios from "axios";
import "./HomePage.css";

const HomePage = ({ initialMode, isDarkMode }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showFindGames, setShowFindGames] = useState(false);
  const [showNameColorForm, setShowNameColorForm] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [availableGames, setAvailableGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedGameId, setSelectedGameId] = useState(null);
  const [joinMode, setJoinMode] = useState(false);
  const [savedGameInfo, setSavedGameInfo] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { gameId } = useParams();

  // warna untuk pemain (akan dipilih otomatis)
  const colorOptions = [
    "#4169E1", // royal blue
    "#50C878", // emerald green
    "#DC143C", // crimson
    "#FFBF00", // amber
    "#8A2BE2", // purple
    "#008080", // teal
    "#FF7F50", // coral
    "#708090", // slate gray
    "#FF00FF", // magenta
    "#228B22", // forest green
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

  // check game state yang tersimpan di localStorage dan tampilkan info
  useEffect(() => {
    const savedGameId = localStorage.getItem("gameId");
    const savedPlayerId = localStorage.getItem("playerId");
    const savedUsername = localStorage.getItem("playerName");
    const savedToken = localStorage.getItem("playerToken");

    if (savedGameId && savedPlayerId && savedToken) {
      // Gunakan nama player yang tersimpan
      if (savedUsername) {
        setPlayerName(savedUsername);
      }

      // ambil info tentang game yang tersimpan
      const fetchSavedGameInfo = async () => {
        try {
          const response = await axios.get(
            `http://localhost:8000/api/games/${savedGameId}/`
          );
          setSavedGameInfo({
            id: savedGameId,
            playerId: savedPlayerId,
            playerName: savedUsername || "Anonymous",
            difficulty: response.data.difficulty,
          });

          
        } catch (error) {
          console.error("Error fetching saved game:", error);
          // jika game tidak ditemukan, hapus data dari localStorage
          localStorage.removeItem("gameId");
          localStorage.removeItem("playerId");
          localStorage.removeItem("playerName");
          localStorage.removeItem("playerToken");
        }
      };

      fetchSavedGameInfo();
    }
  }, []);

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

    // check if already in another game
    const savedGameId = localStorage.getItem("gameId");
    const savedPlayerId = localStorage.getItem("playerId");

    if (savedGameId && savedPlayerId) {
      // User is part of another game - confirm before switching
      const confirmSwitch = window.confirm(
        "You're already in another game. Do you want to leave that game and create a new one?"
      );

      if (!confirmSwitch) {
        // user canceled, don't proceed with creating new game
        return;
      }
    }

    setLoading(true);
    try {
      // pilih warna secara acak dari pilihan warna
      const randomColor =
        colorOptions[Math.floor(Math.random() * colorOptions.length)];

      const response = await axios.post("http://localhost:8000/api/games/", {
        difficulty: difficulty,
        player_name: playerName,
        player_color: randomColor,
      });

      // save game & player info to localStorage
      localStorage.setItem("gameId", response.data.id);
      localStorage.setItem("playerId", response.data.player_id);
      localStorage.setItem("playerName", playerName);
      localStorage.setItem("playerToken", response.data.token);

      // simpan token dengan username sebagai kunci untuk pencarian nanti
      localStorage.setItem(`token_${playerName}`, response.data.token);

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

    // check if already in another game
    const savedGameId = localStorage.getItem("gameId");
    const savedPlayerId = localStorage.getItem("playerId");

    if (savedGameId && savedPlayerId && savedGameId !== selectedGameId) {
      // user is part of another game - confirm before switching
      const confirmSwitch = window.confirm(
        "You're already in another game. Do you want to leave that game and join this one?"
      );

      if (!confirmSwitch) {
        // user canceled, don't proceed with join
        return;
      }

      // User confirmed, clear existing game data
      localStorage.removeItem("gameId");
      localStorage.removeItem("playerId");
      localStorage.removeItem("playerName");
      localStorage.removeItem("playerToken");
    }

    setLoading(true);
    try {
      // cek apakah kita punya token yang tersimpan untuk username ini
      const savedToken = localStorage.getItem(`token_${playerName.trim()}`);

      // pilih warna secara acak dari pilihan warna
      const randomColor =
        colorOptions[Math.floor(Math.random() * colorOptions.length)];

      const response = await axios.post(
        `http://localhost:8000/api/games/${selectedGameId}/join/`,
        {
          player_name: playerName,
          player_color: randomColor,
          token: savedToken, // kirim token jika ada
        }
      );

      // save game info to localStorage
      localStorage.setItem("gameId", selectedGameId);
      localStorage.setItem("playerId", response.data.player_id);
      localStorage.setItem("playerName", playerName);
      localStorage.setItem("playerToken", response.data.token);

      // simpan token yang terkait dengan username untuk digunakan di pencarian nanti
      localStorage.setItem(`token_${playerName}`, response.data.token);

      // redirect to the game page
      navigate(`/game/${selectedGameId}`);
    } catch (error) {
      console.error("Error joining game:", error);

      // cek apakah error karena username sudah digunakan
      if (
        error.response &&
        error.response.data &&
        error.response.status === 400 &&
        error.response.data.error &&
        error.response.data.error.includes("already in use")
      ) {
        setErrorMessage(
          "Username already in use in this game. If this is your username, make sure you're using the same device or browser where you first joined."
        );
      } else if (
        error.response &&
        error.response.data &&
        error.response.data.error
      ) {
        setErrorMessage(error.response.data.error);
      } else {
        setErrorMessage("Failed to join the game");
      }
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

      {savedGameInfo && (
        <div className="saved-game-info">
          <h3>You have a saved game</h3>
          <div className="saved-game-card">
            <div className="saved-game-details">
              <p>
                <strong>Player:</strong> {savedGameInfo.playerName}
              </p>
              <p>
                <strong>Difficulty:</strong> {savedGameInfo.difficulty}
              </p>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => navigate(`/game/${savedGameInfo.id}`)}
            >
              Resume Game
            </button>
          </div>
        </div>
      )}

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
    // Kelompokkan game berdasarkan tingkat kesulitan
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
        <div className="available-games-list">
          <div className="games-header">
            <h4>Available Games</h4>
            {/* Tombol refresh di tengah atas */}
            <button
              className="btn btn-refresh"
              onClick={fetchAvailableGames}
              disabled={loading}
            >
              Refresh List
            </button>
          </div>

          {loading ? (
            <div className="loading-message">Loading available games...</div>
          ) : (
            <>
              {errorMessage && (
                <div className="error-message">{errorMessage}</div>
              )}
              {availableGames.length === 0 ? (
                <div className="no-games-message">No games available</div>
              ) : (
                <div className="games-list">
                  {/* Easy Games Section */}
                  {easyGames.length > 0 && (
                    <div className="difficulty-section">
                      <h5 className="difficulty-title easy-title">
                        Easy Games
                      </h5>
                      {easyGames.map((game) => (
                        <div key={game.id} className="game-item">
                          <div className="game-info">
                            <span className="host-name">
                              {game.host_name}'s Game
                            </span>
                            <span className={`difficulty ${game.difficulty}`}>
                              {game.difficulty}
                            </span>
                            <span className="player-count">
                              {game.player_count} player
                              {game.player_count !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <button
                            className="btn btn-join"
                            onClick={() => handlePrepareJoinGame(game.id)}
                          >
                            Join
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Medium Games Section */}
                  {mediumGames.length > 0 && (
                    <div className="difficulty-section">
                      <h5 className="difficulty-title medium-title">
                        Medium Games
                      </h5>
                      {mediumGames.map((game) => (
                        <div key={game.id} className="game-item">
                          <div className="game-info">
                            <span className="host-name">
                              {game.host_name}'s Game
                            </span>
                            <span className={`difficulty ${game.difficulty}`}>
                              {game.difficulty}
                            </span>
                            <span className="player-count">
                              {game.player_count} player
                              {game.player_count !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <button
                            className="btn btn-join"
                            onClick={() => handlePrepareJoinGame(game.id)}
                          >
                            Join
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Hard Games Section */}
                  {hardGames.length > 0 && (
                    <div className="difficulty-section">
                      <h5 className="difficulty-title hard-title">
                        Hard Games
                      </h5>
                      {hardGames.map((game) => (
                        <div key={game.id} className="game-item">
                          <div className="game-info">
                            <span className="host-name">
                              {game.host_name}'s Game
                            </span>
                            <span className={`difficulty ${game.difficulty}`}>
                              {game.difficulty}
                            </span>
                            <span className="player-count">
                              {game.player_count} player
                              {game.player_count !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <button
                            className="btn btn-join"
                            onClick={() => handlePrepareJoinGame(game.id)}
                          >
                            Join
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tampilkan pesan jika tidak ada game */}
                  {easyGames.length === 0 &&
                    mediumGames.length === 0 &&
                    hardGames.length === 0 && (
                      <div className="no-games-message">No games available</div>
                    )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="back-button">
          <button
            className="btn btn-create"
            onClick={() => navigate("/create")}
          >
            Create a New Game
          </button>
        </div>

        {/* Bagian Share */}
        <div className="share-section">
          <p>No game available?</p>
          <button className="btn btn-share" onClick={handleShareLobby}>
            Share
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
    <div className={`name-color-form ${isDarkMode ? "dark-mode" : ""}`}>
      <h3 style={{ color: isDarkMode ? "#e0e0e0" : "inherit" }}>
        {joinMode ? "Join Game" : "Create New Game"}
      </h3>

      {errorMessage && (
        <div
          className={`error-message ${
            errorMessage.includes("already in use")
              ? "error-message-username"
              : ""
          }`}
          style={{
            backgroundColor: isDarkMode ? "#4d2c2c" : "#ffebee",
            color: isDarkMode ? "#f5b6bc" : "#c62828",
            border: isDarkMode ? "1px solid #5a3333" : "",
          }}
        >
          {errorMessage}
        </div>
      )}

      <form onSubmit={joinMode ? joinGame : handleCreateGame}>
        <div className="form-group">
          <label
            htmlFor="playerName"
            style={{ color: isDarkMode ? "#e0e0e0" : "inherit" }}
          >
            Your Username:
          </label>
          <input
            type="text"
            id="playerName"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your username"
            className={
              errorMessage && errorMessage.includes("already in use")
                ? "input-error"
                : ""
            }
            style={{
              backgroundColor: isDarkMode ? "#333" : "white",
              color: isDarkMode ? "#e0e0e0" : "inherit",
              border: isDarkMode ? "1px solid #555" : "1px solid #ccc",
            }}
            required
          />
          <small
            className="form-hint"
            style={{ color: isDarkMode ? "#aaa" : "#666" }}
          >
            Use the same username each time to easily rejoin your games later
          </small>
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
    <div className={`home-page ${isDarkMode ? "dark-mode" : ""}`}>
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
