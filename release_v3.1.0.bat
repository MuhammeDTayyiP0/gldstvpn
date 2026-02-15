@echo off
chcp 65001 >nul
echo ==========================================
echo      V204 VPN - v3.1.0 Release
echo ==========================================
echo.

echo 1. Adding changes...
git add -A

echo.
echo 2. Committing...
git commit -m "feat(v3.1.0): Linux pencere sürükleme düzeltmesi, proxy cross-platform desteği"

echo.
echo 3. Tagging v3.1.0 (Force)...
git tag -f v3.1.0

echo.
echo 4. Pushing to GitHub (Force tags)...
git push origin main --force
git push origin --tags --force

echo.
echo ==========================================
echo SUCCESS! v3.1.0 pushed.
echo Check GitHub Actions for the build.
echo ==========================================
pause
