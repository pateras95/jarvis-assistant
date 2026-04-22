const { app, BrowserWindow, ipcMain, shell, screen } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const os = require('os');
const si = require('systeminformation');

// Enable speech synthesis features for Linux
app.commandLine.appendSwitch('enable-speech-dispatcher');

let voiceProcess = null;
let mainWindow = null;

// ─── App Launcher Map ────────────────────────────────────────────
const APP_MAP = {
  'chrome':        'google-chrome',
  'google':        'google-chrome',
  'google chrome': 'google-chrome',
  'browser':       'google-chrome',
  'firefox':       'firefox',
  'intellij':      'intellij-idea',
  'idea':          'intellij-idea',
  'code':          'code',
  'vs code':       'code',
  'vscode':        'code',
  'visual studio': 'code',
  'postman':       'postman',
  'terminal':      'gnome-terminal',
  'spotify':       'spotify',
  'music':         'spotify',
  'discord':       'discord',
  'files':         'nautilus',
  'file manager':  'nautilus',
  'calculator':    'gnome-calculator',
  'settings':      'gnome-control-center',
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 850,
    frame: false,
    transparent: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.setAlwaysOnTop(true, 'floating');
  mainWindow.loadFile('index.html');
}

// Start the Python vosk speech recognition engine
function startVoiceEngine() {
  const modelPath = path.join(__dirname, 'models', 'english');
  voiceProcess = spawn('python3', [path.join(__dirname, 'voice_engine.py'), modelPath]);

  voiceProcess.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(l => l.trim());
    for (const line of lines) {
      try {
        const msg = JSON.parse(line);

        if (msg.status === 'ready') {
          console.log('[JARVIS] Voice engine ready (offline)');
          if (mainWindow) mainWindow.webContents.send('voice-engine-status', 'ready');
        } else if (msg.error) {
          console.error('[JARVIS] Voice engine error:', msg.error);
          if (mainWindow) mainWindow.webContents.send('voice-engine-status', 'error');
        } else if (msg.type === 'final') {
          console.log(`[VOICE]: ${msg.text}`);
          if (mainWindow) mainWindow.webContents.send('voice-result', { type: 'final', text: msg.text });
        } else if (msg.type === 'partial') {
          if (mainWindow) mainWindow.webContents.send('voice-result', { type: 'partial', text: msg.text });
        }
      } catch (e) {
        // not JSON, print raw
        console.log('[VOICE ENGINE]', line);
      }
    }
  });

  voiceProcess.stderr.on('data', (data) => {
    const text = data.toString().trim();
    if (text) console.error('[VOICE ENGINE STDERR]', text);
  });

  voiceProcess.on('close', (code) => {
    console.log(`[JARVIS] Voice engine exited with code ${code}`);
    voiceProcess = null;
    if (mainWindow) mainWindow.webContents.send('voice-engine-status', 'stopped');
  });
}

// IPC handlers
ipcMain.on('voice-input', (event, transcript) => {
  console.log(`[JARVIS]: ${transcript}`);
});

// Send speak command to Python TTS (spd-say)
ipcMain.on('speak', (event, payload) => {
  if (voiceProcess && voiceProcess.stdin) {
    voiceProcess.stdin.write(`SPEAK:${payload}\n`);
    try {
      const data = JSON.parse(payload);
      console.log(`[TTS] Speaking: ${data.text} (${data.type}, rate:${data.rate}, pitch:${data.pitch})`);
    } catch (e) {
      console.log(`[TTS] Speaking: ${payload}`);
    }
  }
});

ipcMain.on('launch-app', (event, appName) => {
  const key = appName.toLowerCase().trim();
  const cmd = APP_MAP[key];
  const toRun = cmd || key;
  console.log(`[JARVIS] Launching: ${toRun}`);
  try {
    const child = spawn(toRun, [], { detached: true, stdio: 'ignore', shell: true });
    child.unref();
    child.on('error', (err) => {
      console.error(`[JARVIS] Launch failed: ${err.message}`);
      if (mainWindow) mainWindow.webContents.send('app-launched', { success: false, app: appName });
    });
    if (mainWindow) mainWindow.webContents.send('app-launched', { success: true, app: appName });
  } catch (err) {
    console.error(`[JARVIS] Launch error: ${err.message}`);
    if (mainWindow) mainWindow.webContents.send('app-launched', { success: false, app: appName });
  }
});

