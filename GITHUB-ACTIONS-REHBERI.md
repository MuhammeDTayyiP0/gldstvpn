# 🚀 GitHub Actions ile Otomatik Derleme Rehberi

Bu rehber, projenizi GitHub'a yüklediğinizde Windows (`.exe`) ve Linux (`.deb`, `.AppImage`) paketlerinin nasıl otomatik olarak hazırlanacağını anlatır.

## 1. Hazırlık: Projeyi GitHub'a Yükleme

Eğer projeniz henüz GitHub'da değilse:
1. GitHub hesabınızda yeni bir depo (Repository) oluşturun.
2. Bilgisayarınızda terminale (PowerShell/CMD) gidin ve şu komutları sırasıyla çalıştırın:

```bash
# ⚠️ ÖNEMLİ: Tag atmadan önce package.json dosyasındaki "version" 
# kısmını da etiketiyle aynı yapmayı unutmayın (örn: "1.1.0").

git init
git add .
git commit -m "İlk VPN sürümü"
git remote add origin https://github.com/MuhammeDTayyiP0/gldstvpn.git
git push -u origin main
```

## 2. Otomatik Derlemeyi Tetikleme (Tag Atma)

GitHub Actions iş akışımız (`.github/workflows/build.yml`), siz bir "Versiyon Etiketi" (Tag) oluşturup paylaştığınızda otomatik olarak başlar.

Yeni bir sürüm yayınlamak için şu komutları kullanın:

```bash
# Versiyona isim verin (örn: v1.0.0)
git tag v1.0.0

# Etiketi GitHub'a gönderin
git push origin v1.0.0
```

## 3. Derleme Sürecini İzleme

1. GitHub'da deponuza (Repository) gidin.
2. Üst menüdeki **"Actions"** sekmesine tıklayın.
3. Sol tarafta **"Build/Release"** yazan iş akışını göreceksiniz.
4. Başlayan işleme tıklayarak Windows ve Linux paketlerinin derlenme aşamalarını canlı izleyebilirsiniz.

## 4. Dosyaları İndirme

Derleme her iki platform (Windows ve Ubuntu) için tamamlandığında (yaklaşık 5-10 dk):
1. **"Releases"** (Sürümler) sekmesine gidin.
2. Yeni oluşturulan başlığın altında (Assets) şu dosyaları göreceksiniz:
   - `GeldeSat-VPN-Setup.exe` (Windows Kurulum Sihirbazı)
   - `geldesat-vpn_1.0.0_amd64.deb` (Linux Debian/Ubuntu Paketi)
   - `geldesat-vpn_1.0.0_amd64.AppImage` (Linux Genel Paketi)

## 💡 İpucu
- Her yeni güncelleme yaptığınızda (kod değişikliği), deponuza `git push` yaptıktan sonra yeni bir etiket (`v1.0.1` gibi) oluşturup pushlamanız yeterlidir.
- GitHub Actions, tüm platformlar için derlemeyi sizin yerinize yapacaktır; böylece Windows üzerinde Linux paketi oluşturma zahmetinden kurtulursunuz.
