@echo off
SET PATH=C:\Users\liavs\tools\node-v20.11.0-win-x64;C:\Users\liavs\tools\bin;%PATH%
echo Starting The GRC Platform...
echo.
echo Once you see "Local: http://localhost:5173", open your browser and go to:
echo http://localhost:5173
echo.
echo Press Ctrl+C to stop the server.
echo.
npm run dev
pause