// Play a specific Spotify URI (track/album/playlist)
ipcMain.on('spotify-play', (event, uri) => {
  console.log(`[JARVIS] Spotify play: ${uri}`);
  // xdg-open with spotify: URI will open and auto-play in Spotify
  spawn('xdg-open', [uri], { detached: true, stdio: 'ignore' }).unref();
});

// Search and play a song on Spotify
ipcMain.on('spotify-search-play', (event, query) => {
  console.log(`[JARVIS] Spotify search+play: ${query}`);
  // Open Spotify search URI
  const searchUri = `spotify:search:${encodeURIComponent(query)}`;
  spawn('xdg-open', [searchUri], { detached: true, stdio: 'ignore' }).unref();

  // After search loads, focus Spotify and press Enter to play first result
  // Then use Tab+Enter or just Enter to start playback
  setTimeout(() => {
    exec('xdotool search --name "Spotify" windowactivate --sync 2>/dev/null', () => {
      // Small delay after focus, then press Enter to play top result
      setTimeout(() => {
        exec('xdotool key Return');
        console.log('[JARVIS] Sent Enter to Spotify to play first result');
      }, 800);
    });
  }, 2500);
});

// Media controls — use XF86 media keys via xdotool (works with snap Spotify)
ipcMain.on('media-control', (event, action) => {
  console.log(`[JARVIS] Media: ${action}`);
  switch (action) {
    case 'pause':
    case 'play':
      exec('xdotool key XF86AudioPlay');
      break;
    case 'next':
      exec('xdotool key XF86AudioNext');
      break;
    case 'previous':
      exec('xdotool key XF86AudioPrev');
      break;
    case 'mute':
      exec('xdotool key XF86AudioMute');
      break;
  }
});

// System commands
ipcMain.on('system-command', (event, cmd) => {
  console.log(`[JARVIS] System: ${cmd}`);
  const homeDir = os.homedir();
  switch (cmd) {
    case 'screenshot':
      exec(`gnome-screenshot -f ${homeDir}/Pictures/jarvis-screenshot-$(date +%s).png`, (err) => {
        if (err) exec(`import -window root ${homeDir}/Pictures/jarvis-screenshot.png`);
      });
      break;
    case 'lock':
      exec('loginctl lock-session');
      break;
    case 'volume-up':
      exec('wpctl set-volume @DEFAULT_AUDIO_SINK@ 5%+', (err) => {
        if (err) exec('amixer set Master 5%+');
      });
      break;
    case 'volume-down':
      exec('wpctl set-volume @DEFAULT_AUDIO_SINK@ 5%-', (err) => {
        if (err) exec('amixer set Master 5%-');
      });
      break;
    default:
      if (cmd.startsWith('volume-set:')) {
        const pct = cmd.split(':')[1];
        const wpctlVol = (parseInt(pct) / 100).toFixed(2);
        exec(`wpctl set-volume @DEFAULT_AUDIO_SINK@ ${wpctlVol}`, (err) => {
          if (err) exec(`amixer set Master ${pct}%`);
        });
      }
      break;
  }
});

// Close/kill applications
ipcMain.on('close-app', (event, appName) => {
  const key = appName.toLowerCase().trim();
  // Map friendly names to process names
  const PROCESS_MAP = {
    'chrome': 'google-chrome',
    'google chrome': 'google-chrome',
    'firefox': 'firefox',
    'spotify': 'spotify',
    'intellij': 'idea',
    'idea': 'idea',
    'code': 'code',
    'vs code': 'code',
    'vscode': 'code',
    'discord': 'Discord',
    'postman': 'postman',
    'terminal': 'gnome-terminal',
    'calculator': 'gnome-calculator',
    'files': 'nautilus',
  };
  const proc = PROCESS_MAP[key] || key;
  console.log(`[JARVIS] Closing: ${proc}`);
  exec(`pkill -f "${proc}"`, (err) => {
    if (mainWindow) mainWindow.webContents.send('app-closed', { success: !err, app: appName });
  });
});

ipcMain.on('app-quit', () => {
  if (voiceProcess) voiceProcess.kill();
  app.quit();
});

// Web search via default browser
ipcMain.on('web-search', (event, query) => {
  console.log(`[JARVIS] Searching: ${query}`);
  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
});

