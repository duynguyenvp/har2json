@echo off
setlocal ENABLEDELAYEDEXPANSION

:: Paths to verify after install
set "UUID_PKG=node_modules\uuid\package.json"
set "MOCKOON_BIN=node_modules\.bin\mockoon-cli.cmd"

:: If both already present, skip install
if exist "%UUID_PKG%" if exist "%MOCKOON_BIN%" (
  echo Dependencies are already installed.
  goto :end
)

echo Installing local dependencies (single transaction)...
call npm install @mockoon/cli uuid --no-save

:: Verify installation
if not exist "%UUID_PKG%" (
  echo ERROR: uuid package missing after install.
  exit /b 1
)
if not exist "%MOCKOON_BIN%" (
  echo ERROR: mockoon-cli binary missing after install.
  exit /b 1
)

echo Dependencies are ready.

:end
endlocal
exit /b
