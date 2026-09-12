@echo off
title PAHDMS - Punjab Animal Husbandry Management System
echo Starting PAHDMS locally...
echo.
where python >nul 2>nul
if %errorlevel%==0 (
    start "" http://localhost:8000/login.html
    python -m http.server 8000
    goto :eof
)
where npx >nul 2>nul
if %errorlevel%==0 (
    start "" http://localhost:8000/login.html
    npx --yes serve -l 8000 .
    goto :eof
)
echo Could not find Python or Node/npx on this computer.
echo Please install Python (https://python.org) or Node.js (https://nodejs.org) and run this file again.
pause
