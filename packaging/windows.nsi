Unicode true
!include "MUI2.nsh"
Name "ResearchPi"
OutFile "${OUTPUT}"
InstallDir "$LOCALAPPDATA\Programs\ResearchPi"
RequestExecutionLevel user
SetCompressor /SOLID lzma
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"
Section "ResearchPi"
  SetOutPath "$INSTDIR"
  File /r "${PAYLOAD}\*"
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  ExecWait '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\windows-path.ps1" -Action add -InstallDirectory "$INSTDIR"' $0
  IntCmp $0 0 path_ok
  MessageBox MB_ICONSTOP "Could not update PATH. You can run $INSTDIR\repi.cmd directly."
  path_ok:
  SendMessage 0xffff 0x001A 0 "STR:Environment" /TIMEOUT=5000
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ResearchPi" "DisplayName" "ResearchPi"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ResearchPi" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ResearchPi" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ResearchPi" "InstallLocation" "$INSTDIR"
SectionEnd
Section "Uninstall"
  ExecWait '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\windows-path.ps1" -Action remove -InstallDirectory "$INSTDIR"' $0
  SendMessage 0xffff 0x001A 0 "STR:Environment" /TIMEOUT=5000
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ResearchPi"
  RMDir /r "$INSTDIR"
  ; Per-user scientific projects, connections and experiment environments are retained.
SectionEnd
