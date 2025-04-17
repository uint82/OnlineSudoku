import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';

const Invite = ({ gameId }) => {
  const [qrCode, setQrCode] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (gameId) {
      fetchQrCode();
    }
  }, [gameId]);

  const fetchQrCode = async () => {
    try {
      const response = await axios.get(`http://localhost:8000/api/games/${gameId}/qr_code/`);
      setQrCode(response.data.qr_code);
      setShareUrl(response.data.share_url);
    } catch (error) {
      console.error('Error fetching QR code:', error);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!gameId) return null;

  return (
    <div style={{ textAlign: 'center', margin: '20px' }}>
      <h3>Invite Friends</h3>
      <div>
        {qrCode ? (
          <div>
            <div>
              <img src={qrCode} alt="QR Code" style={{ width: '200px', height: '200px' }} />
            </div>
            <div style={{ margin: '10px 0' }}>
              <p>Or share this link:</p>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  style={{ width: '250px', marginRight: '10px', padding: '5px' }}
                />
                <button onClick={copyToClipboard}>
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p>Loading invite options...</p>
        )}
      </div>
    </div>
  );
};

export default Invite;
