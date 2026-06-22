# =============================================================================
# SHADOW SETUP — instala todo lo necesario para Living Costa del Sol
# Pegar en PowerShell (como Administrador) en la maquina Shadow
# =============================================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SHADOW SETUP — Living Costa del Sol  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# --- 1. Git ---
Write-Host "[1/4] Instalando Git..." -ForegroundColor Yellow
winget install -e --id Git.Git --silent --accept-package-agreements --accept-source-agreements
Write-Host "      Git listo." -ForegroundColor Green

# --- 2. Node.js LTS ---
Write-Host "[2/4] Instalando Node.js..." -ForegroundColor Yellow
winget install -e --id OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
Write-Host "      Node.js listo." -ForegroundColor Green

# --- 3. VS Code ---
Write-Host "[3/4] Instalando VS Code..." -ForegroundColor Yellow
winget install -e --id Microsoft.VisualStudioCode --silent --accept-package-agreements --accept-source-agreements
Write-Host "      VS Code listo." -ForegroundColor Green

# --- 4. Epic Games Launcher ---
Write-Host "[4/4] Instalando Epic Games Launcher..." -ForegroundColor Yellow
winget install -e --id EpicGames.EpicGamesLauncher --silent --accept-package-agreements --accept-source-agreements
Write-Host "      Epic Games Launcher listo." -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Todo instalado. Ahora:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1. Cierra este PowerShell" -ForegroundColor White
Write-Host "  2. Abre uno NUEVO (para que cargue Node)" -ForegroundColor White
Write-Host "  3. Ejecuta:" -ForegroundColor White
Write-Host "     npm install -g @anthropic-ai/claude-code" -ForegroundColor Yellow
Write-Host ""
Write-Host "  4. Abre Epic Games Launcher" -ForegroundColor White
Write-Host "     -> inicia sesion -> instala Unreal 5.7" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
