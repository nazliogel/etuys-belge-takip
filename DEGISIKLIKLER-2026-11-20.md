# Kapalı belge düzeltmesi – kod değişiklikleri (20.11.2026)

## Özet

Belge önce açıkken sisteme giriyor ve makine/beyanname verisi açık kaydın detayına yazılıyordu. Belge e-TUYS’ta kapanınca kapalı kayıt açılıyor ama veri açık kayıtta kalıyordu. Kapalı belge ekranında ithal makine 0 görünüyordu (örnek: 515592 Ağaoğlu – Excel’de 28 makine, sistemde 0).

- **Veri düzeltmesi (yapıldı, canlı):** 51 belge `kapali_belge_duzeltme.sql` ile düzeltildi. 666 makine kapalı tarafa geçti, 290 beyannamenin hepsi makineye bağlandı.
- **Kod düzeltmesi (bu paket):** Aynı sorunun bir daha oluşmaması için 8 dosya.

## Dosyalar

| Dosya | Klasör | Değişiklik |
|---|---|---|
| `closed-document-transition.service.ts` | `src/services` | YENİ DOSYA – Belge kapanınca açık detayı kapalı belgeye taşır |
| `approval.service.ts` | `src/services` | Kapalı belge onayında detay otomatik taşınıyor |
| `document-detail-import.service.ts` | `src/services` | Belge detay aktarımı: hatalı belge atlanıyor, dosya reddedilmiyor |
| `domestic-realization-import.service.ts` | `src/services` | Yerli gerçekleşme: detayı olan belge kaydı seçiliyor |
| `imported-realization-excel-parser.service.ts` | `src/services` | İthal gerçekleşme Excel’i: makine ID, tarih ve tutar okunuyor |
| `imported-realization-import.service.ts` | `src/services` | İthal gerçekleşme: beyanname makineye makine ID ile bağlanıyor |
| `imported-realization.repository.ts` | `src/repositories` | İthal gerçekleşme repository: makine ID ile arama eklendi |
| `company-request.repository.ts` | `src/repositories` | Firma talepleri: pasif açık kayıt yerine kapalı kayıt tercih ediliyor |

### closed-document-transition.service.ts

**YENİ DOSYA – Belge kapanınca açık detayı kapalı belgeye taşır**

```
Sorun: Belge önce açıkken sisteme giriyor, makine/beyanname verisi açık kaydın
detayına yazılıyordu. Belge kapanınca kapalı kayıt açılıyor ama veri açıkta kalıyordu.
Sonuç: aynı belge iki tabloda, veri ikiye bölünmüş (örnek 515592 Ağaoğlu: 0 makine).

moveOpenDetailToClosedDocument():
  1. Açık belgenin detay kaydını kapalı belgeye bağlar (silmez, ID’ler korunur).
  2. Kapalı tarafta önceden açılmış detay varsa birleştirir: gerçekleşme özeti
     kapalı taraftaki (kapanıştaki son hal) tutulur, tekrar eden beyannameler silinir.
  3. Açık kaydı pasife alır (isActive=false, status=kapalı kaydınki).
  4. Bağlantısız ithal beyannameleri makineye bağlar.
  5. Yaptıklarını ChangeHistory tablosuna yazar (source=SYSTEM).
  Tekrar çalıştırılabilir. Kapalı detayda beklenmeyen veri varsa CLOSED_DETAIL_CONFLICT
  hatasıyla durur, tahmin yürütmez.

linkImportedRealizations(): Önce e-TUYS makine ID, yoksa tekil Sıra No ile bağlar.

Kullanıldığı yerler: approval.service.ts, document-detail-import.service.ts
Canlıdaki 51 belge 20.11.2026’da aynı mantıktaki SQL script’iyle düzeltildi.
```

### approval.service.ts

**Kapalı belge onayında detay otomatik taşınıyor**

```
Değişen yerler (moveOpenDetailToClosedDocument çağrısı):
  - CLOSED_INCENTIVE_DOCUMENT / CREATED onayı: kapalı belge oluşturulduktan sonra.
  - INCENTIVE_DOCUMENT / isActive=false onayı: açık kayıt pasife alınırken.
Neden: Kapalı liste onaylanınca açık kayıt aktif kalıyor ve verisi taşınmıyordu.
Mevcut onay akışı aynı; ek olarak taşıma yapılıyor.
```

### document-detail-import.service.ts

**Belge detay aktarımı: hatalı belge atlanıyor, dosya reddedilmiyor**

