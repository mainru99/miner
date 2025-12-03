const STORAGE_KEY = 'miner_ranking';

export function getRankings() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : { easy: [], medium: [], hard: [] };
}

export function saveScore(difficulty, name, score) {
    const rankings = getRankings();
    if (!rankings[difficulty]) rankings[difficulty] = [];

    rankings[difficulty].push({ name, score, date: new Date().toISOString() });

    rankings[difficulty].sort((a, b) => b.score - a.score);
    rankings[difficulty] = rankings[difficulty].slice(0, 10);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(rankings));
}

export function resetRankings() {
    localStorage.removeItem(STORAGE_KEY);
}
