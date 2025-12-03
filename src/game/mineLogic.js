import { getNeighbors } from './board.js';

export function getMineCount(difficulty) {
    const ranges = {
        easy: [9, 13],
        medium: [24, 28],
        hard: [45, 50]
    };
    const range = ranges[difficulty] || ranges.easy;
    const [min, max] = range;
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function placeMines(grid, count) {
    const rows = grid.length;
    const cols = grid[0].length;
    const mines = [];

    const activeCells = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c].isActive) {
                activeCells.push(grid[r][c]);
            }
        }
    }

    activeCells.sort(() => Math.random() - 0.5);

    for (let i = 0; i < Math.min(count, activeCells.length); i++) {
        activeCells[i].isMine = true;
        mines.push({ r: activeCells[i].r, c: activeCells[i].c });
    }

    return mines;
}

export function moveMines(grid, mines) {
    let moved = false;

    // Track current mine positions to avoid collision
    const mineMap = new Set(mines.map(m => `${m.r},${m.c}`));

    for (let i = 0; i < mines.length; i++) {
        const minePos = mines[i];
        const cell = grid[minePos.r][minePos.c];

        // Rule: Cannot move if FLAGGED (Player secured it).
        if (cell.flagState === 1) continue;

        // Get valid moves (Radius 1 neighbors)
        // Rule: Move 1 step.
        // Rule: Cannot move to revealed cells.
        // Rule: Cannot move to existing mines.
        const neighbors = getNeighbors(grid, minePos.r, minePos.c, 1);
        const validMoves = neighbors.filter(n =>
            !n.isRevealed &&
            !n.isMine &&
            !mineMap.has(`${n.r},${n.c}`)
        );

        // Add "Stay" option
        validMoves.push(cell);

        const target = validMoves[Math.floor(Math.random() * validMoves.length)];

        if (target !== cell) {
            cell.isMine = false;
            target.isMine = true;

            mineMap.delete(`${minePos.r},${minePos.c}`);
            mineMap.add(`${target.r},${target.c}`);
            mines[i] = { r: target.r, c: target.c };
            moved = true;
        }
    }

    return moved;
}
