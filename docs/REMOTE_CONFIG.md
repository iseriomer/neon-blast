# Firebase üzerinden oyun dengesi

24 Ekim denge güncellemesi: yeni istemci uzaktan ayarları yalnızca sunucudaki
`balance_revision` alanı `2` olduğunda uygular. Güncel şablon bu alanı içerir;
önceki yayın ve eski denge önbelleği yeni başlangıç ayarlarını geri alamaz.
Eşleşen şablon yayınlanana kadar yeni koşular yerel dengeyi kullanır.
Devam eden kayıtlar kendi denge görüntüsünü korur; yeni ayarlar tekrar denemede uygulanır.

Proje: `neon-blast-8a945`. Oyun Firebase Web SDK 12.6.0 kullanıyor; leaderboard
ve Remote Config aynı Firebase uygulamasını paylaşıyor, ayrı yükleniyor.

## Kolay kullanım: ayrı sayı alanları

Güncel `docs/firebase-remote-config.template.json`, ayarları 18 Firebase grubunda
tek tek **Number** alanları olarak oluşturur. Hızlı kullanım ve örnekler:
`docs/REMOTE_CONFIG_KISA_REHBER.md`. Örneğin `enemy_speedster_hp`,
`level_1_miniboss_1_evolution`, `level_1_boss_evolution`.
Her satırın açıklaması Türkçedir. Sayı alanları varsa eski JSON içindeki aynı
değerin önüne geçer. Yeni grup desteği için güncel oyun kodu gerekir.

## İlk kurulum

**Dosya yükleyerek içe aktarma için:** `docs/firebase-remote-config.template.json`
dosyasını seç. Bu dosya Firebase'in `parameters → game_balance_v1 → defaultValue`
şemasını içerir. `remote-config.defaults.json` ham oyun ayarlarıdır; Firebase'in
**Import JSON / Dosya içe aktar** alanına yüklenmez. Bu alana ham ayar dosyası
yüklenirse **Invalid JSON file / RemoteConfig JSON specification** hatası çıkar.

**Parametreyi elle oluşturmak için:** aşağıdaki adımları kullan.

