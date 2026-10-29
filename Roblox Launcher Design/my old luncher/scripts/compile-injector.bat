@echo off
REM Build the Oxevy DLL Injector CLI tool
REM Requires: MSVC (Visual Studio Build Tools) or MinGW-w64

setlocal enabledelayedexpansion

set SCRIPT_DIR=%~dp0
set PROJECT_DIR=%SCRIPT_DIR%..
set INJECTOR_SRC=%PROJECT_DIR%\src\injector\inject.cpp
set INJECTOR_OUT=%PROJECT_DIR%\src\injector\inject.exe

REM Try MSVC first (cl.exe)
where cl.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo [injector] Building with MSVC...
    cl /nologo /EHsc /Fe:"%INJECTOR_OUT%" "%INJECTOR_SRC%" /link kernel32.lib user32.lib
    if %errorlevel% equ 0 (
        echo [injector] Build successful: %INJECTOR_OUT%
        exit /b 0
    ) else (
        echo [injector] MSVC build failed, trying MinGW...
    )
)

REM Try MinGW-w64
where g++ >nul 2>&1
if %errorlevel% equ 0 (
    echo [injector] Building with MinGW-w64...
    g++ -static -O2 -o "%INJECTOR_OUT%" "%INJECTOR_SRC%"
    if %errorlevel% equ 0 (
        echo [injector] Build successful: %INJECTOR_OUT%
        exit /b 0
    ) else (
        echo [injector] MinGW build failed.
        exit /b 1
    )
)

echo [injector] ERROR: No C++ compiler found. Install Visual Studio Build Tools or MinGW-w64.
echo [injector]   - MSVC: https://visualstudio.microsoft.com/visual-cpp-build-tools/
echo [injector]   - MinGW: https://www.mingw-w64.org/
exit /b 1
