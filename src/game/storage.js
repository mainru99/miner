import { db } from './firebase.js';
import { collection, addDoc, getDocs, query, orderBy, limit, where, deleteDoc } from "firebase/firestore";

const STORAGE_KEY = 'miner_ranking';

export async function getRankings() {
    // Try fetching from Firebase
    if (db) {
        try {
            const rankings = { easy: [], medium: [], hard: [] };
            for (const diff of ['easy', 'medium', 'hard']) {
                const q = query(
                    collection(db, "scores"),
                    where("difficulty", "==", diff),
                    orderBy("score", "desc"),
                    limit(10)
                );
                const querySnapshot = await getDocs(q);
                rankings[diff] = querySnapshot.docs.map(doc => doc.data());
            }
            return rankings;
        } catch (e) {
            console.error("Error fetching from Firebase:", e);
        }
    }

    // Fallback to local storage
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : { easy: [], medium: [], hard: [] };
}

export async function saveScore(difficulty, name, score) {
    // Save to Firebase
    if (db) {
        try {
            await addDoc(collection(db, "scores"), {
                difficulty,
                name,
                score,
                date: new Date().toISOString()
            });
        } catch (e) {
            console.error("Error saving to Firebase:", e);
        }
    }

    // Save to Local Storage (Backup)
    const rankings = JSON.parse(localStorage.getItem(STORAGE_KEY)) || { easy: [], medium: [], hard: [] };
    if (!rankings[difficulty]) rankings[difficulty] = [];

    rankings[difficulty].push({ name, score, date: new Date().toISOString() });
    rankings[difficulty].sort((a, b) => b.score - a.score);
    rankings[difficulty] = rankings[difficulty].slice(0, 10);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(rankings));
}

export async function resetRankings() {
    // Delete from Firebase
    if (db) {
        try {
            const q = query(collection(db, "scores"));
            const snapshot = await getDocs(q);
            const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
            await Promise.all(deletePromises);
        } catch (e) {
            console.error("Error resetting Firebase DB:", e);
        }
    }

    // Delete from Local Storage
    localStorage.removeItem(STORAGE_KEY);
}
