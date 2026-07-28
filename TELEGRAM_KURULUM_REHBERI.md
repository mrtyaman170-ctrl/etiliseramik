# ETİLİSMART Telegram Bildirimi Kurulumu

Bu sürüm yeni arıza oluşturulduğunda, arızanın fabrika ve bakım disiplinine göre
yalnızca aktif vardiyadaki ilgili bakım personellerine kişisel Telegram mesajı
gönderir. Vardiya dışında olan personele ve Telegram kullanıcı adı tanımlanmayan
hesaplara bildirim gönderilmez.

## Güvenlik uyarısı

Telegram bot tokenını `index.html`, `js/config.js`, GitHub deposu veya herhangi
bir tarayıcı dosyasına yazmayın. Token yalnızca Cloudflare Worker içindeki
şifreli `TELEGRAM_BOT_TOKEN` secret alanına girilmelidir.

Daha önce mesajda, ekranda veya herkese açık bir yerde görünen tokenı kullanmayın.
BotFather içinde `/revoke` komutuyla eski tokenı iptal edip `/token` komutuyla
yeni token oluşturun.

## 1. Telegram tarafında yapılacaklar

1. Telegram'da `@BotFather` sohbetini açın.
2. `/revoke` yazın, `@EtiliSmartBakimBot` botunu seçin ve eski tokenı iptal edin.
3. `/token` yazın, aynı botu seçin ve yeni token oluşturun.
4. Yeni tokenı yalnızca Cloudflare secret alanına girmek üzere saklayın.
5. Tokenı GitHub'a, HTML'e veya mesajlaşma ekranına yapıştırmayın.

## 2. Cloudflare Worker kurulumu

Paket içindeki `telegram-worker/src/index.js` güvenli bildirim servisidir.

1. Cloudflare hesabında **Workers & Pages** alanını açın.
2. `etilismart-telegram` adında yeni bir Worker oluşturun.
3. Worker koduna `telegram-worker/src/index.js` içeriğini yerleştirin.
4. **KV** alanında bir namespace oluşturun.
5. Worker ayarlarında KV binding adını tam olarak `TELEGRAM_LINKS` yapın.
6. Worker **Secrets** bölümüne şu üç değeri ekleyin:

   - `TELEGRAM_BOT_TOKEN`: BotFather'dan alınan yeni token
   - `TELEGRAM_WEBHOOK_SECRET`: sizin oluşturduğunuz uzun ve rastgele anahtar
   - `SETUP_KEY`: kurulum ekranında kullanacağınız farklı, uzun anahtar

7. Worker **Variables** bölümüne şunları ekleyin:

   - `ALLOWED_ORIGINS`: `https://mrtyaman170-ctrl.github.io`
   - `APP_URL`: `https://mrtyaman170-ctrl.github.io/etiliseramik/`

8. Worker'ı yayınlayın ve oluşan `https://...workers.dev` adresini kopyalayın.

## 3. Webhook bağlantısını kurma

Worker adresinin sonuna `/setup` ekleyip tarayıcıda açın:

`https://WORKER-ADRESINIZ.workers.dev/setup`

`SETUP_KEY` olarak belirlediğiniz kurulum anahtarını yazın ve
**Webhook Bağlantısını Kur** düğmesine basın. Başarılı mesajını gördükten sonra
bot gelen `/start` mesajlarını kaydedebilir.

Webhook kurulduktan sonra:

1. Bildirim alacak her personele `https://t.me/EtiliSmartBakimBot` bağlantısını
   gönderin.
2. Her personel Telegram'da bir kullanıcı adına sahip olmalı ve botta bir kez
   **Başlat** düğmesine basmalı veya `/start` yazmalıdır.
3. Personelin Telegram kullanıcı adını ETİLİSMART içinde
   **Personel Yönetimi → Düzenle → Telegram Kullanıcı Adı** alanına yazın.

Webhook kurulmadan önce **Başlat** düğmesine basan kullanıcılar, kurulum
tamamlandıktan sonra `/start` mesajını bir kez daha göndermelidir.

## 4. ETİLİSMART bağlantısı ve test

1. ETİLİSMART'a Yazılımcı veya Bakım Müdürü hesabıyla giriş yapın.
2. Sol menüden **Telegram Bildirimleri** sayfasını açın.
3. Worker HTTPS adresini girip **Bu Tarayıcıda Kaydet** düğmesine basın.
4. **Bağlantıyı Kontrol Et** düğmesine basın.
5. Test alıcısı olarak `Mert Yaman · @merty17` hesabını seçin.
6. **Test Mesajı Gönder** düğmesine basın.

Bu ilk kayıt yalnızca kullanılan tarayıcıda saklanır. Worker adresinin tüm
telefon ve bilgisayarlarda otomatik çalışması için adresi `js/config.js`
dosyasındaki `workerUrl` alanına yazın ve tek HTML dosyasını yeniden üretin.
İsterseniz Worker adresini ilettikten sonra bu son yerleştirmeyi yeni bir ZIP
sürümünde yaptırabilirsiniz.

## Bildirim içeriği

Mesajda kayıt numarası, fabrika, hat, bölüm, makine, arıza türü, konu, açıklama,
arızayı açan kişi, sistemin atadığı bakımcı, aktif vardiya ve üretimin durup
durmadığı bulunur. Üretimi durduran arızalar kırmızı uyarıyla gösterilir.

## Mevcut mimarinin sınırı

Bu ETİLİSMART sürümü verileri tarayıcının yerel depolamasında saklar. Bu nedenle
Telegram mesajı telefonlara ulaşır; ancak farklı cihazların aynı arıza kaydını
ortaklaşa güncellemesi için sonraki aşamada merkezi bir veritabanı ve gerçek
sunucu oturumu gerekir. Bu sürümde mesajın içinde gerekli arıza ayrıntılarının
tamamı özellikle gösterilir.
