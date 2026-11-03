# Udhëmbarë për Android Auto · version testues 0.1

Aplikacion **native Android**, me shërbim POI në Android for Cars App Library. Nuk është WebView që përpiqet të shfaqë faqen në ekranin e veturës. Ndërfaqja e veturës vizatohet nga hosti Android Auto; forma dhe ngjyrat përfundimtare varen prej tij.

## Çfarë përfshin

- Pranë meje, pranë një vendi dhe përgjatë itinerarit OSRM.
- Rreze/korridor 0.3–100 km; lidhës CCS2, Type 2 ose të dy; fuqi minimale.
- Numra dhe pika në hartën e hostit, përputhje me rreshtat, faqe pas faqeje sipas kufirit të hostit (maksimumi gjashtë për faqe).
- Detaje, operator, orar, fuqi dhe tarifë e raportuar kur burimi i jep. Statusi aktual shënohet i pakonfirmuar.
- Butona Waze dhe Google Maps në veturë; në telefon edhe OsmAnd. Android Auto mund të zgjedhë aplikacionin e vet të parazgjedhur; ky kalim duhet provuar me hostin real.
- Rrugë me nisje manuale në telefon, e ruajtur për ta hapur nga menuja e veturës. Nisja e ruajtur emërtohet shprehimisht dhe nuk merret si GPS aktual.
- Filtra dhe rruga e fundit ruhen privatisht në aplikacion. Nuk ndahen automatikisht me localStorage/historikun e faqes web.
- Pjesët e regjistrit publik ruhen përkohësisht në cache. Rifreskimi i dështuar etiketohet kur ekziston kopje e vlefshme. Kjo nuk garanton kërkim ose hartë plotësisht offline.

Përdoret regjistri i publikuar i Udhëmbarë: OpenStreetMap/ODbL, OCM me licencë të hapur dhe burimet publike të katalogut të faqes. **Nuk nevojitet çelës API.** App-i nuk kërkon dhe nuk kopjon çelësat personalë Waze/Ninjas të faqes web. Burimet dhe kushtet përkatëse: https://tosilabs.github.io/ev-balkan-web/data/sources.json.

## APK dhe instalimi në telefon

Shkarko APK-në testuese nga [Releases](https://github.com/tosilabs/ev-balkan-web/releases) ose artifact-i `udhembare-android-auto-apk` te [Android Actions](https://github.com/tosilabs/ev-balkan-web/actions/workflows/android.yml). `SHA256SUMS.txt` shoqëron APK-në. Publikimi krijohet vetëm pas kompilimit, testeve dhe lint-it me sukses.

Instalo APK-në në telefon, hape Udhëmbarë dhe lejo vendndodhjen. Provo fillimisht “Pranë një vendi”. Për një itinerar vendos destinacionin, dhe nisjen nëse GPS mungon; kërkimi e ruan rrugën për veturën. Instalo Waze ose Google Maps në telefon për navigim.

Pakoja testuese është `al.udhembare.auto.debug`, Android 8.0+ (API 26). APK-ja debug merr çelës testimi gjatë ndërtimit; nënshkrimi mund të ndryshojë mes ndërtimeve. Nëse Android refuzon përditësimin direkt, mos çinstalo pa llogaritur humbjen e filtrave/rrugës së ruajtur. Për provat e veturës prefero instalimin përmes Google Play si më poshtë.

## Si ta provosh në Audi / Android Auto

**Vetëm instalimi direkt i APK-së nuk mjafton.** Sipas [Google: testimi në vetura](https://developer.android.com/training/cars/testing#test-in-real-vehicles), Car App Library kërkon burim të besuar. Opsioni “Unknown sources” nuk zbatohet për këto aplikacione. Mund të përdoren Internal App Sharing ose Internal Test Track.

Rruga më e shpejtë për këtë version testues:

1. Në llogarinë tënde Google Play Console, krijo/regjistro aplikacionin testues sipas kërkesave të llogarisë.
2. Hape [Internal App Sharing](https://play.google.com/console/internal-app-sharing/) dhe ngarko APK-në e këtij versioni. Google lejon debug APK dhe e rinënshkruan me certifikatën e vet për testim; nuk duhet të na dërgosh çelës privat.
3. Në Play Store të telefonit aktivizo Internal app sharing, hape lidhjen e krijuar nga Google dhe instaloje prej saj.
4. Hape aplikacionin në telefon, jep lejen e vendndodhjes dhe lidhe telefonin me Android Auto. Kontrollo edhe listën “Customize launcher”.
5. Provo kërkimin dhe kalimin te Waze/Google Maps kur vetura është e parkuar.

[Udhëzimet zyrtare të Internal App Sharing](https://support.google.com/googleplay/android-developer/answer/9844679). Nuk kemi hyrë në Play Console tënd dhe nuk e kemi publikuar aplikacionin atje.

Në kompjuter mund të testohet me [Desktop Head Unit](https://developer.android.com/training/cars/testing/dhu), telefon Android dhe Android Auto developer mode. Testet automatike përdorin hostin testues AndroidX, jo një seancë reale DHU apo Audi.

## Ndërtimi dhe testet

JDK 21, Android SDK 35 dhe Gradle 8.11.1. Nga kjo dosje:

```sh
gradle :app:assembleDebug :app:testDebugUnitTest :app:lintDebug
```

Hape këtë dosje në Android Studio ose gjenero wrapper-in me `gradle wrapper --gradle-version 8.11.1`. Wrapper JAR nuk ruhet si blob i paverifikuar në këtë version; CI përdor Gradle Setup Action me versionin e caktuar. APK-ja gjendet te `app/build/outputs/apk/debug/app-debug.apk`.

Testet kontrollojnë lidhësin dhe fuqinë në të njëjtën prizë, pikat private/mbyllura/të pavlefshme, renditjen sipas ecjes përgjatë rrugës, URI-të e navigimit, gjeneratat e regjistrit dhe kontratat e template-ve të Android Auto për hartën, listën, gabimet, ngarkimin dhe detajet. Robolectric nuk zëvendëson provën në veturë.

## Kufijtë e versionit të parë

Navigimi hapet në Waze/Google Maps; navigimi 3D i faqes, moti dhe raportet OpenWeb Ninja nuk janë portuar në ekranin e veturës. Nuk lexohen bateria, llogaria myAudi apo itinerari aktiv i Waze. Largësia në listë është në vijë ajrore ose përgjatë vijës së itinerarit, jo devijim rrugor apo kohë mbërritjeje. Itinerari kufizohet në 1500 km dhe 64 zona të regjistrit; kërkimi tepër i gjerë kërkon ngushtim, nuk jep në heshtje listë të pjesshme. Hostët mund të kufizojnë kërkimin me tekst dhe ndërveprime gjatë lëvizjes.

Për shpërndarje të përgjithshme duhen identiteti/nënshkrimi i prodhimit, verifikimi i hostëve të besuar, deklarimet e privatësisë dhe kontrolli i cilësisë Android Auto në Google Play. Nuk pretendojmë se Google e ka aprovuar këtë version.
