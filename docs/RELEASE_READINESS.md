# Neon Blast — güncelleme hazırlığı

8 Ekim 2026. Bu dosya yerel çalışma alanındaki güncellemeyi anlatır. Değişiklikler
Google Play'e yüklenmedi. Kullanıcı isteğiyle imzalı `2.0.13 / 38` AAB üretildi;
çıktı `release/neonblast-2.0.13-v38.aab` içindedir. Önceki paketle aynı imzalama
sertifikası, 597 imzalı giriş, manifest ve 93 güncel oyun dosyası doğrulandı.
Altı test komutu geçti; gerçek Android cihaz kontrolleri aşağıda kalır. Mevcut uygulama kimliği,
oyuncu kayıt anahtarları, ürün kimlikleri, AdMob birimleri ve ödül değerleri korunur.
Yayıncı mevcut sürümde reklam ve IAP'nin çalıştığını doğruladı.

Son kozmetik/buton/ses güncellemesi `COSMETICS_AUDIO_UPDATE.md` içindedir:
perk renkleri tüm tasarımlarda korunur; beş gemi ve beş mermi eklendi; tüm menü
butonları dolu yüzeylidir; yeni organik ses seti Casino Audio kaynaklarından düzenlendi.

## Bu güncellemenin amacı

İlk turu anlaşılır kılmak, kısa dokunuşları kaçırmamak ve oyuncuya her turun
sonunda somut bir ilerleme hedefi vermek. Gelir için daha fazla zorunlu reklam
eklenmedi. Oyuncunun tekrar oynamak istemesi öncelikli.

| Alan | Yerel sonuç |
| --- | --- |
| İlk giriş | Yeni oyuncuda otomatik ödül popup'ı kaldırıldı; ödül düğmesinde işaret var |
| Kontroller | Altı dilde yardım, ilk nişanda kapanan ve dokunmayı engellemeyen ipucu |
| Kısa dokunuş | Touchstart ilk atışı hemen yapar; basılı tutma ve çoklu dokunma korunur |
| İlk geliştirme | En az bir hızlı ateş/çoklu atış seçeneği; üç seçenek benzersiz |
| Güç kombinasyonları | Uyumlu geliştirmeler etiketlenir; sonraki tekliflerde bazen bir kombinasyon seçeneği yer alır |
| Tur sonuçları | Aktif süre, düşman sayısı, yeni rekor veya bir sonraki hedef |
| Kayıtlar | v1 devam eder; sayaçlar korunur; bozuk kayıt açılışı bozmaz; bitmiş tur tekrar kaydedilmez |
| Günlük görev | Hayatta kalma süresine duraklatma ve reklam bekleme dahil edilmez |
| Ses | Açılış menüsü sessiz; yumuşak menü örnekleri; savaş/perk sesleri korunur |
| Tercihler | Ses, müzik, ses seviyesi, ekran sallanması ve joystick ayarları hatırlanır |
| Mağaza | Native'de Google Play yerel fiyatı; ürün hazır değilse satın alma düğmesi kapalı |
| Geri yükleme | Kalıcı haklar/kozmetikler geri gelir; coin veya sandık tekrar verilmez |
| Gizlilik | Mevcut yayınlanmış politika bağlantısı, UMP gerekli olduğunda reklam tercihleri girişi |
| Ölçüm | Kullanıcı tercihiyle Firebase; yerel/dev olayları üretim raporuna gönderilmez |

## Doğrulama

- `npm test`: reklam yaşam döngüsü, iki kez ödül alma, tüketilebilir işlem
  tekrarı, günlük görev, geçerli/bozuk eski kayıt, native yerel fiyatlar,
  coin üretmeden geri yükleme, ölçüm tercihi ve ilk geliştirme seçenekleri.
- `npm run test:browser`: altı dil, canlı çeviri, mağaza, ödüllü reklam
  simülasyonu, pause/revive, iki kat coin, yardım, kalıcı ses tercihi ve ilk nişan.
- `npm run test:menus`: 15 ekran görüntüsü; altı dil/dört ekran boyutunda
  menü taşması, kesilen metinler, perk geometrisi ve gameplay stil izolasyonu.
- `npm run test:audio`: yerel örneklerin decode edilmesi, sessiz açılış,
  oynatma/mute, çark/sandık ve savaş/perk ses izolasyonu.
- `npm run test:runtime`: 320×568, 390×844 ve 844×390 dokunmatik ekranlarda
  çevrimdışı oyun, altı dilde seçenekler, kısa dokunuş, eski oyuncu verileri,
  turdan devam etme, sayaçlar ve sonuçlar. Dokuz boss ve üç miniboss için
  başlatma ve 90 kare update/draw kontrolü; tüm boss fazlarının testi değildir.

Tarayıcı testleri Playwright ve Chrome ister. Testlerde dış HTTPS trafiği
engellenir; canlı lider tablosuna skor, mağazaya satın alma veya reklam ağına
istek gönderilmez. Görsel sonuçlar `artifacts/menus/` ve `artifacts/readiness/`.
Tarayıcı testleri Android cihaz performansı ve gerçek faturalama testi yerine geçmez.

## Yayına çıkmadan tamamlanacak işler

