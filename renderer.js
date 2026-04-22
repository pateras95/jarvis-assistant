const { ipcRenderer } = require('electron');

// ─── DOM Elements ────────────────────────────────────────────────
const statusEl = document.getElementById('status');
const transcriptEl = document.getElementById('transcript');
const reactorEl = document.getElementById('reactor-container');
const ringEl = document.getElementById('rotating-ring');
const closeBtn = document.getElementById('close-btn');
const settingsBtn = document.getElementById('settings-btn');
const settingsPanel = document.getElementById('settings-panel');
const closeSettingsBtn = document.getElementById('close-settings');
const helpBtn = document.getElementById('help-btn');
const commandsPanel = document.getElementById('commands-panel');
const closeCommandsBtn = document.getElementById('close-commands');

// ─── Window dragging (frameless) ─────────────────────────────────
document.body.style.webkitAppRegion = 'drag';
[reactorEl, closeBtn, settingsBtn, settingsPanel, helpBtn, commandsPanel].forEach(el => {
    if (el) el.style.webkitAppRegion = 'no-drag';
});

// ─── State ───────────────────────────────────────────────────────
let voiceEngineReady = false;
let voiceResponseEnabled = true;
let wakeWordActive = false;

// Voice settings (spd-say: -100 to +100)
let voiceType = 'male1';
let voiceRate = 0;
let voicePitch = 0;
let voiceVolume = 100;

// ─── Voice Engine Events ─────────────────────────────────────────
ipcRenderer.on('voice-engine-status', (event, status) => {
    if (status === 'ready') {
        voiceEngineReady = true;
        statusEl.innerText = 'Awaiting Wake Word';
        transcriptEl.innerText = 'Say "Daddy is Home" to activate...';
        reactorEl.classList.add('active');
        ringEl.style.animationDuration = '8s';
    } else if (status === 'error') {
        statusEl.innerText = 'Voice Engine Error';
        transcriptEl.innerText = 'Check terminal for details.';
        reactorEl.classList.remove('active');
    } else if (status === 'stopped') {
        voiceEngineReady = false;
        statusEl.innerText = 'Voice Engine Stopped';
        reactorEl.classList.remove('active');
        ringEl.style.animationDuration = '15s';
    }
});

ipcRenderer.on('voice-result', (event, data) => {
    if (data.type === 'partial') {
        transcriptEl.innerText = data.text;
        ringEl.style.animationDuration = '2s';
    } else if (data.type === 'final') {
        transcriptEl.innerText = data.text;
        ringEl.style.animationDuration = '5s';
        ipcRenderer.send('voice-input', data.text);
        const command = data.text.toLowerCase();

        if (!wakeWordActive && matchesWakeWord(command)) {
            wakeWordActive = true;
            statusEl.innerText = 'System Active';
            reactorEl.classList.add('active');
            ringEl.style.animationDuration = '3s';
            transcriptEl.innerText = 'JARVIS activated!';
            speak('Welcome home, Sir. JARVIS systems online and ready for your commands.');
            return;
        }

        if (wakeWordActive) processCommand(command);
    }
});

ipcRenderer.on('app-launched', (event, data) => {
    transcriptEl.innerText = data.success ? `Launched: ${data.app}` : `Failed: ${data.app}`;
    if (!data.success) speak(`Sorry Sir, I could not find ${data.app}.`);
});

ipcRenderer.on('app-closed', (event, data) => {
    transcriptEl.innerText = data.success ? `Closed: ${data.app}` : `Could not close: ${data.app}`;
});

// ─── Fuzzy Matching ──────────────────────────────────────────────
function matchesWakeWord(t) {
    const hasDaddy = t.includes('daddy') || t.includes('dad the') || t.includes('dadi');
    const hasHome = t.includes('home') || t.includes('hom');
    return hasDaddy && hasHome;
}

function matchesWorkCommand(t) {
    return t.includes('work to do') || t.includes('work to due') ||
        (t.includes('have') && t.includes('work')) ||
        (t.includes('got') && t.includes('work'));
}

