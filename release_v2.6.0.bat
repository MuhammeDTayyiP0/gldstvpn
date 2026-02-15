@echo off
echo ==========================================
echo      V204 VPN - v2.6.0 (Tauri) Release
echo ==========================================
echo.
echo 1. Adding changes...
git add .
echo.

echo 2. Committing...
git commit -m "feat(v2.6.0): Remove Linux optimizations, fix icon, general optimization"
echo.

echo 3. Tagging v2.6.0...
git tag v2.6.0
echo.

echo 4. Pushing to GitHub...
git push origin main
git push origin v2.6.0
echo.

echo ==========================================
echo SUCCESS! v2.6.0 pushed.
echo Check GitHub Actions for the build.
echo ==========================================
pause
