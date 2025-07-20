const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3001;

const LEADERBOARD_FILE = path.join(__dirname, 'leaderboard.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'speed-typing-game.html'));
});

function loadLeaderboard() {
    if (!fs.existsSync(LEADERBOARD_FILE)) return {};
    return JSON.parse(fs.readFileSync(LEADERBOARD_FILE, 'utf8'));
}

function saveLeaderboard(leaderboard) {
    fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(leaderboard, null, 2));
}

app.post('/score', (req, res) => {
    const { name, score } = req.body;
    if (!name || typeof score !== 'number') {
        return res.status(400).json({ error: 'Invalid name or score' });
    }
    const leaderboard = loadLeaderboard();
    if (!leaderboard[name] || score > leaderboard[name]) {
        leaderboard[name] = score;
        saveLeaderboard(leaderboard);
    }
    res.json({ success: true });
});

app.get('/leaderboard', (req, res) => {
    const leaderboard = loadLeaderboard();
    const sorted = Object.entries(leaderboard)
        .map(([name, score]) => ({ name, score }))
        .sort((a, b) => b.score - a.score);
    res.json(sorted);
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
}); 