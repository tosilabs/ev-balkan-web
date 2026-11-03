# Revizion i projekteve GitHub për Udhëmbarë

Data e kontrollit: 2 nëntor 2026. Projekti ynë i krahasuar: Udhëmbarë v2.2, commit `f07003f1fe08905d4727347d191b762c1e8d6469`.

## Përfundimi për vendimmarrje

Nga shtatë repository unike, **Vidyut është më i vlefshmi për idetë e planifikimit të udhëtimit**, **EV Finder për organizimin e çmimeve dhe njoftimeve**, dhe **evpin për kërkimet gjeografike dhe ngarkimin gradual të detajeve**. Nuk gjeta një databazë të gatshme, të hapur dhe të verifikuar për mbushësit e Ballkanit në këto repository.

RiyaSubash përdor TomTom, i cili mund të jetë burim shtesë për rajonin, por kërkon çelësin tonë, kontroll të mbulimit dhe respektim të kushteve të shërbimit. ChargeEase ka shumë ndërfaqe demonstrimi. cryptprosteel ka vetëm README. rvssrao përdor një databazë reale, por vetëm për Indinë.

Rekomandimi është të vazhdojmë aplikacionin tonë web/PWA, duke përshtatur idetë e dobishme në modulet ekzistuese. Kalimi i gjithë projektit në Java, React Native ose në një platformë pagesash do të shtonte punë pa zgjidhur mungesën e stacioneve në Ballkan.

## Çfarë u kontrollua

- U lexua struktura e plotë e skedarëve të shtatë repository-ve dhe metadata e tyre.
- U lexuan 54 skedarë të zgjedhur: kodi i kërkimit, burimet e stacioneve, modeli i të dhënave, logjika e itinerarit, shembujt e databazave, pagesat, testet për planifikimin dhe deklaratat e licencimit.
- U kontrolluan endpoint-e reale të evaround.me për kërkime rreth Shkupit, Prishtinës, Sofjes dhe Londrës; më pas u filtruan koordinatat e të gjithë regjistrit të kthyer.
- U provua API-ja e përdorur nga rvssrao për një rreze 100 km rreth Shkupit.
- U krahasuan rezultatet me burimet dhe kodin aktual të Udhëmbarë.

Ky është revizion i kodit dhe i përshtatshmërisë së të dhënave. Projektet nuk u nisën të gjitha si aplikacione të plota; testet Java u lexuan, nuk u ekzekutuan. Nuk u përdorën çelësa API të gjetur në repository dhe nuk u provuan pagesa, rezervime ose sesione karikimi. Arkivat binare dhe çdo skedar i projektit të madh Vidyut nuk u audituan individualisht. Kjo nuk është certifikim sigurie ose gatishmërie për prodhim.

## 1. RiyaSubash/EV_stations-master

**Çfarë ekziston në kod:** kërkim lokacioni dhe stacionesh përmes TomTom, kërkim i disponueshmërisë, llogaritje e itinerarit EV për udhëtime të gjata dhe parametra për konsumin/karikimin. Kodi i modelit përfshin masën e veturës, efikasitetin në ngjitje/zbritje, energjinë ndihmëse dhe kurbën e karikimit.

**Vlera për ne:** koncepti i një profili të veturës dhe planifikimit me ndalesa karikimi është i dobishëm. Mund të lidhim terrenin dhe motin që i kemi tashmë me një model të vlerësuar energjie. Parametrat e shembullit, përfshirë baterinë 100 kWh dhe lidhësit e tij, nuk përfaqësojnë automatikisht Audi e-tron-in evropian të përdoruesit.

**Databaza:** nuk ka një eksport të gatshëm të stacioneve në skedarët e kontrolluar. Burimi është TomTom. Licenca e kodit nuk jep të drejtë për shkarkimin ose rishpërndarjen e databazës së TomTom.

Dokumentacioni aktual i TomTom shënon të dhëna statike për Shqipërinë, Kosovën, Maqedoninë e Veriut dhe Malin e Zi; në tabelën e kontrolluar nuk shënon disponueshmëri dinamike për këto katër tregje. Për Serbinë, Bullgarinë, Kroacinë, Greqinë, Rumaninë dhe Slloveninë shënon edhe mbulim dinamik. Kjo është deklaratë mbulimi sipas tregut, jo provë se çdo stacion i njohur nga ne është në API.

