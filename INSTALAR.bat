@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao encontrado. Instale em https://nodejs.org e rode este arquivo de novo.
  start https://nodejs.org
  pause
  exit /b 1
)
node scripts\iniciar.mjs --sem-servidor
if errorlevel 1 (
  pause
  exit /b 1
)
start "" http://localhost:5173
node scripts\servidor.mjs
pause
