import React, { useState, useEffect } from "react";
import axios from "axios";
import { Copy, Check } from "lucide-react";

const GameControls = ({ difficulty, playerName, isHost, gameId }) => {
  const [qrCode, setQrCode] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [showQrCode, setShowQrCode] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (gameId) {
      fetchQrCode();
    }
  }, [gameId]);

  const fetchQrCode = async () => {
    try {
      const response = await axios.get(
        `http://localhost:8000/api/games/${gameId}/qr_code/`
      );
      setQrCode(response.data.qr_code);
      setShareUrl(response.data.share_url);
    } catch (error) {
      console.error("Error fetching QR code:", error);
    }
  };

  const toggleQrCode = () => {
    setShowQrCode(!showQrCode);
  };

  const copyToClipboard = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div style={{ margin: "20px auto", textAlign: "center" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "20px",
          maxWidth: "600px",
          margin: "0 auto",
          padding: "15px",
          backgroundColor: "#f8f9fa",
          borderRadius: "5px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <span
            style={{
              backgroundColor:
                difficulty === "easy"
                  ? "#4CAF50"
                  : difficulty === "medium"
                  ? "#FFC107"
                  : "#F44336",
              color: "white",
              padding: "5px 10px",
              borderRadius: "4px",
              fontWeight: "bold",
            }}
          >
            {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <span>Playing as:</span>
          <strong>{playerName}</strong>
          {isHost && (
            <span
              style={{
                backgroundColor: "#9C27B0",
                color: "white",
                fontSize: "12px",
                padding: "2px 6px",
                borderRadius: "10px",
              }}
            >
              Host
            </span>
          )}
        </div>
        <button
          onClick={toggleQrCode}
          style={{
            backgroundColor: "#2196F3",
            color: "white",
            border: "none",
            borderRadius: "4px",
            padding: "5px 10px",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          {showQrCode ? "Hide QR" : "Share Game"}
        </button>
      </div>

      {showQrCode && qrCode && (
        <div
          style={{
            margin: "15px auto",
            padding: "15px",
            backgroundColor: "white",
            borderRadius: "5px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            maxWidth: "250px",
          }}
        >
          <div>
            <img
              src={qrCode}
              alt="QR Code"
              style={{ width: "150px", height: "150px", margin: "0 auto" }}
            />
          </div>
          <p style={{ margin: "10px 0 5px", fontSize: "14px", color: "#666" }}>
            Scan or Copy link to join the game
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              marginTop: "10px",
              justifyContent: "center",
            }}
          >
            <button
              onClick={copyToClipboard}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                backgroundColor: copied ? "#4CAF50" : "#2196F3",
                color: "white",
                border: "none",
                borderRadius: "4px",
                padding: "6px 12px",
                cursor: "pointer",
                fontSize: "14px",
                transition: "background-color 0.3s",
              }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Copied!" : "Copy Invite Link"}
            </button>
          </div>
          <div
            style={{
              fontSize: "12px",
              padding: "5px",
              backgroundColor: "#f5f5f5",
              borderRadius: "3px",
              wordBreak: "break-all",
              margin: "10px 0 0",
              color: "#666",
            }}
          >
            {shareUrl}
          </div>
        </div>
      )}
    </div>
  );
};

export default GameControls;
