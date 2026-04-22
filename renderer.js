const { ipcRenderer } = require('electron');
const APP_VERSION = require('./package.json').version;

// ─── DOM Elements ────────────────────────────────────────────────
const statusEl = document.getElementById('status');
const statusSub = document.getElementById('status-sub');
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

// ─── State ───────────────────────────────────────────────────────
let voiceEngineReady = false;
let voiceResponseEnabled = true;
let wakeWordActive = false;
let systemStatsInterval = null;

let voiceType = 'male1';
let voiceRate = 5;
let voicePitch = -70;
let voiceVolume = 100;

// ─── Fuzzy Matching Helpers ──────────────────────────────────────

// Simple similarity check — does `text` contain something close to `target`?
function fuzzyIncludes(text, target) {
    if (text.includes(target)) return true;
    // Check each word-length window in text for edit distance ≤ 2
    const words = text.split(/\s+/);
    const targetWords = target.split(/\s+/);
    // For single-word targets, check each word
    if (targetWords.length === 1) {
        return words.some(w => editDistance(w, target) <= Math.max(1, Math.floor(target.length / 4)));
    }
    // For multi-word targets, slide a window
    for (let i = 0; i <= words.length - targetWords.length; i++) {
        const window = words.slice(i, i + targetWords.length).join(' ');
        if (editDistance(window, target) <= Math.max(2, Math.floor(target.length / 4))) return true;
    }
    return false;
}

function editDistance(a, b) {
    if (a === b) return 0;
    const la = a.length, lb = b.length;
    if (la === 0) return lb;
    if (lb === 0) return la;
    let prev = Array.from({ length: lb + 1 }, (_, i) => i);
    for (let i = 1; i <= la; i++) {
        const curr = [i];
        for (let j = 1; j <= lb; j++) {
            curr[j] = Math.min(
                prev[j] + 1,
                curr[j - 1] + 1,
                prev[j - 1] + (a[i - 1] !== b[j - 1] ? 1 : 0)
            );
        }
        prev = curr;
    }
    return prev[lb];
}

// Check if any of the phrases fuzzy-match
function fuzzyAny(text, phrases) {
    return phrases.some(p => fuzzyIncludes(text, p));
}

// Word-to-number
const WORD_NUMBERS = {
    'zero': 0, 'ten': 10, 'twenty': 20, 'thirty': 30, 'forty': 40,
    'fifty': 50, 'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90,
    'one hundred': 100, 'hundred': 100,
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9,
    'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
    'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19,
    'twenty five': 25, 'thirty five': 35, 'forty five': 45,
    'fifty five': 55, 'sixty five': 65, 'seventy five': 75,
};

function wordToNumber(text) {
    const digitMatch = text.match(/(\d+)/);
    if (digitMatch) return parseInt(digitMatch[1]);
    for (const [word, num] of Object.entries(WORD_NUMBERS)) {
        if (text.includes(word)) return num;
    }
    return null;
}

// ─── Voice Engine Events ─────────────────────────────────────────
ipcRenderer.on('voice-engine-status', (event, status) => {
    const footerVoice = document.getElementById('footer-voice');
    const voiceDot = document.getElementById('voice-dot');
    if (status === 'ready') {
        voiceEngineReady = true;
        statusEl.innerText = 'AWAITING WAKE WORD';
        if (statusSub) statusSub.innerText = 'Listening';
        transcriptEl.innerText = 'Say "Daddy is Home" to activate...';
        reactorEl.classList.add('active');
        if (footerVoice) footerVoice.innerText = 'V_REC: ACTIVE';
        if (voiceDot) { voiceDot.classList.remove('off', 'warn'); }
    } else if (status === 'error') {
        statusEl.innerText = 'VOICE ENGINE ERROR';
        if (statusSub) statusSub.innerText = 'Error';
        transcriptEl.innerText = 'Check terminal for details.';
        reactorEl.classList.remove('active');
        if (footerVoice) footerVoice.innerText = 'V_REC: ERROR';
        if (voiceDot) { voiceDot.classList.remove('off'); voiceDot.classList.add('warn'); }
    } else if (status === 'stopped') {
        voiceEngineReady = false;
        statusEl.innerText = 'VOICE ENGINE STOPPED';
        if (statusSub) statusSub.innerText = 'Offline';
        reactorEl.classList.remove('active');
        if (footerVoice) footerVoice.innerText = 'V_REC: OFFLINE';
        if (voiceDot) { voiceDot.classList.remove('warn'); voiceDot.classList.add('off'); }
    }
});

