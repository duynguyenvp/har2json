@echo off
setlocal ENABLEDELAYEDEXPANSION

set "ROOT=%~dp0"
set "DATA=%ROOT%output\mockoon.json"
set "CLI=%ROOT%node_modules\.bin\mockoon-cli.cmd"

if not exist "%CLI%" (
  echo Error: Mockoon CLI not found. Run setup.bat first.
  exit /b 1
)

if not exist "%DATA%" (
  echo Error: %DATA% not found. Generate it with: node har2mockoon.js
  exit /b 1
)

"%CLI%" start -d "%DATA%" -e 0 -p 9000

endlocal
exit /b


