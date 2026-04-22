#!/usr/bin/env python3
"""JARVIS Voice Recognition + Speech Engine using Vosk (offline) + Festival TTS"""

import sys
import os
import json
import queue
import subprocess
import threading
import sounddevice as sd
from vosk import Model, KaldiRecognizer

# Get model path from argument or use default
MODEL_PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "models", "english")

SAMPLE_RATE = 16000

# ─── TTS via spd-say (speech-dispatcher) ──────────────────────────
def speak(params_json):
    """Speak text using spd-say with configurable voice parameters"""
    def _speak():
        try:
            params = json.loads(params_json)
            text = params.get('text', '')
            voice_type = params.get('type', 'male1')
            rate = str(params.get('rate', 0))
            pitch = str(params.get('pitch', 0))
            volume = str(params.get('volume', 100))

            subprocess.run(
                ['spd-say', '-t', voice_type, '-r', rate, '-p', pitch, '-i', volume, '-w', text],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=False
            )
        except json.JSONDecodeError:
            # Fallback: treat as plain text
            subprocess.run(
                ['spd-say', '-t', 'male1', '-w', params_json],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=False
            )
        except Exception as e:
            print(json.dumps({"error": f"TTS error: {e}"}), flush=True)

    t = threading.Thread(target=_speak, daemon=True)
    t.start()

# ─── Main voice recognition loop ─────────────────────────────────
def main():
    if not os.path.exists(MODEL_PATH):
        print(json.dumps({"error": f"Model not found at {MODEL_PATH}"}), flush=True)
        sys.exit(1)

    model = Model(MODEL_PATH)
    rec = KaldiRecognizer(model, SAMPLE_RATE)
    rec.SetWords(True)

    audio_queue = queue.Queue()

    def audio_callback(indata, frames, time_info, status):
        audio_queue.put(bytes(indata))

    # Listen for speak commands from stdin in a thread
    def stdin_listener():
        for line in sys.stdin:
            line = line.strip()
            if line.startswith('SPEAK:'):
                payload = line[6:]
                speak(payload)

    threading.Thread(target=stdin_listener, daemon=True).start()

    # Signal ready
    print(json.dumps({"status": "ready"}), flush=True)

    try:
        with sd.RawInputStream(
            samplerate=SAMPLE_RATE,
            blocksize=4000,
            dtype="int16",
            channels=1,
            callback=audio_callback
        ):
            while True:
                data = audio_queue.get()
                if rec.AcceptWaveform(data):
                    result = json.loads(rec.Result())
                    text = result.get("text", "").strip()
                    if text:
                        print(json.dumps({"type": "final", "text": text}), flush=True)
                else:
                    partial = json.loads(rec.PartialResult())
                    text = partial.get("partial", "").strip()
                    if text:
                        print(json.dumps({"type": "partial", "text": text}), flush=True)

    except KeyboardInterrupt:
        print(json.dumps({"status": "stopped"}), flush=True)
    except Exception as e:
        print(json.dumps({"error": str(e)}), flush=True)
        sys.exit(1)

if __name__ == "__main__":
    main()

