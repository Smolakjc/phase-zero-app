@echo off
title PHASE-ZERO Launcher
start "PHASE-ZERO Backend (FastAPI)" cmd /k "cd /d "%~dp0backend" && python -m uvicorn main:app --reload --port 8000"
start "PHASE-ZERO Frontend (Next.js)" cmd /k "cd /d "%~dp0frontend" && npm run dev"
timeout /t 4 >nul
start http://localhost:3000
