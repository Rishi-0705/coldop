$ErrorActionPreference = "Stop"

npm install --legacy-peer-deps

try {
    npm run db:push
} catch {}

try {
    npm run db:generate
} catch {}

if (-Not (Test-Path "venv")) {
    python -m venv venv
}

& .\venv\Scripts\Activate.ps1

pip install -r requirements.txt

$pythonProcess = Start-Process -FilePath "uvicorn" -ArgumentList "scripts.analyze_cooler:app --host 0.0.0.0 --port 8000" -PassThru -NoNewWindow

try {
    npm run dev
} finally {
    Stop-Process -Id $pythonProcess.Id -Force -ErrorAction SilentlyContinue
}
