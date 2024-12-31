@echo off
echo 開始打包程序...

rem 清理舊的構建文件
rmdir /s /q build
rmdir /s /q dist

rem 使用 PyInstaller 打包
pyinstaller --clean webtoon_scraper.spec

echo 打包完成！
pause 