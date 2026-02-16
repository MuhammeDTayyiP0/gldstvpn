@echo off
echo ============================================
echo   V204 VPN - GitHub Release Automation (v3.2.0)
echo   This script will upload code to GitHub to trigger builds.
echo ============================================

echo.
echo [1/4] Adding all files...
git add .

echo.
echo [2/4] Committing changes...
git commit -m "Release v3.2.0 - Stable Build"

echo.
echo [3/4] Pushing code to GitHub (main)...
git push origin main

echo.
echo [4/4] Creating and Pushing Tag v3.2.0...
git tag v3.2.0
git push origin v3.2.0

echo.
echo ============================================
echo   SUCCESS! 
echo   GitHub Actions is now building Windows & Linux versions.
echo   Check your repository 'Actions' tab.
echo ============================================
pause
