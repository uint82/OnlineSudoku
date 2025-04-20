import React from 'react';

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
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '10px',
        maxWidth: '500px',
        width: '90%',
        textAlign: 'center',
        boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)',
        animation: 'fade-in 0.5s'
      }}>
        {/* Header */}
        <h2 style={{ 
          color: '#4CAF50', 
          marginBottom: '15px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span role="img" aria-label="trophy" style={{ fontSize: '24px' }}>🏆</span> 
          Congratulations! 
          <span role="img" aria-label="trophy" style={{ fontSize: '24px' }}>🏆</span>
        </h2>
        
        <div style={{ 
          marginBottom: '20px',
          fontSize: '18px'
        }}>
          You and your team have successfully completed the Sudoku puzzle!
        </div>
        
        {/* Top Contributors Section */}
        <h3 style={{ 
          color: '#2196F3', 
          marginBottom: '15px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px',
          position: 'relative'
        }}>
          <span role="img" aria-label="star">⭐</span> 
          Top Contributors 
          <span role="img" aria-label="star">⭐</span>
        </h3>
        
        {/* Line separator */}
        <div style={{ 
          height: '2px', 
          backgroundColor: '#E0E0E0', 
          margin: '0 0 20px 0',
          width: '100%'
        }}></div>
        
        {/* Contributors display */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '15px',
          marginBottom: '25px',
          flexWrap: 'wrap'
        }}>
          {topContributors.map((player, index) => {
            const colors = ['#FFD700', '#C0C0C0', '#CD7F32']; // Gold, Silver, Bronze
            const backgroundColor = index < 3 ? colors[index] : '#f0f0f0';
            
            return (
              <div key={player.id} style={{ 
                width: '120px',
                padding: '15px 5px',
                backgroundColor: backgroundColor,
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                position: 'relative',
                border: player.id === playerId ? '3px solid #2196F3' : 'none',
              }}>
                {/* Rank number with icon */}
                <div style={{ 
                  position: 'absolute',
                  top: -5,
                  left: 'calc(50% - 12px)',
                  width: '24px',
                  height: '24px',
                  backgroundColor: '#fff',
                  borderRadius: '50%',
                  border: '2px solid ' + (index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32'),
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  color: '#333'
                }}>
                  {index + 1}
                </div>
                
                {/* Player initial circle */}
                <div style={{ 
                  width: '50px',
                  height: '50px',
                  backgroundColor: player.color || '#3498db',
                  borderRadius: '50%',
                  margin: '10px auto',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '24px'
                }}>
                  {player.name.charAt(0).toUpperCase()}
                </div>
                
                {/* Player rank name */}
                <div style={{ 
                  fontWeight: 'bold',
                  fontSize: '16px',
                  marginBottom: '5px'
                }}>
                  {index === 0 ? 'Best' : index === 1 ? 'Second' : 'Third'}
                </div>
                
                {/* Player moves count */}
                <div style={{ fontSize: '14px' }}>
                  {player.contributions} {player.contributions === 1 ? 'move' : 'moves'}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Team Members Section */}
        <h3 style={{ 
          color: '#9C27B0',
          marginBottom: '15px' 
        }}>
          Team Members
        </h3>
        
        {/* Line separator */}
        <div style={{ 
          height: '2px', 
          backgroundColor: '#E0E0E0', 
          margin: '0 0 20px 0',
          width: '100%'
        }}></div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '10px', 
          flexWrap: 'wrap',
          marginBottom: '25px'
        }}>
          {players.map(player => (
            <div 
              key={player.id} 
              style={{ 
                padding: '6px 12px', 
                backgroundColor: player.color || '#3498db', 
                color: '#fff',
                borderRadius: '20px',
                fontWeight: player.id === playerId ? 'bold' : 'normal'
              }}
            >
              {player.name} {player.is_host ? '(Host)' : ''}
            </div>
          ))}
        </div>
        
        {/* Game Stats */}
        <div style={{
          marginBottom: '20px',
          padding: '10px',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px'
        }}>
          <h4 style={{ 
            margin: '0 0 10px 0',
            color: '#333',
            fontSize: '16px'
          }}>
            Game Stats
          </h4>
          <div style={{ fontSize: '14px', lineHeight: '1.5' }}>
            Total Correct Moves: {totalCorrectMoves}
            <br />
            Total Players: {players.length}
          </div>
        </div>
        
        {/* Close button */}
        <button 
          onClick={onClose}
          style={{
            backgroundColor: '#4CAF50',
            color: 'white',
            padding: '10px 30px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            transition: 'all 0.2s ease'
          }}
        >
          Close
        </button>
        
        <style>
          {`
            @keyframes fade-in {
              from { opacity: 0; transform: translateY(-20px); }
              to { opacity: 1; transform: translateY(0); }
            }
            
            button:hover {
              background-color: #45a049;
              transform: translateY(-2px);
              box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            }
            
            button:active {
              transform: translateY(0);
            }
          `}
        </style>
      </div>
    </div>
  );
};

export default Popup;
