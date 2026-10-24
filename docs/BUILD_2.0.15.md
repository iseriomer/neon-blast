# Android release 2.0.15 / 40

9 Ekim 2026. İmzalı Google Play AAB: `release/neonblast-2.0.15-v40.aab`.
Boyut: 7421780 bayt. SHA-256: `79c3315df338799d7493626224b604c70df44b926d6bd6a47fe5e9ea3dfa551c`.
R8 mapping: `release/mapping-2.0.15-v40.txt`.

- Speedster temel canı 0.5; ilk iki level'da daha geç miniboss/boss ve daha yumuşak zorluk.
- Firebase Remote Config, 18 grupta 177 ayrı sayı alanını okur; eski JSON desteği korunur.
- Yeni ayarlar sonraki koşuda uygulanır; kayıtlı koşu kendi snapshot'ını korur.
- minSdk 24, target/compile SDK 36, AGP 8.10.0; uygulama kimliği korunur.
- Önceki 2.0.14 / 39 paketiyle aynı imzalama sertifikası doğrulandı.
- 610 imzalı giriş ve 106 güncel www dosyası AAB içinden doğrulandı.
- Regresyon ve Remote Config birim/tarayıcı testleri geçti.

Google Play'e yükleme yapılmadı; paket kullanıcıya teslim edildi.
Gruplanmış Firebase şablonu: `docs/firebase-remote-config.template.json`.
Kullanım: `docs/REMOTE_CONFIG_KISA_REHBER.md`.
