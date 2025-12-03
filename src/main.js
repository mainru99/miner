import './style.css';
import { createBoard, revealCell, toggleFlag, checkWinCondition, calculateCellValues, getNeighbors } from './game/board.js';
import { placeMines, moveMines, getMineCount } from './game/mineLogic.js';
import { renderBoard, updateTimer, updateMineCount, showMessage, switchScreen, showGameOverPopup, updateMoveCount, initBackground, renderIntroRankings } from './ui/renderer.js';
import { sounds, initAudio } from './game/audio.js';
import { saveScore } from './game/storage.js';

const state = {
  difficulty: 'easy',
  shape: 'square',
  grid: [],
  mines: [],
  rows: 0,
  cols: 0,
  mineCount: 0,
  timeLeft: 0,
  score: 0,
  timerId: null,
  moveTimerId: null,
  countdownId: null,
  isGameOver: false,
  movesLeft: 0,
  movesSinceLastClick: 0,
  totalMoveBudget: 0,
  moveInterval: 0
};

const CONFIG = {
  easy: {
    time: 90,
    size: 10,
    mineRange: [9, 13],
    moveInterval: 6,
    maxMoves: 10
  },
  medium: {
    time: 150,
    size: 15,
    mineRange: [24, 28],
    moveInterval: 12,
    maxMoves: 15
  },
  hard: {
    time: 270,
    size: 20,
    mineRange: [45, 50],
    moveInterval: 24,
    maxMoves: 20
  }
};

// DOM Elements
const startBtn = document.getElementById('start-btn');
const difficultyBtns = document.querySelectorAll('#difficulty-select .btn');
const shapeBtns = document.querySelectorAll('#shape-select .btn');
const rankTabs = document.querySelectorAll('.tab-btn');

// Init
initBackground();
renderIntroRankings('easy');

// Event Listeners
difficultyBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    difficultyBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.difficulty = btn.dataset.value;

    if (state.difficulty !== 'easy') {
      document.querySelector('[data-value="square"]').click();
      document.getElementById('shape-select').style.pointerEvents = 'none';
      document.getElementById('shape-select').style.opacity = '0.5';
    } else {
      document.getElementById('shape-select').style.pointerEvents = 'auto';
      document.getElementById('shape-select').style.opacity = '1';
    }
  });
});

shapeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    shapeBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.shape = btn.dataset.value;
  });
});

rankTabs.forEach(btn => {
  btn.addEventListener('click', () => {
    rankTabs.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderIntroRankings(btn.dataset.rankTab);
  });
});

startBtn.addEventListener('click', startGame);

function startGame() {
  initAudio();
  sounds.start();

  const config = CONFIG[state.difficulty];
  state.timeLeft = config.time;
  state.rows = config.size;
  state.cols = config.size;
  state.isGameOver = false;
  state.score = 0;
  state.movesSinceLastClick = 0;

  // Use config mine range
  state.mineCount = Math.floor(Math.random() * (config.mineRange[1] - config.mineRange[0] + 1)) + config.mineRange[0];

  state.totalMoveBudget = config.maxMoves;
  state.movesLeft = state.totalMoveBudget;
  state.moveInterval = config.moveInterval;

  state.grid = createBoard(state.rows, state.cols, state.shape, state.difficulty);
  state.mines = placeMines(state.grid, state.mineCount);
  calculateCellValues(state.grid);

  switchScreen('game-screen');
  renderBoard(state.grid, handleCellClick, handleCellRightClick);
  updateTimer(state.timeLeft);
  updateMineCount(state.mineCount);
  updateMoveCount(state.movesLeft);

  startTimer();
  // Mine movement is now checked inside the timer loop to match React logic
}

function startTimer() {
  if (state.timerId) clearInterval(state.timerId);

  const config = CONFIG[state.difficulty];
  const initialTime = config.time;

  state.timerId = setInterval(() => {
    if (state.isGameOver) return;

    if (state.timeLeft > 0) {
      state.timeLeft--;
      updateTimer(state.timeLeft);

      // Check for mine movement
      const timeElapsed = initialTime - state.timeLeft;
      const shouldMove = timeElapsed > 0 && (timeElapsed % state.moveInterval === 0);

      if (shouldMove && state.movesLeft > 0) {
        if (state.movesSinceLastClick < 2) { // MAX_IDLE_MOVES = 2
          triggerMineMovement();
        }
      }

    } else {
      gameOver(false, true);
    }
  }, 1000);
}

function triggerMineMovement() {
  showMessage("⚠️ 지진 활동 감지! 지뢰가 이동합니다! ⚠️");
  sounds.move();

  const moved = moveMines(state.grid, state.mines);
  if (moved) {
    calculateCellValues(state.grid);
    state.movesLeft--;
    state.movesSinceLastClick++;
    updateMoveCount(state.movesLeft);
    renderBoard(state.grid, handleCellClick, handleCellRightClick);
    setTimeout(() => showMessage(""), 2000);
  }
}

function handleCellClick(row, col) {
  if (state.isGameOver) return;

  const cell = state.grid[row][col];
  if (cell.flagState === 1 || cell.isRevealed) return;

  state.movesSinceLastClick = 0;
  sounds.click();

  if (cell.isMine) {
    gameOver(true, false);
  } else {
    const points = revealCell(state.grid, row, col);
    state.score += points;
    calculateCellValues(state.grid);
    renderBoard(state.grid, handleCellClick, handleCellRightClick);

    if (checkWinCondition(state.grid, state.mineCount)) {
      gameWin();
    }
  }
}

function handleCellRightClick(row, col, e) {
  e.preventDefault();
  if (state.isGameOver) return;

  const cell = state.grid[row][col];
  if (cell.isRevealed) return;

  state.movesSinceLastClick = 0; // Reset idle count on flag too? React code says "resetIdleCount" on context menu too.
  toggleFlag(cell);
  renderBoard(state.grid, handleCellClick, handleCellRightClick);
}

function gameOver(hitMine, timeOut) {
  clearInterval(state.timerId);
  state.isGameOver = true;

  if (hitMine) sounds.boom();

  state.mines.forEach(pos => {
    state.grid[pos.r][pos.c].isRevealed = true;
  });
  renderBoard(state.grid, handleCellClick, handleCellRightClick);

  const msg = hitMine ? "💥 쾅! 게임 오버 💥" : "⏰ 시간 초과! ⏰";
  showMessage(msg);

  saveScore(state.difficulty, "플레이어", state.score);

  let countdown = 5;
  const countdownMsg = document.createElement('div');
  countdownMsg.style.marginTop = '10px';
  countdownMsg.style.color = '#fff';
  document.querySelector('.hud').appendChild(countdownMsg);

  state.countdownId = setInterval(() => {
    countdown--;
    showMessage(`${msg} (${countdown}초 후 결과 창)`);
    if (countdown <= 0) {
      clearInterval(state.countdownId);
      showGameOverPopup(false, state.score, msg, state.difficulty);
    }
  }, 1000);
}

function gameWin() {
  clearInterval(state.timerId);
  state.isGameOver = true;
  sounds.win();

  const finalScore = state.score * state.timeLeft + 100;
  showMessage("🏆 임무 완수! 🏆");

  saveScore(state.difficulty, "플레이어", finalScore);

  let countdown = 5;
  state.countdownId = setInterval(() => {
    countdown--;
    showMessage(`🏆 승리! 🏆 (${countdown}초 후 결과 창)`);
    if (countdown <= 0) {
      clearInterval(state.countdownId);
      showGameOverPopup(true, finalScore, "승리!", state.difficulty);
    }
  }, 1000);
}
