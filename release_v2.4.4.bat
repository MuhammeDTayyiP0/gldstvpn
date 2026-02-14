@echo off
echo ==========================================
echo      V204 VPN - v2.4.4 Release Script
echo ==========================================
echo.
echo 1. Changes will be added to Git...
git add .
echo.

echo 2. Committing changes...
git commit -m "fix(release): v2.4.4 - Fix Linux Icon/Stats/ReleaseName"
echo.

echo 3. Creating Tag v2.4.4...
git tag v2.4.4
echo.

echo 4. Pushing to GitHub (Main Branch & Tags)...
git push origin main
git push origin v2.4.4
echo.

echo ==========================================
echo SUCCESS! v2.4.4 has been pushed.
echo GitHub Actions will build and rename the release to "v2.4.4 - V204 VPN".
echo Check: https://github.com/MuhammeDTayyiP0/gldstvpn/actions
echo ==========================================
pause
