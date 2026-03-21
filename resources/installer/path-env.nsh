; Purpose: Add TreeNote install directory to current-user PATH so `treenote` can run from command line.

!macro customInstall
  ReadRegStr $0 HKCU "Environment" "Path"
  StrCpy $3 "$INSTDIR"

  StrCmp $0 "" 0 +3
    WriteRegExpandStr HKCU "Environment" "Path" "$INSTDIR"
    Goto path_broadcast

  WriteRegExpandStr HKCU "Environment" "Path" "$0;$INSTDIR"
  StrCpy $3 "$0;$INSTDIR"

path_broadcast:
  System::Call 'Kernel32::SetEnvironmentVariable(t, t) i("PATH", "$3").r1'
  System::Call 'user32::SendMessageTimeout(p 0xffff, i 0x1A, p 0, t "Environment", i 0, i 5000, *p .r2)'
!macroend

!macro customUnInstall
  ; Keep PATH cleanup minimal; command availability is the key requirement.
!macroend
