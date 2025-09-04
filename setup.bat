@echo off
:: If uuid is already installed in local node_modules
if exist node_modules\.bin\http-server (
    echo uuid is already installed locally.
    exit /b
)

:: If not installed, install locally
echo Installing uuid locally...
call npm install uuid --no-save
echo uuid has been installed locally.
exit /b
