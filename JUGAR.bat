@echo off
title GTA Marbella - Servidor (no cerrar mientras juegas)
cd /d "%~dp0"

if not exist node_modules (
  echo Instalando dependencias por primera vez, espera un momento...
  call npm install
)

echo.
echo ==========================================================
echo    GTA MARBELLA
echo    Iniciando el juego... se abrira el navegador solo.
echo.
echo    *** NO CIERRES ESTA VENTANA mientras juegas ***
echo    Mientras este abierta, tu navegador mostrara
echo    SIEMPRE la ultima version automaticamente.
echo.
echo    Para parar el juego: cierra esta ventana o pulsa Ctrl+C.
echo ==========================================================
echo.

call npm run dev
pause
