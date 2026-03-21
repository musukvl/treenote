@echo off
REM Purpose: Build TreeNote Windows installer and portable executable
REM Usage: build-win.bat

setlocal
set CSC_IDENTITY_AUTO_DISCOVERY=false

echo === TreeNote Windows Build ===

echo Installing dependencies...
call npm ci
if errorlevel 1 goto :error

echo Building...
call npm run build
if errorlevel 1 goto :error

echo Packaging Windows installer and executable...
call npx electron-builder --win --config electron-builder.yml
if errorlevel 1 goto :error

echo Creating dist\treenote.exe...
if exist "dist\treenote.exe" del /f /q "dist\treenote.exe"

set "SOURCE_EXE="
if exist "dist\win-unpacked\TreeNote.exe" set "SOURCE_EXE=dist\win-unpacked\TreeNote.exe"

if not defined SOURCE_EXE for %%F in ("dist\TreeNote*.exe") do (
	echo %%~nF | findstr /i /v "setup" >nul
	if not errorlevel 1 set "SOURCE_EXE=%%~fF"
)

if not defined SOURCE_EXE goto :error_no_exe

copy /y "%SOURCE_EXE%" "dist\treenote.exe" >nul
if errorlevel 1 goto :error

echo === Build complete ===
echo Installer and executable are in dist\ directory
echo Run "treenote" from a new command prompt after installer installation.
exit /b 0

:error_no_exe
echo Build completed but no source .exe was found to create dist\treenote.exe
exit /b 1

:error
echo Build failed with exit code %errorlevel%
exit /b %errorlevel%
