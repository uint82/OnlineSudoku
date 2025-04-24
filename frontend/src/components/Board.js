import React, { useState, useEffect } from "react";
import Cell from "./Cell";
import { isValidSudokuMove } from "../utils/sudokuUtils";
import { Pencil, EyeOff, MessageCircle, Eraser, UserIcon } from "lucide-react";
import "./Board.css";

const Board = ({
  initialBoard,
  currentBoard,
  onMakeMove,
  players,
  playerId,
  moves,
  gameId,
  socketState,
  broadcastQuickChat,
  chatMessages,
  cellFocus,
  setCellFocus,
  isDarkMode,
}) => {
  const [selectedCell, setSelectedCell] = useState(null);
  const [highlightedNumber, setHighlightedNumber] = useState(null);
  const [pencilMode, setPencilMode] = useState(false);
  const [pencilNotes, setPencilNotes] = useState({});
  const [isRequestingHint, setIsRequestingHint] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [showQuickChat, setShowQuickChat] = useState(false);
  const [quickChatPosition, setQuickChatPosition] = useState({ x: 0, y: 0 });
  const [temporaryMessages, setTemporaryMessages] = useState([]);

  const quickChatOptions = {
    messages: [
      "Good move!",
      "I need help here",
      "Let's solve this together",
      "Almost there!",
      "Nice strategy",
      "I'm stuck...",
    ],
    emojis: ["👍", "👏", "🎉", "🤔", "❤️", "😊", "🙌", "🧩"],
  };

  useEffect(() => {
    console.log("Chat messages received in Board:", chatMessages);
  }, [chatMessages]);

  useEffect(() => {
    console.log("Current cellFocus state in Board:", cellFocus);

    // debug log untuk setiap sel yang memiliki fokus
    Object.keys(cellFocus || {}).forEach((key) => {
      const focus = cellFocus[key];
      console.log(
        `FOCUS DEBUG: Sel ${key} difokuskan oleh pemain ${
          focus.playerName || focus.player?.name || "Unnamed"
        }`
      );
    });

    // kika kita memiliki sel yang dipilih, pastikan fokus kita tetap terdaftar di state
    if (selectedCell) {
      const cellKey = `${selectedCell.row}-${selectedCell.col}`;
      const existingFocus = cellFocus[cellKey];

      // periksa apakah pemain ini sudah memiliki fokus di sel lain
      const playerHasFocusElsewhere = Object.values(cellFocus).some(
        (focus) =>
          focus.player_id === playerId &&
          (focus.row !== selectedCell.row || focus.column !== selectedCell.col)
      );

      // jika kita tidak memiliki fokus pada sel yang dipilih atau memiliki fokus di sel lain, kirimkan ulang
      if (
        (!existingFocus || existingFocus.player_id !== playerId) &&
        !playerHasFocusElsewhere
      ) {
        // gunakan fungsi handleCellFocus secara manual di sini dengan parameter yang sama
        if (socketState && socketState.isReady && socketState.isReady()) {
          const currentPlayer = players.find((p) => p.id === playerId);
          if (currentPlayer) {
            // kirim pesan fokus melalui WebSocket
            const message = {
              type: "cell_focus",
              player_id: playerId,
              player: {
                id: playerId,
                color: currentPlayer.color,
                name: currentPlayer.name,
              },
              row: selectedCell.row,
              column: selectedCell.col,
              focus_type: "focus",
            };
            socketState.sendMessage(JSON.stringify(message));

            // perbarui juga state fokus lokal untuk respons yang lebih cepat
            const cellKey = `${selectedCell.row}-${selectedCell.col}`;
            setCellFocus((prev) => {
              const newState = { ...prev };

              // hapus dahulu semua fokus dari pemain ini dari sel lain
              Object.keys(newState).forEach((key) => {
                if (newState[key].player_id === playerId) {
                  delete newState[key];
                }
              });

              newState[cellKey] = {
                player_id: playerId,
                player: {
                  id: playerId,
                  color: currentPlayer.color,
                  name: currentPlayer.name,
                },
                row: selectedCell.row,
                column: selectedCell.col,
                focus_type: "focus",
                color: currentPlayer.color,
                playerName: currentPlayer.name,
              };
              return newState;
            });
          }
        }
      }
    }
  }, [cellFocus, selectedCell, playerId, players, socketState, setCellFocus]);

  // tambahkan useEffect untuk menangani pesan fokus dari server
  useEffect(() => {
    // periksa untuk memastikan tidak ada pemain yang memiliki lebih dari satu fokus
    const playerFocusCounts = {};

    Object.values(cellFocus).forEach((focus) => {
      if (!playerFocusCounts[focus.player_id]) {
        playerFocusCounts[focus.player_id] = 1;
      } else {
        playerFocusCounts[focus.player_id]++;
      }
    });

    // jika ada pemain yang memiliki lebih dari satu fokus, bersihkan fokus yang berlebihan (menghindari duplikasi)
    const playersWithMultipleFoci = Object.entries(playerFocusCounts)
      .filter(([_, count]) => count > 1)
      .map(([id]) => id);

    if (playersWithMultipleFoci.length > 0) {
      console.log(
        "Found players with multiple foci, cleaning up:",
        playersWithMultipleFoci
      );

      setCellFocus((prev) => {
        // untuk setiap pemain dengan fokus ganda, pertahankan hanya fokus terbaru
        const newState = { ...prev };
        const processedPlayers = {};

        // urutkan sel fokus berdasarkan waktu (terakhir dulu)
        const allFoci = Object.entries(newState);

        // iterasi semua fokus
        allFoci.forEach(([key, focus]) => {
          const playerId = focus.player_id;

          // jika pemain ini memiliki fokus ganda
          if (playersWithMultipleFoci.includes(playerId)) {
            // jika ini pertama kali kita melihat fokus untuk pemain ini, simpan
            if (!processedPlayers[playerId]) {
              processedPlayers[playerId] = key;
            } else {
              // jika kita sudah melihat fokus sebelumnya untuk pemain ini, hapus yang ini
              delete newState[key];
            }
          }
        });

        return newState;
      });
    }
  }, [cellFocus]);

  // process the moves data to determine which cells were solved using hints
  const getHintCells = () => {
    const hintCells = {};

    moves?.forEach((move) => {
      // cek flag is_hint yang eksplisit
      if (move.is_hint === true) {
        const cellKey = `${move.row}-${move.column}`;
        hintCells[cellKey] = true;
        console.log(`Detected hint cell at ${cellKey} from is_hint flag`);
        return;
      }

      
      const cellKey = `${move.row}-${move.column}`;
      const hintKey = `game_${gameId}_hint_cell_${cellKey}`;

      if (localStorage.getItem(hintKey) === "true") {
        hintCells[cellKey] = true;
        console.log(`Detected hint cell at ${cellKey} from localStorage`);
        return;
      }

      // simpan sel hint yang baru ditemukan untuk persistensi
      if (move.is_hint === true) {
        localStorage.setItem(hintKey, "true");
        console.log(`Saved hint cell at ${cellKey} to localStorage`);
      }
    });

    return hintCells;
  };

  // check if current player has already used a hint - both on initial load and when moves change
  useEffect(() => {
    // check localStorage for persistence across page refreshes
    const hintUsedStorageKey = `game_${gameId}_player_${playerId}_hint_used`;
    const hintUsedFromStorage =
      localStorage.getItem(hintUsedStorageKey) === "true";

    if (hintUsedFromStorage) {
      setHintUsed(true);
      return;
    }

    // if not in localStorage, check the moves array
    if (moves && moves.length > 0) {
      const playerHasUsedHint = moves.some(
        (move) =>
          (move.player?.id === playerId || move.player_id === playerId) &&
          move.is_hint === true
      );

      if (playerHasUsedHint) {
        // store this information in localStorage for persistence
        localStorage.setItem(hintUsedStorageKey, "true");
        setHintUsed(true);
      }
    }
  }, [moves, playerId, gameId]);

  // set up periodic ping for focus positions
  useEffect(() => {
    // create a timer to refresh the player's focus position
    // this ensures that if messages are dropped, the focus state is still maintained
    if (selectedCell) {
      const focusRefreshInterval = setInterval(() => {
        if (socketState && socketState.isReady && socketState.isReady()) {
          const currentPlayer = players.find((p) => p.id === playerId);
          if (currentPlayer) {
            // use a more efficient refresh approach with less frequent updates
            handleCellFocus(selectedCell.row, selectedCell.col, true);
          }
        }
      }, 5000); // refresh setiap 5 detik untuk mencegah kehilangan fokus

      return () => clearInterval(focusRefreshInterval);
    }
  }, [selectedCell, socketState, playerId, players]);

  // clear all focus information when component unmounts
  useEffect(() => {
    return () => {
      // if we have a selected cell, send a blur event for it before unmounting
      if (
        selectedCell &&
        socketState &&
        socketState.isReady &&
        socketState.isReady()
      ) {
        handleCellBlur(selectedCell.row, selectedCell.col);
      }
    };
  }, []);

  // when chatMessages prop changes, add them to temporaryMessages
  useEffect(() => {
    if (chatMessages && chatMessages.length > 0) {
      // get the latest chat message
      const latestMessage = chatMessages[chatMessages.length - 1];

      // skip adding messages from the current player (they'll be added directly in sendQuickChatMessage)
      if (latestMessage && latestMessage.player_id !== playerId) {
        console.log(
          "Adding chat message to temporary messages:",
          latestMessage
        );
        addTemporaryMessage(latestMessage);
      }
    }
  }, [chatMessages]);

  // process the moves data to determine which cells contain errors
  const getErrorCells = () => {
    const errorCells = {};
    const latestMoves = {};

    // find the most recent move for each cell
    moves?.forEach((move) => {
      const cellKey = `${move.row}-${move.column}`;
      if (
        !latestMoves[cellKey] ||
        (move.timestamp || 0) > (latestMoves[cellKey].timestamp || 0)
      ) {
        latestMoves[cellKey] = move;
      }
    });

    // mark cells as errors only if their latest move is incorrect
    Object.values(latestMoves).forEach((move) => {
      const cellKey = `${move.row}-${move.column}`;

      // check if the cell is empty in the current board (value = 0)
      const [row, col] = cellKey.split("-").map(Number);
      const isEmpty = currentBoard[row][col] === 0;

      if (move.hasOwnProperty("is_correct") && move.is_correct === false) {
        // only mark as error if the cell still has a value
        errorCells[cellKey] = !isEmpty;
      } else if (
        move.hasOwnProperty("is_correct") &&
        move.is_correct === true
      ) {
        // explicitly mark correct cells to ensure they're not in error state
        errorCells[cellKey] = false;
      }
    });

    return errorCells;
  };

  const errorCells = getErrorCells();
  const hintCells = getHintCells();

  // find player color and correctness status from the moves list
  const getCellData = (cellRow, cellCol) => {
    const cellKey = `${cellRow}-${cellCol}`;
    const isError = errorCells[cellKey] === true;
    const isHint = hintCells[cellKey] === true;

    // get the most recent move for this cell
    const move = moves
      ?.filter((m) => m.row === cellRow && m.column === cellCol)
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))[0];

    if (move) {
      const player = players.find(
        (p) => p.id === move.player?.id || move.player_id
      );

      // A cell is correct if:
      // 1. The most recent move is marked as correct, OR
      // 2. The cell has a value and is not marked as an error
      const isCurrentlyCorrect =
        move.is_correct === true ||
        (currentBoard[cellRow][cellCol] !== 0 && !isError);

      return {
        color: player ? player.color : "#666",
        isCorrect: isCurrentlyCorrect,
        playerId: move.player?.id || move.player_id,
        hasError: isError,
        isHint: isHint,
      };
    }
    return {
      color: "#666",
      isCorrect: null,
      playerId: null,
      hasError: false,
      isHint: false,
    };
  };

  const handleCellClick = (row, col, isLocked) => {
    // if we had a previous selected cell, send a blur event for it before setting new selection
    if (
      selectedCell &&
      (selectedCell.row !== row || selectedCell.col !== col)
    ) {
      handleCellBlur(selectedCell.row, selectedCell.col);

      // pastikan sel sebelumnya kehilangan fokus sebelum menambahkan fokus baru
      setCellFocus((prev) => {
        const newState = { ...prev };
        // hapus semua fokus milik pemain ini
        Object.keys(newState).forEach((key) => {
          if (newState[key].player_id === playerId) {
            delete newState[key];
          }
        });
        return newState;
      });
    }

    // if the cell is locked (initial or correct), only handle highlighting
    if (isLocked) {
      if (highlightedNumber === currentBoard[row][col]) {
        // if already highlighted, turn off highlighting
        setHighlightedNumber(null);
      } else {
        // otherwise, highlight this number
        setHighlightedNumber(currentBoard[row][col]);
      }

      // tetap pilih sel dan kirim event fokus meskipun sel terkunci
      // untuk konsistensi indikator fokus
      setSelectedCell({ row, col });

      // kirim fokus event setelah sel dipilih
      setTimeout(() => {
        handleCellFocus(row, col);
      }, 10);
    } else {
      // for empty cells, reset the highlighting
      if (currentBoard[row][col] === 0) {
        setHighlightedNumber(null);

        // set the new selected cell before sending focus
        // to avoid race conditions
        setSelectedCell({ row, col });

        // send focus event
        setTimeout(() => {
          handleCellFocus(row, col);
        }, 10);
      } else {
        // for non-empty cells, handle highlighting
        if (highlightedNumber === currentBoard[row][col]) {
          setHighlightedNumber(null);
        } else {
          setHighlightedNumber(currentBoard[row][col]);
        }

        // allow selecting the cell regardless of who placed it
        setSelectedCell({ row, col });

        // send focus event
        setTimeout(() => {
          handleCellFocus(row, col);
        }, 10);
      }
    }
  };

  const handleCellFocus = (row, col, isRefresh = false) => {
    if (!playerId) return;

    // cek apakah kita sudah memiliki fokus di sel ini dari pemain yang sama
    const cellKey = `${row}-${col}`;
    const existingFocus = cellFocus[cellKey];

    // jika pemain yang sama sudah fokus pada sel yang sama dan ini bukan refresh, tidak perlu mengirim lagi
    if (
      existingFocus &&
      existingFocus.player_id === playerId &&
      existingFocus.focus_type === "focus" &&
      !isRefresh
    ) {
      return;
    }

    // don't log periodic refreshes to reduce console spam
    if (!isRefresh) {
      console.log(`Sending focus event for cell ${row}-${col}`);
    }

    // find current player to include complete player info
    const currentPlayer = players.find((p) => p.id === playerId);
    if (!currentPlayer) return;

    // cek apakah pemain ini sudah punya fokus di sel lain
    const playerFocusElsewhere = Object.entries(cellFocus).find(
      ([k, v]) => v.player_id === playerId && k !== cellKey
    );

    // jika pemain punya fokus di tempat lain, hapus terlebih dahulu
    if (playerFocusElsewhere) {
      const [otherKey, _] = playerFocusElsewhere;
      const [otherRow, otherCol] = otherKey.split("-").map(Number);

      // kirim event blur untuk sel sebelumnya melalui WebSocket
      if (socketState && socketState.isReady && socketState.isReady()) {
        const blurMessage = {
          type: "cell_focus",
          player_id: playerId,
          row: otherRow,
          column: otherCol,
          focus_type: "blur",
        };
        socketState.sendMessage(JSON.stringify(blurMessage));
      }
    }

    // send focus event through WebSocket
    if (socketState && socketState.isReady && socketState.isReady()) {
      const message = {
        type: "cell_focus",
        player_id: playerId,
        player: {
          id: playerId,
          color: currentPlayer.color,
          name: currentPlayer.name,
        },
        row: row,
        column: col,
        focus_type: "focus",
      };

      socketState.sendMessage(JSON.stringify(message));

      // perbarui status fokus lokal untuk respons yang lebih cepat
      setCellFocus((prev) => {
        // buat objek baru untuk memastikan React mendeteksi perubahan state
        const newState = { ...prev };

        // hapus dahulu semua fokus dari pemain ini dari sel lain
        Object.keys(newState).forEach((key) => {
          if (newState[key].player_id === playerId) {
            delete newState[key];
          }
        });

        // tambahkan fokus baru
        newState[cellKey] = {
          player_id: playerId,
          player: {
            id: playerId,
            color: currentPlayer.color,
            name: currentPlayer.name,
          },
          row,
          column: col,
          focus_type: "focus",
          color: currentPlayer.color,
          playerName: currentPlayer.name,
        };
        return newState;
      });
    }
  };

  const handleCellBlur = (row, col) => {
    if (!playerId) return;

    const cellKey = `${row}-${col}`;
    const existingFocus = cellFocus[cellKey];

    // hanya kirim blur jika kita memiliki fokus di sel ini
    if (!existingFocus || existingFocus.player_id !== playerId) {
      return;
    }

    console.log(`Sending blur event for cell ${row}-${col}`);

    // send blur event through WebSocket
    if (socketState && socketState.isReady && socketState.isReady()) {
      const message = {
        type: "cell_focus",
        player_id: playerId,
        row: row,
        column: col,
        focus_type: "blur",
      };

      socketState.sendMessage(JSON.stringify(message));

      // hapus fokus lokal juga untuk respons yang lebih cepat
      setCellFocus((prev) => {
        const newState = { ...prev };
        // hanya hapus jika itu adalah fokus dari pemain saat ini
        if (newState[cellKey] && newState[cellKey].player_id === playerId) {
          delete newState[cellKey];
        }
        return newState;
      });
    }
  };

  const handleNumberSelect = (number) => {
    if (selectedCell) {
      const { row, col } = selectedCell;

      // get the current cell data to check if it has an error
      const cellData = getCellData(row, col);
      const hasError = cellData.hasError;

      // allow editing if:
      // 1. cell is empty, OR
      // 2. cell has an error (any player can fix errors), or
      // 3. cell was placed by current player
      const canEdit =
        currentBoard[row][col] === 0 ||
        hasError ||
        cellData.playerId === playerId;

      if (!canEdit) {
        setSelectedCell(null);
        return;
      }

      const cellKey = `${row}-${col}`;
      const hasPencilNotes =
        pencilNotes[cellKey] && pencilNotes[cellKey].length > 0;

      // handle eraser button (number === 0) - works regardless of pencil mode
      if (number === 0) {
        // clear actual value if present and editable
        if (
          currentBoard[row][col] !== 0 &&
          (hasError || cellData.playerId === playerId)
        ) {
          onMakeMove(row, col, 0, null);
        }

        // clear pencil notes if present
        if (hasPencilNotes) {
          const updatedNotes = { ...pencilNotes };
          delete updatedNotes[cellKey];
          setPencilNotes(updatedNotes);
        }

        // always clear selection after erasing
        setSelectedCell(null);
        return;
      }

      // handle pencil mode (for numbers 1-9)
      if (pencilMode) {
        const currentNotes = pencilNotes[cellKey] || [];

        // toggle the number in pencil notes
        const newNotes = currentNotes.includes(number)
          ? currentNotes.filter((n) => n !== number)
          : [...currentNotes, number].sort();

        setPencilNotes({
          ...pencilNotes,
          [cellKey]: newNotes,
        });

        // don't clear selection in pencil mode to allow multiple notes
      } else {
        // normal mode - input actual numbers
        // check if the move is valid according to Sudoku rules
        const isValid = isValidSudokuMove(currentBoard, row, col, number);

        // make the move, include is_correct flag in the move data
        onMakeMove(row, col, number, isValid);

        // clear pencil notes for this cell when placing a number
        if (hasPencilNotes) {
          const updatedNotes = { ...pencilNotes };
          delete updatedNotes[cellKey];
          setPencilNotes(updatedNotes);
        }

        // clear selection after placing a number
        setSelectedCell(null);
      }
    }

    // toggle highlighting when clicking a number (except for eraser/0)
    if (number !== 0) {
      if (highlightedNumber === number) {
        setHighlightedNumber(null);
      } else {
        setHighlightedNumber(number);

        // only clear selected cell when highlighting in normal mode
        if (!pencilMode) {
          setSelectedCell(null);
        }
      }
    }
  };

  const handleHint = async () => {
    if (!selectedCell) {
      alert("Please select a cell first to get a hint");
      return;
    }

    // check if the player has already used their hint
    if (hintUsed) {
      alert("You've already used your hint for this game");
      return;
    }

    const { row, col } = selectedCell;

    // check if this is an initial cell or already solved correctly
    if (initialBoard[row][col] !== 0) {
      alert("Cannot get hint for initial board cells");
      return;
    }

    // check if the cell already has the correct value
    const cellData = getCellData(row, col);
    if (cellData.isCorrect === true) {
      alert("This cell already has the correct value");
      return;
    }

    // prevent multiple hint requests
    if (isRequestingHint) {
      return;
    }

    setIsRequestingHint(true);

    try {
      // try WebSocket approach first
      if (socketState && socketState.isReady && socketState.isReady()) {
        console.log("Requesting hint via WebSocket");
        socketState.sendMessage(
          JSON.stringify({
            type: "request_hint",
            player_id: playerId,
            row: row,
            column: col,
            is_hint: true,
          })
        );
      }
      // fall back to REST API if WebSocket isn't available
      else {
        console.log("Requesting hint via REST API");
        const response = await fetch(
          `http://localhost:8000/api/games/${gameId}/get_hint/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              player_id: playerId,
              row: row,
              column: col,
              is_hint: true,
            }),
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to get hint");
        }

        const data = await response.json();
        console.log("Hint received from REST API:", data.value);
        // move will be broadcast via WebSocket or handled by the game state
      }

      // mark that this player has used their hint
      const hintUsedStorageKey = `game_${gameId}_player_${playerId}_hint_used`;
      localStorage.setItem(hintUsedStorageKey, "true");
      setHintUsed(true);

      // clear selected cell after requesting hint
      setSelectedCell(null);
    } catch (error) {
      alert(`Error getting hint: ${error.message}`);
    } finally {
      setIsRequestingHint(false);
    }
  };

  const togglePencilMode = () => {
    setPencilMode(!pencilMode);
  };

  const toggleQuickChat = (event) => {
    if (event) {
      // position the panel near the button
      const buttonRect = event.currentTarget.getBoundingClientRect();
      setQuickChatPosition({
        x: buttonRect.left,
        y: buttonRect.bottom + 10,
      });
    }
    setShowQuickChat(!showQuickChat);
  };

  const sendQuickChatMessage = (message) => {
    if (!message) return;

    // if broadcastQuickChat is available, use it
    if (broadcastQuickChat) {
      broadcastQuickChat(message);
    } else if (socketState && socketState.isReady && socketState.isReady()) {
      // fallback to direct socket communication
      const quickMessage = {
        type: "quick_chat",
        player_id: playerId,
        message: message,
        timestamp: new Date().toISOString(),
      };

      socketState.sendMessage(JSON.stringify(quickMessage));
    }

    // close the quick chat panel
    setShowQuickChat(false);

    // add to local messages for immediate feedback
    addTemporaryMessage({
      type: "quick_chat",
      player_id: playerId,
      player: players.find((p) => p.id === playerId),
      message: message,
      timestamp: new Date().toISOString(),
      id: Date.now(),
    });
  };

  const addTemporaryMessage = (message) => {
    console.log("Adding temporary message:", message);

    // add new message with unique ID
    const messageWithId = {
      ...message,
      id: message.id || Date.now(),
    };

    setTemporaryMessages((prev) => [...prev, messageWithId]);

    // remove message after 3 seconds
    setTimeout(() => {
      setTemporaryMessages((prev) =>
        prev.filter((msg) => msg.id !== messageWithId.id)
      );
    }, 3000);
  };

  const renderNumberPad = () => {
    return (
      <div className="number-pad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => (
          <button
            key={number}
            onClick={() => handleNumberSelect(number)}
            className={pencilMode ? "pencil-mode" : ""}
          >
            {number}
          </button>
        ))}
      </div>
    );
  };

  const renderControlButtons = () => {
    return (
      <div className="control-buttons">
        {/* Pencil Button */}
        <div className={`control-button ${pencilMode ? "active" : ""}`}>
          <button onClick={togglePencilMode} title="Pencil Mode">
            <Pencil size={24} />
          </button>
          <span>Pencil</span>
        </div>

        {/* Hint Button */}
        <div className={`control-button ${hintUsed ? "disabled" : ""}`}>
          <button
            onClick={handleHint}
            title={hintUsed ? "Hint already used" : "Get Hint"}
            disabled={isRequestingHint || hintUsed}
            style={{
              opacity: hintUsed ? (isDarkMode ? "0.6" : "0.5") : "1",
              cursor: "pointer",
            }}
          >
            <EyeOff size={24} />
          </button>
          <span>Hint {hintUsed ? "(Used)" : ""}</span>
        </div>

        {/* QuickChat Button  */}
        <div className={`control-button ${showQuickChat ? "active" : ""}`}>
          <button onClick={toggleQuickChat} title="Quick Chat">
            <MessageCircle size={24} />
          </button>
          <span>Chat</span>
        </div>

        {/* Eraser Button */}
        <div className="control-button eraser-button">
          <button onClick={() => handleNumberSelect(0)} title="Erase">
            <Eraser size={24} />
          </button>
          <span>Eraser</span>
        </div>
      </div>
    );
  };

  const renderQuickChatPanel = () => {
    if (!showQuickChat) return null;

    return (
      <div
        className="quick-chat-panel"
        style={{
          position: "absolute",
          left: `${quickChatPosition.x}px`,
          top: `${quickChatPosition.y}px`,
          zIndex: 1001,
        }}
      >
        <div className="quick-chat-header">
          <h4>Quick Chat</h4>
          <button
            className="close-quick-chat"
            onClick={() => setShowQuickChat(false)}
          >
            &times;
          </button>
        </div>

        <div className="quick-chat-section">
          <h5>Messages</h5>
          <div className="quick-messages">
            {quickChatOptions.messages.map((message, index) => (
              <button
                key={index}
                onClick={() => sendQuickChatMessage(message)}
                className="quick-message-btn"
              >
                {message}
              </button>
            ))}
          </div>
        </div>

        <div className="quick-chat-section">
          <h5>Reactions</h5>
          <div className="quick-emojis">
            {quickChatOptions.emojis.map((emoji, index) => (
              <button
                key={index}
                onClick={() => sendQuickChatMessage(emoji)}
                className="quick-emoji-btn"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderTemporaryMessages = () => {
    if (temporaryMessages.length === 0) return null;

    return (
      <div className="temporary-messages-container">
        {temporaryMessages.map((msg) => {
          const sender =
            msg.player || players.find((p) => p.id === msg.player_id);

          return (
            <div key={msg.id} className="temporary-message">
              <div
                className="temp-message-indicator"
                style={{ backgroundColor: sender?.color || "#666" }}
              ></div>
              <div className="temp-message-content">
                <span className="temp-message-sender">
                  {sender?.name || "Player"}
                </span>
                <span className="temp-message-text">{msg.message}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  useEffect(() => {
    // ketika array moves berubah, simpan info hint cells ke localStorage
    moves?.forEach((move) => {
      if (move.is_hint === true) {
        const cellKey = `${move.row}-${move.column}`;
        const hintKey = `game_${gameId}_hint_cell_${cellKey}`;
        localStorage.setItem(hintKey, "true");
      }
    });
  }, [moves, gameId]);

  return (
    <div className={`board-container ${isDarkMode ? "dark-mode" : ""}`}>
      <div className="sudoku-grid">
        {currentBoard.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const {
              color,
              isCorrect,
              playerId: cellPlayerId,
              hasError,
              isHint,
            } = getCellData(rowIndex, colIndex);
            const isOwner = cellPlayerId === playerId;
            const cellKey = `${rowIndex}-${colIndex}`;
            const cellNotes = pencilNotes[cellKey] || [];

            // properly format focus info from cellFocus state
            let focusInfo = null;
            if (
              cellFocus &&
              cellFocus[cellKey] &&
              cellFocus[cellKey].focus_type === "focus"
            ) {
              const focusData = cellFocus[cellKey];

              // tampilkan semua fokus, tidak perlu menyaring berdasarkan ID pemain
              focusInfo = {
                playerName:
                  players.find((p) => p.id === focusData.player_id)?.name ||
                  focusData.player?.name ||
                  focusData.playerName ||
                  "Player",
                color:
                  players.find((p) => p.id === focusData.player_id)?.color ||
                  focusData.player?.color ||
                  focusData.color ||
                  "#ff5722",
                playerId: focusData.player_id,
              };
            }

            return (
              <Cell
                key={`${rowIndex}-${colIndex}`}
                value={cell}
                row={rowIndex}
                col={colIndex}
                isInitial={initialBoard[rowIndex][colIndex] !== 0}
                isSelected={
                  selectedCell?.row === rowIndex &&
                  selectedCell?.col === colIndex
                }
                isHighlighted={cell !== 0 && cell === highlightedNumber}
                onCellClick={handleCellClick}
                playerColor={hasError ? "red" : color}
                hasError={hasError}
                isCorrect={isCorrect === true}
                isOwner={isOwner}
                pencilNotes={cellNotes}
                isHint={isHint}
                focusInfo={focusInfo}
                onFocus={() => handleCellFocus(rowIndex, colIndex)}
                onBlur={() => handleCellBlur(rowIndex, colIndex)}
                playerId={playerId}
                isDarkMode={isDarkMode}
              />
            );
          })
        )}
      </div>

      {renderControlButtons()}
      {renderNumberPad()}
      {renderQuickChatPanel()}
      {renderTemporaryMessages()}
    </div>
  );
};

export default Board;
