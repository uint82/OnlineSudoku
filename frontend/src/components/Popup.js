import React from 'react';
import './Popup.css';

const Popup = ({ show, onClose, players, playerId, moves = [] }) => {
  if (!show) return null;
  
  // find current player in the players list
  const currentPlayer = players.find(p => p.id === playerId) || {};

  console.log('Moves:', moves); // debug
  console.log('Players:', players); // debug
  
  // count contributions per player based on correct moves
  const playerContributions = {};
  players.forEach(player => {
    playerContributions[player.id] = 0;
  });

  console.log("Player IDs initialized:", Object.keys(playerContributions)); // debug
  
  // calculate contributions based on correct moves
  moves.forEach(move => {
    console.log("Processing move:", move);
    
    // get player id from either move.player_id or move.player.id
    const playerId = move.player_id || (move.player && move.player.id);
    
    if (playerId && move.is_correct === true) {
      // check if this player id exists in our contributions object
      if (playerContributions.hasOwnProperty(playerId)) {
        playerContributions[playerId] += 1;
      } else {
        console.log("Player ID not found:", playerId);
      }
    }
  });

  console.log('Player contributions:', playerContributions); // debug
  
  // create sorted contributors array
  const sortedContributors = players
    .map(player => ({
      ...player,
      contributions: playerContributions[player.id] || 0
    }))
    .sort((a, b) => b.contributions - a.contributions);
  
  // get top 3 contributors. all if less than 3
  const topContributors = sortedContributors.slice(0, 3);
  
  // total correct moves
  const totalCorrectMoves = moves.filter(m => m.is_correct === true).length;
  
  // determine rank names
  const getRankName = (index) => {
    return index === 0 ? 'Best' : index === 1 ? 'Second' : 'Third';
  };
  
  // determine rank badge classes
  const getRankBadgeClass = (index) => {
    if (index === 0) return 'gold-rank';
    if (index === 1) return 'silver-rank';
    return 'bronze-rank';
  };
  
  return (
    <div className="popup-overlay">
      <div className="popup-container">
        {/* Header */}
        <h2 className="popup-header">
          <span role="img" aria-label="trophy" style={{ fontSize: '24px' }}>🏆</span> 
          Congratulations! 
          <span role="img" aria-label="trophy" style={{ fontSize: '24px' }}>🏆</span>
        </h2>
        
        <div className="popup-message">
          You and your team have successfully completed the Sudoku puzzle!
        </div>
        
        {/* Top Contributors Section */}
        <h3 className="section-header">
          <span role="img" aria-label="star">⭐</span> 
          Top Contributors 
          <span role="img" aria-label="star">⭐</span>
        </h3>
        
        {/* Line separator */}
        <div className="separator-line"></div>
        
        {/* Contributors display */}
        <div className="contributors-container">
          {topContributors.map((player, index) => {
            const colors = ['#FFD700', '#C0C0C0', '#CD7F32']; // Gold, Silver, Bronze
            const backgroundColor = index < 3 ? colors[index] : '#f0f0f0';
            
            return (
              <div 
                key={player.id} 
                className={`contributor-card ${player.id === playerId ? 'current-player' : ''}`} 
                style={{ backgroundColor }}
              >
                {/* Rank number with icon */}
                <div className={`rank-badge ${getRankBadgeClass(index)}`}>
                  {index + 1}
                </div>
                
                {/* Player initial circle */}
                <div 
                  className="player-initial"
                  style={{ backgroundColor: player.color || '#3498db' }}
                >
                  {player.name.charAt(0).toUpperCase()}
                </div>
                
                {/* Player rank name */}
                <div className="player-rank">
                  {getRankName(index)}
                </div>
                
                {/* Player moves count */}
                <div className="player-score">
                  {player.contributions} {player.contributions === 1 ? 'move' : 'moves'}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Team Members Section */}
        <h3 className="section-header purple">
          Team Members
        </h3>
        
        {/* Line separator */}
        <div className="separator-line"></div>
        
        <div className="team-members-container">
          {players.map(player => (
            <div 
              key={player.id} 
              className="member-tag"
              style={{ 
                backgroundColor: player.color || '#3498db',
                fontWeight: player.id === playerId ? 'bold' : 'normal'
              }}
            >
              {player.name} {player.is_host ? '(Host)' : ''}
            </div>
          ))}
        </div>
        
        {/* Game Stats */}
        <div className="game-stats">
          <h4 className="stats-header">
            Game Stats
          </h4>
          <div className="stats-content">
            Total Correct Moves: {totalCorrectMoves}
            <br />
            Total Players: {players.length}
          </div>
        </div>
        
        {/* Close button */}
        <button 
          onClick={onClose}
          className="close-button"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default Popup;
