# 🤖 JARVIS Assistant

<p align="center">
  <img src="./jarvis.png" alt="JARVIS Assistant" width="300"/>
</p>

<p align="center">
  <strong>Just A Rather Very Intelligent System</strong><br>
  Offline AI Voice Assistant inspired by Iron Man
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Electron-41.2.2-47848F?logo=electron"/>
  <img src="https://img.shields.io/badge/Python-3.8+-3776AB?logo=python&logoColor=white"/>
  <img src="https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white"/>
  <img src="https://img.shields.io/badge/License-ISC-blue.svg"/>
</p>

---

## 🚀 Overview

JARVIS is an **offline-capable AI voice assistant** built with Electron and Python.

Control your system, launch apps, play music, and interact using **natural voice commands** — all without relying on cloud services.

---

## ✨ Features

### 🎤 Voice AI
- Offline speech recognition using **Vosk**
- Wake word activation: **"Daddy is Home"**
- Real-time transcription

### 🎨 Interface
- Arc Reactor inspired UI
- Transparent floating window
- Live visual feedback

### ⚡ System Control
- Launch & close applications
- Volume & media control
- Screenshots & screen lock

### 🎵 Media
- Spotify voice control
- Auto-play songs via commands

### 💻 Developer Mode
- One command workspace setup:
  > “We have work to do”

---

## 🧠 How It Works

### Voice Pipeline

```

Microphone → Vosk → Command Parser → Electron → Action → TTS

```

### Execution Flow

```

Wake Word → Command → Match → Execute → Speak Response

```

---

## 🏗️ Architecture

```

UI (Electron Renderer)
│
▼
Main Process (Node.js)
│
▼
Python Voice Engine (Vosk + TTS)
│
Mic / Speakers

````

---

## 🔌 Integrations

- **Vosk** → Speech Recognition  
- **speech-dispatcher** → Text-to-Speech  
- **xdotool** → System automation  
- **Spotify** → Music playback  
- **Electron** → Desktop UI  

---

## 📦 Installation

<details>
<summary><strong>🔧 Requirements</strong></summary>

- Linux (Ubuntu/Fedora/Arch)
- Node.js 18+
- Python 3.8+
- Microphone

</details>

---

### 1. Clone

```bash
git clone https://github.com/pateras95/jarvis-assistant.git
cd jarvis-assistant
````

### 2. Install dependencies

```bash
npm install
pip3 install vosk sounddevice
```

### 3. Install system tools

```bash
# Ubuntu/Debian
sudo apt install speech-dispatcher xdotool

# Fedora
sudo dnf install speech-dispatcher xdotool

# Arch
sudo pacman -S speech-dispatcher xdotool
```

### 4. Run

```bash
npm start
```

---

## 🎤 Example Commands

| Command              | Action          |
| -------------------- | --------------- |
| "Open Chrome"        | Launch browser  |
| "Play music"         | Start Spotify   |
| "Volume up"          | Increase volume |
| "Take screenshot"    | Capture screen  |
| "We have work to do" | Full dev setup  |

---

## ⚙️ Configuration

Edit the following files:

* `main.js` → application mappings
* `renderer.js` → custom voice commands

---

## 🛠️ Troubleshooting

<details>
<summary><strong>🎤 Voice not working</strong></summary>

Check microphone:

```bash
arecord -l
```

Verify Vosk model:

```bash
ls models/english/
```

</details>

---

<details>
<summary><strong>🔊 No sound output</strong></summary>

Test TTS:

```bash
spd-say "test"
```

</details>

---

<details>
<summary><strong>🚀 Apps not launching</strong></summary>

Check installation:

```bash
which google-chrome spotify code
```

</details>

---

## 🏗️ Build

```bash
npm run build:linux
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to your branch
5. Open a Pull Request

---

## 📜 License

This project is licensed under the **ISC License**.

---

## 💡 Future Ideas

* 🌦️ Weather API
* 🏠 Smart home control
* 🌍 Multi-language support
* 🤖 AI conversational mode

---

<p align="center">
  <em>"Sometimes you gotta run before you can walk."</em><br>
  — Tony Stark
</p>
```