```
Önceki sohbetten gelen (korundu):
  - Excel’deki "Belge Durumu"na göre açık/kapalı kayıt seçiliyor.
  - Yerli/ithal makineler silinip yeniden oluşturulmuyor, ID ile bulunup güncelleniyor
    (beyanname–makine bağlantıları korunuyor).
Bu sürümde eklenen:
  - Belge bazında hatalar (tanınmayan durum, kapalı kaydı olmayan kapalı belge vb.)
    artık tüm dosyayı reddetmiyor; o belge atlanıp hata listesine yazılıyor.
  - Her belge kendi transaction’ında: hata olursa sadece o belge geri alınıyor.
  - Belge kapalıysa ve verisi hâlâ açık kayıttaysa önce taşınıyor (kendini onarma).
  - Hiç belge yüklenemezse batch FAILED, en az biri yüklenirse COMPLETED.
```

### domestic-realization-import.service.ts

**Yerli gerçekleşme: detayı olan belge kaydı seçiliyor**

```
Önceden: Belge açık tabloda varsa her zaman açık kayıt seçiliyordu.
Sorun: Kapanan belgelerde detay kapalı kayda taşındığı için açık kayıt detaysız kalıyor,
"Belge detay kaydı bulunamadı" hatası alınıyordu.
Şimdi: Önce detayı olan kayıt seçiliyor (açık → kapalı → hiçbiri).
```

### imported-realization-excel-parser.service.ts

**İthal gerçekleşme Excel’i: makine ID, tarih ve tutar okunuyor**

```
Önceden "İthal Makine ID" sütunu hiç okunmuyordu; eşleşme sadece Sıra No ile yapılıyordu
ve veritabanında externalMachineId hep boş kalıyordu.
Şimdi okunan ek sütunlar (zorunlu değil, eski Excel’ler de yüklenir):
  "İthal Makine ID", "Beyanname Tarihi", "Tutar", "Belge Durumu".
Tarih hücreleri YYYY-MM-DD olarak okunuyor.
Not: Satır ID beyanname başına değil makine satırı başına; anahtar zaten
"SatırID:BeyannameNo" olduğu için aynı Satır ID’li beyannameler ayrı kayıt oluyor.
```

### imported-realization-import.service.ts

**İthal gerçekleşme: beyanname makineye makine ID ile bağlanıyor**

```
findMachine(): Önce e-TUYS makine ID ile (kesin), yoksa tekil Sıra No ile eşleştirir.
Sıra No ile bulunan makinenin ID’si Excel’deki ID ile çelişirse bağlamaz.
Makine henüz yüklenmemiş olsa bile externalMachineId kaydediliyor (sonra bağlanabilir).
rawData’ya beyanname tarihi, tutar, belge durumu ve makine ID ekleniyor.
Kontrol (20.11.2026): Excel’deki 1.387 beyannamenin hepsi makine ID ile doğru eşleşiyor.
```

### imported-realization.repository.ts

**İthal gerçekleşme repository: makine ID ile arama eklendi**

```
Eklenen: findImportedMachinesByExternalId(detailId, externalMachineId).
imported-realization-import.service.ts içindeki findMachine() tarafından kullanılıyor.
findDocument() değişmedi: açık kayıt detaysız kalınca otomatik kapalı kayda düşüyor.
```

### company-request.repository.ts

**Firma talepleri: pasif açık kayıt yerine kapalı kayıt tercih ediliyor**

```
findDocumentForCompanyRequest():
  - Belge ID ile: aktif açık kayıt → kapalı kayıt → (son çare) pasif açık kayıt.
  - Belge No ile: sadece aktif açık kayıtlar aranıyor, sonra kapalı kayıtlar.
Neden: Kapanan belgelerin açık kaydı pasife alındı; talepler kapalı belgeye bağlanmalı.
```

## Excel yükleme sırası (önerilen)

1. Kapalı belge listesi → yükle ve onayla (açık detaylar otomatik taşınır)
2. Açık belge listesi → yükle ve onayla
3. Belge detayları (hatalı belge atlanır, dosyanın geri kalanı yüklenir)
4. İthal gerçekleşme, yerli gerçekleşme, gerçekleşme özeti

## Canlıya çıktıktan sonra

1. Kapalı listeyi yükleyip onayla → DEMMA (523463) verisi kapalı kayda geçmeli.
2. İthal gerçekleşme Excel’ini bir kez yükle → mevcut beyannamelerin makine ID’leri dolar.
3. Bekleyen hatırlatma kontrolü (psql):

```sql
SELECT r.id, r.channel, r.type, r."targetDate", i."documentNumber"
FROM "DocumentReminder" r
JOIN "IncentiveDocument" i ON i.id = r."documentId"
WHERE r.status = 'PENDING' AND (i."isActive" = false OR i.status <> 'OPEN');
```

## Şema

Şema değişikliği / migration yok. Beyanname tarihi ve tutar şimdilik `rawData` içinde.
