# Neon Blast

Reklamlar Android'de AdMob ile çalışır. Tarayıcıda test reklamı ve test satın alma
yalnızca `?dev=1` ile açılır; normal tarayıcı oturumunda sahte ödül verilmez.

`npm test` reklam yaşam döngüsü, günlük ödül, satın alma ve görev regresyonlarını
kontrol eder. `npm run test:browser` için Playwright ve Chrome gerekir; oyun,
armory ve mobil ekran akışlarını yerel sunucuda kontrol eder. Mağaza, kozmetikler,
günlük ödüller ve sandık açılışı altı dilde kontrol edilir; Armory her girişte mağazayı açar.

Mağaza çevirileri `www/game/store-translations.js` dosyasında tutulur. Her satırda
anahtarın ardından İngilizce, Türkçe, Fransızca, İspanyolca, Almanca ve İtalyanca
metin gelir. Kozmetik anahtarları gerçek envanter kimlikleriyle eşleşmelidir.

İmzalı AAB oluşturmak için `npx cap sync android` çalıştırın, ardından
`NEON_KEYSTORE_PATH` ve `NEON_PASSWORD_CANDIDATES` ortam değişkenlerini ayarlayıp
`python scripts/build-release.py` çalıştırın. Parola seçenekleri JSON dizi
biçiminde verilir; şifreler dosyalara kaydedilmez. Çıktılar `release/` altında,
derleme kayıtları `artifacts/` altındadır. Script imzayı ve keystore sertifikasını
doğrular; manifest sürümünü ve oyun dosyalarını AAB içinden kontrol eder.
