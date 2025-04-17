import React from 'react';

const Cell = ({ 
  value, 
  row, 
  col, 
  isInitial, 
  isSelected, 
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
    backgroundColor: isSelected ? '#f0f0f0' : 'white',
    cursor: isInitial ? 'default' : 'pointer',
    color: hasError ? 'red' : (isInitial ? 'black' : playerColor || '#666'),
  };

  // Add border styling to create the 3x3 boxes
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
    if (!isInitial) {
      onCellClick(row, col);
    }
  };

  return (
    
      {value > 0 ? value : ''}
    
  );
};

export default Cell;
