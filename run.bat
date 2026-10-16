@echo off
title BMSCE LMS Auto-Solver
color 0A
cls
echo ============================================================
echo           BMSCE LMS AUTO-SOLVER FOR CLASSMATES
echo ============================================================
echo.

:: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js is not installed on this computer!
    echo Please download and install Node.js (LTS version) from:
    echo    https://nodejs.org/
    echo.
    echo After installing, double-click this file again.
    pause
    exit /b 1
)

:: Run the interactive runner
call npm run solve-all
echo.
echo Press any key to exit...
pause >nul
