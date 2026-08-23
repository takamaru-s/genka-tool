@echo off
chcp 65001 > nul
cd /d "%~dp0"
set PATH=%PATH%;C:\Program Files\nodejs

echo ========================================
echo  原価管理ツール 配布用ZIP作成
echo ========================================
echo.

echo [1/4] アプリをビルド中...
call npm run build
if %errorlevel% neq 0 (echo [エラー] ビルド失敗 & pause & exit /b 1)

echo.
echo [2/4] データベーステンプレートを作成中...
call node scripts/prepare-seed-db.js
if %errorlevel% neq 0 (echo [エラー] seed.db 作成失敗 & pause & exit /b 1)

echo.
echo [3/4] Electronパッケージを作成中...
set CSC_IDENTITY_AUTO_DISCOVERY=false
call npx electron-builder --win --dir
if not exist "dist\win-unpacked\原価管理ツール.exe" (
    echo [エラー] パッケージ作成失敗
    pause
    exit /b 1
)

echo.
echo [4/4] ZIPファイルを作成中...
if exist "dist\genka-tool-win.zip" del "dist\genka-tool-win.zip"
powershell -NoProfile -Command "Compress-Archive -Path 'dist\win-unpacked\*' -DestinationPath 'dist\genka-tool-win.zip' -Force"
if %errorlevel% neq 0 (echo [エラー] ZIP作成失敗 & pause & exit /b 1)

echo.
echo ========================================
echo  完了！
echo  dist\genka-tool-win.zip を配布してください。
echo  受け取った方はZIPを解凍して
echo  「原価管理ツール.exe」を実行するだけです。
echo ========================================
echo.
pause
