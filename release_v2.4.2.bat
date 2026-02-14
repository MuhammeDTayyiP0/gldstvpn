@echo off
echo ==========================================
echo      V204 - v2.4.2 Release Script
echo ==========================================
echo.
echo 1. Changes will be added to Git...
git add .
echo.

echo 2. Committing changes...
git commit -m "feat(release): v2.4.2 - Linux Optimization & Branding Fixes"
echo.

echo 3. Creating Tag v2.4.2...
git tag v2.4.2
echo.

echo 4. Pushing to GitHub (Main Branch & Tags)...
git push origin main
git push origin v2.4.2
echo.

echo ==========================================
echo SUCCESS! v2.4.2 has been pushed.
echo GitHub Actions should now start building the release.
echo Check: https://github.com/MuhammeDTayyiP0/gldstvpn/actions
echo ==========================================
pause
