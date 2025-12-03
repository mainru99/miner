import { getRankings, saveScore, resetRankings } from '../game/storage.js';

export function initBackground() {
    const canvas = document.createElement('canvas');
    canvas.id = 'bg-canvas';
    const existing = document.getElementById('bg-canvas');
    if (existing) existing.remove();

    document.body.prepend(canvas);

    const ctx = canvas.getContext('2d');
    let width, height;
    const particles = [];

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    class Particle {
        constructor() {
            this.reset(true);
        }
        reset(initial = false) {
            this.x = Math.random() * width;
            this.y = initial ? Math.random() * height : height + 50;
            this.vx = (Math.random() - 0.5) * 0.5;
            this.vy = -(Math.random() * 0.5 + 0.5); // Faster float up
            this.size = Math.random() * 20 + 15;
            this.rotation = Math.random() * 360;
            this.vr = (Math.random() - 0.5) * 2;
            this.alpha = Math.random() * 0.3 + 0.1;
            this.type = Math.random() > 0.6 ? 'mine' : 'flag';

            // Explosion state
            this.exploding = false;
            this.explodeProgress = 0;
        }
        update() {
            if (this.exploding) {
                this.explodeProgress += 0.05;
                this.size += 1;
                this.alpha -= 0.05;
                if (this.alpha <= 0) this.reset();
                return;
            }

            this.x += this.vx;
            this.y += this.vy;
            this.rotation += this.vr;

            // Randomly explode mines
            if (this.type === 'mine' && Math.random() < 0.002) {
                this.exploding = true;
            }

            if (this.y < -50) this.reset();
        }
        draw() {
            ctx.save();
            ctx.globalAlpha = this.alpha;
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation * Math.PI / 180);

            if (this.type === 'mine') {
                if (this.exploding) {
                    // Draw explosion
                    ctx.fillStyle = '#ef4444';
                    ctx.beginPath();
                    // Star shape for explosion
                    for (let i = 0; i < 8; i++) {
                        ctx.rotate(Math.PI / 4);
                        ctx.lineTo(this.size, 0);
                        ctx.lineTo(this.size / 2, this.size / 2);
                    }
                    ctx.fill();
                } else {
                    // Draw Bomb
                    ctx.fillStyle = '#1e293b'; // Dark body
                    ctx.beginPath();
                    ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
                    ctx.fill();

                    // Cap
                    ctx.fillStyle = '#334155';
                    ctx.fillRect(-this.size / 4, -this.size / 1.6, this.size / 2, this.size / 4);

                    // Fuse
                    ctx.beginPath();
                    ctx.strokeStyle = '#64748b';
                    ctx.lineWidth = 2;
                    ctx.moveTo(0, -this.size / 1.6);
                    ctx.quadraticCurveTo(this.size / 3, -this.size, this.size / 1.5, -this.size / 1.2);
                    ctx.stroke();

                    // Spark
                    ctx.fillStyle = '#ef4444';
                    ctx.beginPath();
                    ctx.arc(this.size / 1.5, -this.size / 1.2, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else {
                // Draw Flag
                ctx.fillStyle = '#ef4444';
                ctx.beginPath();
                ctx.moveTo(-this.size / 3, -this.size / 2);
                ctx.lineTo(this.size / 3, -this.size / 4);
                ctx.lineTo(-this.size / 3, 0);
                ctx.fill();

                ctx.strokeStyle = '#1e293b';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(-this.size / 3, -this.size / 2);
                ctx.lineTo(-this.size / 3, this.size / 2);
                ctx.stroke();
            }

            ctx.restore();
        }
    }

    for (let i = 0; i < 30; i++) particles.push(new Particle());

    function animate() {
        ctx.clearRect(0, 0, width, height);
        particles.forEach(p => {
            p.update();
            p.draw();
        });
        requestAnimationFrame(animate);
    }
    animate();
}

export function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

export function showMessage(msg) {
    const el = document.getElementById('message-area');
    el.textContent = msg;
}

export function updateTimer(time) {
    document.getElementById('timer').textContent = time;
}

export function updateMineCount(count) {
    document.getElementById('mine-count').textContent = count;
}

export function updateMoveCount(count) {
    let el = document.getElementById('move-count');
    if (!el) {
        const hud = document.querySelector('.hud');
        const box = document.createElement('div');
        box.className = 'stat-box';
        box.innerHTML = `<span class="label">이동 횟수</span><span id="move-count" class="value">${count}</span>`;
        hud.appendChild(box);
        el = document.getElementById('move-count');
    }
    el.textContent = count;
}

export function renderBoard(grid, onClick, onRightClick) {
    const boardEl = document.getElementById('game-board');
    boardEl.innerHTML = '';

    const rows = grid.length;
    const cols = grid[0].length;

    boardEl.style.gridTemplateColumns = `repeat(${cols}, 32px)`;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cellData = grid[r][c];
            const cellEl = document.createElement('div');
            cellEl.classList.add('cell');

            if (!cellData.isActive) {
                cellEl.style.visibility = 'hidden';
            }

            if (cellData.isRevealed) {
                cellEl.classList.add('revealed');

                if (cellData.isMine) {
                    cellEl.classList.add('mine');
                    // If it was flagged and revealed (Game Over/Win state), show it was correct
                    if (cellData.flagState === 1) {
                        cellEl.classList.add('secured');
                        cellEl.textContent = '✅';
                    }
                } else if (cellData.flagState === 1) {
                    // Wrong flag (Safe cell but flagged)
                    cellEl.classList.add('wrong-flag');
                    cellEl.textContent = '❌';
                } else if (cellData.neighborMines > 0) {
                    cellEl.textContent = cellData.neighborMines;
                    cellEl.dataset.dist = "1";
                } else if (cellData.distanceHint === 2) {
                    cellEl.dataset.dist = "2";
                } else if (cellData.distanceHint === 3) {
                    cellEl.dataset.dist = "3";
                } else {
                    cellEl.classList.add('safe');
                }
            } else if (cellData.flagState === 1) {
                cellEl.classList.add('flagged');
            } else if (cellData.flagState === 2) {
                cellEl.classList.add('question');
            }

            cellEl.addEventListener('click', () => onClick(r, c));
            cellEl.addEventListener('contextmenu', (e) => onRightClick(r, c, e));

            boardEl.appendChild(cellEl);
        }
    }
}

