@echo off
title NEXIS - Dual Service Launcher
cd /d "%~dp0"

echo ========================================================
echo          NEXIS Web + Python Diagnostic Engine
echo ========================================================
echo.

:: 1. Verify / Setup Python Virtual Environment
if not exist "backend\.venv\Scripts\python.exe" (
    echo [*] Initializing Python virtual environment in backend\.venv ...
    python -m venv backend\.venv
    if errorlevel 1 (
        echo [!] Failed to create Python virtual environment. Ensure Python is on PATH.
        pause
        exit /b 1
    )
    echo [*] Installing backend dependencies (FastAPI, Uvicorn, Pydantic, HTTPX)...
    backend\.venv\Scripts\pip.exe install -r backend\requirements.txt
)

:: 2. Verify Node modules
if not exist "node_modules" (
    echo [*] Node modules missing. Running npm install...
    call npm install
)

:: 3. Start Backend in separate window
echo [*] Launching Python FastAPI Backend on http://127.0.0.1:8000 ...
start "NEXIS Backend (FastAPI :8000)" cmd /k "title NEXIS Backend & echo Starting FastAPI Server... & backend\.venv\Scripts\python.exe backend\run.py"

:: 4. Start Frontend in separate window
echo [*] Launching Vite React Frontend on http://localhost:5173 ...
start "NEXIS Frontend (Vite :5173)" cmd /k "title NEXIS Frontend & echo Starting Vite Server... & npm run dev"

echo.
echo ========================================================
echo   [SUCCESS] Both NEXIS services are now running!
echo.
echo   - Web Frontend : http://localhost:5173
echo   - API Swagger  : http://127.0.0.1:8000/docs
echo   - API Health   : http://127.0.0.1:8000/api/health
echo ========================================================
echo.
echo You can close this launcher window anytime.
pause
