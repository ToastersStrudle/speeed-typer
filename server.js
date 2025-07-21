const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3001;

const DIFFICULTIES = ['easy', 'medium', 'hard'];
const LEADERBOARD_FILE = path.join(__dirname, 'leaderboard.json');

const basicAuth = require('express-basic-auth');

const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;

app.use(['/admin', '/admin/api', '/admin/player/:name', '/admin/reset', '/admin/wipe'], basicAuth({
    users: { [ADMIN_USER]: ADMIN_PASS },
    challenge: true,
    unauthorizedResponse: 'Unauthorized'
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'speed-typing-game.html'));
});

function loadLeaderboard() {
    if (!fs.existsSync(LEADERBOARD_FILE)) {
        // Initialize with all difficulties
        const empty = {};
        DIFFICULTIES.forEach(d => empty[d] = {});
        return empty;
    }
    const data = JSON.parse(fs.readFileSync(LEADERBOARD_FILE, 'utf8'));
    // Ensure all difficulties exist
    DIFFICULTIES.forEach(d => { if (!data[d]) data[d] = {}; });
    return data;
}

function saveLeaderboard(leaderboard) {
    fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(leaderboard, null, 2));
}

// POST /score?difficulty=easy
app.post('/score', (req, res) => {
    const { name, score } = req.body;
    const difficulty = req.query.difficulty;
    if (!name || typeof score !== 'number' || !DIFFICULTIES.includes(difficulty)) {
        return res.status(400).json({ error: 'Invalid name, score, or difficulty' });
    }
    const leaderboard = loadLeaderboard();
    if (!leaderboard[difficulty][name] || score > leaderboard[difficulty][name]) {
        leaderboard[difficulty][name] = score;
        saveLeaderboard(leaderboard);
    }
    res.json({ success: true });
});

// GET /leaderboard?difficulty=easy
app.get('/leaderboard', (req, res) => {
    const difficulty = req.query.difficulty;
    if (!DIFFICULTIES.includes(difficulty)) {
        return res.status(400).json({ error: 'Invalid difficulty' });
    }
    const leaderboard = loadLeaderboard();
    const sorted = Object.entries(leaderboard[difficulty])
        .map(([name, score]) => ({ name, score }))
        .sort((a, b) => b.score - a.score);
    res.json(sorted);
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// GET /admin/api?difficulty=easy
app.get('/admin/api', (req, res) => {
    const difficulty = req.query.difficulty;
    if (!DIFFICULTIES.includes(difficulty)) {
        return res.status(400).json({ error: 'Invalid difficulty' });
    }
    const leaderboard = loadLeaderboard();
    const sorted = Object.entries(leaderboard[difficulty])
        .map(([name, score]) => ({ name, score }))
        .sort((a, b) => b.score - a.score);
    res.json(sorted);
});

// DELETE /admin/player/:name?difficulty=easy
app.delete('/admin/player/:name', (req, res) => {
    const { name } = req.params;
    const difficulty = req.query.difficulty;
    if (!DIFFICULTIES.includes(difficulty)) {
        return res.status(400).json({ error: 'Invalid difficulty' });
    }
    const leaderboard = loadLeaderboard();
    if (leaderboard[difficulty][name]) {
        delete leaderboard[difficulty][name];
        saveLeaderboard(leaderboard);
        res.json({ success: true, message: `Player ${name} removed from ${difficulty}` });
    } else {
        res.status(404).json({ error: 'Player not found' });
    }
});

// PUT /admin/player/:name?difficulty=easy
app.put('/admin/player/:name', (req, res) => {
    const { name } = req.params;
    const { score } = req.body;
    const difficulty = req.query.difficulty;
    if (!DIFFICULTIES.includes(difficulty) || typeof score !== 'number') {
        return res.status(400).json({ error: 'Invalid difficulty or score' });
    }
    const leaderboard = loadLeaderboard();
    leaderboard[difficulty][name] = score;
    saveLeaderboard(leaderboard);
    res.json({ success: true, message: `Player ${name} score updated to ${score} in ${difficulty}` });
});

// DELETE /admin/reset?difficulty=easy (wipe one) or /admin/wipe (wipe all)
app.delete('/admin/reset', (req, res) => {
    const difficulty = req.query.difficulty;
    if (!DIFFICULTIES.includes(difficulty)) {
        return res.status(400).json({ error: 'Invalid difficulty' });
    }
    const leaderboard = loadLeaderboard();
    leaderboard[difficulty] = {};
    saveLeaderboard(leaderboard);
    res.json({ success: true, message: `Leaderboard for ${difficulty} reset` });
});

app.delete('/admin/wipe', (req, res) => {
    const empty = {};
    DIFFICULTIES.forEach(d => empty[d] = {});
    saveLeaderboard(empty);
    res.json({ success: true, message: 'All leaderboards wiped' });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
}); 