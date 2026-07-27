# ETİLİSMART Kullanıcı Hesapları

Bu liste demo sürümündeki yerel kullanıcı hesaplarını gösterir. Veritabanı ve
sunucu tarafı kimlik doğrulama eklenene kadar şifreler tarayıcı tarafında
tutulur; gerçek kullanıma geçmeden önce güvenli kimlik doğrulama kurulmalıdır.

## Yönetim hesapları

| Kullanıcı ID | Şifre | Kullanıcı | Rol | Yetki alanı |
|---|---:|---|---|---|
| 1111 | 1111 | Genel Yönetici | Genel Müdür | Tüm fabrikalar, izleme ve raporlama |
| 3901 | 3901 | 1. Fabrika Üretim Müdürü | Üretim Müdürü | Yalnız 1. Fabrika, tüm bölümler |
| 3902 | 3902 | 2. Fabrika Üretim Müdürü | Üretim Müdürü | Yalnız 2. Fabrika A ve B Blok, tüm bölümler |
| 4001 | 7318 | Hamit Uysal | Bakım Müdürü | Tüm fabrikalar, bakım yönetimi |
| 9001 | 9001 | Mert Yaman | Yazılımcı | Tüm fabrikalar ve sistemdeki tüm işlem yetkileri |

`2222` ve `3333` numaralı eski fabrika yöneticisi hesapları kaldırılmıştır.

## Bakım formenleri

| Kullanıcı ID | Şifre | Kullanıcı | Rol | Fabrika / ekip |
|---|---:|---|---|---|
| 4101 | 2846 | Halil İbrahim Utku | Elektrik Bakım Formeni | 1. Fabrika / Elektrik Bakım |
| 4102 | 9573 | Adem Keleş | Elektrik Bakım Formeni | 1. Fabrika / Elektrik Bakım |
| 4103 | 6159 | Mert Yaman | Elektrik Bakım Formeni | 1. Fabrika / Elektrik Bakım |
| 4201 | 3487 | Necip Gökkaya | Mekanik Bakım Formeni | 1. Fabrika / Mekanik Bakım |
| 4202 | 8294 | Serkan Çeviren | Mekanik Bakım Formeni | 1. Fabrika / Mekanik Bakım |
| 4301 | 5726 | Kemal Ayrancı | Bakım Formeni | 2. Fabrika A ve B Blok / Tüm Bakım |

## Bölüm formenleri

| Kullanıcı ID | Şifre | Kullanıcı | Fabrika | Bölüm |
|---|---:|---|---|---|
| 4401 | 1801 | 1. Fabrika Masse Bölümü Formeni | 1. Fabrika | Masse Bölümü |
| 4402 | 1802 | 1. Fabrika Pres Bölümü Formeni | 1. Fabrika | Pres Bölümü |
| 4403 | 1803 | 1. Fabrika Sır Bantları Formeni | 1. Fabrika | Sır Bantları |
| 4404 | 1804 | 1. Fabrika Fırınlar Formeni | 1. Fabrika | Fırınlar |
| 4405 | 1805 | 1. Fabrika Polisaj Formeni | 1. Fabrika | Polisaj |
| 4406 | 1806 | 1. Fabrika Paketleme Formeni | 1. Fabrika | Paketleme |
| 4501 | 2801 | 2. Fabrika Masse Bölümü Formeni | 2. Fabrika A ve B Blok | Masse Bölümü |
| 4502 | 2802 | 2. Fabrika Pres Bölümü Formeni | 2. Fabrika A ve B Blok | Pres Bölümü |
| 4503 | 2803 | 2. Fabrika Sır Bantları Formeni | 2. Fabrika A ve B Blok | Sır Bantları |
| 4504 | 2804 | 2. Fabrika Fırınlar Formeni | 2. Fabrika A ve B Blok | Fırınlar |
| 4505 | 2805 | 2. Fabrika Polisaj Formeni | 2. Fabrika A ve B Blok | Polisaj |
| 4506 | 2806 | 2. Fabrika Paketleme Formeni | 2. Fabrika A ve B Blok | Paketleme |

## 1. Fabrika bakım personeli

| Kullanıcı ID | Şifre | Kullanıcı | Ekip |
|---|---:|---|---|
| 5101 | 1937 | Sercan Şahin | Elektrik Bakım |
| 5102 | 8462 | Onur Arga | Elektrik Bakım |
| 5103 | 5271 | Mehmet Çağlayan | Elektrik Bakım |
| 5104 | 3648 | Ali Sezer | Elektrik Bakım |
| 5201 | 9185 | Üzeyir Toy | Mekanik Bakım |
| 5202 | 2469 | Recep Kocabıyık | Mekanik Bakım |

## 2. Fabrika bakım personeli

| Kullanıcı ID | Şifre | Kullanıcı | Ekip |
|---|---:|---|---|
| 6101 | 7834 | Ahmet Gürer | Elektrik Bakım |
| 6102 | 4592 | Tayfun Akıncı | Elektrik Bakım |
| 6103 | 1268 | Rasim Çelik | Elektrik Bakım |
| 6104 | 8951 | Arda Uysal | Elektrik Bakım |
| 6105 | 3176 | Buğra Varol | Elektrik Bakım |
| 6106 | 6843 | Mustafa Çağrı Tekin | Elektrik Bakım |
| 6201 | 5417 | Özgür Öz | Mekanik Bakım |
| 6202 | 9724 | Rasim Genel | Mekanik Bakım |
| 6203 | 2385 | Ramazan Aykut | Mekanik Bakım |
| 6204 | 7561 | Alper Boztepe | Mekanik Bakım |
| 6205 | 4139 | Alperen Durmaz | Mekanik Bakım |
| 6206 | 8672 | Turgay Songur | Mekanik Bakım |
| 6207 | 3294 | Ozan Kinet | Mekanik Bakım |
| 6208 | 5948 | Umut Tokgöz | Mekanik Bakım |

## Operatör hesapları

| Kullanıcı ID | Şifre | Kullanıcı | Fabrika / bölüm |
|---|---:|---|---|
| 6666 | 6666 | 1. Fabrika Operatörü | 1. Fabrika / Pres Bölümü |
| 7777 | 7777 | 2. Fabrika Operatörü | 2. Fabrika A ve B Blok / Pres Bölümü |
