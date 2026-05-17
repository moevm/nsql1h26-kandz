param(
    [switch]$NoCache
)

$ErrorActionPreference = "Stop"

$images = @(
    "python:3.12.8-slim",
    "node:22.13.1-alpine3.21",
    "nginx:1.27.3-alpine3.20",
    "mongo:7.0.16"
)

function Invoke-WithRetry {
    param(
        [scriptblock]$Command,
        [string]$Label,
        [int]$Attempts = 5
    )

    for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
        try {
            Write-Host "[$attempt/$Attempts] $Label"
            & $Command
            return
        }
        catch {
            if ($attempt -eq $Attempts) {
                throw
            }

            $delay = [Math]::Min(45, 5 * $attempt)
            Write-Host "Retry in $delay seconds: $($_.Exception.Message)"
            Start-Sleep -Seconds $delay
        }
    }
}

foreach ($image in $images) {
    Invoke-WithRetry -Label "docker pull $image" -Command {
        docker pull $image
    }
}

if ($NoCache) {
    docker compose build --no-cache
}
else {
    docker compose build
}
