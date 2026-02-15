@echo off
echo ==========================================
echo      V204 VPN - v2.4.5 Release Script
echo ==========================================
echo.
echo 1. Changes will be added to Git...
git add .
echo.

echo 2. Committing changes...
git commit -m "fix(ci): Fix GitHub Release not uploading artifacts (v2.4.5)"
echo.

echo 3. Creating Tag v2.4.5...
git tag v2.4.5
echo.

echo 4. Pushing to GitHub (Main Branch & Tags)...
git push origin main
git push origin v2.4.5
echo.

echo ==========================================
echo SUCCESS! v2.4.5 has been pushed.
echo GitHub Actions will now build and upload .exe/.deb/.AppImage to the release.
echo Check: https://github.com/MuhammeDTayyiP0/gldstvpn/actions
echo ==========================================
pause
