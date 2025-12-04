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
  moveInterval: 0,
  firstClick: true,
  inputMode: 'mine' // 'mine' or 'flag'
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
const mobileToggleBtn = document.getElementById('mobile-mode-toggle');

// Init
initBackground();
renderIntroRankings('easy');
detectMobile();

function detectMobile() {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 800;
  if (isMobile) {
    mobileToggleBtn.classList.remove('hidden');
  }
}

// Event Listeners
mobileToggleBtn.addEventListener('click', () => {
  if (state.inputMode === 'mine') {
    state.inputMode = 'flag';
    mobileToggleBtn.textContent = '🚩 깃발 모드';
    mobileToggleBtn.classList.add('flag-mode');
  } else {
    state.inputMode = 'mine';
    mobileToggleBtn.textContent = '⛏️ 채굴 모드';
    mobileToggleBtn.classList.remove('flag-mode');
  }
});

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
  state.firstClick = true; // Flag for first click

  // Reset Input Mode
  state.inputMode = 'mine';
  mobileToggleBtn.textContent = '⛏️ 채굴 모드';
  mobileToggleBtn.classList.remove('flag-mode');

  state.grid = createBoard(state.rows, state.cols, state.shape, state.difficulty);
  // Mines are now placed on first click

  switchScreen('game-screen');
  renderBoard(state.grid, handleCellClick, handleCellRightClick);
  updateTimer(state.timeLeft);
  updateMineCount(state.mineCount);
  updateMoveCount(state.movesLeft);

  startTimer();
}

// Expose restart for renderer
window.restartGame = startGame;

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

      if (shouldMove && state.movesLeft > 0 && !state.firstClick) { // Don't move if game hasn't really started (mines not placed)
        if (state.movesSinceLastClick < 2) {
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

  // Mobile Flag Mode Check
  if (state.inputMode === 'flag') {
    handleCellRightClick(row, col);
    return;
  }

  const cell = state.grid[row][col];
  if (cell.flagState === 1 || cell.isRevealed) return;

  // Safe First Click Logic
  if (state.firstClick) {
    state.mines = placeMines(state.grid, state.mineCount, row, col);
    calculateCellValues(state.grid);
    state.firstClick = false;
  }

  state.movesSinceLastClick = 0;
  sounds.click();

  if (cell.isMine) {
    gameOver(true, false);
  } else {
    const points = revealCell(state.grid, row, col);
    state.score += points;
    calculateCellValues(state.grid); // Recalculate mainly for neighbor counts if needed, though static unless mines moved.
    renderBoard(state.grid, handleCellClick, handleCellRightClick);

    if (checkWinCondition(state.grid, state.mineCount)) {
      gameWin();
    }
  }
}

function handleCellRightClick(row, col, e) {
  if (e) e.preventDefault(); // e is optional now
  if (state.isGameOver) return;

  const cell = state.grid[row][col];
  if (cell.isRevealed) return;

  state.movesSinceLastClick = 0;
  toggleFlag(cell);
  renderBoard(state.grid, handleCellClick, handleCellRightClick);
}

function gameOver(hitMine, timeOut) {
  clearInterval(state.timerId);
  state.isGameOver = true;

  if (hitMine) sounds.boom();

  // If mines exist (game started), reveal them
  if (state.mines) {
    state.mines.forEach(pos => {
      state.grid[pos.r][pos.c].isRevealed = true;
    });
  }
  renderBoard(state.grid, handleCellClick, handleCellRightClick);

  const msg = hitMine ? "💥 쾅! 게임 오버 💥" : "⏰ 시간 초과! ⏰";
  showMessage(msg);

  // saveScore removed to prevent duplicate entry (waiting for user input)

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

  // New Score Logic: Score + 10 + TimeLeft
  const finalScore = state.score + 10 + state.timeLeft;
  showMessage("🏆 임무 완수! 🏆");

  // saveScore removed to prevent duplicate entry

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
