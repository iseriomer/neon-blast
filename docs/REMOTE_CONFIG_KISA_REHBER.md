# Oyun ayarlarını kolayca değiştirme

Firebase'deki Version 1 ekranı ilk JSON'un yayınlandığını gösteriyor.
Yeni şablon ayarları gruplara ve tek tek **Number** alanlarına ayırır.

1. Remote Config'te aynı **Import JSON** alanından
   `docs/firebase-remote-config.template.json` dosyasını tekrar yükle.
2. **Publish changes** ile yayınla.
3. İlgili grubu aç, satırın **kalem** simgesine bas, **Default value** sayısını
   değiştir, kaydet ve tekrar **Publish changes** yap.

## İlk denenecek ayarlar

| Grup | Parametre | Şu an | Ne işe yarıyor? |
|---|---|---:|---|
| 01 - Level 1 | `level_1_miniboss_1_evolution` | 6 | İlk minibossun zamanı; 7 yaparsan daha geç gelir |
| 01 - Level 1 | `level_1_boss_evolution` | 9 | Ana boss zamanı; 11 yaparsan daha fazla build seçimi olur |
| 01 - Level 1 | `level_1_boss_hp_multiplier` | 0.85 | Boss canı; 0.7 yaparsan daha kolay olur |
| 02 - Level 2 | `level_2_miniboss_1_evolution` | 9 | İkinci level'ın ilk miniboss zamanı |
| 02 - Level 2 | `level_2_boss_evolution` | 15 | İkinci level'ın ana boss zamanı |
| 11 - Dusmanlar | `enemy_speedster_hp` | 0.5 | Speedster temel canı |
| 11 - Dusmanlar | `enemy_speedster_speed` | 1.9 | Speedster hızı; küçültürsen yavaşlar |
| 14 - Spawn ve zorluk | `scaling_spawn_base_ms` | 1100 | Düşman geliş aralığı; 1400 yaparsan daha seyrek gelir |
| 13 - XP ve Evolution | `xp_initial_step` | 600 | İlk perk için gereken XP; 450 yaparsan ilk build seçimi daha çabuk gelir |

Önce bir iki değeri değiştirip yeni koşu dene. Miniboss zamanı ana boss zamanından
küçük olmalı; birden çok minibossun zamanı kendi içinde artan sırada olmalı.
Ondalık sayıları **noktayla** yaz: `0.5`.

`game_balance_v1` eski JSON uyumluluğu içindir. Günlük ayar değişikliklerini
gruplardaki sayı alanlarından yap; yeni oyun kodu bu alanlara öncelik verir.
Satırların açıklamalarında ayarın anlamı Türkçe yazıyor.

**Oyunun güncel kodunu da çalıştırmak gerekiyor.** Yalnız Firebase şablonunu
güncellemek eski uygulamaya ayrı sayı alanlarını okuma özelliği eklemez.
Web'de güncel kodla sayfayı yenile; Android'de bu kodun bulunduğu yeni paketi kur.
Sonrasında sayıları değiştirirken yeniden uygulama paketi çıkarmak gerekmez.

Production'da yeni değerler en erken bir sonraki Firebase fetch'te alınır
(minimum aralık 1 saat). Yerel testte `?dev=1` ile yenileme aralığı sıfırdır.
Alınan ayarlar bir sonraki **yeni koşuda** uygulanır; kayıtlı koşu kendi ayarlarını
korur. **Fetch %0** yayın başarısız demek değildir; oyunun ayarı aldığını tek
başına doğrulamaz. Geliştirme konsolunda `GameBalance.status` ile kaynağı,
`GameBalance.snapshot()` ile etkin değerleri görebilirsin.