// ─── Command Processing ──────────────────────────────────────────
const processCommand = (command) => {
    ipcRenderer.send('voice-input', `[CMD] ${command}`);

    // ── Workflow: "we have work to do" ──
    if (matchesWorkCommand(command)) {
        speak('Right away, Sir. Spinning up your workspace.');
        setTimeout(() => ipcRenderer.send('launch-app', 'chrome'), 500);
        setTimeout(() => ipcRenderer.send('launch-app', 'intellij'), 1500);
        setTimeout(() => ipcRenderer.send('launch-app', 'discord'), 2500);
        setTimeout(() => {
            ipcRenderer.send('launch-app', 'spotify');
            setTimeout(() => ipcRenderer.send('spotify-play', 'spotify:track:2zYzyRzz6pRmhPzyfMEC8s'), 4000);
        }, 3500);
        return;
    }

    // ── Open / Launch apps ──
    const openMatch = command.match(/(?:open|launch|start|run)\s+(.+)/);
    if (openMatch) {
        ipcRenderer.send('launch-app', openMatch[1].trim());
        speak(`Opening ${openMatch[1].trim()}.`);
        return;
    }

    // ── Close / Kill apps ──
    const closeMatch = command.match(/(?:close|quit|kill|exit|stop)\s+(.+)/);
    if (closeMatch) {
        const app = closeMatch[1].trim();
        ipcRenderer.send('close-app', app);
        speak(`Closing ${app}.`);
        return;
    }

    // ── Play song on Spotify ──
    const playMatch = command.match(/play\s+(.+)/);
    if (playMatch) {
        const song = playMatch[1].trim();
        ipcRenderer.send('spotify-search-play', song);
        speak(`Playing ${song}.`);
        return;
    }

    // ── Media Controls ──
    if (command.includes('pause') || command.includes('stop music') || command.includes('stop the music')) {
        ipcRenderer.send('media-control', 'pause');
        speak('Paused.');
        return;
    }
    if (command.includes('resume') || command === 'continue') {
        ipcRenderer.send('media-control', 'play');
        speak('Resuming playback.');
        return;
    }
    if (command.includes('next song') || command.includes('skip') || command.includes('next track')) {
        ipcRenderer.send('media-control', 'next');
        speak('Next track.');
        return;
    }
    if (command.includes('previous') || command.includes('last song') || command.includes('go back')) {
        ipcRenderer.send('media-control', 'previous');
        speak('Previous track.');
        return;
    }

    // ── Volume Control ──
    // ── Set volume to specific percentage ──
    const volMatch = command.match(/(?:set\s+)?volume\s+(?:to\s+)?(\d+)\s*(?:percent|%)?/);
    if (volMatch) {
        const pct = Math.min(100, Math.max(0, parseInt(volMatch[1])));
        ipcRenderer.send('system-command', `volume-set:${pct}`);
        speak(`Volume set to ${pct} percent.`);
        return;
    }
    if (command.includes('volume up') || command.includes('louder') || command.includes('turn it up')) {
        ipcRenderer.send('system-command', 'volume-up');
        speak('Volume up.');
        return;
    }
    if (command.includes('volume down') || command.includes('quieter') || command.includes('turn it down')) {
        ipcRenderer.send('system-command', 'volume-down');
        speak('Volume down.');
        return;
    }
    if (command.includes('mute') || command.includes('silence')) {
        ipcRenderer.send('media-control', 'mute');
        speak('Toggling mute.');
        return;
    }

    // ── System Commands ──
    if (command.includes('screenshot') || command.includes('screen capture') || command.includes('take a picture')) {
        ipcRenderer.send('system-command', 'screenshot');
        speak('Screenshot taken, Sir.');
        return;
    }
    if (command.includes('lock') || command.includes('lock screen') || command.includes('lock the screen')) {
        speak('Locking screen.');
        setTimeout(() => ipcRenderer.send('system-command', 'lock'), 1500);
        return;
    }

    // ── Web Search ──
    const searchMatch = command.match(/(?:search|google|look up)\s+(.+)/);
    if (searchMatch) {
        const query = searchMatch[1].trim();
        ipcRenderer.send('web-search', query);
        speak(`Searching for ${query}.`);
        return;
    }

    // ── Basic commands ──
    if (command.includes('hello') || command.includes('jarvis'))
        speak('Yes, Sir? Always at your service.');
    else if (command.includes('thank'))
        speak('My pleasure, Sir.');
    else if (command.includes('status'))
        speak('All systems nominal. Core temperature within parameters.');
    else if (command.includes('who are you'))
        speak('I am Just A Rather Very Intelligent System. Call me JARVIS.');
    else if (command.includes('time'))
        speak(`The current time is ${new Date().toLocaleTimeString()}.`);
    else if (command.includes('date') || command.includes('today'))
        speak(`Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`);
    else if (command.includes('weather'))
        speak('I do not have weather data yet, Sir. That feature is coming soon.');
    else if (command.includes('joke') || command.includes('funny')) {
        const jokes = [
            'Why do programmers prefer dark mode? Because light attracts bugs.',
            'There are only 10 types of people. Those who understand binary, and those who do not.',
            'A SQL query walks into a bar, sees two tables, and asks: Can I join you?',
            'Why was the JavaScript developer sad? Because he did not Node how to Express himself.',
        ];
        speak(jokes[Math.floor(Math.random() * jokes.length)]);
    }
    else if (command.includes('go to sleep') || command.includes('goodbye') || command.includes('shut down')) {
        speak('Goodnight, Sir.');
        setTimeout(() => ipcRenderer.send('app-quit'), 2500);
    }
};

