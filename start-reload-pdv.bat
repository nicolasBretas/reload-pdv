@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo [ERRO] Node.js nao foi encontrado neste computador.
  echo Baixe e instale em https://nodejs.org/ ^(versao 22 ou mais recente^) e rode este arquivo de novo.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Instalando dependencias pela primeira vez, aguarde...
  call npm install
  if errorlevel 1 (
    echo.
    echo [ERRO] Falha ao instalar as dependencias. Verifique sua conexao com a internet.
    echo.
    pause
    exit /b 1
  )
)

echo.
echo Iniciando Reload PDV...
echo NAO FECHE esta janela enquanto estiver usando o sistema.
echo Para outros caixas na mesma rede acessarem, use o IP deste computador na porta 3100.
echo.

start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3100"

call npm start

echo.
echo O servidor foi encerrado.
pause
