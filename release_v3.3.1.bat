@echo off
echo ============================================
echo   V204 VPN - GitHub Release Automation (v3.3.1)
echo   Pink Edition 🎀 + Linux Fix (glibc 2.35)
echo ============================================

echo.
echo [1/4] Adding all files...
git add .

echo.
echo [2/4] Committing changes...
git commit -m "Release v3.3.1 - Linux Fix (Ubuntu 22.04 base) & Pink Theme"

echo.
echo [3/4] Pushing code to GitHub (main)...
git push origin main

echo.
echo [4/4] Creating and Pushing Tag v3.3.1...
git tag v3.3.1
git push origin v3.3.1

echo.
echo ============================================
echo   SUCCESS! 
echo   GitHub Actions is now building v3.3.1 with 
echo   Ubuntu 22.04 runner for better Linux compatibility.
echo ============================================
pause
