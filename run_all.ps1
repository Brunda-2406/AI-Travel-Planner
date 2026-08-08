# run_all.ps1
# Starts Ollama (LLM), backend and frontend in separate PowerShell windows.
# Usage: .\run_all.ps1

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$python = Join-Path $projectRoot ".venv\Scripts\python.exe"

if (-not (Test-Path $python)) {
    Write-Host "ERROR: Python executable not found at $python"
    Write-Host "Activate your venv or create one at .venv and install dependencies first."
    exit 1
}

# Ollama (local LLM server) — only start if not already running
$ollamaRunning = Get-NetTCPConnection -LocalPort 11434 -State Listen -ErrorAction SilentlyContinue
if (-not $ollamaRunning) {
    Write-Host "Starting Ollama (local LLM server)…"
    Start-Process ollama -ArgumentList "serve"
} else {
    Write-Host "Ollama already running on port 11434."
}

# Backend command (uses .env in backend/ if present)
$backendCmd = "$python -m uvicorn backend.main:app --host 127.0.0.1 --port 8001"
Start-Process powershell -WorkingDirectory $projectRoot -ArgumentList "-NoExit","-Command $backendCmd"

# Frontend command
$frontendCmd = "npm run dev"
Start-Process powershell -WorkingDirectory $projectRoot -ArgumentList "-NoExit","-Command cd frontend; $frontendCmd"

Write-Host "Started Ollama, backend and frontend."
Write-Host "If the backend requires API keys, place them in backend/.env or set environment variables before running."