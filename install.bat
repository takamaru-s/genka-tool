@echo off
chcp 65001 > nul
echo ========================================
echo  原価管理ツール セットアップ
echo ========================================
echo.

:: Node.js チェック
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [エラー] Node.js が見つかりません。
    echo https://nodejs.org から Node.js をインストールしてください。
    pause
    exit /b 1
)

echo [1/3] パッケージをインストール中...
call npm install
if %errorlevel% neq 0 (
    echo [エラー] npm install に失敗しました。
    pause
    exit /b 1
)

echo.
echo [2/3] データベースを初期化中...
call npx prisma db push
if %errorlevel% neq 0 (
    echo [エラー] データベースの初期化に失敗しました。
    pause
    exit /b 1
)

echo.
echo [3/3] デスクトップにショートカットを作成中...
set SCRIPT_DIR=%~dp0
set SHORTCUT=%USERPROFILE%\Desktop\原価管理ツール.lnk
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT%'); $s.TargetPath = '%SCRIPT_DIR%起動.bat'; $s.WorkingDirectory = '%SCRIPT_DIR%'; $s.IconLocation = 'shell32.dll,137'; $s.Description = '原価管理ツール'; $s.Save()"

echo.
echo ========================================
echo  セットアップ完了！
echo  デスクトップの「原価管理ツール」を
echo  ダブルクリックして起動できます。
echo ========================================
echo.
pause
