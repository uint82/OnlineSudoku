import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Board from "./Board";
import GameControls from "./GameControls";
import CongratulationsPopup from "./Popup";
import Navbar from "./Navbar";
import { setupWebSocketWithHeartbeat } from "../utils/websocketUtils";
import { isBoardComplete } from "../utils/sudokuUtils";

const Game = ({
  gameIdProp,
  playerIdProp,
  onLeaveGame,
  isDarkMode,
  toggleDarkMode,
}) => {
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
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [socketState, setSocketState] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showCongratulations, setShowCongratulations] = useState(false);
  const [completionAcknowledged, setCompletionAcknowledged] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [cellFocus, setCellFocus] = useState({});
  const [playerContributions, setPlayerContributions] = useState({});

  // join form
  const [playerName, setPlayerName] = useState("");

  // warna untuk pemain (akan dipilih otomatis)
  const colorOptions = [
    "#4169E1", // royal blue
    "#50C878", // emerald green
    "#DC143C", // crimson
    "#FFBF00", // amber
    "#8A2BE2", // purple
    "#008080", // teal
    "#FF7F50", // coral
    "#708090", // slate Gray
    "#FF00FF", // magenta
    "#228B22", // forest Green
  ];

  // kalkulasi kontribusi pemain berdasarkan gerakan
  useEffect(() => {
    if (game && game.moves) {
      const contributions = {};

      // hitung kontribusi untuk setiap pemain
      game.moves.forEach((move) => {
        const movePlayerId = move.player_id || (move.player && move.player.id);
        if (movePlayerId) {
          if (!contributions[movePlayerId]) {
            contributions[movePlayerId] = 0;
          }
          // tambahkan poin untuk langkah benar
          if (move.is_correct === true) {
            contributions[movePlayerId] += 10;
          }
          // tambahkan juga poin untuk setiap gerakan, terlepas dari kebenarannya
          contributions[movePlayerId] += 1;
        }
      });

      setPlayerContributions(contributions);
    }
  }, [game?.moves]);

  useEffect(() => {
    // check if user is already part of this game or a different game
    const savedGameId = localStorage.getItem("gameId");
    const savedPlayerId = localStorage.getItem("playerId");
    const savedPlayerName = localStorage.getItem("playerName");
    const savedToken = localStorage.getItem("playerToken");

    if (savedGameId && savedPlayerId) {
      if (savedGameId === gameId) {
        // if user is already part of this game
        setPlayerId(savedPlayerId);
        if (savedPlayerName) {
          setPlayerName(savedPlayerName);
        }
      }
      
    }

    // pastikan URL menggunakan format /game/:gameId
    if (gameId && window.location.pathname === "/") {
      navigate(`/game/${gameId}`, { replace: true });
    }

    const hasAcknowledged =
      localStorage.getItem(`game_${gameId}_completed_acknowledged`) === "true";
    if (hasAcknowledged) {
      setCompletionAcknowledged(true);
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
          socketState.sendMessage(
            JSON.stringify({
              type: "request_player_list",
            })
          );
        }
      }, 5000); // check every 5 seconds

      return () => {
        clearInterval(playerListInterval);
      };
    }
  }, [playerId, game]);

  // check for game completion
  useEffect(() => {
    if (game && game.current_board && !completionAcknowledged) {
      const isComplete = isBoardComplete(game.current_board);

      if (isComplete && !showCongratulations) {
        console.log(
          "Game completed! Showing congratulations and notifying others."
        );

        // show congratulations popup locally
        setShowCongratulations(true);

        // notify other players via WebSocket
        if (socketState && socketState.isReady()) {
          socketState.sendMessage(
            JSON.stringify({
              type: "game_complete",
              player_id: playerId,
            })
          );
        }
      }
    }
  }, [
    game?.current_board,
    showCongratulations,
    socketState,
    playerId,
    completionAcknowledged,
  ]);

  // congrat effect
  useEffect(() => {
    if (
      game &&
      game.is_complete &&
      !showCongratulations &&
      !completionAcknowledged
    ) {
      setShowCongratulations(true);
    }
  }, [game?.is_complete, completionAcknowledged]);

  useEffect(() => {
    // if connection status changes to disconnected, attempt to reconnect
    if (
      connectionStatus === "disconnected" &&
      socketState &&
      socketState.reconnect
    ) {
      const reconnectTimer = setTimeout(() => {
        console.log("Attempting to reconnect...");
        socketState.reconnect();
      }, 2000); // reconnect after 2 seconds

      return () => clearTimeout(reconnectTimer);
    }
  }, [connectionStatus, socketState]);

  useEffect(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      const handleWebSocketMessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("WebSocket message received in Game:", data);

        // handle specific message types if needed
        if (data.type === "quick_chat") {
          console.log("Quick chat message received:", data);
          // pass to board component via props
        }
      };

      socket.addEventListener("message", handleWebSocketMessage);

      return () => {
        socket.removeEventListener("message", handleWebSocketMessage);
      };
    }
  }, [socket]);

  useEffect(() => {
    if (socketState && socketState.isReady && socketState.isReady()) {
      // message handler for cell focus events
      const handleSocketMessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === "cell_focus") {
            const { row, column, player_id, player, focus_type } = message;
            const cellKey = `${row}-${column}`;

            console.log(
              "FOCUS DEBUG: Received focus event in specific handler:",
              message
            );
            console.log("FOCUS DEBUG: Current cellFocus state:", cellFocus);

            setCellFocus((prev) => {
              // for 'focus' events, add or update the focus information
              if (focus_type === "focus") {
                // create a new object to ensure React detects the state change
                const newState = { ...prev };
                newState[cellKey] = {
                  player_id,
                  player,
                  row,
                  column,
                  focus_type,
                  color: player?.color || "#ff5722",
                  playerName: player?.name || "Player",
                };

                console.log("FOCUS DEBUG: Updated state will be:", newState);
                return newState;
              }
              // for 'blur' events, remove the focus information
              else if (focus_type === "blur") {
                // only remove if the blur is from the same player who set the focus
                const newState = { ...prev };

                if (
                  newState[cellKey] &&
                  newState[cellKey].player_id === player_id
                ) {
                  delete newState[cellKey];
                  console.log("FOCUS DEBUG: Deleting focus for cell:", cellKey);
                }

                return newState;
              }

              return prev;
            });
          }
        } catch (error) {
          console.error("Error processing socket message:", error);
        }
      };

      // event listener
      socketState.addEventListener("message", handleSocketMessage);

      // cleanup
      return () => {
        socketState.removeEventListener("message", handleSocketMessage);
      };
    }
  }, [socketState]);

  const fetchGameDetails = async () => {
    try {
      const response = await axios.get(
        `http://localhost:8000/api/games/${gameId}/`
      );
      setGame(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching game:", error);
      setError("Game not found or has expired");
      setLoading(false);
    }
  };

  const handleJoinGame = async (e) => {
    e.preventDefault();

    if (!playerName.trim()) {
      setErrorMessage("Please enter your name");
      return;
    }

    // check if already in another game
    const savedGameId = localStorage.getItem("gameId");
    const savedPlayerId = localStorage.getItem("playerId");

    if (savedGameId && savedPlayerId && savedGameId !== gameId) {
      // user is part of another game - confirm before switching
      const confirmSwitch = window.confirm(
        "You're already in another game. Do you want to leave that game and join this one?"
      );

      if (!confirmSwitch) {
        // user canceled, don't proceed with join
        return;
      }

      // user confirmed, clear existing game data
      localStorage.removeItem("gameId");
      localStorage.removeItem("playerId");
      localStorage.removeItem("playerName");
      localStorage.removeItem("playerToken");
    }

    // check if username token exists for this game
    const savedToken = localStorage.getItem(`token_${playerName.trim()}`);

    // select a random color from colorOptions
    const randomColor =
      colorOptions[Math.floor(Math.random() * colorOptions.length)];

    try {
      // kirim request dengan token jika ada
      const response = await axios.post(
        `http://localhost:8000/api/games/${gameId}/join/`,
        {
          player_name: playerName,
          player_color: randomColor,
          token: savedToken, // send token if available
        }
      );

      // save game & player data to localStorage
      localStorage.setItem("gameId", gameId);
      localStorage.setItem("playerId", response.data.player_id);
      localStorage.setItem("playerName", playerName);
      localStorage.setItem("playerToken", response.data.token);

      // also save token with username as key for future searches
      localStorage.setItem(`token_${playerName}`, response.data.token);

      // hapus pesan error jika ada
      setErrorMessage(null);

      // set player ID from response
      setPlayerId(response.data.player_id);

      // update game data
      setGame(response.data);

      // update URL dari /join/id ke /game/id jika kita berada di URL join
      if (window.location.pathname.includes("/join/")) {
        navigate(`/game/${gameId}`, { replace: true });
      }
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

      // atur timer untuk menghilangkan pesan error setelah beberapa detik
      setTimeout(() => {
        setErrorMessage(null);
      }, 8000);
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
      setConnectionStatus("connected");
      setTimeout(() => {
        if (socket && socket.readyState === WebSocket.OPEN) {
          console.log("Announcing player join:", playerId);
          socket.send(
            JSON.stringify({
              type: "join",
              player_id: playerId,
            })
          );

          // request a fresh player list
          socket.send(
            JSON.stringify({
              type: "request_player_list",
            })
          );
        }
      }, 500);
    };

    const onMessage = (e) => {
      const data = JSON.parse(e.data);

      // skip heartbeat messages as they're handled in the utility
      if (data.type === "heartbeat") return;

      console.log("WebSocket message received:", data); // For debugging

      if (data.type === "move") {
        // update board with new move
        handleRemoteMove(data.move);
      } else if (data.type === "join") {
        // handle new player joining
        handlePlayerJoin(data.player);

        // when we receive a join message, also request a fresh player list
        if (socketState && socketState.isReady()) {
          socketState.sendMessage(
            JSON.stringify({
              type: "request_player_list",
            })
          );
        }
      } else if (data.type === "player_list_update") {
        // handle complete player list update
        updatePlayerList(data.players);
      } else if (data.type === "game_complete") {
        // show congratulations popup when another player completes the game
        setShowCongratulations(true);
      } else if (data.type === "error") {
        // display error messages from the server
        setErrorMessage(data.message);
        setTimeout(() => setErrorMessage(null), 3000);
      } else if (data.type === "quick_chat") {
        console.log("RECEIVED QUICK CHAT:", data); // debug
        setChatMessages((prev) => {
          // check if this message is already in our list to avoid duplicates
          const isDuplicate = prev.some(
            (msg) =>
              msg.timestamp === data.timestamp &&
              msg.player_id === data.player_id &&
              msg.message === data.message
          );

          if (!isDuplicate) {
            console.log("Adding quick chat message to state:", data);
            return [...prev, data];
          }
          return prev;
        });
      } else if (data.type === "cell_focus") {
        const { row, column, player_id, player, focus_type } = data;
        const cellKey = `${row}-${column}`;

        console.log("Received cell_focus in main handler:", data);

        setCellFocus((prev) => {
          const newState = { ...prev };

          // for 'focus' events, add or update the focus information
          if (focus_type === "focus") {
            // hapus fokus player ini di sel manapun sebelum menambahkan yang baru
            // ini penting untuk mencegah duplikasi fokus dari pemain yang sama
            Object.keys(newState).forEach((key) => {
              if (newState[key]?.player_id === player_id) {
                delete newState[key];
              }
            });

            // tambahkan fokus baru
            newState[cellKey] = {
              player_id,
              player,
              row,
              column,
              focus_type,
              color: player?.color || "#ff5722",
              playerName: player?.name || "Player",
            };

            return newState;
          }
          // for 'blur' events, remove the focus information
          else if (focus_type === "blur") {
            // only remove if the blur is from the same player who set the focus
            if (
              newState[cellKey] &&
              newState[cellKey].player_id === player_id
            ) {
              delete newState[cellKey];
            }

            return newState;
          }

          return prev;
        });
      }
    };

    const onError = (e) => {
      console.error("WebSocket error:", e);
      setConnectionStatus("error");
    };

    const onClose = (e) => {
      console.log("WebSocket disconnected", e.reason);
      setConnectionStatus("disconnected");
    };

    // set up the websocket with heartbeat
    const {
      socket: ws,
      cleanup,
      isReady,
      getConnectionState,
      sendMessage,
      reconnect,
    } = setupWebSocketWithHeartbeat(
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
      reconnect,
    });
  };

  const handleRemoteMove = (move) => {
    const enhancedMove = {
      ...move,
      player_id:
        move.player_id ||
        (move.players && Object.keys(move.players)[0]) ||
        null,
    };

    // update game state with the new move
    setGame((prevGame) => {
      if (!prevGame) return null;

      const newBoard = [...prevGame.current_board];
      newBoard[move.row][move.column] = move.value;

      // enhanced move with player_id
      const newMoves = [...(prevGame.moves || []), enhancedMove];

      return {
        ...prevGame,
        current_board: newBoard,
        moves: newMoves,
      };
    });
  };

  const handlePlayerJoin = (player) => {
    // add new player to the game state
    setGame((prevGame) => {
      if (!prevGame) return null;

      const playerExists = prevGame.players.some((p) => p.id === player.id);

      if (playerExists) {
        return prevGame;
      }

      return {
        ...prevGame,
        players: [...prevGame.players, player],
      };
    });

    // log player join for debugging
    console.log(`Player joined: ${player.name}`);
  };

  const updatePlayerList = (players) => {
    console.log("Updating player list with:", players);

    // use a more reliable state update approach
    setGame((prevGame) => {
      if (!prevGame) return null;

      // deep comparison to check if player list has changed
      const currentPlayers = JSON.stringify(
        prevGame.players.map((p) => p.id).sort()
      );
      const newPlayers = JSON.stringify(players.map((p) => p.id).sort());

      if (currentPlayers !== newPlayers) {
        console.log("Player list changed, updating state");
        return {
          ...prevGame,
          players: players,
        };
      }

      return prevGame;
    });
  };

  const handleMakeMove = (row, col, value, isCorrect = null) => {
    // create the move message with is_correct flag
    // we pass null for is_correct and let the server handle validation
    const moveMessage = JSON.stringify({
      type: "move",
      player_id: playerId,
      row: row,
      column: col,
      value: value,
      is_correct: isCorrect,
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

    // kirim notifikasi ke server bahwa pengguna meninggalkan game
    if (socketState && socketState.isReady && socketState.isReady()) {
      socketState.sendMessage(
        JSON.stringify({
          type: "leave_game",
          player_id: playerId,
          game_id: gameId,
        })
      );
    }

    // Hapus data game dari localStorage
    localStorage.removeItem("gameId");
    localStorage.removeItem("playerId");
    localStorage.removeItem("playerName");
    localStorage.removeItem("playerToken");

    // Hapus semua state lokal game
    setGame(null);
    setPlayerId(null);
    setSocket(null);
    setSocketState(null);
    setChatMessages([]);
    setCellFocus({});
    setPlayerContributions({});

    // use provided callback if available, otherwise navigate home
    if (onLeaveGame) {
      onLeaveGame();
    } else {
      // Navigasi ke homepage
      navigate("/", { replace: true });
    }
  };

  const broadcastQuickChat = (message) => {
    // socket state checking
    if (
      socket &&
      socket.readyState === WebSocket.OPEN &&
      socketState &&
      socketState.isReady &&
      socketState.isReady()
    ) {
      console.log("Broadcasting quick chat via main socket:", message);
      const chatMessage = {
        type: "quick_chat",
        player_id: playerId,
        message: message,
        timestamp: new Date().toISOString(),
      };
      socket.send(JSON.stringify(chatMessage));

      // add to local chatMessages state for immediate feedback
      setChatMessages((prev) => [...prev, chatMessage]);
    } else {
      console.log(
        "Primary socket not ready, trying socketState sendMessage..."
      );

      // fall back to socketState's sendMessage function if available
      if (socketState && socketState.sendMessage) {
        const chatMessage = {
          type: "quick_chat",
          player_id: playerId,
          message: message,
          timestamp: new Date().toISOString(),
        };

        const success = socketState.sendMessage(JSON.stringify(chatMessage));

        if (success) {
          console.log("Message sent via socketState.sendMessage");
          // add to local state for immediate feedback
          setChatMessages((prev) => [...prev, chatMessage]);
        } else {
          console.error("Failed to send message via socketState.sendMessage");

          // add to local state to provide user feedback
          setChatMessages((prev) => [...prev, chatMessage]);

          // show error message briefly
          setErrorMessage(
            "Message not sent to other players - reconnecting..."
          );
          setTimeout(() => setErrorMessage(null), 3000);
        }
      } else {
        console.error("No working socket available for sending messages");
        setErrorMessage("Cannot send messages - connection lost");
        setTimeout(() => setErrorMessage(null), 3000);
      }
    }
  };

  const handleCloseCongratulations = () => {
    setShowCongratulations(false);
    setCompletionAcknowledged(true);
    localStorage.setItem(`game_${gameId}_completed_acknowledged`, "true");

    // kirim notifikasi ke server bahwa game sudah selesai
    if (socketState && socketState.isReady && socketState.isReady()) {
      socketState.sendMessage(
        JSON.stringify({
          type: "game_completed",
          player_id: playerId,
          game_id: gameId,
        })
      );
    }
  };

  if (loading) {
    return <div className="loading">Loading game...</div>;
  }

  if (error) {
    return (
      <div
        style={{
          maxWidth: "500px",
          margin: "0 auto",
          padding: "20px",
          textAlign: "center",
        }}
      >
        <div className="error">{error}</div>
        <button
          onClick={() => {
            localStorage.removeItem("gameId");
            localStorage.removeItem("playerId");
            navigate("/");
          }}
          style={{
            backgroundColor: "#3498db",
            color: "white",
            padding: "10px 15px",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            marginTop: "20px",
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
      <div style={{ maxWidth: "500px", margin: "0 auto", padding: "20px" }}>
        <h2>Join Sudoku Game</h2>

        {errorMessage && (
          <div
            style={{
              backgroundColor: "#FFEBEE",
              color: "#D32F2F",
              padding: "12px 16px",
              borderRadius: "4px",
              marginBottom: "20px",
              border: "1px solid #FFCDD2",
              fontSize: "14px",
              fontWeight: errorMessage.includes("already in use")
                ? "bold"
                : "normal",
            }}
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleJoinGame}>
          <div style={{ marginBottom: "20px" }}>
            <label
              htmlFor="playerName"
              style={{
                display: "block",
                marginBottom: "5px",
                color: isDarkMode ? "#e0e0e0" : "inherit",
              }}
            >
              Your Username:
            </label>
            <input
              type="text"
              id="playerName"
              value={playerName}
              onChange={(e) => {
                setPlayerName(e.target.value);
                // hapus pesan error saat user mengetik
                if (errorMessage) setErrorMessage(null);
              }}
              style={{
                width: "100%",
                padding: "8px",
                backgroundColor: isDarkMode ? "#333" : "white",
                color: isDarkMode ? "#e0e0e0" : "inherit",
                border:
                  errorMessage && errorMessage.includes("already in use")
                    ? "1px solid #D32F2F"
                    : isDarkMode
                    ? "1px solid #555"
                    : "1px solid #ccc",
              }}
              required
            />
            <div
              style={{
                fontSize: "12px",
                color: isDarkMode ? "#aaa" : "#666",
                marginTop: "5px",
              }}
            >
              Use the same username each time to easily rejoin your games later
            </div>
          </div>

          <button
            type="submit"
            style={{
              backgroundColor: "#4CAF50",
              color: "white",
              padding: "10px 15px",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "16px",
            }}
          >
            Join Game
          </button>
        </form>
      </div>
    );
  }

  // find current player in players list
  const currentPlayer = game.players.find((p) => p.id === playerId) || {};

  // sortir pemain berdasarkan kontribusi
  const sortedPlayers = [...game.players].sort((a, b) => {
    const contributionA = playerContributions[a.id] || 0;
    const contributionB = playerContributions[b.id] || 0;
    return contributionB - contributionA; // Urutkan dari kontribusi tertinggi
  });

  return (
    <div style={{ textAlign: "center" }}>
      {/* Navbar */}
      <Navbar
        playerName={currentPlayer.name || "Player"}
        playerId={playerId}
        gameId={gameId}
        onLeaveGame={handleLeaveGame}
        playerColor={currentPlayer.color}
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
      />

      {/* Enhanced Players list - Horizontal Layout */}
      <div style={{ margin: "0 0 15px 0" }}>
        <div
          className="player-list"
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "8px",
            maxWidth: "800px",
            margin: "0 auto",
          }}
        >
          {sortedPlayers.slice(0, 3).map((player, index) => {
            const contribution = playerContributions[player.id] || 0;
            return (
              <div
                key={player.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "5px 10px",
                  borderRadius: "4px",
                  backgroundColor:
                    player.id === playerId
                      ? isDarkMode
                        ? "#3a3a3a"
                        : "#f0f0f0"
                      : isDarkMode
                      ? "#2a2a2a"
                      : "#f8f9fa",
                  border: isDarkMode ? "1px solid #444" : "1px solid #ddd",
                  fontSize: "0.9rem",
                  gap: "6px",
                  minWidth: "120px",
                  color: isDarkMode ? "#e0e0e0" : "inherit",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "18px",
                    height: "18px",
                    backgroundColor: isDarkMode ? "#444" : "#eee",
                    color: isDarkMode ? "#ddd" : "inherit",
                    borderRadius: "50%",
                    fontSize: "0.75rem",
                    fontWeight: "bold",
                  }}
                >
                  {index + 1}
                </div>
                <div
                  style={{
                    width: "12px",
                    height: "12px",
                    backgroundColor: player.color || "#3498db",
                    borderRadius: "50%",
                    marginRight: "2px",
                  }}
                ></div>
                <div
                  style={{
                    fontWeight: player.id === playerId ? "bold" : "normal",
                  }}
                >
                  {player.name}
                </div>
                <div
                  style={{
                    backgroundColor: isDarkMode ? "#1b3a26" : "#e8f5e9",
                    color: isDarkMode ? "#4caf50" : "#2e7d32",
                    fontSize: "0.75rem",
                    padding: "1px 5px",
                    borderRadius: "10px",
                    marginLeft: "auto",
                  }}
                >
                  {contribution}pt
                </div>
                {player.is_host && (
                  <div
                    style={{
                      backgroundColor: "#9C27B0",
                      color: "white",
                      fontSize: "0.65rem",
                      padding: "1px 4px",
                      borderRadius: "4px",
                    }}
                  >
                    Host
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Error message display */}
      {errorMessage && (
        <div
          style={{
            margin: "10px 0",
            padding: "10px",
            backgroundColor: isDarkMode ? "#4d2c2c" : "#f8d7da",
            color: isDarkMode ? "#f5b6bc" : "#721c24",
            borderRadius: "4px",
          }}
        >
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
        gameId={gameId}
        socketState={socketState}
        broadcastQuickChat={broadcastQuickChat}
        chatMessages={chatMessages}
        cellFocus={cellFocus}
        setCellFocus={setCellFocus}
        isDarkMode={isDarkMode}
      />

      {/* Game info moved below board */}
      <GameControls
        difficulty={game.difficulty}
        playerName={currentPlayer.name || "Player"}
        isHost={currentPlayer.is_host || false}
        gameId={gameId}
        isDarkMode={isDarkMode}
      />

      {/* Congratulations popup */}
      <CongratulationsPopup
        show={showCongratulations}
        onClose={handleCloseCongratulations}
        players={game.players}
        playerId={playerId}
        moves={game.moves || []}
      />
    </div>
  );
};

export default Game;