1. Mevcut Play sürümünün üzerine güncelleme kurulumu: coin, kozmetik, VIP,
   satın alma geçmişi ve kayıtlı tur kontrolü. Sonra uçak modunda oyunu aç.
2. Gerçek düşük/orta seviye telefonda en az 10 dakikalık oyun; çoklu dokunma,
   joystick, ekran döndürme, arka plana alıp geri dönme ve ileri seviye bosslar.
3. Google Play test hesabıyla her ürünün yerel fiyatını, satın alma iptalini,
   pending durumunu, bitmiş işlemi ve yeniden kurulumdan sonra geri yüklemeyi
   kontrol et. Bu checkout'taki değişiklikler henüz cihazda doğrulanmadı.
4. UMP'de gerektiğinde form, reddedilen tercihler ve sonradan değiştirme;
   ödüllü reklamı kapatma, ödül sonrası tekrar tıklama ve hazır olmayan reklam.
5. Firebase'de tercihi açan bir test cihazı için olayları doğrula; localhost
   verisinin gelmediğini ve tercihi kapatınca gönderimin durduğunu kontrol et.
   Gizlilik politikası/Data safety açıklaması yeni isteğe bağlı kullanım
   ölçümünü açıklamalı; mevcut politika sayfasının gömülü içeriği burada doğrulanamadı.
6. Bu güncelleme için Gradle `38 / 2.0.13` olarak ayarlandı; önceki yerel
   AAB `37 / 2.0.12` idi. Play Console'daki en yüksek kod hesap üzerinden
   doğrulanmadı; paket yüklenirken sürüm uygunluğu kontrol edilmelidir.
7. Android build istendiğinde DEVELOPMENT.md'deki imzalı build akışını kullan;
   `scripts/verify-release.py` ile AAB içindeki web dosyalarını doğrula.
8. Önce test kanalında dene, ardından kademeli üretim güncellemesi yap. Yeni
   çökme, ANR, satın alma/ödül hatası varsa dağıtımı durdur.

Bağlı Android cihaz bulunmadı; Play Console, AdMob ve Firebase hesaplarında
bu turda değişiklik yapılmadı. Bu nedenle belge tam üretim onayı değildir.

## Gelir ve oyuncu testi

Mağaza metinlerinin Türkçe/İngilizce taslağı `store-listing.json` içinde.
Oyuncu yorumu gibi sunulan doğrulanmamış alıntılar kullanılmaz. Trafik testinde
ilk kareden gerçek oynanışı göster: sabit çekirdek, her yönden gelen düşmanlar,
geliştirme seçimi ve güç kombinasyonu. Menü görüntüsünü reklamın ana sahnesi yapma.

İlk küçük oyuncu testinde şu sorulara bak:

- Yardımı okumadan ilk atış yapılabiliyor mu? İlk geliştirme ekranına ulaşan
  oyuncu yeni gücün etkisini anlayabiliyor mu?
- İlk üç turda farklı güçleri deniyor ve sonucu gördükten sonra tekrar oynuyor mu?
- Ölümler anlaşılır mı? Çekirdek ve tehditler efekt yoğunluğunda okunuyor mu?
- Ödüllü reklamı oyuncu kendi hedefi için mi seçiyor? Mağaza teklifinin
  sağladığı haklar fiyat gösterilmeden önce anlaşılır mı?

Eşik uydurmak yerine ilk test kohortunu karşılaştırma noktası olarak kullan.
D1/D7, tur süresi, tekrar oynama ve reklam/satın alma sonuçlarını ülke, uygulama
sürümü ve edinme kaynağına göre karşılaştır. Bütçeyi artırmadan önce oyuncu başına
gelir ile edinme maliyetini ve geri dönüş oranını birlikte değerlendir.

Firebase olayları: `run_start`, `run_resume`, `run_end`, `aim_learned`,
`perk_picked`, `store_open`, `purchase_begin`, `purchase_granted`,
`ad_request`, `ad_complete`, `ad_cancel`. `run_resume` yeni tur sayılmaz.
`purchase_granted` bir akış olayıdır; para tutarı değildir. Gerçek gelir için
Google Play ve AdMob raporlarını kullan. Geri dönüş ölçümü yalnızca onay veren
oyuncuları kapsar; bu örneklem tüm oyuncuları temsil etmeyebilir.

## Sonraki altyapı işi

IAP onayı mevcut CdvPurchase/Google Play istemci akışıyla çalışır. Güvenilir
sunucu doğrulaması/kalıcı sahiplik yedeği bu projede kurulmamış. Canlı lider
tablosu da istemci skorlarını doğrudan Firestore'a yazıyor; sunucuda oyun
sonucu doğrulaması yok. Hile dayanıklılığı için ayrı sunucu işi gerekir;
bu checkout bunu varmış gibi göstermiyor ve canlı Firestore kuralları değiştirilmedi.

Kaynaklar: [Google Play satın alma güvenliği](https://developer.android.com/google/play/billing/security),
[UMP gizlilik seçenekleri](https://developers.google.com/admob/android/privacy),
[Firebase Analytics API](https://firebase.google.com/docs/reference/js/analytics).
