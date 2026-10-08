# Neon Blast

Yayın hazırlığı ve dışarıda kalan gerçek cihaz kontrolleri `docs/RELEASE_READINESS.md`
içindedir; TR/EN Play metinleri `docs/store-listing.json` içinde taslaktır.
`npm run test:runtime` çevrimdışı telefon akışını, kayıtlı oyuncu verilerini,
kısa dokunuşları ve boss başlatma/güncellemesini kontrol eder.
Yeni oyunculara günlük ödül otomatik açılmaz; ödül düğmesinde işaret gösterilir.
`www/game/experience.js` ilk nişan ipucunu ve kalıcı ayarları yönetir.
İsteğe bağlı Firebase olayları `www/game/telemetry.js` içindedir; localhost/dev
verileri gönderilmez. Native WebView'in localhost adresi dev sayılmaz.

Cosmetic energy colour always follows playerStats.color (perks), including live
equip changes and the batched projectile path. Cosmetic colours are display
palettes for the hangar. New procedural designs are shared by previews and the
game renderer via `www/game/cosmetic-visuals.js`; geometry never changes hitboxes.
`npm run test:cosmetics` checks all 15 cores/ships and 13 projectiles against six
perk colours, both drawing paths, new chest availability and button backgrounds.
`www/button-surfaces.css` adds surfaces to menu actions without changing layout.
Armory previews redraw at their displayed CSS size with capped device-pixel
density and uniform scaling. `test:cosmetics` also checks roundness, centring,
card bounds and animated clipping at five viewport sizes/densities, including
live rotation without reloading. Hangar, card, reveal and crate canvas sizing
is handled by `ArmoryUI.preparePreviewCanvas`.

Menu audio uses locally edited Kenney Casino Audio (CC0), with source and
license in `www/audio/ui/`. `www/game/menu-audio.js` controls mix levels, cached
decoding, a soft low-pass mix, voice limits and the existing SFX switch. Eight
short organic WAV cues replace the previous switch/click set; success feedback
replaces simultaneous generic clicks. `scripts/build-menu-audio.cjs` recreates
the cues from the extracted pack, with browser offline audio processing. Menu
text animations are silent, including startup. Combat/perk synthesis and
music tracks remain unchanged. `npm run test:audio` requires Playwright and Chrome;
it checks offline decoding, navigation, daily claims, wheel/crate cues, muting
and isolation from gameplay/perk sounds.

Reklamlar Android'de AdMob ile çalışır. Tarayıcıda test reklamı ve test satın alma
yalnızca `?dev=1` ile açılır; normal tarayıcı oturumunda sahte ödül verilmez.

`npm test` reklam yaşam döngüsü, günlük ödül, satın alma ve görev regresyonlarını
kontrol eder. `npm run test:browser` için Playwright ve Chrome gerekir; oyun,
armory ve mobil ekran akışlarını yerel sunucuda kontrol eder. Mağaza, kozmetikler,
günlük ödüller ve sandık açılışı altı dilde kontrol edilir; Armory her girişte mağazayı açar.

Mağaza çevirileri `www/game/store-translations.js` dosyasında tutulur. Her satırda
anahtarın ardından İngilizce, Türkçe, Fransızca, İspanyolca, Almanca ve İtalyanca
metin gelir. Kozmetik anahtarları gerçek envanter kimlikleriyle eşleşmelidir.

Reklamlar menüde, oyun başında ve gösterim sonrasında önceden hazırlanır.
Geçiş reklamı için üç uygun oyun gerekir; 45 saniyeden kısa aktif oyunlar sayılmaz.
Tam ekran reklamlar arasında en az 120 saniye beklenir. Hazır olmayan geçiş
reklamı sonuç ekranını bekletmez. Eşikler AdManager.CONFIG içindedir.
Kullanıcı açıkça istemedikçe yeni Android build oluşturulmaz.

Sade menü tasarımı `www/menus.css` içinde yalnızca menü ekranlarına uygulanır;
gameplay canvas ve HUD stilleri değişmez. Menü metinleri ve yerel en iyi skor
sunumu `www/game/menus.js` içindedir. Oswald ve Rajdhani fontları çevrimdışı
çalışacak şekilde `www/fonts/` içine, OFL lisanslarıyla birlikte eklenmiştir.
Kısa ekranlar `www/menu-viewport.css` ile telefon yüksekliğine sığar; perk seçimi,
sandık, sonuç, revive, duraklatma ve günlük ödül ekranlarında kaydırma gerekmez.
Armory ve uzun lider tablosu kaydırılabilir. Game over ekranında dönem filtreleri
ve lider tablosu görünür; yalnızca sıralama listesi kendi içinde kayar.
Yatay telefonlarda iki sütun kullanılır.
`npm run test:menus` gerçek menülerden 15 telefon görüntüsünü `artifacts/menus/`
altına kaydeder; altı dil/dört ekran boyutunda yatay/dikey taşmayı ve kesilen
buton/metinleri, en uzun perk açıklamalarını ve tüm sandık içeriklerini kontrol eder.
Perk kartlarının şifre çözme boyunca yatay konum ve genişliğinin sabit kaldığı
animasyon kareleri üzerinden ölçülür.
Kilitli tasarımdan mağazaya geçişi ve menü stillerinin gameplay HUD/canvas
stillerini değiştirmediğini de doğrular.

İmzalı AAB oluşturmak için `npx cap sync android` çalıştırın, ardından
`NEON_KEYSTORE_PATH` ve `NEON_PASSWORD_CANDIDATES` ortam değişkenlerini ayarlayıp
`python scripts/build-release.py` çalıştırın. Parola seçenekleri JSON dizi
biçiminde verilir; şifreler dosyalara kaydedilmez. Çıktılar `release/` altında,
derleme kayıtları `artifacts/` altındadır. Script imzayı ve keystore sertifikasını
doğrular; manifest sürümünü ve oyun dosyalarını AAB içinden kontrol eder.
