@echo off
setlocal enabledelayedexpansion
set APP_NAME=Oxevy Launcher
set VERSION=1.0.0

echo =============================================
echo   Oxevy Launcher - Setup Installer
echo =============================================
echo.

cd /d "%~dp0\.."

:: Find installer
if exist "dist-electron\Oxevy-Launcher-Setup-%VERSION%.exe" (
    set INSTALLER=dist-electron\Oxevy-Launcher-Setup-%VERSION%.exe
) else if exist "dist-electron\Oxevy Launcher Setup %VERSION%.exe" (
    set INSTALLER=dist-electron\Oxevy Launcher Setup %VERSION%.exe
) else (
    echo Building installer first...
    call npm run build
    call npx electron-builder --win
)

if not exist "!INSTALLER!" (
    echo Error: installer not found.
    pause
    exit /b 1
)

echo Launching installer...
echo.
start "" "!INSTALLER!"
echo.
echo If the installer doesn't start automatically,
echo run: "!INSTALLER!"
echo.
pause