export function renderIntroRankings(difficulty) {
    const listEl = document.getElementById('intro-rank-list');
    if (!listEl) return;

    const titleEl = document.querySelector('.intro-ranking h3');
    if (titleEl && !titleEl.hasAttribute('data-init')) {
        titleEl.setAttribute('data-init', 'true');
        titleEl.style.cursor = 'pointer';
        titleEl.title = '클릭하여 랭킹 초기화';
        titleEl.addEventListener('click', () => {
            if (confirm('모든 랭킹을 초기화하시겠습니까?')) {
                resetRankings();
                renderIntroRankings(difficulty);
            }
        });
    }

    const rankings = getRankings()[difficulty] || [];

    if (rankings.length === 0) {
        listEl.innerHTML = '<li style="text-align:center; color:var(--text-muted)">기록 없음</li>';
        return;
    }

    listEl.innerHTML = rankings.map((r, i) => `
    <li>
      <span class="rank">#${i + 1}</span>
      <span class="name">${r.name}</span>
      <span class="score">${r.score}</span>
    </li>
  `).join('');
}

export function showGameOverPopup(isWin, score, msg, difficulty) {
    const popup = document.createElement('div');
    popup.className = 'popup-overlay';

    const rankings = getRankings()[difficulty];
    const rankList = rankings.map((r, i) => `<li>${i + 1}. ${r.name} - ${r.score}</li>`).join('');

    popup.innerHTML = `
    <div class="popup-content">
      <h2>${msg}</h2>
      <div class="score-display">점수: ${score}</div>
      
      <div class="input-group">
        <input type="text" id="player-name" placeholder="이름 입력" maxlength="10">
        <button id="save-score-btn" class="btn primary small">기록 저장</button>
      </div>

      <div class="ranking-board">
        <h3>🏆 ${difficulty.toUpperCase()} 랭킹 🏆</h3>
        <ul>${rankList}</ul>
      </div>

      <div class="action-buttons">
        <button id="restart-game-btn" class="btn secondary">다시 시작</button>
        <button id="menu-btn" class="btn">메뉴로</button>
      </div>
    </div>
  `;

    document.body.appendChild(popup);
    document.getElementById('app').classList.add('blurred');

    popup.querySelector('#save-score-btn').addEventListener('click', () => {
        const name = popup.querySelector('#player-name').value || "익명";
        saveScore(difficulty, name, score);
        const newRankings = getRankings()[difficulty];
        popup.querySelector('ul').innerHTML = newRankings.map((r, i) => `<li>${i + 1}. ${r.name} - ${r.score}</li>`).join('');
        popup.querySelector('#save-score-btn').disabled = true;
        popup.querySelector('#save-score-btn').textContent = "저장됨";
    });

    popup.querySelector('#restart-game-btn').addEventListener('click', () => {
        window.location.reload();
    });

    popup.querySelector('#menu-btn').addEventListener('click', () => {
        window.location.reload();
    });
}
