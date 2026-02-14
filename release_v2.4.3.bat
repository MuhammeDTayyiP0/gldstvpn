@echo off
echo ==========================================
echo      V204 VPN - v2.4.3 Release Script
echo ==========================================
echo.
echo 1. Changes will be added to Git...
git add .
echo.

echo 2. Committing changes...
git commit -m "fix(linux): Restore 'V204 VPN' name and fix icon path (v2.4.3)"
echo.

echo 3. Creating Tag v2.4.3...
git tag v2.4.3
echo.

echo 4. Pushing to GitHub (Main Branch & Tags)...
git push origin main
git push origin v2.4.3
echo.

echo ==========================================
echo SUCCESS! v2.4.3 has been pushed.
echo GitHub Actions should now start building the release.
echo Check: https://github.com/MuhammeDTayyiP0/gldstvpn/actions
echo ==========================================
pause
