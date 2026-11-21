@echo off
setlocal EnableExtensions DisableDelayedExpansion

pushd "%~dp0" || (
    echo [ERROR] Khong the truy cap thu muc du an.
    pause
    exit /b 1
)

for %%I in (.) do set "PROJECT_NAME=%%~nxI"

for /f %%T in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set "TIMESTAMP=%%T"
if not defined TIMESTAMP set "TIMESTAMP=backup"

set "ZIP_NAME=%PROJECT_NAME%_%TIMESTAMP%.zip"
set "TEMP_ZIP=%TEMP%\%ZIP_NAME%"
set "DEST_ZIP=%CD%\%ZIP_NAME%"

where tar >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Khong tim thay lenh tar.exe tren Windows.
    popd
    pause
    exit /b 1
)

if exist "%TEMP_ZIP%" del /f /q "%TEMP_ZIP%"

echo ============================================================
echo   Nen du an: %PROJECT_NAME%
echo   File dich : %DEST_ZIP%
echo   Bo qua    : .git, node_modules, target, temp, tmp, output, out,
echo               dist, build, pgdata, logs, coverage, cache,
echo               playwright-report, test-results, *.log, *.tmp
echo ============================================================
echo.
echo [INFO] Dang nen du lieu, vui long cho...

tar.exe -a -c -f "%TEMP_ZIP%" ^
    --exclude=".git" ^
    --exclude="*/.git" ^
    --exclude="*/.git/*" ^
    --exclude="node_modules" ^
    --exclude="*/node_modules" ^
    --exclude="*/node_modules/*" ^
    --exclude="target" ^
    --exclude="*/target" ^
    --exclude="*/target/*" ^
    --exclude="temp" ^
    --exclude="*/temp" ^
    --exclude="*/temp/*" ^
    --exclude="tmp" ^
    --exclude="*/tmp" ^
    --exclude="*/tmp/*" ^
    --exclude="output" ^
    --exclude="*/output" ^
    --exclude="*/output/*" ^
    --exclude="out" ^
    --exclude="*/out" ^
    --exclude="*/out/*" ^
    --exclude="dist" ^
    --exclude="*/dist" ^
    --exclude="*/dist/*" ^
    --exclude="build" ^
    --exclude="*/build" ^
    --exclude="*/build/*" ^
    --exclude="pgdata" ^
    --exclude="*/pgdata" ^
    --exclude="*/pgdata/*" ^
    --exclude="logs" ^
    --exclude="*/logs" ^
    --exclude="*/logs/*" ^
    --exclude="coverage" ^
    --exclude="*/coverage" ^
    --exclude="*/coverage/*" ^
    --exclude="playwright-report" ^
    --exclude="*/playwright-report" ^
    --exclude="*/playwright-report/*" ^
    --exclude="test-results" ^
    --exclude="*/test-results" ^
    --exclude="*/test-results/*" ^
    --exclude=".vite" ^
    --exclude="*/.vite" ^
    --exclude="*/.vite/*" ^
    --exclude=".next" ^
    --exclude="*/.next" ^
    --exclude="*/.next/*" ^
    --exclude=".nuxt" ^
    --exclude="*/.nuxt" ^
    --exclude="*/.nuxt/*" ^
    --exclude=".turbo" ^
    --exclude="*/.turbo" ^
    --exclude="*/.turbo/*" ^
    --exclude=".cache" ^
    --exclude="*/.cache" ^
    --exclude="*/.cache/*" ^
    --exclude=".parcel-cache" ^
    --exclude="*/.parcel-cache" ^
    --exclude="*/.parcel-cache/*" ^
    --exclude=".gradle" ^
    --exclude="*/.gradle" ^
    --exclude="*/.gradle/*" ^
    --exclude="__pycache__" ^
    --exclude="*/__pycache__" ^
    --exclude="*/__pycache__/*" ^
    --exclude=".venv" ^
    --exclude="*/.venv" ^
    --exclude="*/.venv/*" ^
    --exclude="venv" ^
    --exclude="*/venv" ^
    --exclude="*/venv/*" ^
    --exclude="*.log" ^
    --exclude="*.tmp" ^
    --exclude="*.temp" ^
    --exclude="*.hprof" ^
    --exclude="*.dmp" ^
    --exclude="%PROJECT_NAME%_*.zip" ^
    -C .. "%PROJECT_NAME%"

if errorlevel 1 (
    echo.
    echo [ERROR] Nen du an that bai!
    if exist "%TEMP_ZIP%" del /f /q "%TEMP_ZIP%"
    popd
    pause
    exit /b 1
)

move /Y "%TEMP_ZIP%" "%DEST_ZIP%" >nul
if errorlevel 1 (
    echo.
    echo [ERROR] Khong the di chuyen file zip ve thu muc du an.
    popd
    pause
    exit /b 1
)

for %%F in ("%DEST_ZIP%") do set "ZIP_BYTES=%%~zF"
for /f %%M in ('powershell -NoProfile -Command "[math]::Round(%ZIP_BYTES%/1MB, 2)"') do set "ZIP_MB=%%M"

echo.
echo [DONE] Nen thanh cong!
echo        File: %DEST_ZIP%
echo        Size: %ZIP_MB% MB
echo.
popd
pause
exit /b 0
