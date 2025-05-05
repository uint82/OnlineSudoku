import React, { useState, useRef, useEffect } from "react";
import {
  UserIcon,
  LinkIcon,
  LogOut,
  ChevronDown,
  Menu,
  Moon,
  Sun,
} from "lucide-react";
import axios from "axios";

const Navbar = ({
  playerName,
  playerId,
  gameId,
  onLeaveGame,
  playerColor,
  isDarkMode,
  toggleDarkMode,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef(null);

  // fetch the share URL when component mounts
  useEffect(() => {
    if (gameId) {
      fetchShareUrl();
    }
  }, [gameId]);

  // close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const fetchShareUrl = async () => {
    try {
      const response = await axios.get(
        `http://localhost:8000/api/games/${gameId}/qr_code/`
      );
      setShareUrl(response.data.share_url);
    } catch (error) {
      console.error("Error fetching share URL:", error);
    }
  };

  const copyToClipboard = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const handleToggleDarkMode = () => {
    if (toggleDarkMode) {
      toggleDarkMode();
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 20px",
        backgroundColor: isDarkMode ? "#1a1a1a" : "#2c3e50",
        color: "white",
        boxShadow: isDarkMode
          ? "0 2px 4px rgba(0,0,0,0.3)"
          : "0 2px 4px rgba(0,0,0,0.1)",
        position: "relative",
        zIndex: 1000,
        marginBottom: "15px",
      }}
    >
      {/* Left side - Title */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          fontWeight: "bold",
          fontSize: "1.25rem",
        }}
      >
        <span>Sudoku Squad</span>
      </div>

      {/* Right side - User menu */}
      <div ref={dropdownRef} style={{ position: "relative" }}>
        <button
          onClick={toggleDropdown}
          style={{
            display: "flex",
            alignItems: "center",
            backgroundColor: "transparent",
            border: "none",
            color: "white",
            padding: "8px 12px",
            fontSize: "0.9rem",
            cursor: "pointer",
            borderRadius: "4px",
            gap: "8px",
          }}
        >
          {playerColor && (
            <div
              style={{
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                backgroundColor: playerColor,
                marginRight: "5px",
              }}
            />
          )}
          <UserIcon size={18} />
          <span>{playerName || "Player"}</span>
          <ChevronDown size={16} />
        </button>

        {showDropdown && (
          <div
            style={{
              position: "absolute",
              right: 0,
              top: "calc(100% + 5px)",
              backgroundColor: isDarkMode ? "#2c2c2c" : "white",
              borderRadius: "4px",
              boxShadow: isDarkMode
                ? "0 2px 10px rgba(0,0,0,0.5)"
                : "0 2px 10px rgba(0,0,0,0.2)",
              width: "220px",
              color: isDarkMode ? "#e0e0e0" : "#333",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "12px 16px",
                borderBottom: isDarkMode ? "1px solid #444" : "1px solid #eee",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                }}
              >
                {/* Player info container */}
                <div style={{ display: "flex", alignItems: "center" }}>
                  {/* Color indicator */}
                  <div
                    style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "50%",
                      backgroundColor: playerColor || "#cccccc",
                      marginRight: "12px",
                      flexShrink: 0,
                    }}
                  />

                  {/* Name and ID container */}
                  <div>
                    <div
                      style={{
                        fontSize: "0.9rem",
                        fontWeight: "bold",
                        lineHeight: "1.2",
                        marginBottom: "4px",
                        textAlign: "left",
                      }}
                    >
                      {playerName}
                    </div>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: isDarkMode ? "#aaa" : "#666",
                        lineHeight: "1",
                        textAlign: "left",
                      }}
                    >
                      ID: {playerId ? playerId.substring(0, 8) : ""}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: "8px 0" }}>
              {/* Dark Mode Toggle */}
              <button
                className="dark-mode-toggle"
                onClick={handleToggleDarkMode}
                style={{
                  color: isDarkMode ? "#e0e0e0" : "#333",
                }}
              >
                {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
                <span style={{ marginLeft: "10px" }}>
                  {isDarkMode ? "Mode Terang" : "Mode Gelap"}
                </span>
                <div
                  className="toggle-track"
                  style={{
                    marginLeft: "auto",
                    backgroundColor: isDarkMode ? "#007bff" : "#ccc",
                  }}
                >
                  <div
                    className="toggle-thumb"
                    style={{
                      transform: isDarkMode
                        ? "translateX(20px)"
                        : "translateX(0)",
                    }}
                  />
                </div>
              </button>

              <button
                onClick={copyToClipboard}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  width: "100%",
                  textAlign: "left",
                  backgroundColor: "transparent",
                  border: "none",
                  padding: "10px 16px",
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  color: isDarkMode ? "#e0e0e0" : "#333",
                }}
              >
                <LinkIcon size={16} />
                <span>{copied ? "Link copied!" : "Copy invite link"}</span>
              </button>

              <button
                onClick={onLeaveGame}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  width: "100%",
                  textAlign: "left",
                  backgroundColor: "transparent",
                  border: "none",
                  padding: "10px 16px",
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  color: "#e74c3c",
                }}
              >
                <LogOut size={16} />
                <span>Leave Game</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Navbar;
