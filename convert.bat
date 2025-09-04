@echo off
REM === convert HAR -> Mockoon JSON ===

REM Path to Node.js (if Node is already added to PATH then no need to modify)
set NODE=node

REM Input HAR file and output JSON file
set INPUT=input.har
set OUTPUT=mockoon.json

%NODE% har2mockoon.js %INPUT% %OUTPUT%

pause
