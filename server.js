const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3001;

const LEADERBOARD_FILE = path.join(__dirname, 'leaderboard.json');

const basicAuth = require('express-basic-auth');

const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;

app.use(['/admin', '/admin/api', '/admin/player/:name', '/admin/reset'], basicAuth({
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

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/admin/api', (req, res) => {
    const leaderboard = loadLeaderboard();
    const sorted = Object.entries(leaderboard)
        .map(([name, score]) => ({ name, score }))
        .sort((a, b) => b.score - a.score);
    res.json(sorted);
});

app.delete('/admin/player/:name', (req, res) => {
    const { name } = req.params;
    const leaderboard = loadLeaderboard();
    if (leaderboard[name]) {
        delete leaderboard[name];
        saveLeaderboard(leaderboard);
        res.json({ success: true, message: `Player ${name} removed` });
    } else {
        res.status(404).json({ error: 'Player not found' });
    }
});

app.put('/admin/player/:name', (req, res) => {
    const { name } = req.params;
    const { score } = req.body;
    if (typeof score !== 'number') {
        return res.status(400).json({ error: 'Invalid score' });
    }
    const leaderboard = loadLeaderboard();
    leaderboard[name] = score;
    saveLeaderboard(leaderboard);
    res.json({ success: true, message: `Player ${name} score updated to ${score}` });
});

app.delete('/admin/reset', (req, res) => {
    saveLeaderboard({});
    res.json({ success: true, message: 'Leaderboard reset' });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
}); 