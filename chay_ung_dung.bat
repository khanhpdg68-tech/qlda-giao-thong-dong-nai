@echo off
title Ban QLDA Giao Thong - May Chu He Thong Web App
color 0a

echo =======================================================================
echo    BAN QUAN LY DU AN DAU TU XAY DUNG CONG TRINH GIAO THONG
echo    HE THONG QUAN LY DAU THAU & GIAM SAT TIEN DO HOP DONG
echo =======================================================================
echo.
echo [!] LUU Y: Cua so nay la MAY CHU cua ung dung.
echo     Vui long KHONG DONG cua so nay khi dang lam viec tren Web.
echo.
cd /d "%~dp0"

echo Dang mo trinh duyet...
start http://localhost:3000

echo Dang khoi dong may chu tren cong 3000...
echo.
node "node_modules\next\dist\bin\next" start

echo.
echo May chu da dung. Nhan phim bat ky de thoat.
pause >nul
