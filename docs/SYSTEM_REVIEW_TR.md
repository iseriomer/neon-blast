# Level / Evolution sistemi: değerlendirme

Bu sürümün görsel referansı mevcut Armory ve menüler. Hub için eklenen yuvarlak
kartlar, renkli degrade zeminler ve farklı başlık dili kaldırıldı. Yeni ekranlar
da siyah zemin, keskin butonlar, ince ayırıcılar, beyaz dar başlıklar ve mevcut
cyan / pembe / gold renkleri kullanıyor.

## Sistemin güçlü tarafları

Her Level'ın tek ana bossla bitmesi oyuncuya somut bir hedef veriyor. Önceki
uzun koşuda 25–30 Evolution'dan sonra oluşan tam ekran build, sonraki Level'a
taşınmıyor. Oyuncu tekrar perk seçerek yeni bir kombinasyon kuruyor. Mevcut
nişan alma, atış düzeni ve perk matematiği korunuyor.

Gold artık yalnızca kozmetik için değil, sonraki denemeye hazırlık için de
anlamlı. Hasar ve atış hızı doğrudan ateşi; otomasyon pasif buildleri; kritik
şansı ise kritik temelli perkleri destekliyor. İlk alışverişler farklı oyun
tarzlarının önceliklerini belirliyor.

Level dosyasında boss, miniboss anları, tek zorluk eğrisi, boss canı ve isteğe
bağlı ödül var. Her küçük denge değişikliği için spawn koduna girmek gerekmiyor.
Alt menü, tekrar deneme ile gelişim satın alma arasındaki mesafeyi kısaltıyor.

## Dikkat edilmesi gereken tasarım sonuçları

**Sıfırlama tek başına sonsuza kadar çeşitlilik sağlamaz.** Aynı ilk perkler
hep en iyi seçime dönüşürse ilk dakikalar tekrar edebilir. Bunu yeni düşman
mekanikleri veya atış nerfleriyle çözmek yerine önce mevcut perklerin hangi
Level'larda tercih edildiğini gözlemlemek daha doğru.

**Tek eğri pratik ama üç etkiyi birlikte değiştirir.** Eğriyi artırınca düşman
canı, hız ve sayı birlikte yükselir. Sadece boss uzun sürüyorsa eğriyi değil
boss HP çarpanını değiştirmek gerekir. Sadece başlangıç yoruyorsa eğrinin ilk
noktasını azaltıp son noktayı aynı bırakabilirsin.

**Metaprogress yatırım farkı zamanla azalır.** Dört çizgi de maksimuma ulaştığında
her oyuncunun kalıcı statları eşitlenir. Bu ilk sürüm için anlaşılır; ileride
farklı oyun tarzları hâlâ isteniyorsa, sahip olunan geliştirmeler arasında
seçilebilir bir aktif/pasif uzmanlık eklenebilir. İlk sürüme yeni karmaşıklık
eklemek için acele etmemek gerekir.

**Aynı gold iki ihtiyaca bölünüyor.** İlerlemek için gelişim zorunlu hissedilirse
oyuncu kozmetik alamaz. Önce gerçek denemelerde oyuncunun hem anlamlı bir
gelişim hem de zaman zaman bir sandık alabilmesini kontrol etmek gerekir.
Meta maliyetleri ve boss ödülleri bu nedenle başlangıç değerleri olarak tutuldu.

**Leaderboard eski skor sistemiyle devam ediyor.** Level uzunlukları farklı
olduğu için tek koşu skoru artık bütün beceriyi temsil etmez. Sonraki adımda
en yüksek tamamlanan Level ana ölçüt, aynı Level içinde skor veya boss süresi
ikincil ölçüt olabilir. Mevcut yayındaki skorları silmeden ayrı tablo gerekir.

## Önce polish edilmesi gerekenler

1. **İlk üç Level'ın süresi:** yeni oyuncunun ilk bossu ne kadar sürede gördüğü,
   kaç kez öldüğü ve ilk gold alışverişini ne zaman yapabildiği ölçülmeli.
   Evolution sayısı tek başına dakika cinsinden süre vermez.
2. **Boss dayanıklılığı:** zayıf, çoklu atış ve pasif ağırlıklı buildlerle ayrı
   denemeler yapılmalı. Çok uzayan boss için HP çarpanı; yorucu sıradan bölüm
   için eğri ayarlanmalı. Atış yayılımını veya perk seçim mantığını değiştirmeye
   gerek yok.
3. **Yeni bossların okunabilirliği:** Helix'in destek hedefleri ve Aurora'nın
   ağır/hafif saldırıları, telefon ekranında nişan önceliğini açık göstermeli.
   Otomatik testler saldırıların çalıştığını doğruluyor; insanın bunları ne kadar
   hızlı okuyabildiğini kanıtlamıyor.
4. **Başarı ekranı:** tamamlanan Level, boss ve kazanılan gold artık ayrı win
   ekranında görünüyor. Sonraki Level ve ana menü seçenekleri var; son Level
   için tekrar oynama sunuluyor. Kısa bir görsel zafer animasyonu ileride
   eklenebilir; bekleme zorunluluğu olmamalı.
5. **Ansiklopedi:** arşiv yerine yalnızca gerçekten görülen düşmanlar, bosslar
   ve perkler kayıt oluyor. Görseller, davranışlar ve özellikler mevcut;
   keşifler kalıcı. Taktiği öğrenmek için okunabilir kısa açıklamalar yeterli,
   keşfedilmemiş içerikleri ifşa eden bir listeye dönüşmemeli.

## Şimdilik eklemeyeceğim şeyler

Enerji/stamina, yeni para birimi, zorunlu reklam, ekstra günlük menüler ve
otomatik hareket sistemi. Bunlar mevcut eğlenceli nişan alma çekirdeğini
iyileştirmeden tekrar oynama akışını uzatabilir. Önce bu 10 Level ve dört
gelişim çizgisinin ritmini oturtmak daha değerli.

## Öz değerlendirme

Teknik uygulama değerlendirmem **9/10**: sıralı 10 farklı boss, yeni build
sıfırlaması, kayıt devamı, kalıcı gelişim, gold işlemleri ve hub akışları
otomatik testlerle kontrol edildi. Görsel kontroller dört ekran boyutunda
yapıldı; mevcut menü tarzına uyum için tasarım düzeltildi.

Bu puan boss dengesi, oyuncu bağlılığı veya gelir için verilmiş bir puan değil.
Gerçek Android cihazdaki son kontrol ve oyuncuyla yapılan süre/denge testleri
henüz yapılmadı. En önemli kalan iş, yeni özellik sayısını artırmak değil,
mevcut sistemin ilk üç Level'ını ve son üç Level'ını gerçek oynanışla ayarlamak.
