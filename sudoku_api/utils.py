import random
import copy

def generate_sudoku(difficulty='medium'):
    """Generate a Sudoku puzzle and the solution."""
    # generate an empty 9x9 grid
    grid = [[0 for _ in range(9)] for _ in range(9)]
    
    for box in range(0, 9, 3):
        fill_box(grid, box, box)
    
    solve_sudoku(grid)
    
    # create a copy of the solved grid as the solution
    solution = copy.deepcopy(grid)
    
    # create puzzle by removing numbers based on difficulty
    if difficulty == 'easy':
        cells_to_remove = 40  # leave ~41 clues
    elif difficulty == 'medium':
        cells_to_remove = 50  # leave ~31 clues
    else:  # hard
        cells_to_remove = 60  # leave ~21 clues
    
    # removing the numbers
    puzzle = copy.deepcopy(solution)
    remove_numbers(puzzle, cells_to_remove)
    
    return {
        'puzzle': puzzle,
        'solution': solution,
        'difficulty': difficulty
    }

def fill_box(grid, row, col):
    """Fill a 3x3 box with numbers 1-9."""
    nums = list(range(1, 10))
    random.shuffle(nums)
    
    for i in range(3):
        for j in range(3):
            grid[row + i][col + j] = nums.pop()

def is_valid(grid, row, col, num):
    """Check if a number can be placed at grid[row][col]."""
    # check row
    for x in range(9):
        if grid[row][x] == num:
            return False
    
    # check column
    for x in range(9):
        if grid[x][col] == num:
            return False
    
    # check 3x3 box
    start_row, start_col = 3 * (row // 3), 3 * (col // 3)
    for i in range(3):
        for j in range(3):
            if grid[i + start_row][j + start_col] == num:
                return False
    
    return True

def solve_sudoku(grid):
    """Solve the Sudoku grid using backtracking."""
    for i in range(9):
        for j in range(9):
            if grid[i][j] == 0:
                for num in range(1, 10):
                    if is_valid(grid, i, j, num):
                        grid[i][j] = num
                        if solve_sudoku(grid):
                            return True
                        grid[i][j] = 0
                return False
    return True

def remove_numbers(grid, count):
    """Remove numbers from the grid to create a puzzle."""
    cells = [(i, j) for i in range(9) for j in range(9)]
    random.shuffle(cells)
    
    for i, j in cells[:count]:
        grid[i][j] = 0