// ─── TTS via spd-say (through Python backend) ────────────────────
const speak = (text) => {
    if (!voiceResponseEnabled) return;
    ipcRenderer.send('voice-input', `[SPEAK] ${text}`);
    ipcRenderer.send('speak', JSON.stringify({ text, type: voiceType, rate: voiceRate, pitch: voicePitch, volume: voiceVolume }));
    statusEl.innerText = 'Responding...';
    setTimeout(() => { statusEl.innerText = wakeWordActive ? 'Listening...' : 'Awaiting Wake Word'; }, Math.max(1500, text.length * 80));
};

// ─── Reactor Click ───────────────────────────────────────────────
reactorEl.addEventListener('click', () => {
    if (!voiceEngineReady) { ipcRenderer.send('start-voice-engine'); statusEl.innerText = 'Starting...'; }
});

// ─── Top Bar Buttons ─────────────────────────────────────────────
closeBtn?.addEventListener('click', () => ipcRenderer.send('app-quit'));
settingsBtn?.addEventListener('click', () => { settingsPanel?.classList.toggle('hidden'); commandsPanel?.classList.add('hidden'); });
closeSettingsBtn?.addEventListener('click', () => settingsPanel?.classList.add('hidden'));
helpBtn?.addEventListener('click', () => { commandsPanel?.classList.toggle('hidden'); settingsPanel?.classList.add('hidden'); });
closeCommandsBtn?.addEventListener('click', () => commandsPanel?.classList.add('hidden'));

// ─── Voice Settings Controls ─────────────────────────────────────
const rateValue = document.getElementById('rate-value');
const pitchValue = document.getElementById('pitch-value');
const volumeValue = document.getElementById('volume-value');

document.getElementById('voice-type-select')?.addEventListener('change', (e) => { voiceType = e.target.value; });
document.getElementById('voice-rate')?.addEventListener('input', (e) => { voiceRate = parseInt(e.target.value); rateValue.innerText = voiceRate; });
document.getElementById('voice-pitch')?.addEventListener('input', (e) => { voicePitch = parseInt(e.target.value); pitchValue.innerText = voicePitch; });
document.getElementById('voice-volume')?.addEventListener('input', (e) => { voiceVolume = parseInt(e.target.value); volumeValue.innerText = voiceVolume; });
document.getElementById('test-voice-btn')?.addEventListener('click', () => speak('Hello Sir. This is your current JARVIS voice configuration.'));
document.getElementById('voice-response-toggle')?.addEventListener('change', (e) => { voiceResponseEnabled = e.target.checked; });

// ─── Microphone Test ─────────────────────────────────────────────
const micTestResult = document.getElementById('mic-test-result');
document.getElementById('mic-test-btn')?.addEventListener('click', async () => {
    micTestResult.innerText = 'Speak now...';
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        ctx.createMediaStreamSource(stream).connect(analyser);
        const buf = new Uint8Array(analyser.frequencyBinCount);
        let max = 0, t0 = Date.now();
        const loop = () => {
            analyser.getByteFrequencyData(buf);
            const avg = buf.reduce((a, b) => a + b) / buf.length;
            max = Math.max(max, avg);
            if (Date.now() - t0 < 2000) { micTestResult.innerText = `Level: ${Math.round(avg)}`; requestAnimationFrame(loop); }
            else { stream.getTracks().forEach(t => t.stop()); ctx.close(); micTestResult.innerText = max > 10 ? `✓ Working! Peak: ${Math.round(max)}` : `✗ No sound`; }
        };
        loop();
    } catch (e) { micTestResult.innerText = `✗ ${e.message}`; }
});

console.log('JARVIS initialized.');
