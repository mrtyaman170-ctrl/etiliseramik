# ETİLİSMART Modüler Proje — v1.4.1

Bu klasör, ETİLİSMART arayüzünün geliştirme için parçalara ayrılmış sürümüdür.
Mevcut görünüm, kayıt yapısı ve yetkiler korunmuştur.

## v1.4.1 yenilikleri

- Vardiyalı Çalışma Çizelgesi Excel şablonu doğrudan tanınır: `AY`, `YIL`, `24/8`, `8/16`, `16/24` başlıkları ve renkli vardiya hücreleri okunur.
- Aynı çalışma kitabındaki eski çizelgeler yerine en güncel ay otomatik seçilir.
- `İZİN`, rapor ve tatil kayıtları çizelgede **İzinli** olarak görünür; aktif vardiyadaki bakımcı hesabına dahil edilmez.
- Eşleşmeyen personel isimleri aktarım sonunda açıkça bildirilir; böylece eksik kullanıcı hesabı nedeniyle veri sessizce kaybolmaz.
- Bakım formenleri de kendi bakım ekiplerinin vardiya çizelgesinde yer alabilir.

## v1.4.0 yenilikleri

- Vardiya çizelgesine Excel içe aktarma altyapısı eklendi.
- Periyodik kontroller sade kartlara taşındı; detay ekranından ekleme, kapsamlı kayıt, düzenleme ve silme sağlandı.
- Su ve gaz için ayrı günlük, haftalık ve aylık tek sayfa çıktılar eklendi.
- Son 7 günlük kontrol geçmişinde vardiyadaki elektrik ve mekanik bakım personelleri gösterildi.
- Talepler “Taşerona Verilecek” iş emrine dönüştürülebilir.

- Mekanik atölye talep, onay, tahmini süre, üretim ve arşiv modülü eklendi.
- İş talepleri normal veya “Satın Alınacak” notlu, Malzeme Bekliyor durumundaki iş emrine dönüştürülebilir.
- Atölye işleri teknik resim, parça tipi ve kullanılacağı makineyle ilişkilendirildi.
- Tamamlanan atölye parçalarının malzeme kartına dönüştürülmesi ve makine detayında görüntülenmesi sağlandı.
- Aylık taşeron kontrolleri “Periyodik Kontroller” olarak yenilendi; trafo, kesici, gaz istasyonu ve yangın sistemi kapsama alındı.

## v1.2.0 yenilikleri

- Vardiya çizelgesine düzenlenebilir aylık görünüm ve aylar arasında geçiş eklendi.
- Arıza tablolarındaki sorumlu bakımcı ve durum sütunu çakışmaları giderildi.
- Eksik çözüm uyarısı “Arıza çözümü yazılmadı” olarak güncellendi.

## v1.1.2 yenilikleri

- Makine detay penceresinden makine silme alanı tamamen kaldırıldı. Silme işlemi yalnızca yetkili makine yönetim ekranında tutuldu.

## v1.1.1 yenilikleri

- Makine silme işlemi kapatma düğmesinin yanından kaldırılarak detay penceresinin en altındaki ayrı tehlikeli işlemler alanına taşındı.

## v1.1.0 yenilikleri

- Malzeme kataloğuna sıralama, satırdan detay açma ve depo konumu alanı eklendi.
- Depo sorumlusu hesabı ile malzeme ekleme, düzenleme ve silme yetkileri tanımlandı.
- Arıza ve iş emri malzeme girişleri aranabilir hale getirildi.
- Giriş ekranına “Beni hatırla” seçeneği ve görünür sürüm bilgisi eklendi.
- Personel aramasında ilk harften sonra odağın kaybolması düzeltildi.
- Talep, iş emri ve taşeron işi düğmeleri eşitlendi.

## Önceki sürümden gelen özellikler

- Ana panelde canlı saat ve aktif vardiyadaki bakım ekipleri için ayrı bloklar
- Daha profesyonel QR tarama simgesi
- Aranabilir ve sütun başlıklarından sıralanabilir arıza kayıtları
- Üç fabrika için ayrı arıza geçmişi görünümü
- İş talebi ve iş emri geçmişleri
- Yetkili bakım yöneticileri için taşeron işleri yönetimi
- Planlı bakımı oluşturan kullanıcı bilgisi
- Makine detayında planlı bakım geçmişi
- Masaüstüyle aynı işlem yetkilerini koruyan sade mobil görünüm

## Çalıştırma

En kolay kullanım için `dist/ETILISMART.html` dosyasını Chrome veya Edge ile
açın. Bu dosya bütün stil ve kodları tek dosyada içerir.

Geliştirme yapmak veya GitHub Pages üzerinde yayımlamak için `index.html`,
`css`, `js` ve `tools` klasörlerini birlikte kullanın. İnternet bağlantısı
olmadan temel ekranlar çalışır. Kamera ile QR okutma özelliği tarayıcı güvenlik
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
- `KULLANICI_HESAPLARI.md`: Güncel demo kullanıcı ID ve şifre listesi

Yeni geliştirmelerde yalnızca ilgili dosya düzenlenmelidir. Büyük tek HTML
dosyası geliştirme kaynağı olarak kullanılmamalıdır.

## Tek HTML üretme

Node.js kuruluysa aşağıdaki komut çalıştırılabilir:

```bash
node tools/build-single-html.mjs
```

Oluşan tek dosya `dist/ETILISMART.html` konumunda yer alır.
