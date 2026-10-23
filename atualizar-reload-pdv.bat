@echo off
setlocal
cd /d "%~dp0"

echo.
echo ==========================================
echo   Atualizacao do Reload PDV
echo ==========================================
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Git nao foi encontrado neste computador.
  echo Baixe e instale em https://git-scm.com/download/win e rode este arquivo de novo.
  echo.
  pause
  exit /b 1
)

if not exist ".git" (
  echo [ERRO] Esta pasta ainda nao esta ligada ao repositorio de atualizacoes.
  echo Peca ao suporte para fazer a configuracao inicial.
  echo.
  pause
  exit /b 1
)

echo [1/5] Fechando o Reload PDV, se estiver aberto...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3100" ^| findstr "LISTENING"') do (
  taskkill /PID %%p /F >nul 2>nul
)
timeout /t 2 /nobreak >nul

echo [2/5] Fazendo copia de seguranca do banco de dados...
if not exist "data\backups-atualizacao" mkdir "data\backups-atualizacao"
for /f %%t in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set CARIMBO=%%t
if exist "data\reload.db" (
  copy /y "data\reload.db" "data\backups-atualizacao\reload-antes-atualizacao-%CARIMBO%.db" >nul
  if errorlevel 1 (
    echo [ERRO] Nao foi possivel copiar o banco. A atualizacao foi cancelada, nada foi alterado.
    echo.
    pause
    exit /b 1
  )
  echo       Copia salva em data\backups-atualizacao\reload-antes-atualizacao-%CARIMBO%.db
) else (
  echo       Nenhum banco encontrado ainda, seguindo.
)

echo [3/5] Baixando a versao nova...
git fetch origin main
if errorlevel 1 (
  echo.
  echo [ERRO] Nao foi possivel baixar a atualizacao. Verifique a internet.
  echo O sistema continua na versao anterior, nada foi alterado.
  echo.
  pause
  exit /b 1
)
rem A pasta data\ (banco, backups e PDFs) fica fora do git e nao e tocada.
git reset --hard origin/main
if errorlevel 1 (
  echo.
  echo [ERRO] Falha ao aplicar a atualizacao.
  echo.
  pause
  exit /b 1
)

echo [4/5] Atualizando dependencias...
call npm install --omit=dev --no-audit --no-fund
if errorlevel 1 (
  echo.
  echo [ERRO] Falha ao instalar as dependencias. Verifique a internet.
  echo.
  pause
  exit /b 1
)

echo [5/5] Atualizacao concluida. Abrindo o Reload PDV...
echo.
start "Reload PDV" cmd /c "start-reload-pdv.bat"
timeout /t 3 /nobreak >nul
