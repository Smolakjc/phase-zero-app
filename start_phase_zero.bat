@echo off
title PHASE-ZERO Launcher
start "PHASE-ZERO Backend (Node)" cmd /k "cd /d "%~dp0backend" && npm start"
start "PHASE-ZERO Frontend (Next.js)" cmd /k "cd /d "%~dp0frontend" && npm run dev"
timeout /t 4 >nul
start http://localhost:3000
