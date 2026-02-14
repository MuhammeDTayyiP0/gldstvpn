# iOS - Shadowrocket / Streisand Yapılandırma Rehberi

## Uygulama Seçenekleri

iOS'ta VLESS protokolünü destekleyen uygulamalar:

| Uygulama | Fiyat | Mağaza |
|----------|-------|--------|
| **Shadowrocket** | ~$2.99 | App Store |
| **Streisand** | Ücretsiz | App Store |
| **V2Box** | Ücretsiz | App Store |

> **Not:** Shadowrocket Türkiye App Store'da bulunmayabilir. Bu durumda farklı bir bölge Apple ID'si gerekebilir veya Streisand/V2Box kullanabilirsiniz.

---

## Shadowrocket Yapılandırması

### Yöntem 1: URI ile Ekleme (Önerilen)

1. Aşağıdaki URI'yi kopyalayın:

```
vless://bf5d83c2-69c5-47d0-aa13-234cd4f521b0@vpn.geldesat.com:443?type=ws&security=tls&path=%2Fchat&host=vpn.geldesat.com&sni=vpn.geldesat.com#GeldeSat%20VPN
```

2. Shadowrocket'i açın
3. Sağ üst köşedeki **+** butonuna dokunun
4. **URI'dan ekle** veya otomatik olarak panodaki URI'yi algılayacaktır

### Yöntem 2: Manuel Ekleme

1. Shadowrocket'i açın → **+** → **Tür: VLESS** seçin
2. Bilgileri girin:

| Alan | Değer |
|------|-------|
| Adres | `vpn.geldesat.com` |
| Port | `443` |
| UUID | `bf5d83c2-69c5-47d0-aa13-234cd4f521b0` |
| Şifreleme | `none` |
| Transport | `websocket` |
| Path | `/chat` |
| Host | `vpn.geldesat.com` |
| TLS | Açık |
| SNI | `vpn.geldesat.com` |

3. **Kaydet**'e dokunun

---

## Streisand Yapılandırması

1. Streisand uygulamasını açın
2. **+** → **Manuel Yapılandırma** → **VLESS** seçin
3. Yukardaki tabloyla aynı bilgileri girin
4. **Kaydet** → Ana ekrana dönün → Bağlan

---

## Bağlanma

1. Ana ekranda **GeldeSat VPN** sunucusunu seçin
2. Bağlantı düğmesine basın
3. VPN izin isteğini onaylayın (ilk seferde)
4. Üst çubukta **VPN** simgesi görünecektir