1. [Firebase Remote Config konsolunu](https://console.firebase.google.com/project/neon-blast-8a945/config)
   aç ve `game_balance_v1` isimli parametre oluştur. Veri tipi **JSON**.
2. `docs/remote-config.defaults.json` içeriğini varsayılan değer olarak yapıştır.
3. **Publish changes / Değişiklikleri yayınla** ile yayınla.

Bu elle JSON oluşturma yolu eski format desteğidir. Günlük düzenleme için
gruplanmış şablonu içe aktar ve sayı alanlarını kullan.

`docs/firebase-remote-config.template.json` aynı parametrenin Firebase template
formatıdır; ayrıca düzenlenebilir sayı grupları içerir. Konsolda template import kullanılıyorsa mevcut template'i önce indir;
tam template import diğer parametreleri değiştirebilir. Tek parametre oluşturmak
veya aşağıdaki yayın aracını kullanmak mevcut ayarları korur.

## Neler değiştirilebilir?

| Bölüm | Ayarlar |
|---|---|
| `levels` | 10 level'ın ana boss Evolution'ı, miniboss listesi/zamanı/türü/HP çarpanı, zorluk eğrisi, boss HP çarpanı, kazanma altını |
| `enemies` | Her düşman türünün temel canı, hızı, yarıçapı, XP/skoru |
| `player` | Başlangıç atış sayısı/hızı/boyutu/delmesi/aralığı/saçılması, kalkan, kritik ihtimali/çarpanı, hasar ve boss hasarı |
| `progression` | İlk Evolution XP eşiği, sonraki eşiklerin büyüme çarpanı ve artışı |
| `scaling` | Spawn aralığı ve minimumu; zorluğa bağlı HP, hız ve miniboss HP ölçeklemesi |
| `spawning` | Düşman türlerinin zorluk eşiği ve kümülatif seçilme olasılığı; healer/spawner adedi sınırı |
| `perks` | Rapid Fire/Machine Gun atış çarpanları, Sniper hız/atış çarpanları, freeze süresi, knockback, orbital sayısı, mermi boyutu, patlama yarıçapı ve build uyumlu teklif olasılığı |
| `meta`, `metaCostGrowth` | Kalıcı yükseltmelerin kademe etkisi, başlangıç fiyatı ve fiyat büyümesi |
| `miniboss` | İlk dalga zamanı, dalga aralıkları, uyarı süresi, aktif birlik eşiği, birlik minimum HP'si ve birlikler varken alınan hasar çarpanı |

`levels` dizisi her zaman 10 öğeli olmalı; sırası ve ana boss kimlikleri sabittir.
Miniboss ID'leri: Sentinel `101`, Warden `102`, Harvester `103`.
Miniboss Evolution'ları artan sırada ve ana boss'tan önce olmalı.
Eğriler `[Evolution, zorluk]` çiftlerinden oluşur, Evolution 1'de başlar,
artan Evolution değerleri kullanır. Ara değerler doğrusal hesaplanır.

`spawning` olasılıkları HEALER → SUPERTANK → SPAWNER → SPLITTER → TANK → DASHER
→ SPEEDSTER sırasıyla kümülatiftir; azalmamalıdır. Kalan olasılık BASIC'tir.
Eşik karşılaştırması `difficulty > threshold` şeklindedir.
Süreler `Ms` isimlerinde milisaniye, miniboss/freeze sürelerinde 60 FPS referans
frame birimidir. `maxNodes` yeni dalga başlatma eşiğidir; bir dalga bu eşiği aşabilir.

Şu an tüm perklerin sayısal değerleri, bossların özel saldırı kodları, kozmetik
envanteri, IAP ürünleri/fiyatları, reklam ve günlük ödül sistemi bu parametrede
değildir. Bunlar gerektiğinde sürümlü şemaya ayrıca bağlanabilir.

## Küçük bir değişiklik örneği

Parametre tam varsayılan JSON'u veya kısmi bir obje olabilir. Eksik alanlar
**yerel varsayılanlardan** tamamlanır; önceki uzak değerlerden tamamlanmaz.

```json
{
  "version": 1,
  "enemies": { "SPEEDSTER": { "hp": 0.5 } },
  "progression": { "initialStep": 500, "stepGrowth": 1.08, "stepAddition": 150 },
  "miniboss": { "telegraphFrames": 90, "waveEarly": 400 }
}
```

Bir level değiştirmek için tam `levels` dizisini kullan. Hazır dosyadaki
`levels[0].minibosses[0].atEvolution` ilk miniboss zamanıdır.
Rapid Fire, Giant Bullet ve orbital açıklamaları etkin sayısal değerleri gösterir.

## Ne zaman uygulanır?

- Açılışta son geçerli yerel cache hemen okunur, Firebase arka planda yüklenir.
- Production fetch minimum aralığı **1 saat**, `?dev=1` ile **0**; timeout 5 saniye.
- Firebase'den gelen değerler sonraki **yeni koşuda** uygulanır. Açık koşu ve menü
  değerleri fetch sırasında değiştirilmez. İlk koşu fetch'ten önce başlatılırsa
  mevcut cache/yerel varsayılanlar kullanılır. Kalıcı yükseltme ayarları da aynı
  koşu sınırında etkinleşir.
- Kayıtlı koşu kendi denge snapshot'ıyla devam eder; yeni config sonradan
  indirilmiş olsa bile boss zamanı, düşmanlar, XP ve perk matematiği değişmez.
- Eski snapshot'sız kayıtlar yerel varsayılanlarla devam eder; ilk iki level'ın
  eski aktif boss/miniboss kimliği korunur.
- Ağ/CDN/IndexedDB sorunu oyunu engellemez. Hatalı JSON, bilinmeyen alanlar,
  negatif/geçersiz sayılar ve tutarsız encounter takvimi reddedilir; son geçerli
  değerler korunur. Sayısal sınırlar `www/game/game-balance.js` içindedir.
- Firebase default kaynağı, daha önce doğrulanmış cache'i silmez. Geri dönmek için
  varsayılan dosyayı **uzak değer** olarak yayınla. Konsol version history'den
  önceki uzak template'e de dönülebilir.

Dev konsolunda `GameBalance.status`, `GameBalance.snapshot()` ve SDK yüklendiyse
`await GameBalance.refresh()` durum incelemek için kullanılabilir.
`GameBalance.stage({...})` yerel deneme ayarını cache'e yazar; sonraki yeni koşuda
etkinleşir, Firebase'e yazmaz. Cache temizliği:
`localStorage.removeItem('neonblast_balance_v1')`, sonra sayfayı yenile.

## Codex / CLI ile yayınlama

Yerel doğrulama ve güncel template üretme (Firebase hesabı gerekmez):

```powershell
npm run config:export
node scripts/remote-config.cjs --input docs/remote-config.defaults.json
```

Yayın için bu projede Remote Config güncelleme yetkili bir Google oturumu gerekir:
`gcloud auth login` veya `FIREBASE_ACCESS_TOKEN` ortam değişkeninde kısa ömürlü
OAuth access token. Firebase Web API key yönetici yetkisi vermez.
Tokenı sohbet veya kaynak dosyalarına yazma; mevcut yerel oturumu kullan.

```powershell
node scripts/remote-config.cjs --input docs/remote-config.defaults.json --validate-server
node scripts/remote-config.cjs --input docs/remote-config.defaults.json --publish
```

Araç mevcut template'i GET ile okur, yalnız `game_balance_v1` varsayılan değerini
ve katalogda tanımlı sayı parametrelerini günceller. Yönetilmeyen diğer
parametreleri/grupları/koşulları ve güncellenen parametrelerin koşullu değerlerini
korur. Sayıları uygun gruba taşırken aynı anahtarı iki yerde oluşturmaz. Yerel şema ve Firebase validate-only kontrolünden sonra
GET'ten alınan ETag ile yayınlar; eşzamanlı değişiklikte zorla üzerine yazmaz.
`--project` ile başka proje seçilebilir; varsayılan `neon-blast-8a945`.
Koşullu deneylerde hedef grupta koşullu JSON değeri varsayılanı geçersiz kılabilir.

CLI üzerinden canlı publish yapılmadı: geliştirme ortamında yönetici oturumu yok.
Kullanıcı ilk JSON şablonunu konsoldan Version 1 olarak yayınladı; sayı gruplarını
eklemek için güncel şablon tekrar içe aktarılmalı.
Yeni JS dosyalarının mevcut Android uygulamasına girmesi için uygulama paketinin
güncellenmesi gerekir; bu sürüm kurulduktan sonra sayısal Remote Config değişikliği
için tekrar APK yayınlamak gerekmez.

## Doğrulama

`npm run test:balance`: şema/cache/snapshot birim testleri ve mock Firebase SDK ile
gerçek tarayıcıda yükleme, koşu dondurma, kayıt/devam, perk/XP/düşman davranışı,
hatalı config ve tamamen engellenmiş uzak bağlantı kontrolü.
`npm run test:levels`: 10 level ve mevcut ödül/kayıt/build akışı.

Referanslar: [Firebase Web kurulumu](https://firebase.google.com/docs/remote-config/web/get-started),
[template yayınlama](https://firebase.google.com/docs/remote-config/templates/client),
[REST update/ETag](https://firebase.google.com/docs/reference/remote-config/rest/v1/projects/updateRemoteConfig).
