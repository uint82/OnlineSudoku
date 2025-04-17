import React from 'react';

const GameControls = ({ difficulty, playerName, isHost }) => {
  return (
    <div style={{ margin: '20px 0', textAlign: 'center' }}>
      <div style={{ marginBottom: '10px' }}>
        <strong>Difficulty:</strong> {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
      </div>
      <div>
        <strong>Playing as:</strong> {playerName} {isHost ? '(Host)' : ''}
      </div>
    </div>
  );
};

export default GameControls;
