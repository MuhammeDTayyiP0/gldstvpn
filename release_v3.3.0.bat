@echo off
echo ============================================
echo   V204 VPN - GitHub Release Automation (v3.3.0)
echo   Pink Edition 🎀
echo ============================================

echo.
echo [1/4] Adding all files...
git add .

echo.
echo [2/4] Committing changes...
git commit -m "Release v3.3.0 - Pink Edition 🎀"

echo.
echo [3/4] Pushing code to GitHub (main)...
git push origin main

echo.
echo [4/4] Creating and Pushing Tag v3.3.0...
git tag v3.3.0
git push origin v3.3.0

echo.
echo ============================================
echo   SUCCESS! 
echo   GitHub Actions should now be building v3.3.0.
echo ============================================
pause
