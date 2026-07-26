# ETİLİSMART Modüler Proje

Bu klasör, ETİLİSMART arayüzünün geliştirme için parçalara ayrılmış sürümüdür.
Mevcut görünüm, kayıt yapısı ve yetkiler korunmuştur.

## Çalıştırma

`index.html` dosyasını Chrome veya Edge ile açın. İnternet bağlantısı olmadan
temel ekranlar çalışır. Kamera ile QR okutma özelliği tarayıcı güvenlik
kısıtlamaları nedeniyle yerel dosyada izin isteyebilir.

## Geliştirme dosyaları

- `css/styles.css`: Tüm arayüz stilleri
- `js/work-orders.js`: İş talepleri ve iş emirleri
- `js/faults.js`: Arızalar, raporlar ve makine detayları
- `js/daily-controls.js`: Günlük ve taşeron kontrolleri
- `js/planned-maintenance.js`: Planlı bakım
- `js/personnel.js`: Kullanıcılar, roller ve personel
- `js/materials.js`: Malzeme yönetimi
- `js/shifts-dashboard.js`: Vardiyalar ve ana gösterge paneli
- `js/qr.js`: QR üretme ve okutma
- `js/app-shell.js`: Ortak uygulama durumu ve sayfa yönlendirme
- `js/runtime.js`: Ekran olayları ve uygulamanın başlatılması

Yeni geliştirmelerde yalnızca ilgili dosya düzenlenmelidir. Büyük tek HTML
dosyası geliştirme kaynağı olarak kullanılmamalıdır.

## Tek HTML üretme

Node.js kuruluysa aşağıdaki komut çalıştırılabilir:

```bash
node tools/build-single-html.mjs
```

Oluşan tek dosya `dist/ETILISMART.html` konumunda yer alır.
