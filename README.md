# 🤖 JARVIS Assistant
<div align="center">
![JARVIS Assistant](jarvis.png)
*Just A Rather Very Intelligent System - Your personal AI voice assistant inspired by Iron Man*
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Electron](https://img.shields.io/badge/Electron-41.2.2-47848F?logo=electron)](https://www.electronjs.org/)
[![Python](https://img.shields.io/badge/Python-3.8+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
</div>
---
## 📋 Table of Contents
- [Overview](#-overview)
- [Features](#-features)
- [How It Works](#-how-it-works)
- [System Architecture](#-system-architecture)
- [Integrations](#-integrations)
- [Installation](#-installation)
- [Usage](#-usage)
- [Voice Commands](#-voice-commands)
- [Configuration](#-configuration)
- [Troubleshooting](#-troubleshooting)
- [Building](#-building)
- [Contributing](#-contributing)
- [License](#-license)
---
## 🌟 Overview
JARVIS Assistant is an **offline-capable AI voice assistant** built with Electron and Python that brings the iconic JARVIS experience from Iron Man to your Linux desktop. With a sleek Arc Reactor-inspired UI and powerful voice recognition, JARVIS can control your applications, play music, search the web, and much more—all through natural voice commands.
**Key Highlights:**
- 🎤 **100% Offline Voice Recognition** using Vosk AI
- 🎨 **Arc Reactor UI** with animated reactor core
- 🚀 **Application Control** - Launch, close, and manage apps
- 🎵 **Spotify Integration** - Play music with voice commands
- 🔊 **Text-to-Speech** with customizable voice settings
- ⚡ **System Control** - Volume, screenshots, screen lock, and more
- 🌐 **Web Search** - Instant Google searches
- 💻 **Developer Workflow** - One command workspace setup
---
## ✨ Features
### 🎤 Voice Recognition & Control
- **Offline Speech Recognition** using Vosk AI model
- **Wake Word Activation** - Say "Daddy is Home" to activate JARVIS
- **Natural Language Processing** - Understands variations of commands
- **Partial & Final Transcription** - Real-time feedback
### 🎨 User Interface
- **Arc Reactor Design** - Animated, glowing reactor core
- **Frameless Transparent Window** - Floating, always-on-top interface
- **Visual Feedback** - Reactor animation speed changes with activity
- **Dark Theme** - Easy on the eyes
### 🚀 Application Management
**Launch applications with voice:**
- Chrome / Firefox / Browser
- IntelliJ IDEA / VS Code
- Spotify / Discord
- Terminal / File Manager
- Calculator / Settings
- Postman
- And more...
**Close applications instantly:**
- "Close Chrome"
- "Kill Spotify"
- "Exit Discord"
### 🎵 Music & Media Control
- **Spotify Integration**
  - Play songs by name
  - Play/Pause/Next/Previous
  - Control playback without touching keyboard
- **Media Keys Simulation** using xdotool
- **Auto-search and play** - Just say "Play Bohemian Rhapsody"
### 🔊 System Commands
- **Volume Control** - "Volume up", "Volume down", "Set volume to 50"
- **Screenshots** - "Take a screenshot"
- **Screen Lock** - "Lock the screen"
- **Mute/Unmute** audio
### 🌐 Web Integration
- **Google Search** - "Search for Linux tutorials"
- **Opens in default browser**
- **URL encoding** for accurate searches
### 🛠️ Developer Workflow
**"We have work to do"** - Launches your entire workspace:
1. Opens Chrome
2. Starts IntelliJ IDEA
3. Launches Discord
4. Opens Spotify and plays your coding playlist
### 🎙️ Text-to-Speech
- **Multiple voice types** (male1, male2, male3, female1, female2, female3, child_male, child_female)
- **Adjustable speech rate** (-100 to +100)
- **Adjustable pitch** (-100 to +100)
- **Adjustable volume** (0 to 100)
- **spd-say backend** (speech-dispatcher)
### 💡 Smart Features
- Time and date queries
- Status reports
- Dad jokes on demand
- Customizable responses
- Settings panel for voice customization
- Built-in command reference
---
## 🔧 How It Works
JARVIS operates through a multi-component architecture:
### 1. Voice Recognition Pipeline
```
Microphone → sounddevice → Vosk Model → Speech Recognition → Command Parser
```
### 2. Command Processing
```
Voice Input → Wake Word Detection → Command Matching → Action Execution → TTS Response
```
### 3. Component Communication
```
Python Backend ←→ Electron Main Process ←→ Renderer Process
     (Vosk)           (IPC Bridge)          (UI & Commands)
```
---
## 🏗️ System Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                      User Interface                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Arc Reactor UI (index.html)                         │  │
│  │  Renderer Process (renderer.js)                      │  │
│  └─────────────────┬────────────────────────────────────┘  │
└────────────────────┼────────────────────────────────────────┘
                     │ IPC
┌────────────────────┼────────────────────────────────────────┐
│                    ▼                                         │
│          Electron Main Process (main.js)                    │
│  ┌─────────────┬────────────┬───────────┬──────────────┐   │
│  │   App       │  Spotify   │  System   │   Web        │   │
│  │  Launcher   │  Control   │  Control  │  Browser     │   │
│  └─────────────┴────────────┴───────────┴──────────────┘   │
└────────────────────┼────────────────────────────────────────┘
                     │ stdio
┌────────────────────┼────────────────────────────────────────┐
│                    ▼                                         │
│       Python Voice Engine (voice_engine.py)                 │
│  ┌──────────────┐          ┌────────────────┐              │
│  │   Vosk AI    │          │  spd-say TTS   │              │
│  │    Model     │          │  (speech-      │              │
│  │  (Speech     │          │  dispatcher)   │              │
│  │Recognition)  │          │                │              │
│  └──────────────┘          └────────────────┘              │
└───────┬────────────────────────────┬────────────────────────┘
        │                            │
   ┌────▼─────┐               ┌──────▼────────┐
   │Microphone│               │   Speakers    │
   └──────────┘               └───────────────┘
```
### Flow Diagram: Voice Command Execution
```
User: "Daddy is Home" (Wake Word)
  │
  ▼
Microphone captures audio
  │
  ▼
Python Voice Engine (sounddevice)
  │
  ▼
Vosk AI Model processes audio
  │
  ▼
Transcription: "daddy is home"
  │
  ▼
Send to Electron Main (JSON via stdout)
  │
  ▼
Forward to Renderer UI (IPC)
  │
  ▼
Renderer: Detect wake word match
  │
  ▼
Activate JARVIS mode
  │
  ▼
Send TTS request: "Welcome home, Sir..."
  │
  ▼
Python executes spd-say
  │
  ▼
Audio output to speakers
  │
  ▼
System ready for commands
───────────────────────────────────
User: "Open Chrome"
  │
  ▼
Voice captured → Vosk → "open chrome"
  │
  ▼
Renderer parses command
  │
  ▼
Match: launch-app command
  │
  ▼
Send to Main: launch-app "chrome"
  │
  ▼
Main: spawn('google-chrome')
  │
  ▼
Linux system launches Chrome
  │
  ▼
Confirm success → TTS "Opening Chrome"
```
---
## 🔌 Integrations
### Voice Recognition
- **[Vosk](https://alphacephei.com/vosk/)** - Offline speech recognition
- **sounddevice** - Audio capture from microphone
- **Kaldi** - Underlying speech recognition framework
### Text-to-Speech
- **[speech-dispatcher](https://freebsoft.org/speechd)** - TTS backend
- **spd-say** - Command-line speech synthesis
### Desktop Integration
- **xdotool** - Keyboard/mouse automation and window control
- **xdg-open** - Default application launcher
- **pactl** - PulseAudio volume control
- **gnome-screenshot** - Screen capture utility
### Application Control
- **Spotify** - Music playback via URI scheme
- **Chrome/Firefox** - Web browsing
- **IntelliJ IDEA** - IDE management
- **VS Code** - Code editing
- **Discord** - Communication
- **Postman** - API testing
### Framework & Libraries
- **[Electron 41.2.2](https://www.electronjs.org/)** - Cross-platform desktop framework
- **[Tailwind CSS 4.2.4](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Lucide Icons 1.8.0](https://lucide.dev/)** - Beautiful icon set
- **[electron-store 11.0.2](https://github.com/sindresorhus/electron-store)** - Settings persistence
---
## 📦 Installation
### Prerequisites
#### System Requirements
- **OS**: Linux (Ubuntu 20.04+, Fedora, Arch, etc.)
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 500MB for application + 200MB for Vosk model
- **Microphone**: Working audio input device
#### Software Dependencies
##### 1. Node.js & npm
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nodejs npm
# Fedora
sudo dnf install nodejs npm
# Arch Linux
sudo pacman -S nodejs npm
```
##### 2. Python 3.8+
```bash
# Ubuntu/Debian
sudo apt install python3 python3-pip
# Fedora
sudo dnf install python3 python3-pip
# Arch Linux
sudo pacman -S python python-pip
```
##### 3. Python Dependencies
```bash
pip3 install vosk sounddevice
```
##### 4. System Tools
```bash
# Ubuntu/Debian
sudo apt install speech-dispatcher xdotool
# Fedora
sudo dnf install speech-dispatcher xdotool
# Arch Linux
sudo pacman -S speech-dispatcher xdotool
```
### Installation Steps
#### 1. Clone the Repository
```bash
git clone https://github.com/pateras95/jarvis-assistant.git
cd jarvis-assistant
```
#### 2. Install Node Dependencies
```bash
npm install
```
#### 3. Download Vosk Model
Download the English language model from [Vosk Models](https://alphacephei.com/vosk/models):
```bash
# Create models directory
mkdir -p models
# Download and extract model (example: vosk-model-en-us-0.22)
cd models
wget https://alphacephei.com/vosk/models/vosk-model-en-us-0.22.zip
unzip vosk-model-en-us-0.22.zip
mv vosk-model-en-us-0.22 english
cd ..
```
#### 4. Make Scripts Executable
```bash
chmod +x jarvis.sh
```
#### 5. Test Microphone
```bash
# Test if your microphone is detected
python3 -c "import sounddevice as sd; print(sd.query_devices())"
```
---
## 🚀 Usage
### Starting JARVIS
#### Option 1: Using npm
```bash
npm start
```
#### Option 2: Using the shell script
```bash
./jarvis.sh
```
#### Option 3: Direct electron
```bash
npx electron .
```
### First Run
1. **Wait for initialization** - The Arc Reactor will glow blue when ready
2. **Activate wake word** - Say **"Daddy is Home"**
3. **JARVIS responds** - "Welcome home, Sir. JARVIS systems online..."
4. **Start commanding** - Use any voice command!
### Interface Controls
- **Click Reactor** - Restart voice engine if stopped
- **Settings Icon** (⚙️) - Adjust voice parameters
- **Help Icon** (?) - View available commands
- **Close Icon** (✕) - Quit application
---
## 🎤 Voice Commands
### Wake Word
| Command | Action |
|---------|--------|
| "Daddy is Home" | Activate JARVIS |
### Application Management
| Command | Action |
|---------|--------|
| "Open Chrome" | Launch Google Chrome |
| "Launch Firefox" | Launch Firefox |
| "Start Spotify" | Launch Spotify |
| "Run IntelliJ" / "Open IDEA" | Launch IntelliJ IDEA |
| "Open VS Code" / "Launch Code" | Launch Visual Studio Code |
| "Start Discord" | Launch Discord |
| "Open Terminal" | Launch GNOME Terminal |
| "Open Files" | Launch File Manager |
| "Close Chrome" | Close Chrome |
| "Kill Spotify" | Close Spotify |
| "Exit Discord" | Close Discord |
### Music & Media
| Command | Action |
|---------|--------|
| "Play Bohemian Rhapsody" | Search and play on Spotify |
| "Play [song name]" | Play any song |
| "Pause" / "Stop the music" | Pause playback |
| "Resume" / "Continue" | Resume playback |
| "Next song" / "Skip" | Next track |
| "Previous" / "Go back" | Previous track |
### System Control
| Command | Action |
|---------|--------|
| "Volume up" / "Louder" | Increase volume |
| "Volume down" / "Quieter" | Decrease volume |
| "Set volume to 50" | Set volume to 50% |
| "Mute" / "Silence" | Toggle mute |
| "Take a screenshot" | Capture screen |
| "Lock the screen" | Lock session |
### Web Search
| Command | Action |
|---------|--------|
| "Search for Python tutorials" | Google search |
| "Google artificial intelligence" | Google search |
| "Look up electron documentation" | Google search |
### Workflow Commands
| Command | Action |
|---------|--------|
| "We have work to do" | Launch Chrome, IntelliJ, Discord, Spotify |
### Conversational
| Command | Action |
|---------|--------|
| "Hello JARVIS" | Greeting response |
| "Thank you" | Polite response |
| "Status" | System status report |
| "Who are you?" | Introduction |
| "What time is it?" | Current time |
| "What's the date?" | Current date |
| "Tell me a joke" | Random programming joke |
| "Go to sleep" / "Goodbye" | Shutdown JARVIS |
---
## ⚙️ Configuration
### Voice Settings
Access settings by clicking the ⚙️ icon:
- **Voice Type**: male1, male2, male3, female1, female2, female3, child_male, child_female
- **Speech Rate**: -100 (slow) to +100 (fast)
- **Pitch**: -100 (low) to +100 (high)
- **Volume**: 0 (silent) to 100 (loud)
- **Voice Response Toggle**: Enable/disable TTS responses
### Adding Custom Applications
Edit `main.js` to add more applications:
```javascript
const APP_MAP = {
  'your-app': 'command-to-launch',
  'custom': 'my-custom-app',
  // Add more mappings...
};
```
### Custom Commands
Edit `renderer.js` to add custom voice commands:
```javascript
if (command.includes('your custom trigger')) {
  speak('Your response');
  // Your action here
  return;
}
```
---
## 🛠️ Troubleshooting
### Voice Recognition Not Working
**Problem**: JARVIS doesn't respond to voice
**Solutions**:
1. Check microphone permissions
   ```bash
   # Test microphone
   arecord -l
   ```
2. Verify Vosk model is installed
   ```bash
   ls models/english/
   # Should contain: am/, conf/, graph/, ivector/, README
   ```
3. Check Python dependencies
   ```bash
   python3 -c "import vosk, sounddevice"
   ```
### TTS Not Speaking
**Problem**: JARVIS doesn't speak responses
**Solutions**:
1. Install speech-dispatcher
   ```bash
   sudo apt install speech-dispatcher
   ```
2. Test spd-say
   ```bash
   spd-say "test"
   ```
3. Check audio output
   ```bash
   pactl list sinks short
   ```
### Application Launch Fails
**Problem**: Apps don't open with voice commands
**Solutions**:
1. Verify application is installed
   ```bash
   which google-chrome spotify code
   ```
2. Check application name in APP_MAP (main.js)
3. Try launching manually
   ```bash
   google-chrome &
   ```
### Spotify Not Playing
**Problem**: Songs don't play on Spotify
**Solutions**:
1. Ensure Spotify is installed
   ```bash
   which spotify
   ```
2. Install xdotool (required for automation)
   ```bash
   sudo apt install xdotool
   ```
3. Login to Spotify first (must be authenticated)
### High CPU Usage
**Problem**: Application uses too much CPU
**Solutions**:
1. Check Vosk model size - use smaller model for better performance
2. Close unused applications
3. Reduce animation effects
---
## 🏗️ Building
### Linux AppImage
```bash
npm run build:linux
```
Output: `dist/JARVIS Assistant-1.0.0-linux.AppImage`
### Windows Build
```bash
npm run build:win
```
Output: `dist/win-unpacked/`
### All Platforms
```bash
npm run build:all
```
---
## 🤝 Contributing
Contributions are welcome! Here's how you can help:
1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**
   ```bash
   git commit -m "Add amazing feature"
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**
### Areas for Contribution
- 🌦️ Weather API integration
- 📧 Email integration
- 📅 Calendar integration
- 🏠 Smart home control
- 🌐 Multi-language support
- 🎨 UI themes
- 🔌 More application integrations
---
## 📝 License
This project is licensed under the **ISC License**.
---
## 🙏 Acknowledgments
- **Vosk** - Offline speech recognition
- **Electron** - Desktop application framework
- **Iron Man / Marvel** - JARVIS inspiration
- **Open Source Community** - Various tools and libraries
---
## 📞 Support
- **Issues**: [GitHub Issues](https://github.com/pateras95/jarvis-assistant/issues)
- **Discussions**: [GitHub Discussions](https://github.com/pateras95/jarvis-assistant/discussions)
---
<div align="center">
**Made with ❤️ and voice commands**
*"Sometimes you gotta run before you can walk."* - Tony Stark
</div>
