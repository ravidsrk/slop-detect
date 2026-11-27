@echo off
setlocal enabledelayedexpansion
if defined SLOP_DETECT_BIN (
  if exist "%SLOP_DETECT_BIN%" (
    "%SLOP_DETECT_BIN%" %*
    exit /b %errorlevel%
  )
)
set "SCRIPT_DIR=%~dp0"
set "LOCAL_REL=%SCRIPT_DIR%..\..\..\target\release\slop-detect.exe"
if exist "%LOCAL_REL%" (
  "%LOCAL_REL%" %*
  exit /b %errorlevel%
)
set "VERSION=0.1.0"
if exist "%SCRIPT_DIR%..\..\..\ENGINE_VERSION" (
  set /p VERSION=<"%SCRIPT_DIR%..\..\..\ENGINE_VERSION"
)
set "CACHED=%LOCALAPPDATA%\slop-detect\engine\%VERSION%\slop-detect-windows-x64.exe"
if exist "%CACHED%" (
  "%CACHED%" %*
  exit /b %errorlevel%
)
echo slop-detect: native binary not found at "%CACHED%". Build with "cargo build --release -p slop-cli" or run "npx slop-detect". 1>&2
exit /b 127
