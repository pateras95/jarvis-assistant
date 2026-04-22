#!/usr/bin/env python3
"""JARVIS Voice Recognition + Speech Engine using Vosk (offline) + Piper TTS (neural)"""

import sys
import os
import json
import queue
import subprocess
import threading
import tempfile
import sounddevice as sd
from vosk import Model, KaldiRecognizer

MODEL_PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "models", "english")
PIPER_MODEL = os.path.join(os.path.dirname(__file__), "tts_models", "voice.onnx")

SAMPLE_RATE = 16000

# Flag to pause recognition while speaking
is_speaking = threading.Event()

# ─── TTS Engine ───────────────────────────────────────────────────
def speak(params_json):
    """Speak text using Piper (neural TTS), fallback to spd-say"""
    def _speak():
        try:
            params = json.loads(params_json)
            text = params.get('text', '')
        except (json.JSONDecodeError, AttributeError):
            text = str(params_json)

        if not text:
            return

        # Signal that we're speaking — pause mic processing
        is_speaking.set()

        try:
            # Try Piper first (natural human voice)
            if os.path.exists(PIPER_MODEL):
                try:
                    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
                        tmp_path = tmp.name

                    piper_proc = subprocess.run(
                        ['piper', '--model', PIPER_MODEL, '--output_file', tmp_path],
                        input=text, capture_output=True, text=True, timeout=30
                    )

                    if piper_proc.returncode == 0 and os.path.exists(tmp_path) and os.path.getsize(tmp_path) > 100:
                        subprocess.run(
                            ['aplay', '-q', tmp_path],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=30
                        )
                        os.unlink(tmp_path)
                        return
                    else:
                        if os.path.exists(tmp_path):
                            os.unlink(tmp_path)
                except Exception as e:
                    print(json.dumps({"error": f"Piper TTS error: {e}"}), flush=True)
                    try:
                        os.unlink(tmp_path)
                    except:
                        pass

            # Fallback: spd-say
            try:
                params_dict = json.loads(params_json) if isinstance(params_json, str) else {}
                voice_type = params_dict.get('type', 'male1')
                rate = str(params_dict.get('rate', 0))
                pitch = str(params_dict.get('pitch', 0))
                volume = str(params_dict.get('volume', 100))
                subprocess.run(
                    ['spd-say', '-t', voice_type, '-r', rate, '-p', pitch, '-i', volume, '-w', text],
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False
                )
            except Exception as e:
                print(json.dumps({"error": f"TTS error: {e}"}), flush=True)
        finally:
            # Done speaking — resume mic processing after a small buffer
            import time
            time.sleep(0.3)
            is_speaking.clear()

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

    def stdin_listener():
        for line in sys.stdin:
            line = line.strip()
            if line.startswith('SPEAK:'):
                payload = line[6:]
                speak(payload)

    threading.Thread(target=stdin_listener, daemon=True).start()

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

                # While JARVIS is speaking, drain the audio queue but don't process
                if is_speaking.is_set():
                    # Drain any queued audio and reset the recognizer
                    while not audio_queue.empty():
                        try:
                            audio_queue.get_nowait()
                        except queue.Empty:
                            break
                    rec.Reset()
                    continue

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

