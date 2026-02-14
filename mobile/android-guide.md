# Android - v2rayNG Yapılandırma Rehberi

## v2rayNG Kurulumu

1. **Google Play Store**'dan [v2rayNG](https://play.google.com/store/apps/details?id=com.v2ray.ang) uygulamasını indirin
2. Alternatif olarak [GitHub Releases](https://github.com/2dust/v2rayNG/releases) sayfasından APK dosyasını indirebilirsiniz

## Yapılandırma Ekleme

### Yöntem 1: Manuel Ekleme

1. v2rayNG uygulamasını açın
2. Sağ üst köşedeki **+** butonuna dokunun
3. **Sunucu elle ekle** seçeneğini seçin → **VLESS** seçin
4. Aşağıdaki bilgileri girin:

| Alan | Değer |
|------|-------|
| Takma ad | MTE VPN |
| Adres | `vpn.geldesat.com` |
| Port | `443` |
| UUID | `bf5d83c2-69c5-47d0-aa13-234cd4f521b0` |
| Akış (flow) | *(boş bırakın)* |
| Şifreleme | `none` |
| Ağ (network) | `ws` |
| Güvenlik (security) | `tls` |

5. **WebSocket Ayarları:**
   - Path: `/chat`
   - Host: `vpn.geldesat.com`

6. **TLS Ayarları:**
   - SNI: `vpn.geldesat.com`

7. **Kaydet** butonuna dokunun

### Yöntem 2: URI ile Ekleme

Aşağıdaki URI'yi kopyalayın ve v2rayNG'de **+** → **Panodan içe aktar** seçeneğini kullanın:

```
vless://bf5d83c2-69c5-47d0-aa13-234cd4f521b0@vpn.geldesat.com:443?type=ws&security=tls&path=%2Fchat&host=vpn.geldesat.com&sni=vpn.geldesat.com#MTE%20VPN
```

## Bağlanma

1. Ana ekranda **MTE VPN** sunucusunu seçin
2. Sağ alt köşedeki **V** butonuna dokunun
3. VPN izin isteğini onaylayın
4. Bağlantı başarılı olduğunda üst çubuğta anahtar simgesi görünecektir
