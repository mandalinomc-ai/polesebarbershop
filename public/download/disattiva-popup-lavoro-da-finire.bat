@echo off
setlocal EnableExtensions
title Disattiva popup Felice Polese - lavoro da finire
cd /d "%~dp0"

echo.
echo === Disattiva "Felice Polese - lavoro da finire" ===
echo Meglio: tasto destro su questo file ^> Esegui come amministratore
echo.

REM PowerShell: elimina Scheduled Tasks + scorciatoie Avvio
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Continue';" ^
  "$keys=@('Felice Polese','lavoro da finire','lavoro-da-finire','polesebarbershop','polese-lavoro','cursor-polese','Cursor reminder');" ^
  "$exact=@('Felice Polese - lavoro da finire','Felice Polese lavoro da finire','FelicePolese-lavoro-da-finire','polese-lavoro-da-finire','cursor-polese-reminder');" ^
  "$n=0;" ^
  "Write-Host '[1/3] Task Scheduler...';" ^
  "Get-ScheduledTask -ErrorAction SilentlyContinue | ForEach-Object {" ^
  "  $tn=$_.TaskName; $tp=$_.TaskPath; $full=($tp.TrimEnd('\')+'\'+$tn);" ^
  "  $hit=$false;" ^
  "  foreach($e in $exact){ if($tn -eq $e -or $full -like ('*'+$e+'*')){ $hit=$true } }" ^
  "  foreach($k in $keys){ if($tn -match [regex]::Escape($k) -or $full -match [regex]::Escape($k)){ $hit=$true } }" ^
  "  if($hit){" ^
  "    try { Unregister-ScheduledTask -TaskName $tn -TaskPath $tp -Confirm:$false -ErrorAction Stop; Write-Host ('  OK eliminato: '+$full); $n++ }" ^
  "    catch { try { schtasks /Delete /TN $full /F | Out-Null; Write-Host ('  OK schtasks: '+$full); $n++ } catch { Write-Host ('  FALLITO: '+$full+' — '+$_.Exception.Message) } }" ^
  "  }" ^
  "};" ^
  "Write-Host '[2/3] Cartella Avvio...';" ^
  "$startup=Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Startup';" ^
  "if(Test-Path $startup){" ^
  "  Get-ChildItem -LiteralPath $startup -Force -ErrorAction SilentlyContinue |" ^
  "    Where-Object { $_.Name -match 'Felice|polese|lavoro|Cursor.?reminder' } |" ^
  "    ForEach-Object { Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue; Write-Host ('  Rimosso Avvio: '+$_.Name); $n++ }" ^
  "};" ^
  "Write-Host '[3/3] Chiudo msg.exe se attivo...';" ^
  "Get-Process msg -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue;" ^
  "Write-Host '';" ^
  "if($n -gt 0){ Write-Host ('Fatto. Elementi rimossi: '+$n) -ForegroundColor Green }" ^
  "else {" ^
  "  Write-Host 'Nessun task/startup trovato con quei nomi.' -ForegroundColor Yellow;" ^
  "  Write-Host 'Se il popup e Cursor Desktop: apri Cursor > Agents/Automations e spegni quel reminder.';" ^
  "};" ^
  "Write-Host '';" ^
  "Write-Host 'Residui Task Scheduler (se vuoto = ok):';" ^
  "Get-ScheduledTask -ErrorAction SilentlyContinue | Where-Object {" ^
  "  $t=$_.TaskName+' '+$_.TaskPath;" ^
  "  $t -match 'Felice|polese|lavoro da finire|Cursor reminder'" ^
  "} | ForEach-Object { Write-Host ('  - '+$_.TaskPath+$_.TaskName) }"

echo.
pause
endlocal
