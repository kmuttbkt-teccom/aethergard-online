# AETHERGARD ONLINE - Auto-Download Free CC0 GLB Models
# Sources: Three.js official samples, Kenney.nl (CC0 license)

$ModelsDir = "client\public\models"
$TempDir   = "scripts\temp_models"

New-Item -ItemType Directory -Force -Path $ModelsDir | Out-Null
New-Item -ItemType Directory -Force -Path $TempDir   | Out-Null

Write-Host "=== AETHERGARD MODEL AUTO-DOWNLOADER ===" -ForegroundColor Cyan

# Direct GLB URLs from Three.js examples (public, CC-BY / CC0)
$DirectGLBs = @(
    @{ Name = "monster_soldier.glb";   Url = "https://threejs.org/examples/models/gltf/Soldier.glb" },
    @{ Name = "mob_flamingo.glb";      Url = "https://threejs.org/examples/models/gltf/Flamingo.glb" },
    @{ Name = "mob_horse.glb";         Url = "https://threejs.org/examples/models/gltf/Horse.glb" },
    @{ Name = "mob_parrot.glb";        Url = "https://threejs.org/examples/models/gltf/Parrot.glb" },
    @{ Name = "char_robot.glb";        Url = "https://threejs.org/examples/models/gltf/RobotExpressive/RobotExpressive.glb" },
    @{ Name = "char_michelle.glb";     Url = "https://threejs.org/examples/models/gltf/Michelle.glb" },
    @{ Name = "mob_stork.glb";         Url = "https://threejs.org/examples/models/gltf/Stork.glb" }
)

Write-Host "`nDownloading Three.js sample models (CC-BY)..." -ForegroundColor Yellow

foreach ($model in $DirectGLBs) {
    $dest = Join-Path $ModelsDir $model.Name
    if (Test-Path $dest) {
        $sz = [math]::Round((Get-Item $dest).Length / 1KB, 1)
        Write-Host "  [OK] $($model.Name) ($sz KB)" -ForegroundColor Green
        continue
    }
    Write-Host "  [DL] $($model.Name)..." -ForegroundColor White -NoNewline
    try {
        Invoke-WebRequest -Uri $model.Url -OutFile $dest -UseBasicParsing -TimeoutSec 90 -ErrorAction Stop
        $sz = [math]::Round((Get-Item $dest).Length / 1KB, 1)
        Write-Host " OK ($sz KB)" -ForegroundColor Green
    } catch {
        Write-Host " FAILED: $($_.Exception.Message)" -ForegroundColor Red
        if (Test-Path $dest) { Remove-Item $dest }
    }
}

# Kenney Packs with direct ZIP download URLs
$KenneyPacks = @(
    @{
        Name         = "dungeon-kit"
        Url          = "https://kenney.nl/media/pages/assets/dungeon-kit/1cebed4459-1698761988/kenney_dungeon-kit.zip"
        Prefix       = "env_dungeon_"
    },
    @{
        Name         = "fantasy-town-kit"
        Url          = "https://kenney.nl/media/pages/assets/fantasy-town-kit/ab9e0fde0c-1655993327/kenney_fantasy-town-kit.zip"
        Prefix       = "env_fantasy_"
    }
)

Write-Host "`nDownloading Kenney CC0 packs..." -ForegroundColor Yellow

foreach ($pack in $KenneyPacks) {
    $zipPath    = Join-Path $TempDir "$($pack.Name).zip"
    $extractDir = Join-Path $TempDir $pack.Name
    Write-Host "  [DL] $($pack.Name).zip..." -ForegroundColor White -NoNewline
    try {
        Invoke-WebRequest -Uri $pack.Url -OutFile $zipPath -UseBasicParsing -TimeoutSec 120 -ErrorAction Stop
        Write-Host " OK" -ForegroundColor Green
        Expand-Archive -Path $zipPath -DestinationPath $extractDir -Force
        $glbs = Get-ChildItem -Recurse -Path $extractDir -Filter "*.glb"
        $n = 0
        foreach ($g in $glbs) {
            $dn = "$($pack.Prefix)$($g.Name)"
            $dp = Join-Path $ModelsDir $dn
            if (-not (Test-Path $dp)) { Copy-Item $g.FullName -Destination $dp; $n++ }
        }
        Write-Host "  [EX] Extracted $n GLB files" -ForegroundColor Green
    } catch {
        Write-Host " FAILED: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Generate manifest.json for runtime discovery
Write-Host "`nGenerating manifest.json..." -ForegroundColor Cyan
$all = Get-ChildItem -Path $ModelsDir -Filter "*.glb" | Sort-Object Name
$manifest = [ordered]@{
    generated = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    total     = $all.Count
    models    = @()
}
foreach ($f in $all) {
    $t = "misc"
    if ($f.Name -like "char_*")    { $t = "character" }
    elseif ($f.Name -like "monster_*" -or $f.Name -like "mob_*") { $t = "monster" }
    elseif ($f.Name -like "env_*" -or $f.Name -like "dungeon_*") { $t = "environment" }
    elseif ($f.Name -like "prop_*") { $t = "prop" }
    $manifest.models += [ordered]@{ file = $f.Name; size = $f.Length; type = $t }
}
$manifest | ConvertTo-Json -Depth 4 | Set-Content "$ModelsDir\manifest.json" -Encoding UTF8
Write-Host "  [OK] manifest.json ($($all.Count) models)" -ForegroundColor Green

Remove-Item -Recurse -Force $TempDir -ErrorAction SilentlyContinue
Write-Host "`nDONE! $($all.Count) models ready in $ModelsDir`n" -ForegroundColor Cyan
