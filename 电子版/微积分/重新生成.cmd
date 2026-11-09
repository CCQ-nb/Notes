@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo 正在生成 微积分笔记.html ...
node "..\_build\build.mjs" "微积分笔记.md" "微积分笔记.html"
if errorlevel 1 goto fail
echo.
echo 完成。需要 PDF 时：用浏览器打开 HTML，Ctrl+P 另存为 PDF。
pause
exit /b 0

:fail
echo 生成失败：请确认已安装 Node.js（命令行输入 node -v 能显示版本号）。
pause
exit /b 1