**Gjendja teknike:** `package.json` ka test placeholder; `predeploy` thërret një script `build` që nuk është deklaruar. Varësitë dhe shembulli i SDK-së kërkojnë rishikim përpara përdorimit aktual.

**Licenca:** `package.json` deklaron ISC; mungon një skedar i veçantë LICENSE në pemën e kontrolluar. README referon edhe një repository tjetër si origjinë. Për ripërdorim konkret duhet ruajtur prejardhja dhe sqaruar zinxhiri i licencimit.

**Vendimi:** përshtatje e idesë së modelit të energjisë; TomTom si eksperiment i veçantë, jo varësi e detyrueshme e versionit falas.

Burime kodi: [kërkimi](https://github.com/RiyaSubash/EV_stations-master/blob/f8132e3e54f520a43f924d4a7096d69e377ba039/ev_search.js), [itinerari EV](https://github.com/RiyaSubash/EV_stations-master/blob/f8132e3e54f520a43f924d4a7096d69e377ba039/calculateLongDistanceEVRoute.js), [modeli](https://github.com/RiyaSubash/EV_stations-master/blob/f8132e3e54f520a43f924d4a7096d69e377ba039/ev_model.js), [deklarata ISC dhe scripts](https://github.com/RiyaSubash/EV_stations-master/blob/f8132e3e54f520a43f924d4a7096d69e377ba039/package.json). [Mbulimi zyrtar TomTom](https://docs.tomtom.com/ev-charging-stations-availability-api/documentation/product-information/market-coverage).

## 2. cs1m2414238/vidyutEV-1.0

**Çfarë ekziston në kod:** platformë e madhe me backend Spring Boot, ndërfaqe web/mobile, databazë, role përdoruesish dhe logjikë të mirëfilltë optimizimi. `ChargingRouteOptimizer` përdor matricë distancash/kohësh rrugore, kapacitet baterie, konsum, rezervë minimale, kufi fuqie të veturës, kurbë karikimi dhe kufizime kohe/buxheti. Ka objektiva kohe, kostoje dhe kombinimi. `SafeRecoveryPlanner` kërkon alternativa të arritshme kur dështon një ndalesë dhe verifikon distancën reale rrugore.

Testet përkatëse përfshijnë raste kur karikuesi i parë nuk është zgjidhja më e shpejtë, kur fuqia e veturës e kufizon karikimin, kur rruga reale e cenon rezervën, kur nuk ekziston plan i arritshëm dhe kur GPS-i është i vjetër. Kjo e bën logjikën më të vlefshme për studim sesa një listë veçorish në README.

**Vlera për ne:** planifikim me përqindje baterie në çdo ndalesë; karikim vetëm aq sa nevojitet për segmentin vijues plus rezervë; krahasim i udhëtimit sipas kohës dhe kostos; plan alternativ me shpjegimin e ndryshimit në minuta, kilometra dhe energji.

**Databaza:** skedarët e kontrolluar janë për Indinë dhe demonstrim. `chargers-india.json` ka 112 hyrje në snapshot-in e kontrolluar. Gjeneratori për distriktet thotë shprehimisht se prodhon pika sintetike nga poligonet e distrikteve dhe i afron te rruga; këto nuk janë lokacione të verifikuara të karikuesve. Nuk duhen importuar si pika reale në hartën tonë.

**Kufijtë:** profili standard i karikimit përdor pragje dhe vlera të përgjithshme; nuk është kurbë e matur për Audi-n tonë. Llogaritja bazë e energjisë përdor konsum për kilometër; moti, terreni dhe pasiguria duhet të modelohen posaçërisht. `PaymentServiceImpl` zbrit balancë nga portofoli i brendshëm dhe gjeneron një identifikues transaksioni; ky skedar nuk provon pagesë bankare ose pagesë te një operator real. Deklaratat e README për OCPP nuk provojnë qasje të gatshme te operatorët e Ballkanit.

**Licenca:** README e etiketon projektin “Proprietary MIT Dual”. Skedari MIT në `vidyut-mobile/LICENSE` përmend Expo/650 Industries. Kjo nuk është provë e një licence MIT për gjithë backend-in dhe kodin e ri të projektit. Qasja më e përshtatshme për ne është të implementojmë idetë me kodin tonë; kopjimi i moduleve kërkon sqarim të shtrirjes së licencës.

**Vendimi:** kandidati kryesor për modelin e planifikimit, jo për databazë stacionesh ose për importimin e gjithë platformës.

Burime kodi: [optimizer](https://github.com/cs1m2414238/vidyutEV-1.0/blob/3d063eb8f95ff57d829c37c3f1081fcbd1926b0f/vidyut-backend/src/main/java/com/vidyut/autopilot/service/ChargingRouteOptimizer.java), [rikalkulimi](https://github.com/cs1m2414238/vidyutEV-1.0/blob/3d063eb8f95ff57d829c37c3f1081fcbd1926b0f/vidyut-backend/src/main/java/com/vidyut/autopilot/service/SafeRecoveryPlanner.java), [gjeneratori sintetik](https://github.com/cs1m2414238/vidyutEV-1.0/blob/3d063eb8f95ff57d829c37c3f1081fcbd1926b0f/vidyut-backend/scripts/generate_district_chargers.py), [testet e optimizerit](https://github.com/cs1m2414238/vidyutEV-1.0/blob/3d063eb8f95ff57d829c37c3f1081fcbd1926b0f/vidyut-backend/src/test/java/com/vidyut/autopilot/service/ChargingRouteOptimizerTest.java), [pagesat](https://github.com/cs1m2414238/vidyutEV-1.0/blob/3d063eb8f95ff57d829c37c3f1081fcbd1926b0f/vidyut-backend/src/main/java/com/vidyut/payment/service/PaymentServiceImpl.java), [deklarata e licencimit](https://github.com/cs1m2414238/vidyutEV-1.0/tree/3d063eb8f95ff57d829c37c3f1081fcbd1926b0f).

## 3. Unseencoderz/ChargeEase

**Çfarë ekziston në kod:** ndërfaqe React/TypeScript me faqe për kërkim, profil, rezervime dhe portofol. Ka ide për paraqitjen e lidhësve, shërbimeve pranë stacionit dhe komponentëve të ndërfaqes.

**Çfarë nuk vërtetohet nga ky version:** `GoogleMap.tsx` deklaron stacione mock në San Francisco; `BookingPage.tsx` përdor rezervime mock; `useAuth.tsx` simulon hyrjen/regjistrimin dhe krijon token prove. Backend-i `server.js` ofron përgjigje shëndeti të shërbimit; nuk implementon endpoint-et e stacioneve, rezervimeve dhe pagesave që deklarohen në klientin API. Skedari `StationDetailsPage.tsx` në snapshot-in e lexuar përmban komponentin e rikthimit të fjalëkalimit, gjë që tregon mospërputhje konkrete mes emrit dhe përmbajtjes.

**Databaza:** nuk gjeta një databazë reale të stacioneve në repository. Emrat, çmimet, disponueshmëria dhe vlerësimet e shembujve nuk duhen trajtuar si të dhëna reale.

**Vlera për ne:** ide për filtër “24/7”, tualet/kafe/hotel, pamje të kartës dhe organizim të detajeve. Udhëmbarë ka tashmë hartë fullscreen, kartë stacioni, foto kur ka burim dhe lista; nuk ka arsye t’i rindërtojmë vetëm për të adoptuar këtë frontend.

**Licenca:** README thotë MIT dhe lidhet te LICENSE, por skedari LICENSE mungon nga pema e kontrolluar. Nuk e trajtoj si leje të konfirmuar për kopjim të drejtpërdrejtë.

**Vendimi:** ide të kufizuara për UX; jo burim për stacione ose backend të gatshëm rezervimesh.

Burime kodi: [harta me mock](https://github.com/Unseencoderz/ChargeEase/blob/e746da7a4a4775dea31bd2176749750501838087/frontend/src/components/common/GoogleMap.tsx), [hyrja e simuluar](https://github.com/Unseencoderz/ChargeEase/blob/e746da7a4a4775dea31bd2176749750501838087/frontend/src/hooks/useAuth.tsx), [rezervimet](https://github.com/Unseencoderz/ChargeEase/blob/e746da7a4a4775dea31bd2176749750501838087/frontend/src/pages/BookingPage.tsx), [backend-i](https://github.com/Unseencoderz/ChargeEase/blob/e746da7a4a4775dea31bd2176749750501838087/backend/server.js), [faqja e detajeve](https://github.com/Unseencoderz/ChargeEase/blob/e746da7a4a4775dea31bd2176749750501838087/frontend/src/pages/StationDetailsPage.tsx).

## 4. matthewgall/homeassistant-evfinder

**Çfarë ekziston në kod:** integrim Python për Home Assistant. Lexon stacionet dhe tarifat nga evaround.me, filtron sipas rrezes/lidhësit/fuqisë, llogarit stacionin më të lirë dhe më të afërt të lirë, dhe ekspozon sensorë për njoftime. Ka timeouts dhe riprovim me pritje në dështime të rrjetit.

**Kontrolli real i të dhënave:** më 02.11.2026 rreth 22:30 UTC, shkarkimi ktheu 15,038 hyrje. Filtrimi i koordinatave dha zero në Shkup, Prishtinë, Sofje dhe në gjithë kutinë e regjistrit tonë `[34,12,48.5,30]`. Etiketat e shteteve ishin kryesisht GB/United Kingdom; një hyrje ishte etiketuar AUS. Parametri bbox në kërkesat e testuara nuk e kufizoi përgjigjen në server, ndaj numri i përgjithshëm nuk është numër stacionesh lokale.

Përgjigjet e kontrolluara nuk përmbanin header `Access-Control-Allow-Origin`. Nuk duhet premtuar thirrje direkte nga shfletuesi pa provë CORS ose pa një backend. Kjo provë teknike nuk konfirmon të drejtat e ripërdorimit të të dhënave të evaround.me.

**Vlera për ne:** njoftim kur një stacion i zgjedhur lirohet, prag çmimi dhe krahasim tarifash. Këto kërkojnë burim dinamik për stacionin përkatës. Në versionin web fillojmë me kontroll ndërsa app-i është i hapur; njoftimet kur app-i është i mbyllur kërkojnë infrastrukturë shtesë.

**Çfarë duhet përshtatur:** kodi ka formatim çmimi në paund, thjeshton kushtet e tarifës dhe grupon disa statuse të panjohura me jashtë shërbimit. Për ne duhen valuta e burimit, tarifat për energji/kohë/seancë, oraret, datat e statusit dhe ndarje e qartë e statusit të panjohur.

**Licenca:** MIT për kodin e integrimit. Licenca e kodit dhe e databazës janë çështje të ndara.

**Vendimi:** shembull i mirë për njoftime dhe organizim të të dhënave dinamike; burimi i kontrolluar nuk shton stacione në Ballkan.

Burime kodi: [coordinator](https://github.com/matthewgall/homeassistant-evfinder/blob/2208145b32e0e8e9d865da9a2419c3cacf009921/custom_components/evfinder/coordinator.py), [sensorët](https://github.com/matthewgall/homeassistant-evfinder/blob/2208145b32e0e8e9d865da9a2419c3cacf009921/custom_components/evfinder/sensor.py), [MIT](https://github.com/matthewgall/homeassistant-evfinder/blob/2208145b32e0e8e9d865da9a2419c3cacf009921/LICENSE). [Prova e API-ve](https://github.com/tosilabs/ev-balkan-web/actions/runs/41537447885); [prova e koordinatave](https://github.com/tosilabs/ev-balkan-web/actions/runs/41537790771).

## 5. evpin/evpin

**Çfarë ekziston në kod:** hartë React/Leaflet, frontend i thjeshtë, backend FastAPI dhe model MongoDB. Kërkimi përdor `$near` mbi koordinata, rreze në metra dhe kufi rezultatesh. Detajet e stacionit merren veçmas sipas ID-së; ka pamje ngarkimi dhe ruajtje ID-sh që shmang disa përsëritje në frontend.

**Databaza:** script-i i importit thërret endpoint-in e Statiq me koordinata dhe poligon për Bengaluru, Indi; e vendos qytetin “Bengaluru”. Nuk është eksport i një databaze të Ballkanit. Fakti që një endpoint i operatorit është i thirrshëm nuk e bën databazën të licencuar si kodin e projektit.

**Vlera për ne:** model i lehtë për ngarkim sipas zonës, ndarje mes listës së lehtë dhe detajeve të plota, identifikues të qëndrueshëm. Rruga më e lirë fillestare për Udhëmbarë është ndarja e regjistrit në skedarë rajonalë dhe cache lokale. Nëse kemi nevojë për backend, një indeks gjeografik PostGIS ose MongoDB mund të ofrojë të njëjtin qëllim.

**Kufijtë:** përdorimi i `$near` kërkon indeks gjeografik të konfiguruar. Kodi i frontend-it grumbullon stacione dhe ID në memorie; për të dhëna dinamike nevojitet mekanizëm për skadim dhe përditësim, jo vetëm shmangie dublimesh.

**Licenca:** licence e posaçme që lejon përdorimin jo-komercial dhe kërkon licencë me pagesë për përdorim komercial. Nuk është leje e përgjithshme MIT. Idetë mund të implementohen me kodin tonë; kopjimi i kodit duhet të respektojë kushtet përkatëse.

**Vendimi:** i dobishëm për strukturën e kërkimit gjeografik; jo burim stacionesh për rajonin tonë.

Burime kodi: [importi nga Statiq](https://github.com/evpin/evpin/blob/6be486a1f0c068d940e1c0c2a1a4be529c619476/backend/insert_ev_chargers.py), [kërkimi gjeografik](https://github.com/evpin/evpin/blob/6be486a1f0c068d940e1c0c2a1a4be529c619476/backend/routers/ev_chargers.py), [shenjat dhe marrja e të dhënave](https://github.com/evpin/evpin/blob/6be486a1f0c068d940e1c0c2a1a4be529c619476/frontend/src/components/Markers/Marker.tsx), [licenca](https://github.com/evpin/evpin/blob/6be486a1f0c068d940e1c0c2a1a4be529c619476/LICENSE.md).

## 6. cryptprosteel/ev-charge-finder

Pema e repository-t ka vetëm `README.md`. README përshkruan një scraper, formate eksporti, strukturë dosjesh dhe rezultate performance, por kodi dhe dosjet e përshkruara nuk janë në këtë snapshot. Shembulli JSON ngjan me skemën e Open Charge Map; nuk provon një databazë të veçantë ose akses të ri te stacionet.

**Vendimi:** nuk ka komponent ekzekutues ose databazë që mund të integrojmë nga repository publik i kontrolluar. Nuk do ta përdorja si bazë teknike për Udhëmbarë.

Burim: [README dhe pema](https://github.com/cryptprosteel/ev-charge-finder/tree/71366a5ab7ee70f2d21c7e879db319921eb4e389).

## 7. rvssrao/ev-charging-finder

**Çfarë ekziston në kod:** një faqe HTML/JavaScript funksionalisht e thjeshtë për kërkim sipas emrit/GPS-it dhe filtrave të rrezes, AC/DC, fuqisë dhe kategorisë së automjetit. Përdor Nominatim për lokacionin dhe një API të jashtme për stacionet.

**Databaza reale:** API-ja e jashtme deklaron 29,184 stacione nga regjistri i Bureau of Energy Efficiency të Indisë, me snapshot deri më 26.10.2025. Dokumentacioni thotë se nuk ka disponueshmëri aktuale, çmime ose orare. Kërkesa e provuar për 100 km rreth Shkupit dha HTTP 200 dhe zero stacione.

**Vlera për ne:** disiplinë në modelin e lidhësve, fuqia sipas lidhësit dhe të dhëna për prejardhjen/cilësinë e lokacionit. Nuk shton një funksion kryesor kërkimi që Udhëmbarë nuk e ka tashmë.

**Licenca:** nuk u gjet LICENSE në repository e vogël. Faqja e API-së deklaron MIT për kodin e vet, por kjo nuk e licencon automatikisht kodin e këtij repository; të dhënat e BEE kanë prejardhjen dhe kushtet e tyre.

**Vendimi:** shembull i mirë i një API-je të dokumentuar, por databazë jashtë rajonit tonë.

Burime: [index.html](https://github.com/rvssrao/ev-charging-finder/blob/6bd120201c18dbecff4569a660281d34ccdfaca6/index.html), [dokumentacioni i databazës/API-së](https://ev-charging-stations-api.vercel.app/), [prova reale](https://github.com/tosilabs/ev-balkan-web/actions/runs/41537447885).

## Mbulimi që ka tani Udhëmbarë dhe pse mund të mungojnë stacione

Snapshot-i i kontrolluar kishte 22,299 regjistra të bashkuar në rajonin `[34,12,48.5,30]`, para filtrave të aplikacionit. Kjo kuti përfshin edhe zona përreth Ballkanit; shifra nuk është numër i verifikuar i stacioneve publike vetëm brenda shteteve të Ballkanit.

| Burimi aktiv | Regjistra para bashkimit |
| --- | ---: |
| OpenStreetMap | 19,728 |
| Open Charge Map, importi aktual | 1,368 |
| MYFAH, regjistri kombëtar grek | 4,288 |
| Fines | 434 |
| Regjistri i Zagrebit | 40 |

Dublimet e njohura bashkohen, prandaj numrat e burimeve nuk duhen mbledhur si stacione të reja. Ka katër shkaqe të ndryshme që duhen kontrolluar për një stacion të munguar:

1. **Nuk është në burimin që kemi.** Regjistrat vullnetarë nuk kanë çdo operator lokal. Eksporti publik OCM i kontrolluar është snapshot, jo pamje e plotë e API-së aktuale.
2. **Importi ynë është më i ngushtë se burimi.** OCM aktualisht pranon vetëm DataProviderID 1 dhe statusin e publikimit 200. Në referencën OCM, edhe statusi 100 është i publikuar; disa operatorë të tjerë kanë CC0/CC BY. Licenca duhet kontrolluar për çdo provider, duke ruajtur atribuimin e tij.
3. **Filtri e fsheh.** “Në punë” kërkon konfirmim të freskët; aktualisht kontrolli automatik i disponueshëm është kryesisht për Fines. Një stacion me status të panjohur mund të jetë real dhe funksional. Duhet ta tregojmë qartë sa stacione fsheh filtri, pa e quajtur statusin e panjohur “i lirë”.
4. **Rrezja ose përshtatshmëria e përjashton.** Një korridor 300 m përgjatë rrugës është ndryshe nga rrezja 10 km pranë një vendi. Filtrat e fuqisë/lidhësit dhe qasja private mund të fshehin regjistra të tjerë.

Auditi i eksportit OCM gjeti shembuj konkretë: Bullgaria kishte 55 regjistra që kalonin filtrin tonë të vjetër kundrejt 92 me providerë të shënuar të hapur dhe publikime 100/200; Rumania 420 kundrejt 667. **Këto janë numra kandidatë para kontrollit përfundimtar të licencave, kufijve dhe dublimeve**, jo shtesa neto të publikuara. Eksporti kishte vetëm 13 regjistra gjithsej për Maqedoninë e Veriut, prandaj zgjerimi i atij filtri vetëm nuk e zgjidh mungesën atje.

Krahas shtatë projekteve, u gjetën edhe burime për hulumtim: lista zyrtare EVN në Maqedoninë e Veriut dhe eksportet ODbL të BlokVolt. Eksportet e hapura të BlokVolt bazohen kryesisht në OSM/OCM; të dhënat shtesë të mbrojtura të operatorëve të faqes nuk janë automatikisht pjesë e eksportit të hapur. Nuk duhen importuar si burim i ri mijëra kopje të stacioneve që i kemi.

Burime: [auditi i regjistrit dhe OCM](https://github.com/tosilabs/ev-balkan-web/actions/runs/41536497544), [rregullat e eksportit OCM](https://github.com/openchargemap/ocm-export), [licencat OCM](https://openchargemap.org/about/terms), [EVN zyrtar](https://emobility.evn.mk/charging-stations/ChargerMap.aspx?lang=en), [BlokVolt dhe kufijtë e eksportit të hapur](https://www.blokvolt.rs/en/mapa/).

## Propozimet për implementim, sipas përparësisë

| Përparësia | Veçoria | Çfarë merr përdoruesi | Varësitë / puna relative |
| --- | --- | --- | --- |
| P0 | Mbulim dhe audit i stacioneve | Më shumë pika reale; burim, datë dhe arsye e mungesës | Mesatare; importues dhe krahasim në qytete reale |
| P0 | Shpjegim i filtrave aktivë | Kupton kur pika është fshehur nga rrezja, lidhësi ose statusi | E vogël; frontend ekzistues |
| P1 | Devijim real për ndalesën | `+X km / +Y min` kundrejt vazhdimit pa atë ndalesë | Mesatare; OSRM, cache, kufi kandidatësh |
| P1 | Profili “Audi im” | Modeli, bateria e përdorshme, SoC, konsumi dhe kufiri AC/DC | Mesatare; të dhëna të sakta për variantin |
| P1 | Plan me ndalesa dhe rezervë | Sa bateri pritet në çdo ndalesë, sa të karikojë dhe sa zgjat | E madhe; rrugë, profil dhe kurbë karikimi |
| P1 | Alternativa e ndalesës | Rrugë tjetër kur stacioni dështon, me ndryshimin në kohë/energji | E madhe; mbulim i mirë dhe të dhëna të mjaftueshme |
| P2 | Kosto e vlerësuar e seancës | Energji + tarifa kohore/seance/parkimi, me datë burimi | Mesatare–e madhe; tarifa të strukturuara |
| P2 | “Kërko këtë zonë” dhe regjistër rajonal | Lëviz hartën dhe kërkon aty; shkarkime më të vogla në telefon | Mesatare; ndarje JSON sipas zonës, cache |
| P2 | Shërbime pranë stacionit | 24/7, tualet, kafe, hotel, qasje me kushte | Mesatare; vetëm fakte me burim |
| P2 | Raporto ose shto stacion | Plotësim i boshllëqeve lokale dhe raportim me datë | Mesatare–e madhe; backend i vogël dhe moderim |
| P2 | Udhëtimi i ruajtur pa internet | Itinerari i llogaritur dhe stacionet e zgjedhura ruhen lokalisht | Mesatare; IndexedDB; statusi aktual kërkon internet |
| P3 | Njoftime për lirim/çmim | Njoftime për stacionet e zgjedhura kur ka burim dinamik | E madhe jashtë app-it të hapur; backend/push |
| P3 | Kërkim me fjali shqip | P.sh. “CCS mbi 150 kW gjatë rrugës për Sofje” | Mesatare; fillimisht parser i thjeshtë, AI opsional |
| P4 | Rezervim, pagesë dhe nisje karikimi | Transaksion real te operatori | E madhe; marrëveshje, API operatori, pagesa dhe backend |

### A. Mbulimi: puna e parë

Të krijojmë importues me një skemë të përbashkët stacion/lidhës dhe ID origjinale nga çdo burim. Të pranojmë publikimet e vlefshme OCM dhe providerët me kushte të përshtatshme, duke ruajtur licencën e secilit. Të testojmë operatorët lokalë me shembuj konkretë nga qytetet ku përdoruesi vëren mungesa.

Bashkimi duhet të mbështetet te ID-të, referencat EVSE dhe operatori/lokacioni; vetëm afërsia gjeografike mund të bashkojë gabimisht dy operatorë në të njëjtin parking. Importet duhen të jenë të përsëritshme: i njëjti burim nesër nuk duhet të dyfishojë numrin. Numrat e publikuar duhet të jenë shtesa neto dhe pas filtrimit të regjistrave të hequr/privatë, jo shuma e madhësive të skedarëve.

Për të dhëna dinamike ruajmë kohën e matjes, jo vetëm kohën e shkarkimit. Për stacionet pa kontroll aktual përdorim “status i pakonfirmuar”.

### B. Ndalesa me devijim real dhe renditje më të dobishme

Udhëmbarë e ka tashmë renditjen përgjatë itinerarit dhe largësinë anësore. Përmirësimi i ri është ndryshimi i rrugës reale kur shtohet stacioni: rruga me ndalesën krahasohet me rrugën pa të. Kjo shmang rastin kur një stacion në anën tjetër të autostradës duket afër, por kërkon shumë kilometra për kthim.

Të llogariten fillimisht kandidatët më të dobishëm, me matrica/cache dhe kufij kërkesash, jo një thirrje e re për çdo stacion gjatë lëvizjes së hartës.

### C. “Audi im” dhe planifikimi sipas energjisë

Përdoruesi zgjedh variantin e saktë të e-tron 2023; viti dhe emri i përgjithshëm nuk mjaftojnë për të vendosur kapacitetin e përdorshëm ose fuqinë maksimale. Fillimisht përqindja e baterisë dhe konsumi futen manualisht. Kjo është e realizueshme në web pa varësi nga myAudi.

Karta e një ndalese mund të tregojë: “Arritje rreth X% · Kariko deri në Y% · rreth Z min · +D min devijim”. Vlerat dalin vetëm nga llogaritja me të dhëna të mjaftueshme dhe emërtohen si vlerësime. Modeli përfshin kufirin e veturës, kurbën e karikimit dhe rezervën; më pas kalibrohet me terrenin, temperaturën, erën dhe konsumin e raportuar nga shoferi.

Në mungesë të SoC, kapacitetit ose rrugës së vlefshme nuk duhet të shpikim “arrin me 18%”. Mund të vazhdojmë të ofrojmë itinerarin dhe stacionet pa premtuar arritshmëri energjetike.

### D. Plan alternativ dhe krahasim i udhëtimeve

Dy ose tre variante të shpjeguara: më pak kohë, kosto më e ulët kur dihet tarifa, ose më shumë rezervë baterie. Në dështim të një stacioni, alternativa duhet të ketë rrugë të vlefshme dhe energji të mjaftueshme për vazhdimin, jo vetëm distancë të vogël në vijë ajrore.

Përdoruesi sheh arsyen dhe ndryshimin, pastaj zgjedh. Gjendja e panjohur e stacionit duhet të jetë faktor i dukshëm në vendim, jo disponueshmëri e supozuar.

### E. Çmimi, raportimet dhe veçoritë për më vonë

Çmimi duhet të mbetet i lidhur me operatorin, lidhësin, mënyrën e pagesës/roaming dhe datën. Kostoja e panjohur nuk është zero. Tarifa për minutë nuk shndërrohet në €/kWh pa supozime të shpjeguara për fuqinë reale. Krahasimi ndërmjet valutave kërkon kurs dhe datë.

Raportimet e shoferëve mund të mbushin boshllëqe në Ballkan: stacion i ri, koordinata, lidhës, foto dhe “e përdora më datë…”. Kërkohet ruajtje në server dhe verifikim përpara publikimit. Një raport i vjetër pozitiv nuk është status i lirë tani. Vlerësimet/fotot mund të jenë komuniteti ynë ose lidhje te burimet që lejojnë përdorimin; asnjë nga këto projekte nuk na jep automatikisht të drejtë për të kopjuar reviews të Google/PlugShare.

Pagesat, rezervimet dhe nisja e karikimit kanë vlerë vetëm pasi ekziston integrimi me operatorët. OCPP lidh karikuesin me sistemin e operatorit; OCPI mund të shërbejë për shkëmbim/roaming mes sistemeve. Mbështetja e një protokolli në kod nuk jep vetvetiu autorizim mbi stacionet e një rrjeti tjetër.

## Rruga e propozuar e zhvillimit

1. **Versioni pasues: mbulim dhe qartësi.** Zgjerim i importit OCM të lejuar, verifikim operatorësh lokalë, deduplikim sipas ID-ve dhe tregim i filtrave që fshehin pika. Matet përmirësimi në qytete të zgjedhura, me pika reale të njohura.
2. **Më pas: ndalesë e mençur për Audi-n.** Profil manual, devijim real dhe planifikim me rezervë e kurbë karikimi. Terreni/moti shfrytëzohen me kufijtë e modelit të shpjeguar.
3. **Pastaj: kosto, alternativa dhe raportime.** Sipas të dhënave që kemi, jo para tyre. Backend i vogël vetëm për funksionet që e kërkojnë.

Kriteret e përfundimit duhet të kontrollojnë stacione reale dhe rastet e dështimit: operatorë në të njëjtin parking që mbeten të ndarë; regjistër i hequr që nuk rikthehet nga kopja e vjetër; status i skaduar që bëhet i panjohur; devijim në anën tjetër të autostradës; rrugë që nuk arrihet me rezervën e zgjedhur; dhe tarifë e munguar që nuk renditet si falas.

## Snapshot-et e repository-ve të shqyrtuara

| Repository | Commit i kontrolluar |
| --- | --- |
| RiyaSubash/EV_stations-master | `f8132e3e54f520a43f924d4a7096d69e377ba039` |
| cs1m2414238/vidyutEV-1.0 | `3d063eb8f95ff57d829c37c3f1081fcbd1926b0f` |
| Unseencoderz/ChargeEase | `e746da7a4a4775dea31bd2176749750501838087` |
| matthewgall/homeassistant-evfinder | `2208145b32e0e8e9d865da9a2419c3cacf009921` |
| evpin/evpin | `6be486a1f0c068d940e1c0c2a1a4be529c619476` |
| cryptprosteel/ev-charge-finder | `71366a5ab7ee70f2d21c7e879db319921eb4e389` |
| rvssrao/ev-charging-finder | `6bd120201c18dbecff4569a660281d34ccdfaca6` |

ChargeEase ishte dërguar dy herë dhe u shqyrtua një herë. Ky dokument përmban rezultatet e revizionit dhe propozime; nuk deklaron se integrimet e propozuara janë aktivizuar.
