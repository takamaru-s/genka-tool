@echo off
chcp 65001 > nul
cd /d "%~dp0"

:: Node.js パスを追加（インストール先が標準の場合）
set PATH=%PATH%;C:\Program Files\nodejs

:: ポート確認（すでに起動中か）
netstat -an | find "0.0.0.0:3000" > nul 2>&1
if %errorlevel% equ 0 (
    echo すでに起動中です。ブラウザを開きます...
    start http://localhost:3000
    exit /b 0
)

echo 原価管理ツールを起動しています...
echo （このウィンドウは起動中は開いたままにしてください）
echo.
echo 終了するには Ctrl+C を押してください。
echo.

:: バックグラウンドでサーバー起動 → ブラウザを開く
start /b npm run dev
timeout /t 4 /nobreak > nul
start http://localhost:3000

:: サーバーが止まるまで待機
:loop
timeout /t 5 /nobreak > nul
netstat -an | find "0.0.0.0:3000" > nul 2>&1
if %errorlevel% equ 0 goto loop

echo サーバーが停止しました。
pause
