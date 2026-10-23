@echo off
setlocal

rem Este arquivo tambem e substituido na atualizacao, entao ele roda a partir de uma copia temporaria.
if /i not "%~1"=="--executar" (
  copy /y "%~f0" "%TEMP%\reload-pdv-atualizar.bat" >nul
  "%TEMP%\reload-pdv-atualizar.bat" --executar "%~dp0"
  exit /b
)

set "PASTA=%~2"
if "%PASTA:~-1%"=="\" set "PASTA=%PASTA:~0,-1%"
set "REPO=nicolasBretas/reload-pdv"
cd /d "%PASTA%"

echo.
echo ==========================================
echo   Atualizacao do Reload PDV
echo ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao foi encontrado neste computador.
  pause
  exit /b 1
)

echo [1/6] Fechando o Reload PDV, se estiver aberto...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3100" ^| findstr "LISTENING"') do (
  taskkill /PID %%p /F >nul 2>nul
)
timeout /t 2 /nobreak >nul

echo [2/6] Guardando uma copia completa da versao atual (programa + banco)...
for /f %%t in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "CARIMBO=%%t"
set "COPIA=%PASTA%\..\reload-pdv-copias\%CARIMBO%"
robocopy "%PASTA%" "%COPIA%" /E /XD node_modules /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 (
  echo [ERRO] Nao foi possivel fazer a copia de seguranca. Nada foi alterado.
  pause
  exit /b 1
)
echo       Copia salva em %COPIA%

echo [3/6] Baixando a versao nova...
set "ZIP=%TEMP%\reload-pdv-novo.zip"
set "EXTRAIDO=%TEMP%\reload-pdv-novo"
if exist "%EXTRAIDO%" rmdir /s /q "%EXTRAIDO%"
if exist "%ZIP%" del /q "%ZIP%"
powershell -NoProfile -Command ^
  "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12;" ^
  "$h = @{ 'User-Agent' = 'reload-pdv' };" ^
  "$t = Join-Path '%PASTA%' 'data\github-token.txt';" ^
  "if (Test-Path $t) { $h['Authorization'] = 'Bearer ' + (Get-Content $t -Raw).Trim() };" ^
  "Invoke-WebRequest -UseBasicParsing -Headers $h -Uri 'https://api.github.com/repos/%REPO%/zipball/main' -OutFile '%ZIP%'"
if errorlevel 1 (
  echo.
  echo [ERRO] Nao foi possivel baixar a atualizacao. Verifique a internet.
  echo O sistema continua na versao anterior, nada foi alterado.
  echo.
  pause
  exit /b 1
)

echo [4/6] Aplicando a versao nova...
powershell -NoProfile -Command "Expand-Archive -Force -Path '%ZIP%' -DestinationPath '%EXTRAIDO%'"
if errorlevel 1 (
  echo [ERRO] O arquivo baixado esta corrompido. Nada foi alterado.
  pause
  exit /b 1
)
set "ORIGEM="
for /d %%d in ("%EXTRAIDO%\*") do set "ORIGEM=%%d"
rem A pasta data (banco, backups e PDFs) nunca e tocada.
robocopy "%ORIGEM%" "%PASTA%" /E /XD data node_modules .git /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 (
  echo [ERRO] Falha ao copiar os arquivos novos.
  echo Para voltar, copie de volta o conteudo de %COPIA%
  pause
  exit /b 1
)

echo [5/6] Atualizando dependencias...
call npm install --omit=dev --no-audit --no-fund
if errorlevel 1 (
  echo [ERRO] Falha ao instalar as dependencias. Verifique a internet e rode de novo.
  pause
  exit /b 1
)

echo [6/6] Pronto! Abrindo o Reload PDV...
start "Reload PDV" cmd /c ""%PASTA%\start-reload-pdv.bat""
timeout /t 3 /nobreak >nul
exit /b 0
