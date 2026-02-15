[Setup]
AppName=GeldeSat VPN
AppVersion=1.0.0
DefaultDirName={autopf}\GeldeSat VPN
DefaultGroupName=GeldeSat VPN
OutputDir=dist
OutputBaseFilename=GeldeSat-VPN-Setup
Compression=lzma
SolidCompression=yes
UninstallDisplayIcon={app}\GeldeSat VPN.exe

[Files]
Source: "d:\Sites\ggl ag\vpnugulaması\dist\GeldeSat VPN-win32-x64\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs

[Icons]
Name: "{group}\GeldeSat VPN"; Filename: "{app}\GeldeSat VPN.exe"
Name: "{commondesktop}\GeldeSat VPN"; Filename: "{app}\GeldeSat VPN.exe"

[Run]
Filename: "{app}\GeldeSat VPN.exe"; Description: "GeldeSat VPN Başlat"; Flags: nowait postinstall skipifsilent
