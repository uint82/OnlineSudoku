import React from 'react';

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
  isHint
}) => {
  
  const isLocked = isInitial || isCorrect;
  
  const cellStyle = {
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #ccc',
    fontWeight: isInitial || isCorrect ? 'bold' : 'normal',
    backgroundColor: hasError ? '#ffcccc' : 
                   isSelected ? '#6FA6CD' :  
                   isHighlighted ? '#6FA6CD' : 
                   isCorrect ? '#d4edda' : 'white',
    cursor: isLocked ? 'default' : 'pointer',
    color: hasError ? 'red' : 
           isInitial ? 'black' : 
           isCorrect ? '#28a745' : playerColor || '#666',
    transition: 'background-color 0.2s',
    position: 'relative'
  };

  // add border styling to create the 3x3 boxes
  if (row % 3 === 0) {
    cellStyle.borderTop = '2px solid #333';
  }
  if (col % 3 === 0) {
    cellStyle.borderLeft = '2px solid #333';
  }
  if (row === 8) {
    cellStyle.borderBottom = '2px solid #333';
  }
  if (col === 8) {
    cellStyle.borderRight = '2px solid #333';
  }

  const handleClick = () => {
    onCellClick(row, col, isLocked);
  };

  // render pencil notes in a 3x3 grid
  const renderPencilNotes = () => {
    if (value > 0 || pencilNotes.length === 0) return null;
    
    const gridStyle = {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gridTemplateRows: 'repeat(3, 1fr)',
      width: '100%',
      height: '100%',
      fontSize: '10px',
      color: '#666'
    };
    
    return (
      <div style={gridStyle}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <div 
            key={num}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {pencilNotes.includes(num) ? num : ''}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div 
      style={cellStyle} 
      onClick={handleClick}
    >
      {value > 0 ? value : renderPencilNotes()}
    </div>
  );
};

export default Cell;
