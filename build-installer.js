const electronInstaller = require('electron-winstaller');
const path = require('path');

async function createInstaller() {
    console.log('Windows installer oluşturuluyor...');

    try {
        await electronInstaller.createWindowsInstaller({
            appDirectory: path.join(__dirname, 'dist', 'GeldeSat VPN-win32-x64'),
            outputDirectory: path.join(__dirname, 'dist', 'installer-win64'),
            authors: 'GeldeSat',
            exe: 'GeldeSat VPN.exe',
            setupExe: 'GeldeSatVPNSetup.exe',
            noMsi: true,
            description: 'GeldeSat VPN Application'
        });
        console.log('Başarılı! Installer oluşturuldu: dist/installer-win64/GeldeSatVPNSetup.exe');
    } catch (e) {
        console.log(`Hata oluştu: ${e.message}`);
    }
}

createInstaller();
