# ETİLİSMART Modüler Proje — v1.5.0

Bu klasör, ETİLİSMART arayüzünün geliştirme için parçalara ayrılmış sürümüdür.
Mevcut görünüm, kayıt yapısı ve yetkiler korunmuştur.

## GitHub Pages için hazır dosya

`dist/index.html` tek dosyalık, yayına hazır sürümdür. GitHub deposundaki eski
`index.html` yerine bu dosyayı yükleyebilirsiniz. Telegram Worker adresi henüz
oluşmadıysa uygulama normal çalışmaya devam eder; bildirimler kurulum tamamlanana
kadar “Worker adresi tanımlanmadı” durumunda kalır.

## v1.5.0 yenilikleri

- Yeni arızalar, fabrika ve bakım disiplinine göre yalnızca aktif vardiyadaki ilgili bakım personellerine kişisel Telegram mesajı olarak gönderilir.
- Telegram mesajında kayıt numarası, fabrika, hat, bölüm, makine, arıza türü, açıklama, açan kişi, sistem ataması, vardiya ve üretim duruşu bulunur.
- Personel hesaplarına Telegram kullanıcı adı alanı eklendi; bot bağlantı durumu ayrı yönetim ekranından izlenebilir.
- Yazılımcı ve Bakım Müdürü için Worker bağlantı kontrolü, personel eşleştirme görünümü ve test mesajı ekranı eklendi.
- Her arızanın detayında Telegram gönderiminin başarılı, kısmi, bekleyen veya hatalı durumu görünür.
- Bot tokenını HTML ve GitHub dışında tutan Cloudflare Worker, KV kullanıcı eşleştirmesi, webhook doğrulaması, CORS, hız sınırı ve tekrarlı gönderim koruması pakete eklendi.
- Kurulum dosyası: `TELEGRAM_KURULUM_REHBERI.md`.

## v1.4.6 yenilikleri

- Vardiya Excel çıktısında artık vardiya hücreleri şablondaki satır renklerine bağlı değildir: her personelin aktif vardiyası net biçimde işaretlenir ve kişi bazlı renk kullanılır.
- Aynı vardiya değeri farklı yazımla gelmiş olsa bile (`08:00-16:00` gibi) çıktıda doğru hücreye işlenir. Sabit 08–16 çalışanlar önceki talebe uygun gri tonda kalır.
- Boş personel satırları beyaz hücre ve normal kenarlık düzeniyle korunur; izinli günler de tek, okunaklı bir blok olarak yazılır.
- Telefon ekranında geniş vardiya çizelgesinin yatay kaydırması dokunmatik kullanım için iyileştirildi.
- Tarayıcıda eski sürümden kalmış kullanıcı verisi olsa dahi bölüm formenleri, üretim müdürleri ve Yazılımcı hesabının fabrika/rol sınırları güncel yetki modeline göre güvenle düzeltilir; kullanıcının değiştirdiği parola korunur.

## v1.4.5 yenilikleri

- Vardiya Excel çıktısındaki boş personel satırları artık kurum şablonundaki normal beyaz hücre ve kenarlık düzeniyle yazılır; sürekli 08–16 çalışanlar gri vardiya deseniyle belirtilir.
- Son 3 vardiya faaliyet raporu en eski vardiyadan güncel vardiyaya doğru, her vardiya içindeki faaliyetler de saat sırasıyla listelenir.
- **Yazılımcı** hesabı tüm uygulama yetkilerine ve tüm kullanıcı hesaplarını ekleme, düzenleme ve silme ekranına sahiptir. Son Yazılımcı hesabı korunur.
- Mekanik Atölye işleri Atölye Personeli, Bakım Müdürü ve Yazılımcı tarafından iki adımlı onayla silinebilir. Silinen iş, bağlı stok kartını ve daha önceki parça kullanım geçmişini bozmaz.

## v1.4.4 yenilikleri

- Mekanik atölye kullanıcıları talep olmadan kendi yaptıkları üretim, revizyon ve tamamlama işlerini doğrudan kaydedebilir.
- Mekanik üretim parçalarına minimum stok adedi girilir; tamamlanan üretim otomatik olarak malzeme stok kartına bağlanır.
- Atölye işi detayından parça adı, kodu, tipi, miktarı, konumu, teknik bilgileri, minimum stok eşiği ve üretim bilgileri düzenlenebilir.
- Teknik resim ilk kayıtta eklenebilir; sonradan parça detayından değiştirilebilir veya kaldırılabilir.
- Atölye kullanıcıları kendi üretim kartlarını; Bakım Müdürü ise malzeme yetkisiyle tüm ilgili kartları düzenleyip silebilir. Silinen kartların kullanım geçmişi korunur.
- Mekanik Atölye ekranına arama ve sıralamalı **Parça Kullanım Geçmişi** sekmesi eklendi; arıza ve iş emrindeki kullanım kayıtları parça bazında izlenir.
- Atölye ve Depo Sorumlusu için arıza içermeyen, görev odaklı ana paneller eklendi; arıza menüsü ve arıza listeleri bu kullanıcılar için gösterilmez.

## v1.4.3 yenilikleri

- Vardiya Excel çıktısı, yüklenen kurumsal şablonun logo, renk, birleşik hücre, imza alanı ve tek sayfalık yatay baskı düzenini korur.
- Seçili fabrika, bakım ekibi, ay, yıl, personel ve vardiya planı aynı şablona işlenir.
- Açık talepler, açık iş emirleri ve devam eden taşeron işleri ana grupta; üç ayrı geçmiş ise ayrı düğmelerde gösterilir.
- Tüm iş kayıtlarında kelime araması, başlangıç/bitiş tarihi filtresi ve sütun başlığından çift yönlü sıralama bulunur.
- Kayıt satırına tıklanarak ayrıntı ekranı açılır.

## v1.4.2 yenilikleri

- Vardiya planı, seçili ay ve bakım ekibi için renkli hücre yapısını koruyan **Vardiyalı Çalışma Çizelgesi** Excel şablonu olarak dışa aktarılabilir.
- Tamamlanmış arızalarda malzeme kaydı yoksa arıza listesinde ve detay ekranında **“Malzeme girilmedi”** uyarısı görünür.

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
- `js/config.js`: Telegram Worker ve uygulama adresi yapılandırması
- `js/telegram.js`: Aktif vardiyaya göre kişisel Telegram bildirimleri
- `telegram-worker/`: Bot tokenını gizli tutan Cloudflare Worker servisi
- `TELEGRAM_KURULUM_REHBERI.md`: Telegram ve Worker kurulum adımları
- `KULLANICI_HESAPLARI.md`: Güncel demo kullanıcı ID ve şifre listesi

Yeni geliştirmelerde yalnızca ilgili dosya düzenlenmelidir. Büyük tek HTML
dosyası geliştirme kaynağı olarak kullanılmamalıdır.

## Tek HTML üretme

Node.js kuruluysa aşağıdaki komut çalıştırılabilir:

```bash
node tools/build-single-html.mjs
```

Oluşan tek dosya `dist/ETILISMART.html` konumunda yer alır.
