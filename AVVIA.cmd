@echo off
title Polese Barbershop
cd /d "%~dp0"
echo.
echo Avvio Polese Barbershop (Next.js)
echo.
where npm >nul 2>&1
if errorlevel 1 (
  echo npm non trovato. Installa Node.js da https://nodejs.org
  pause
  exit /b 1
)
if not exist node_modules (
  echo Installazione dipendenze...
  call npm install
)
echo.
echo Apri http://localhost:3000
echo.
call npm run dev
