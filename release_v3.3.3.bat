@echo off
echo ============================================
echo   V204 VPN - GitHub Release Automation (v3.3.3)
echo   Hello Kitty Polish Update 🎀
echo ============================================

echo.
echo [1/4] Adding all files...
git add .

echo.
echo [2/4] Committing changes...
git commit -m "Release v3.3.3 - Hello Kitty Polish Update 🎀"

echo.
echo [3/4] Pushing code to GitHub (main)...
git push origin main

echo.
echo [4/4] Creating and Pushing Tag v3.3.3...
git tag v3.3.3
git push origin v3.3.3

echo.
echo ============================================
echo   SUCCESS! 
echo   GitHub Actions should now be building v3.3.3.
echo ============================================
pause
