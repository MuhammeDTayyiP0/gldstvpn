@echo off
echo ==========================================
echo      V204 VPN - v3.0.0 (Tauri) Release
echo ==========================================
echo.
echo 1. Adding changes...
git add .
echo.

echo 2. Committing...
git commit -m "feat(v3.0.0): Major Update - Hafif Mod, Fix Build, Linux Icon"
echo.

echo 3. Tagging v3.0.0 (Force)...
git tag -f v3.0.0
echo.

echo 4. Pushing to GitHub (Force tags)...
git push origin main
git push origin v3.0.0 --force
echo.

echo ==========================================
echo SUCCESS! v3.0.0 pushed.
echo Check GitHub Actions for the build.
echo ==========================================
pause