// Internet speed test - opens Chrome directly to the run page
ipcMain.on('test-internet', () => {
  console.log(`[JARVIS] Testing internet speed`);
  // Use the direct /run URL which auto-starts the test
  const url = 'https://www.speedtest.net/run';
  spawn('google-chrome', ['--new-window', url], { detached: true, stdio: 'ignore' }).unref();
});

ipcMain.on('start-voice-engine', () => {
  if (!voiceProcess) {
    startVoiceEngine();
  }
});

ipcMain.on('stop-voice-engine', () => {
  if (voiceProcess) {
    voiceProcess.kill();
    voiceProcess = null;
  }
});

// System monitoring - get current stats
ipcMain.on('get-system-stats', async (event) => {
  try {
    const [cpu, mem, disk, currentLoad, temp, networkStats, graphics, osInfo] = await Promise.all([
      si.cpu(),
      si.mem(),
      si.fsSize(),
      si.currentLoad(),
      si.cpuTemperature(),
      si.networkStats(),
      si.graphics(),
      si.osInfo()
    ]);

    // Sum network across all interfaces
    const netRx = networkStats.reduce((sum, iface) => sum + (iface.rx_sec || 0), 0);
    const netTx = networkStats.reduce((sum, iface) => sum + (iface.tx_sec || 0), 0);

    const gpu = graphics.controllers?.[0];

    const stats = {
      cpu: {
        model: cpu.brand || 'Unknown',
        usage: Math.round(currentLoad.currentLoad),
        cores: cpu.cores,
        speed: cpu.speed,
        temp: temp.main || 0
      },
      memory: {
        total: (mem.total / 1024 / 1024 / 1024).toFixed(1),
        used: (mem.used / 1024 / 1024 / 1024).toFixed(1),
        percent: Math.round((mem.used / mem.total) * 100)
      },
      disk: {
        total: Math.round(disk[0]?.size / 1024 / 1024 / 1024) || 0,
        used: Math.round(disk[0]?.used / 1024 / 1024 / 1024) || 0,
        percent: Math.round(disk[0]?.use) || 0
      },
      network: {
        down: formatBytes(netRx),
        up: formatBytes(netTx)
      },
      gpu: {
        model: gpu?.model || 'N/A',
        temp: gpu?.temperatureGpu || 0,
        vram: gpu?.vram || 0
      },
      os: {
        platform: osInfo.platform,
        distro: osInfo.distro,
        kernel: osInfo.kernel
      },
      uptime: os.uptime()
    };

    event.reply('system-stats', stats);
  } catch (error) {
    console.error('[JARVIS] System stats error:', error);
    event.reply('system-stats', null);
  }
});

function formatBytes(bytes) {
  if (bytes === 0) return '0 B/s';
  if (bytes < 1024) return bytes.toFixed(0) + ' B/s';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB/s';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB/s';
}

// Move window to the other monitor (toggle)
ipcMain.on('move-to-other-monitor', () => {
  if (!mainWindow) return;
  const displays = screen.getAllDisplays();
  if (displays.length < 2) {
    console.log('[JARVIS] Only one display detected');
    return;
  }
  // Find which display the window is currently on
  const currentBounds = mainWindow.getBounds();
  const currentDisplay = screen.getDisplayNearestPoint({ x: currentBounds.x, y: currentBounds.y });
  // Pick the other display
  const target = displays.find(d => d.id !== currentDisplay.id) || displays[0];
  const { x, y, width, height } = target.workArea;
  const winBounds = mainWindow.getBounds();
  const newX = x + Math.round((width - winBounds.width) / 2);
  const newY = y + Math.round((height - winBounds.height) / 2);
  mainWindow.setPosition(newX, newY);
  console.log(`[JARVIS] Moved to other display at ${newX},${newY}`);
});

// Get display info
ipcMain.on('get-displays', (event) => {
  const displays = screen.getAllDisplays();
  event.reply('display-info', displays.map((d, i) => ({
    index: i,
    label: d.label || `Display ${i + 1}`,
    width: d.size.width,
    height: d.size.height,
    primary: d.id === screen.getPrimaryDisplay().id
  })));
});

app.whenReady().then(() => {
  createWindow();
  startVoiceEngine();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (voiceProcess) voiceProcess.kill();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
