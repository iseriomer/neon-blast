# Kozmetik, buton ve menü sesi güncellemesi

8 Ekim 2026. Değişiklikler imzalı Android AAB `2.0.13 / 38` içine alındı;
Google Play'e yükleme yapılmadı. Paket ve test durumu `RELEASE_READINESS.md` içindedir.

## Renk kuralı

Perkler oyun içindeki enerji rengini belirler. Gemi kuşanmak artık
`playerStats.color` değerini değiştirmez; mermi kuşanmak uçuş hâlindeki
mermilerin rengini değiştirmez. Gövde, motor, enerji hattı, mermi ve izlerde
kozmetiğin sabit rengi yerine perk rengi kullanılır. Beyaz sıcak merkezler ve
koyu gövde parçaları detay olarak kalır. Lazer perk'i seçilince hepsi kırmızıdır.
Hangar önizlemesi kozmetiğin tanıtım rengini kullanır.

Önizleme canvas'ları görünen CSS boyutuna ve ekran piksel yoğunluğuna göre
yeniden çizilir; gemi ve mermilere tek oranla ölçek uygulanır. Hangar, kart,
sandık ve kazanılan tasarım önizlemeleri ekran değişimine uyum sağlar.
320, 390, 768, 844 ve 1440 genişliklerde, 1–3 cihaz piksel yoğunluğu ve canlı
ekran döndürmede yuvarlaklık, merkezleme, kart sınırları ve kırpılma kontrol edildi.

Eski premium fırtına ve anka mermileri de toplu çizimde kendilerine ait geometriyi
kullanır. Yeni gemiler nişan yönüne döner. Şekil/animasyonlar kozmetiktir;
çarpışma yarıçapları, hız, hasar ve mevcut oynanış sesleri değişmez.

| Yeni gemi | Yeni mermi | Nadirlik |
| --- | --- | --- |
| Yırtıcı | Kuyruklu Yıldız | Nadir |
| Manta | Çift Sarmal | Destansı |
| Seraf | Jilet Disk | Destansı |
| Tutulma | Nova | Efsanevi |
| Hükümdar | İyon Mızrağı | Efsanevi |

On yeni tasarım altı dilde ad/açıklama içerir ve mevcut nadirlik sandıklarından
çıkabilir. Mevcut kozmetik kimlikleri ve kayıt anahtarları korunur; yeni IAP
ürünü eklenmez. Otomatik olarak oyunculara ücretsiz açılmazlar.

## Butonlar

Mevcut yerleşim ve tipografi korunarak menü butonlarına dolu arka plan, kenar,
basılı/hover/focus ve devre dışı durumları eklendi. Reklam aksiyonları sıcak
altın tonunda, ana eylemler pembe tonunda, ikincil eylemler koyu yüzeylidir.
Skor kaydetme, sandık, dil, sekme ve kapatma butonları da kapsanır.

## Menü sesi

Önceki setin yerine sekiz kısa organik ses kullanılır: basma, seçim, açma,
geri dönme, kuşanma, ödül, sandık/çark başlangıcı ve sessiz çark tıkı.
Kaynak [Kenney Casino Audio](https://kenney.nl/assets/casino-audio), CC0;
lisans ve düzenleme ayrıntıları `www/audio/ui/CREDITS.md` içinde.
Sesler indirilip yerel WAV dosyalarına dönüştürüldü; başlangıç sessizdir,
aynı eylemin genel tıklaması ve başarı sesi üst üste çalmaz. SFX kapatılınca
aktif sesler durur. Müzik ve savaş/perk sentezi korunur.
Oyuna giriş animasyonunun gecikmeli level-up patlaması kaldırıldı; sonuç
ekranındaki çift coin onayı yeni menü ödül sesini kullanır.

## Doğrulama

- `npm test`: 24 mevcut kayıt, ödül/reklam ve satın alma regresyonu.
- `npm run test:cosmetics`: 15 gemi/çekirdek ve 13 mermi; altı perk rengi;
  tekil/toplu çizimde gerçek piksel renkleri; kuşanma sırasında rengin ve
  coin'in korunması; on yeni tasarımın sandıktan kazanılması; buton yüzeyleri.
- `npm run test:menus`: 15 ekran görüntüsü; görünür butonların dolu yüzeyi;
  altı dil ve dört telefon boyutu; taşma/kesilme kontrolleri.
- `npm run test:browser`, `npm run test:runtime`, `npm run test:audio`:
  menü/mağaza, dokunmatik oyun, eski kayıt, ses decode/mute ve gameplay izolasyonu.

Görseller `artifacts/cosmetics/`, `artifacts/menus/` altında.
500 mermi çizim süreleri `artifacts/cosmetics/report.json` içinde masaüstü Chrome
ölçümüdür; gerçek Android FPS garantisi değildir. Son cihaz kontrolleri
`RELEASE_READINESS.md` içinde listelenir.
