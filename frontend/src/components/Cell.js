import React, { useRef, useEffect } from "react";
import "./Cell.css";

const Cell = ({
  value,
  row,
  col,
  isInitial,
  isSelected,
  isHighlighted,
  onCellClick,
  playerColor,
  hasError,
  isCorrect,
  isOwner,
  pencilNotes = [],
  isHint,
  focusInfo,
  onFocus,
  onBlur,
  playerId,
}) => {
  const cellRef = useRef(null);
  const isLocked = isInitial || isCorrect;

  // for debugging
  useEffect(() => {
    if (focusInfo) {
      console.log(`Cell ${row}-${col} has focus from player:`, focusInfo);
    }
  }, [focusInfo, row, col]);

  const handleCellFocus = () => {
    if (onFocus) onFocus();
  };

  const handleCellBlur = () => {
    if (onBlur) onBlur();
  };

  const cellClassNames = [
    "sudoku-cell",
    isHint ? "hint-cell" : "",
    isSelected ? "selected-cell" : "",
    isHighlighted ? "highlighted-cell" : "",
    isLocked ? "locked-cell" : "",
    hasError ? "error-cell" : "",
    isCorrect ? "correct-cell" : "",
    isOwner ? "owner-cell" : "",
    focusInfo ? "cell-with-focus" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const cellStyle = {
    width: "40px",
    height: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid #ccc",
    fontWeight: isInitial || isCorrect ? "bold" : "normal",
    backgroundColor: hasError
      ? "#ffcccc"
      : isSelected
      ? "#6FA6CD"
      : isHighlighted
      ? "#6FA6CD"
      : isCorrect
      ? "#d4edda"
      : "white",
    cursor: isLocked ? "default" : "pointer",
    color: hasError
      ? "red"
      : isInitial
      ? "black"
      : isCorrect
      ? "#28a745"
      : playerColor || "#666",
    transition: "background-color 0.2s",
    position: "relative",
    outline: "none",

    ...(focusInfo && {
      boxShadow: `0 0 0 2px ${focusInfo.color || "#ff5722"}`,
    }),
  };

  // add border styling to create the 3x3 boxes
  if (row % 3 === 0) {
    cellStyle.borderTop = "2px solid #333";
  }
  if (col % 3 === 0) {
    cellStyle.borderLeft = "2px solid #333";
  }
  if (row === 8) {
    cellStyle.borderBottom = "2px solid #333";
  }
  if (col === 8) {
    cellStyle.borderRight = "2px solid #333";
  }

  const handleClick = () => {
    onCellClick(row, col, isLocked);
    // focus the div when clicked
    if (cellRef.current) {
      cellRef.current.focus();
    }
  };

  // render pencil notes in a 3x3 grid
  const renderPencilNotes = () => {
    if (value > 0 || pencilNotes.length === 0) return null;

    const gridStyle = {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gridTemplateRows: "repeat(3, 1fr)",
      width: "100%",
      height: "100%",
      fontSize: "10px",
      color: "#666",
    };

    return (
      <div style={gridStyle}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <div
            key={num}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {pencilNotes.includes(num) ? num : ""}
          </div>
        ))}
      </div>
    );
  };

  // render focus indicator with improved styling for better visibility
  const renderFocusIndicator = () => {
    if (!focusInfo) return null;

    // tentukan apakah ini fokus dari sendiri atau pemain lain
    const isSelfFocus = focusInfo.playerId === playerId;

    // style khusus untuk fokus
    const borderColor = isSelfFocus
      ? "rgba(0, 119, 255, 0.8)"
      : focusInfo.color || "#ff5722";
    const bgColor = isSelfFocus
      ? "rgba(0, 119, 255, 0.1)"
      : `${focusInfo.color || "#ff5722"}30`;
    const shadowColor = isSelfFocus
      ? "rgba(0, 119, 255, 0.5)"
      : focusInfo.color || "#ff5722";

    return (
      <div
        className="focus-indicator"
        style={{
          position: "absolute",
          top: -3,
          left: -3,
          right: -3,
          bottom: -3,
          border: `3px solid ${borderColor}`,
          borderRadius: "4px",
          pointerEvents: "none",
          zIndex: 10,
          boxShadow: `0 0 10px ${shadowColor}`,
          animation: "pulse-border 1.5s infinite",
          backgroundColor: bgColor,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -13,
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: focusInfo.color || "#ff5722",
            color: "white",
            fontSize: "11px",
            padding: "1px 6px",
            borderRadius: "10px",
            whiteSpace: "nowrap",
            zIndex: 11,
            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
            fontWeight: "bold",
            textShadow: "0 1px 1px rgba(0,0,0,0.4)",
            minWidth: "40px",
            textAlign: "center",
          }}
        >
          {focusInfo.playerName || "Player"}
        </div>
      </div>
    );
  };

  return (
    <div
      ref={cellRef}
      style={cellStyle}
      onClick={handleClick}
      tabIndex={0}
      className={cellClassNames}
      onFocus={handleCellFocus}
      onBlur={handleCellBlur}
    >
      {value > 0 ? value : renderPencilNotes()}
      {renderFocusIndicator()}
    </div>
  );
};

export default Cell;
