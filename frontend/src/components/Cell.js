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
  hasError 
}) => {
  const cellStyle = {
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #ccc',
    fontWeight: isInitial ? 'bold' : 'normal',
    backgroundColor: hasError ? '#ffcccc' : isHighlighted ? '#6FA6CD' : isSelected ? '#f0f0f0' : 'white',
    cursor: isInitial ? 'default' : 'pointer',
    color: hasError ? 'red' : (isInitial ? 'black' : playerColor || '#666'),
    transition: 'background-color 0.2s'
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
    // allow clicking on any cell for highlighting, but only edit non-initial cells
    onCellClick(row, col);
  };

  return (
    <div 
      style={cellStyle} 
      onClick={handleClick}
    >
      {value > 0 ? value : ''}
    </div>
  );
};

export default Cell;
