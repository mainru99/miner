export function createBoard(rows, cols, shape, difficulty) {
    const actualShape = (difficulty === 'medium' || difficulty === 'hard') ? 'square' : shape;

    const grid = [];
    for (let r = 0; r < rows; r++) {
        const row = [];
        for (let c = 0; c < cols; c++) {
            row.push({
                r, c,
                isMine: false,
                isRevealed: false,
                flagState: 0,
                neighborMines: 0,
                distanceHint: 0,
                isActive: isCellActive(r, c, rows, cols, actualShape)
            });
        }
        grid.push(row);
    }
    return grid;
}

function isCellActive(r, c, rows, cols, shape) {
    if (shape === 'square') return true;

    if (shape === 'snake') {
        const h = Math.floor(rows / 5);
        if (r < h) return true;
        if (r < h * 2 && c >= cols - h * 2) return true;
        if (r >= h * 2 && r < h * 3) return true;
        if (r >= h * 3 && r < h * 4 && c < h * 2) return true;
        if (r >= h * 4) return true;
        return false;
    }

    if (shape === 'block') {
        const w = Math.floor(cols / 3);
        if (c < w || c >= cols - w) return true;
        if (r >= Math.floor(rows / 2) - 1 && r <= Math.floor(rows / 2) + 1) return true;
        return false;
    }

    return true;
}

export function revealCell(grid, r, c) {
    const cell = grid[r][c];
    if (!cell.isActive || cell.isRevealed || cell.flagState === 1) return 0;

    cell.isRevealed = true;
    let score = 10;

    const dist1 = countMines(grid, r, c, 1);

    // Flood fill if no mines in radius 1 (Standard Minesweeper logic)
    // This includes cells that might have Red/Blue hints, as long as immediate neighbors are safe.
    if (dist1 === 0) {
        const neighbors = getNeighbors(grid, r, c, 1);
        neighbors.forEach(n => {
            if (!n.isRevealed && !n.isFlagged) {
                score += revealCell(grid, n.r, n.c);
            }
        });
    }

    return score;
}

export function toggleFlag(cell) {
    if (!cell.isRevealed) {
        cell.flagState = (cell.flagState + 1) % 3;
    }
}

export function checkWinCondition(grid, totalMines) {
    let revealedCount = 0;
    let activeCells = 0;

    grid.flat().forEach(cell => {
        if (cell.isActive) {
            activeCells++;
            if (cell.isRevealed) revealedCount++;
        }
    });

    return revealedCount === (activeCells - totalMines);
}

export function getNeighbors(grid, r, c, radius) {
    const neighbors = [];
    const rows = grid.length;
    const cols = grid[0].length;

    for (let i = -radius; i <= radius; i++) {
        for (let j = -radius; j <= radius; j++) {
            if (i === 0 && j === 0) continue;
            const dist = Math.max(Math.abs(i), Math.abs(j));
            if (dist === radius) {
                const nr = r + i;
                const nc = c + j;
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc].isActive) {
                    neighbors.push(grid[nr][nc]);
                }
            }
        }
    }
    return neighbors;
}

function countMines(grid, r, c, radius) {
    const neighbors = getNeighbors(grid, r, c, radius);
    return neighbors.filter(n => n.isMine).length;
}

export function calculateCellValues(grid) {
    const rows = grid.length;
    const cols = grid[0].length;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cell = grid[r][c];
            if (!cell.isActive || cell.isMine) continue;

            const mines1 = countMines(grid, r, c, 1);
            if (mines1 > 0) {
                cell.neighborMines = mines1;
                cell.distanceHint = 0;
                continue;
            }

            const mines2 = countMines(grid, r, c, 2);
            if (mines2 > 0) {
                cell.neighborMines = 0;
                cell.distanceHint = 2;
                continue;
            }

            const mines3 = countMines(grid, r, c, 3);
            if (mines3 > 0) {
                cell.neighborMines = 0;
                cell.distanceHint = 3;
                continue;
            }

            cell.neighborMines = 0;
            cell.distanceHint = 0;
        }
    }
}
