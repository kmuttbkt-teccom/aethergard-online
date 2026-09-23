@echo off
chcp 65001 >nul
title Aethergard Online — 3D MMORPG Server & Cloud Tunnel
echo ========================================================
echo   ⚔️  Aethergard Online — Server + Online Public Tunnel
echo ========================================================
echo.

cd /d "%~dp0"

echo [*] Starting local game server on port 4000...
start "Aethergard Online Server" cmd /c "npm start"

timeout /t 3 >nul

echo [*] Checking Cloudflare Tunnel...
if not exist "cloudflared.exe" (
    echo [*] Downloading cloudflared.exe...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'cloudflared.exe'"
)

echo [*] Launching Cloudflare Tunnel for Public Online Access...
echo.
echo [!] Copy the https://xxxx.trycloudflare.com URL below to share with players!
echo.
cloudflared.exe tunnel --url http://localhost:4000
pause
