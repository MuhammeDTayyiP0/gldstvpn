# GeldeSat VPN

Güvenli ve hızlı VLESS VPN istemcisi. Windows ve Linux masaüstü uygulaması + Android/iOS yapılandırma rehberleri.

## 🖥️ Masaüstü Kurulumu

### Gereksinimler
- Node.js 18+ 
- Xray-core binary

### 1. Bağımlılıkları Yükle
```bash
npm install
```

### 2. Xray-core İndir
[Xray-core Releases](https://github.com/XTLS/Xray-core/releases) sayfasından platformunuza uygun binary'yi indirin:

- **Windows:** `Xray-windows-64.zip` → `xray.exe` dosyasını `resources/xray/` klasörüne koyun
- **Linux:** `Xray-linux-64.zip` → `xray` dosyasını `resources/xray/` klasörüne koyun

### 3. Uygulamayı Çalıştır
```bash
npm run dev
```

### 4. Paketleme (Opsiyonel)
```bash
# Windows installer
npm run build:win

# Linux AppImage
npm run build:linux
```

## 📱 Mobil Kurulum

- **Android:** [Android Rehberi](mobile/android-guide.md) - v2rayNG kullanarak
- **iOS:** [iOS Rehberi](mobile/ios-guide.md) - Shadowrocket/Streisand kullanarak

### Hızlı URI (Kopyala-Yapıştır)
```
vless://bf5d83c2-69c5-47d0-aa13-234cd4f521b0@vpn.geldesat.com:443?type=ws&security=tls&path=%2Fchat&host=vpn.geldesat.com&sni=vpn.geldesat.com#GeldeSat%20VPN
```

## 📁 Proje Yapısı
```
vpnugulaması/
├── src/
│   ├── main/              # Electron ana süreç
│   │   ├── main.js        # Pencere, tray, IPC
│   │   ├── xray-manager.js    # Xray-core süreç yönetimi
│   │   ├── config-generator.js # VLESS yapılandırma
│   │   └── proxy-settings.js  # Sistem proxy ayarları
│   ├── preload.js         # IPC köprüsü
│   └── renderer/          # UI
│       ├── index.html
│       ├── app.js
│       └── styles/index.css
├── mobile/                # Mobil rehberler
├── resources/
│   └── xray/              # Xray-core binary (kendiniz eklemelisiniz)
└── package.json
```
