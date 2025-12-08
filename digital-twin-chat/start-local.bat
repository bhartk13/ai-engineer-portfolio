@echo off
echo Starting Digital Twin Chat Application (Local Development)
echo.

echo Starting Backend (FastAPI)...
start cmd /k "cd backend && python run_local.py"

timeout /t 3 /nobreak > nul

echo Starting Frontend (Next.js)...
start cmd /k "cd frontend && npm run dev"

echo.
echo Both servers are starting...
echo Backend API: http://localhost:8000
echo Frontend UI: http://localhost:3000
echo API Docs: http://localhost:8000/docs
echo.
echo Press any key to exit this window (servers will continue running)
pause > nul