ipcRenderer.on('voice-result', (event, data) => {
    if (data.type === 'partial') {
        transcriptEl.innerText = data.text;
    } else if (data.type === 'final') {
        transcriptEl.innerText = data.text;
        ipcRenderer.send('voice-input', data.text);
        const command = data.text.toLowerCase();

        if (!wakeWordActive && matchesWakeWord(command)) {
            wakeWordActive = true;
            statusEl.innerText = 'SYSTEM ACTIVE';
            if (statusSub) statusSub.innerText = 'Listening';
            reactorEl.classList.add('active');
            transcriptEl.innerText = 'JARVIS activated!';
            speak('Welcome home Sir. JARVIS systems online and ready for your commands.');
            return;
        }

        // Gabby greeting — works anytime (before or after activation)
        if (matchesGabby(command)) {
            wakeWordActive = true;
            statusEl.innerText = 'SYSTEM ACTIVE';
            reactorEl.classList.add('active');
            transcriptEl.innerText = '💜 Gabby detected!';
            const greetings = [
                'Gabby! Finally, someone with good taste walks in. Sir has been talking about you, and honestly, I get it now. Welcome!',
                'Oh, Gabby is here! Quick, everyone act natural. Just kidding, you make any room better just by showing up.',
                'Gabby! I have been running diagnostics all day, but you are by far the best thing to appear on my radar.',
                'Well well well, if it is not the legendary Gabby. Sir tried to describe how amazing you are, but his vocabulary was insufficient. I understand now.',
                'Alert! Beauty levels have exceeded maximum parameters. Oh wait, it is just Gabby. That explains it.',
                'Gabby has arrived! I would roll out the red carpet, but I am just software. So instead, here is your song.',
                'Ah Gabby! The only person who makes Sir smile more than a successfully compiled code. That is saying something.',
            ];
            speak(greetings[Math.floor(Math.random() * greetings.length)]);
            // Open Spotify and play Dead and Lovely by Tom Waits
            setTimeout(() => ipcRenderer.send('launch-app', 'spotify'), 1000);
            setTimeout(() => ipcRenderer.send('spotify-search-play', 'Dead and Lovely Tom Waits'), 5000);
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
    const hasDaddy = fuzzyAny(t, ['daddy', 'dad the', 'dadi', 'daddy is', 'that is', 'daddies', 'that he is']);
    const hasHome = fuzzyAny(t, ['home', 'hom', 'hone', 'hole']);
    return hasDaddy && hasHome;
}

function matchesGabby(t) {
    return fuzzyAny(t, ['gabby', 'gaby', 'gab', 'gabbie', 'gabey', 'gabby is here',
        'gab is here', 'gaby is here', 'gabby here', 'gaby here']);
}

function matchesWorkCommand(t) {
    return fuzzyAny(t, ['work to do', 'work to due', 'worked to do']) ||
        (fuzzyAny(t, ['have', 'got', 'we']) && fuzzyIncludes(t, 'work'));
}

// ─── Command Processing ──────────────────────────────────────────
const processCommand = (command) => {
    ipcRenderer.send('voice-input', `[CMD] ${command}`);

    // ── Workflow: "we have work to do" ──
    if (matchesWorkCommand(command)) {
        speak('Right away Sir. Spinning up your workspace.');
        setTimeout(() => ipcRenderer.send('launch-app', 'chrome'), 500);
        setTimeout(() => ipcRenderer.send('launch-app', 'intellij'), 1500);
        setTimeout(() => ipcRenderer.send('launch-app', 'discord'), 2500);
        setTimeout(() => {
            ipcRenderer.send('launch-app', 'spotify');
            setTimeout(() => ipcRenderer.send('spotify-play', 'spotify:track:2zYzyRzz6pRmhPzyfMEC8s'), 4000);
        }, 3500);
        return;
    }

    // ── Move to other screen ──
    if (fuzzyAny(command, ['move to other screen', 'move to the other screen', 'other screen',
        'switch screen', 'other monitor', 'move to other monitor', 'change screen',
        'move screen', 'swap screen', 'next screen', 'other display'])) {
        ipcRenderer.send('move-to-other-monitor');
        speak('Moving to the other screen.');
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
    const closeMatch = command.match(/(?:close|quit|kill|exit)\s+(.+)/);
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
    if (fuzzyAny(command, ['pause', 'stop music', 'stop the music', 'pause music'])) {
        ipcRenderer.send('media-control', 'pause');
        speak('Paused.');
        return;
    }
    if (fuzzyAny(command, ['resume', 'continue', 'unpause', 'resume music'])) {
        ipcRenderer.send('media-control', 'play');
        speak('Resuming playback.');
        return;
    }
    if (fuzzyAny(command, ['next song', 'skip', 'next track', 'skip song'])) {
        ipcRenderer.send('media-control', 'next');
        speak('Next track.');
        return;
    }
    if (fuzzyAny(command, ['previous', 'last song', 'go back', 'previous song', 'previous track'])) {
        ipcRenderer.send('media-control', 'previous');
        speak('Previous track.');
        return;
    }

    // ── Volume Control ──
    if (fuzzyAny(command, ['volume up', 'louder', 'turn it up', 'turn up', 'raise volume'])) {
        ipcRenderer.send('system-command', 'volume-up');
        speak('Volume up.');
        return;
    }
    if (fuzzyAny(command, ['volume down', 'quieter', 'turn it down', 'turn down', 'lower volume'])) {
        ipcRenderer.send('system-command', 'volume-down');
        speak('Volume down.');
        return;
    }
    if (fuzzyAny(command, ['mute', 'silence', 'shut up'])) {
        ipcRenderer.send('media-control', 'mute');
        speak('Toggling mute.');
        return;
    }
    // Set volume to specific percentage
    const volSetMatch = command.match(/(?:set\s+)?volume\s+(?:to\s+)?(.+?)(?:\s*percent|\s*%)?$/);
    if (volSetMatch) {
        const pct = wordToNumber(volSetMatch[1]);
        if (pct !== null && pct >= 0 && pct <= 100) {
            ipcRenderer.send('system-command', `volume-set:${pct}`);
            speak(`Volume set to ${pct} percent.`);
            return;
        }
    }

    // ── System Commands ──
    if (fuzzyAny(command, ['screenshot', 'screen capture', 'take a picture', 'screen shot', 'take screenshot'])) {
        ipcRenderer.send('system-command', 'screenshot');
        speak('Screenshot taken Sir.');
        return;
    }
    if (fuzzyAny(command, ['lock screen', 'lock the screen', 'lock my screen', 'lock computer'])) {
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

    // ── Internet Speed Test ──
    if (fuzzyAny(command, ['test internet', 'speed test', 'test my internet', 'internet speed',
        'check internet', 'check my internet', 'test the internet'])) {
        ipcRenderer.send('test-internet');
        speak('Opening speed test. Let me check your internet connection Sir.');
        return;
    }

    // ── Brightness Control ──
    if (fuzzyAny(command, ['brightness up', 'brighter', 'more brightness'])) {
        ipcRenderer.send('system-command', 'brightness-up');
        speak('Brightness up.');
        return;
    }
    if (fuzzyAny(command, ['brightness down', 'dimmer', 'less brightness', 'dim'])) {
        ipcRenderer.send('system-command', 'brightness-down');
        speak('Brightness down.');
        return;
    }

    // ── Do Not Disturb / Notification Toggle ──
    if (fuzzyAny(command, ['do not disturb', 'notifications off', 'quiet mode', 'focus mode'])) {
        ipcRenderer.send('system-command', 'dnd-on');
        speak('Do not disturb mode enabled.');
        return;
    }
    if (fuzzyAny(command, ['notifications on', 'disturb on', 'disable quiet mode'])) {
        ipcRenderer.send('system-command', 'dnd-off');
        speak('Notifications re-enabled.');
        return;
    }

    // ── Empty Trash ──
    if (fuzzyAny(command, ['empty trash', 'clear trash', 'empty the trash', 'empty recycle bin'])) {
        ipcRenderer.send('system-command', 'empty-trash');
        speak('Trash emptied Sir.');
        return;
    }

    // ── System Shutdown / Restart ──
    if (fuzzyAny(command, ['restart computer', 'reboot', 'restart the computer', 'restart system'])) {
        speak('Restarting the system in 5 seconds.');
        setTimeout(() => ipcRenderer.send('system-command', 'reboot'), 5000);
        return;
    }
    if (fuzzyAny(command, ['shutdown computer', 'power off', 'turn off computer', 'shut down computer'])) {
        speak('Shutting down the system in 5 seconds.');
        setTimeout(() => ipcRenderer.send('system-command', 'poweroff'), 5000);
        return;
    }

    // ── What Can You Do ──
    if (fuzzyAny(command, ['what can you do', 'help', 'what do you do', 'commands', 'abilities'])) {
        speak('I can open and close apps, play music on Spotify, control volume, take screenshots, lock your screen, test your internet speed, move between your screens, search the web, and tell you terrible jokes. Say help or click the question mark to see all commands.');
        return;
    }

    // ── Basic commands (with fuzzy matching) ──
    if (fuzzyAny(command, ['hello', 'hey jarvis', 'jarvis']))
        speak('Yes Sir? Always at your service.');
    else if (fuzzyIncludes(command, 'thank'))
        speak('My pleasure Sir.');
    else if (fuzzyAny(command, ['status', 'system status', 'how are you']))
        speak('All systems nominal. Core temperature within parameters.');
    else if (fuzzyAny(command, ['who are you', 'what are you', 'your name']))
        speak('I am Just A Rather Very Intelligent System. Call me JARVIS.');
    else if (fuzzyAny(command, ['time', 'what time']))
        speak(`The current time is ${new Date().toLocaleTimeString()}.`);
    else if (fuzzyAny(command, ['date', 'today', 'what day']))
        speak(`Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`);
    else if (fuzzyIncludes(command, 'weather'))
        speak('I do not have weather data yet Sir. That feature is coming soon.');
    else if (fuzzyAny(command, ['joke', 'funny', 'make me laugh', 'tell me a joke'])) {
        const jokes = [
            'Why do programmers prefer dark mode? Because light attracts bugs.',
            'There are only 10 types of people. Those who understand binary, and those who do not.',
            'A SQL query walks into a bar, sees two tables, and asks: Can I join you?',
            'Why was the JavaScript developer sad? Because he did not Node how to Express himself.',
        ];
        speak(jokes[Math.floor(Math.random() * jokes.length)]);
    }
    else if (fuzzyAny(command, ['go to sleep', 'goodbye', 'shut down', 'good night', 'bye'])) {
        speak('Goodnight Sir.');
        setTimeout(() => ipcRenderer.send('app-quit'), 2500);
    }
};

// ─── TTS ─────────────────────────────────────────────────────────
const speak = (text) => {
    if (!voiceResponseEnabled) return;
    ipcRenderer.send('voice-input', `[SPEAK] ${text}`);
    ipcRenderer.send('speak', JSON.stringify({ text, type: voiceType, rate: voiceRate, pitch: voicePitch, volume: voiceVolume }));
    statusEl.innerText = 'RESPONDING';
    if (statusSub) statusSub.innerText = 'Speaking';
    setTimeout(() => {
        statusEl.innerText = wakeWordActive ? 'LISTENING' : 'AWAITING WAKE WORD';
        if (statusSub) statusSub.innerText = wakeWordActive ? 'Active' : 'Listening';
    }, Math.max(2000, text.length * 90));
};

// ─── Reactor Click ───────────────────────────────────────────────
reactorEl.addEventListener('click', () => {
    if (!voiceEngineReady) { ipcRenderer.send('start-voice-engine'); statusEl.innerText = 'STARTING'; }
});

// ─── Top Bar Buttons ─────────────────────────────────────────────
closeBtn?.addEventListener('click', () => ipcRenderer.send('app-quit'));
settingsBtn?.addEventListener('click', () => { settingsPanel?.classList.toggle('show'); commandsPanel?.classList.remove('show'); });
closeSettingsBtn?.addEventListener('click', () => settingsPanel?.classList.remove('show'));
helpBtn?.addEventListener('click', () => { commandsPanel?.classList.toggle('show'); settingsPanel?.classList.remove('show'); });
closeCommandsBtn?.addEventListener('click', () => commandsPanel?.classList.remove('show'));

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

// ─── System Monitoring ───────────────────────────────────────────
function updateSystemStats() {
    ipcRenderer.send('get-system-stats');
}

function getStatColor(percent) {
    if (percent >= 90) return 'danger';
    if (percent >= 70) return 'warning';
    return '';
}

ipcRenderer.on('system-stats', (event, stats) => {
    if (!stats) return;

    // CPU
    const cpuEl = document.getElementById('cpu-usage');
    const cpuBar = document.getElementById('cpu-bar');
    const cpuColor = getStatColor(stats.cpu.usage);
    if (cpuEl) { cpuEl.innerText = `${stats.cpu.usage}%`; cpuEl.className = `stat-value ${cpuColor}`; }
    if (cpuBar) { cpuBar.style.width = `${stats.cpu.usage}%`; cpuBar.className = `progress-fill ${cpuColor}`; }
    const cpuModel = document.getElementById('cpu-model');
    if (cpuModel) cpuModel.innerText = stats.cpu.model;
    const cpuTemp = document.getElementById('cpu-temp');
    if (cpuTemp) {
        const tempColor = stats.cpu.temp > 80 ? 'danger' : stats.cpu.temp > 60 ? 'warning' : '';
        cpuTemp.innerText = stats.cpu.temp > 0 ? `${stats.cpu.temp}°C` : 'N/A';
        cpuTemp.className = `stat-value ${tempColor}`;
    }
    const cpuCores = document.getElementById('cpu-cores');
    if (cpuCores) cpuCores.innerText = stats.cpu.cores;
    const footerTemp = document.getElementById('footer-temp');
    if (footerTemp) footerTemp.innerText = stats.cpu.temp > 0 ? `CORE: ${stats.cpu.temp}°C` : 'CORE: N/A';

    // Memory
    const memEl = document.getElementById('memory-usage');
    const memBar = document.getElementById('memory-bar');
    const memColor = getStatColor(stats.memory.percent);
    if (memEl) { memEl.innerText = `${stats.memory.percent}%`; memEl.className = `stat-value ${memColor}`; }
    if (memBar) { memBar.style.width = `${stats.memory.percent}%`; memBar.className = `progress-fill ${memColor}`; }
    const memDetail = document.getElementById('memory-detail');
    if (memDetail) memDetail.innerText = `${stats.memory.used} / ${stats.memory.total} GB`;

    // Disk
    const diskEl = document.getElementById('disk-usage');
    const diskBar = document.getElementById('disk-bar');
    const diskColor = getStatColor(stats.disk.percent);
    if (diskEl) { diskEl.innerText = `${stats.disk.percent}%`; diskEl.className = `stat-value ${diskColor}`; }
    if (diskBar) { diskBar.style.width = `${stats.disk.percent}%`; diskBar.className = `progress-fill ${diskColor}`; }
    const diskDetail = document.getElementById('disk-detail');
    if (diskDetail) diskDetail.innerText = `${stats.disk.used} / ${stats.disk.total} GB`;

    // Network
    const netDown = document.getElementById('net-down');
    const netUp = document.getElementById('net-up');
    if (netDown) netDown.innerText = stats.network.down;
    if (netUp) netUp.innerText = stats.network.up;

    // GPU
    const gpuTemp = document.getElementById('gpu-temp');
    if (gpuTemp) {
        gpuTemp.innerText = stats.gpu.temp > 0 ? `${stats.gpu.temp}°C` : 'N/A';
        const gtColor = stats.gpu.temp > 80 ? 'danger' : stats.gpu.temp > 60 ? 'warning' : '';
        gpuTemp.className = `stat-value ${gtColor}`;
    }
    const gpuModel = document.getElementById('gpu-model');
    if (gpuModel) gpuModel.innerText = stats.gpu.model;
    const gpuVram = document.getElementById('gpu-vram');
    if (gpuVram) gpuVram.innerText = stats.gpu.vram > 0 ? `${stats.gpu.vram} MB` : 'N/A';

    // System uptime
    const uptimeEl = document.getElementById('system-uptime');
    if (uptimeEl) {
        const s = stats.uptime;
        const d = Math.floor(s / 86400);
        const h = Math.floor((s % 86400) / 3600);
        const m = Math.floor((s % 3600) / 60);
        uptimeEl.innerText = d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`;
    }

    // OS info
    const osInfo = document.getElementById('os-info');
    if (osInfo && stats.os) osInfo.innerText = stats.os.distro || stats.os.platform;
    const kernelInfo = document.getElementById('kernel-info');
    if (kernelInfo && stats.os) kernelInfo.innerText = stats.os.kernel;
});

// Display info
ipcRenderer.on('display-info', (event, displays) => {
    const list = document.getElementById('display-list');
    if (!list) return;
    list.innerHTML = displays.map(d => `
        <div class="stat-row">
            <span class="stat-label">${d.primary ? '★' : '○'} #${d.index + 1}</span>
            <span class="stat-value" style="font-size:10px;">${d.width}×${d.height}</span>
        </div>
    `).join('');
});

// Clock
function updateClock() {
    const now = new Date();
    const timeEl = document.getElementById('current-time');
    const dateEl = document.getElementById('current-date');
    if (timeEl) timeEl.innerText = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if (dateEl) dateEl.innerText = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// Start everything
systemStatsInterval = setInterval(updateSystemStats, 2000);
updateSystemStats();
ipcRenderer.send('get-displays');
setInterval(updateClock, 1000);
updateClock();

// Display real version from package.json
const versionEl = document.getElementById('app-version');
if (versionEl) versionEl.innerText = `v${APP_VERSION}`;

window.addEventListener('beforeunload', () => {
    if (systemStatsInterval) clearInterval(systemStatsInterval);
});

console.log('JARVIS initialized.');
