# Build Puku Puku CRM for multiple platforms (amd64 + arm64)
# Prereqs: docker buildx (Docker Desktop 4.23+ / Docker Engine 24+)
#
# Usage:
#   .\scripts\build-docker.ps1                       # dev (single platform, no push)
#   .\scripts\build-docker.ps1 -Push -Tag v1.0.0    # multi-arch + push to registry

param(
  [switch]$Push,
  [string]$Tag = "latest",
  [string]$Registry = ""
)

$PLATFORMS = "linux/amd64,linux/arm64"
$BUILDER = "puku-puku-builder"

# ── Ensure builder exists ──
$existing = docker buildx ls --format "{{.Name}}" | Select-String -Pattern "^$BUILDER`$"
if (-not $existing) {
  docker buildx create --name $BUILDER --use
} else {
  docker buildx use $BUILDER
}

docker buildx inspect --bootstrap

# ── Tags ──
$tagBackend = if ($Registry) { "$Registry/puku-puku-api:$Tag" } else { "puku-puku-api:$Tag" }
$tagFrontend = if ($Registry) { "$Registry/puku-puku-web:$Tag" } else { "puku-puku-web:$Tag" }

$pushFlag = if ($Push) { "--push" } else { "--load" }

Write-Host "Building backend → $tagBackend ($PLATFORMS)" -ForegroundColor Cyan
docker buildx build $pushFlag `
  --platform $PLATFORMS `
  -t $tagBackend `
  -f ../backend/Dockerfile `
  ../backend

Write-Host "Building frontend → $tagFrontend ($PLATFORMS)" -ForegroundColor Cyan
docker buildx build $pushFlag `
  --platform $PLATFORMS `
  -t $tagFrontend `
  -f ../frontend/Dockerfile `
  ../frontend

Write-Host "Done!" -ForegroundColor Green
if ($Push) {
  Write-Host "Images pushed: $tagBackend, $tagFrontend" -ForegroundColor Green
}
