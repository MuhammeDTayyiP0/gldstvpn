@echo off
echo ==========================================
echo      V204 VPN - v2.5.0 (Tauri) Release
echo ==========================================
echo.
echo 1. Adding changes...
git add .
echo.

echo 2. Committing (Tauri Migration)...
git commit -m "feat(core): Migrate from Electron to Tauri (Rust) for 10x Performance"
echo.

echo 3. Tagging v2.5.0...
git tag v2.5.0
echo.

echo 4. Pushing to GitHub...
git push origin main
git push origin v2.5.0
echo.

echo ==========================================
echo SUCCESS! v2.5.0 (Tauri Edition) pushed.
echo Check GitHub Actions for the build.
echo ==========================================
pause
