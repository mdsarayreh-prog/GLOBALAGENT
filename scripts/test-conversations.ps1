$ErrorActionPreference = "Stop"

$port = if ($env:CONVERSATION_TEST_PORT) { $env:CONVERSATION_TEST_PORT } else { "3217" }
$env:CONVERSATION_TEST_BASE_URL = "http://127.0.0.1:$port"

if (-not (Test-Path ".next/BUILD_ID")) {
  cmd /c npm run build
  if ($LASTEXITCODE -ne 0) {
    throw "Build failed with exit code $LASTEXITCODE"
  }
}

$server = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npm run start -- --port $port" -PassThru -WindowStyle Hidden

try {
  node scripts/test-conversations.mjs
  if ($LASTEXITCODE -ne 0) {
    throw "Conversation tests failed with exit code $LASTEXITCODE"
  }
}
finally {
  if ($null -ne $server -and -not $server.HasExited) {
    Stop-Process -Id $server.Id -Force
  }
}
