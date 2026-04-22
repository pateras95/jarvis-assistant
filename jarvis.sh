#!/bin/bash
# JARVIS Assistant Launcher
cd "/var/www/html/Jarvis Assistant"
export ELECTRON_DISABLE_SANDBOX=1
"/var/www/html/Jarvis Assistant/node_modules/electron/dist/electron" --no-sandbox "/var/www/html/Jarvis Assistant" &
