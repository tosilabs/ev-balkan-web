# Udhëmbarë

**Çdo rrugë, më e menduar.**

Aplikacion në shqip për udhëtime elektrike: karikues pranë teje, përgjatë itinerarit ose pranë një vendi, kohë udhëtimi, profil lartësie, mot dhe radar reshjesh. Punon në shfletuesin e telefonit dhe mund të instalohet si PWA. Vendndodhja mund të caktohet manualisht kur GPS mungon.

**Versioni:** 2.2.0 · identiteti i ri Udhëmbarë. Projekti është përgatitur për repository më vete; shih [MIGRIMI.md](MIGRIMI.md) për gjendjen dhe hapat e krijimit/publikimit. Adresa e synuar nuk konsiderohet e publikuar derisa GitHub Pages të ketë përfunduar.

Lidhjet me myAudi, Waze dhe OsmAnd, burimet e karikuesve, statusi kur ofrohet, fotografitë/lidhjet zyrtare, historiku, moti dhe profili i terrenit ruhen si funksione. Çmimet dhe statusi shfaqen vetëm kur burimi i ofron; sinjalet e motit janë orientuese, jo alarme zyrtare.

## Burime shtesë publike (v1.4)

Përveç OpenStreetMap, pipeline lexon këto burime anonime pa çelës API:

| Burimi | Mbulimi | Të dhënat | Qasja / kushtet |
| --- | --- | --- | --- |
| MYFAH, Ministria greke e Infrastrukturës dhe Transportit | Greqi | Lokacione, EVSE, lidhës, fuqi, operatorë, foto të lidhura | ZIP JSON publik, i publikuar çdo ditë; atribuohet regjistri dhe kushtet publike MYFAH/AFIR |
| Fines Charging | Rrjeti i operatorit në Bullgari dhe lokacionet që publikon | Lokacione, lidhës, fuqi, interval çmimi kur jepet shprehimisht EUR/kWh | API publike, pa auth, CORS i lejuar; atribuim te operatori |
| Qyteti i Zagrebit përmes data.gov.hr | Zagreb, jo gjithë Kroacia | Koordinata, adresa, numër prizash, AC/DC | GeoJSON publik, Otvorena dozvola (OD); nuk hamendësohen standardi i prizës ose kW |

URL dhe gjendja aktuale gjenden në `dist/data/sources.json`, i gjeneruar në publikim, dhe në faqe te **? → Burimet e të dhënave · EU / NAP**. `data.europa.eu` trajtohet si portal zbulimi; Eurostat si statistikë, jo si lokacione. NAP Slovenia raportohet si qasje që kërkon autorizim (endpoint-i kthen 401; licenca CC BY-SA 4.0 është falas). BGNAP kërkon regjistrim/çelës API sipas dokumentacionit. Asnjëri nuk paraqitet si feed i integruar pa qasje reale.

Burimet ruhen veçmas: `osm-base.json` (OSM/ODbL), `source-myfah.json`, `source-fines.json`, `source-zagreb.json` (kushtet e tyre), plus pamja e bashkuar `charging-balkans.json` me proveniencën për çdo rekord. Të dhënat e papërpunuara shkarkohen përkohësisht në `.source-cache/` dhe nuk publikohen. Nuk importohen numra të furnizimeve elektrike ose fusha të brendshme OCPI që nuk nevojiten.

Bashkimi përdor përputhje konservative: operator/emër/ID EVSE i njëjtë dhe distancë deri 35 m. Operatorë të ndryshëm ose dy rekorde të ndryshme brenda të njëjtit regjistër nuk shkrihen vetëm sepse janë afër. Mund të mbeten dublime kur burimet përdorin emra të ndryshëm; kjo shmang fshirjen e pikave të tjera fizike. Në dështim të një burimi mbahet kopja e fundit me datën e saj dhe katalogu e shënon si të tillë.

**Disponueshmëria Fines:** në detaje ka butonin për kontroll. Kërkesa bëhet vetëm kur përdoruesi e kërkon; përgjigjja për të njëjtin lokacion ripërdoret për të paktën dy minuta. Shfaqet koha e burimit. Përgjigjet pa timestamp të vlefshëm ose më të vjetra se dhjetë minuta nuk paraqiten si aktuale. Nuk ka garanci rezervimi ose status për të gjitha rrjetet. Statusi statik i MYFAH nuk shfaqet si status në kohë reale.

Burime primare:

- https://electrokinisi.yme.gov.gr/public/HelpMyfah/PublicData/
- https://finescharging.com/public-api
- https://data.gov.hr/ckan/en/dataset/geoportal-elektricne-punionice
- https://nap.si/en/datasets_details?id=db82d062-1518-b71a-8036-9823bbd36e5a
- https://sipbg.gov.bg/bgnap/portal/en/instructions
- https://data.europa.eu/en

## Detajet e lokacioneve (v1.3)

Shenjat vizuale në hartë janë 24 px, me numra që përputhen me rendin e listës së kërkimit aktual. Ngjyrat dhe filtri ndjekin kategoritë EAFO/AFIR: AC <7.4 kW i ngadaltë, 7.4–22 kW mesatar, >22 kW i shpejtë; DC <50 kW i ngadaltë, 50–<150 kW i shpejtë dhe ≥150 kW ultra. ≥350 kW shënohet veçmas në detaje. Mungesa e fuqisë ose llojit AC/DC jep “Pa klasifikim”, jo vlerë të hamendësuar. Kategoria e lokacionit bazohet te lidhësi i zgjedhur me fuqinë më të lartë për të cilin dihet lloji AC/DC.

Burimi: https://alternative-fuels-observatory.ec.europa.eu/general-information/recharging-systems . Kjo nuk është shpejtësi e garantuar për veturën konkrete.

Seksioni “Foto, operatori dhe informacione” përfshin lidhësit, orarin, përshkrimin, qasjen, pagesat dhe kontaktet kur janë në regjistër. Lidhjet e operatorit merren nga OSM; një direktori e kufizuar plotëson lidhjet zyrtare për Eldrive, Charge&GO, Tesla, OneCharge dhe EVN Macedonia të identifikuar qartë. EVN dhe Petrol nuk lidhen automatikisht me një kompani të një vendi tjetër kur emri është i paqartë.

Fotot Commons ngarkohen vetëm me veprim të përdoruesit, me autorin, licencën dhe lidhjen origjinale kur metadata lejon shfaqjen. Lidhjet e tjera të fotove dhe Mapillary hapen në burimin e tyre. Nuk kopjohen foto nga Google/PlugShare dhe nuk sajohet një foto për lokacionet ku mungon. Vlerësimet ofrohen si kërkim i jashtëm në Google Maps, pa importuar yje ose komente dhe pa garantuar përputhje automatike të listing-ut. Përdoruesi kontrollon vendin që hapet.

Regjistri i eksportuar ka `schemaVersion: 2` dhe ruan fushat shtesë. Një eksport i vjetër nuk ripërdoret si eksport i freskët me metadata të plota; në rast dështimi mund të ruhet versioni i mëparshëm me fushat që disponon.

## Pamja e hartës (v1.2)

Harta zë të gjithë ekranin. Kërkimi dhe filtrat hapen në një dialog; lista hapet vetëm kur shtypet “Karikuesit” ose një shenjë në hartë. Kërkimi pranë vendndodhjes nis automatikisht dhe kërkon lejen e shfletuesit. Si parazgjedhje rrezja është 10 km, fuqia çfarëdo dhe lidhësit të gjithë. Filtrat e versioneve të vjetra nuk e ngushtojnë pamjen e parë të re.

Të gjithë karikuesit publikë në regjistër brenda rrezes së kërkuar vendosen në hartë; kufiri i mëparshëm prej 200 shenjash është hequr. Lista lexohet në faqe me 12 karta, pa kufizuar shenjat në hartë. Lidhësit që nuk përputhen me e-tron dallohen në detaje. Regjistri nuk pretendon të përmbajë çdo karikues fizik.

## Rregullimi i pritjes së gjatë (v1.1)

Kërkimet brenda zonës 34°–48.5° N / 12°–30° E përdorin një kopje publike të regjistrit OpenStreetMap të përgatitur gjatë publikimit. Telefoni shkarkon një skedar nga e njëjta faqe; nuk pret që Overpass të kryejë një kërkim të ri për çdo përdorues. Data e shkarkimit shfaqet pranë rezultateve dhe nuk nënkupton verifikim fizik të stacioneve.

GitHub Actions tenton rifreskimin çdo ditë në 04:17 UTC dhe gjatë publikimeve. Kur burimet nuk përgjigjen, ruan datën e kopjes së mëparshme të publikuar; nëse nuk ekziston asnjë kopje e vlefshme, publikimi ndalet. Jashtë kësaj zone ka kërkim rezervë online. Disa qytete kryesore të Ballkanit mund të zgjidhen pa Photon. Itinerari ka dy shërbime rezervë, por ende kërkon internet.

Për zhvillim lokal, ekzekuto `node scripts/update-charging.mjs` përpara serverit që të përgatitësh regjistrin real. Skedari gjenerohet në `dist/data/charging-balkans.json` dhe nuk ndiqet në Git.

## Funksionet

- **Pranë meje** me lejen e vendndodhjes së shfletuesit.
- **Në rrugë**: destinacion, itinerar rrugor OSRM dhe karikues në korridorin e zgjedhur rreth tij.
- **Një vend**: qytet, adresë, koordinata ose zgjedhje e një pike me prekje në hartë.
- Rreze 5/10/25/50/100 km; fuqi minimale; CCS2 ose Type 2. Lidhësit e paspecifikuar dallohen dhe mund të përjashtohen.
- Ruajtje karikuesish dhe filtrash në shfletues. Nuk sinkronizohen mes pajisjeve.
- **Dërgo te Audi**: udhëzime dhe menuja standarde e ndarjes së telefonit. Zgjidh myAudi nëse ofrohet, pastaj “Senden”. Nuk përdoret API private dhe nuk kërkohet fjalëkalimi i Audi-t. Pranimi i lidhjes nga myAudi dhe mbërritja në MMI duhen verifikuar në telefonin/veturën e përdoruesit.
- Alternativa: kopjim, hapje në Google Maps, OsmAnd ose Waze.
- Manifest dhe service worker për ikonë në ekranin kryesor dhe ruajtjen e ndërfaqes. Kërkimi, itinerari dhe harta kërkojnë internet.

## Hapja lokale

Kërkohen Node.js 20+ për kontrollet dhe Python 3 për serverin. Nuk ka varësi npm për t'u instaluar.

```sh
npm run check
npm test
npm start
```

Hap `http://localhost:8080`. Për vendndodhje dhe ndarje nga telefoni nevojitet një adresë HTTPS e arritshme nga telefoni. Hapja e drejtpërdrejtë e index.html si file:// nuk mbështetet.

## GitHub Pages

Vendose përmbajtjen e kësaj dosjeje në rrënjën e një repository të ri. Përfshi dosjen e fshehur `.github`.

1. Te **Settings → Pages → Build and deployment**, zgjidh **GitHub Actions**.
2. Te **Actions**, zgjidh **Kontrollo dhe publiko Udhëmbarë → Run workflow**, ose bëj push në main.
3. Pas suksesit, lidhja shfaqet te ekzekutimi i deploy-t dhe Settings → Pages.

Workflow kontrollon JavaScript-in dhe testet përpara publikimit të dosjes `dist`. Nuk ka secrets. GitHub Pages e publikon faqen në internet; mundësia për repository privat varet nga plani GitHub. Mos shto kredenciale, pozicione personale ose të dhëna konfidenciale në repository.

## Kufizime dhe burime

- © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright). Të dhënat kanë licencë ODbL. Atribuimi shfaqet në hartë dhe fund të faqes. Çdo rezultat lidhet me regjistrin burimor. Regjistrat mund të mungojnë ose të jenë të vjetër.
- Hartat online nga tile.openstreetmap.org. Nuk ruhen tiles për përdorim offline dhe nuk ka prefetch. Për trafik të madh duhet ofrues i përshtatshëm sipas [politikës së tiles](https://operations.osmfoundation.org/policies/tiles/).
- [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) për karikuesit: overpass-api.de dhe si rezervë overpass.private.coffee. Kërkesat kanë afat kohor dhe kufi memorie. Në dështim tregohet gabim; nuk paraqiten të dhëna të sajuara.
- [Photon](https://github.com/komoot/photon) për qytete/adresa. Kërkohet vetëm kur shtypet butoni; nuk ka kërkesa automatike për çdo shkronjë. Përdorimi demonstrues nuk ka SLA.
- [OSRM](https://project-osrm.org/) për itinerarin. Shërbim publik demonstrues, jo SLA prodhimi. Kërkohen itinerare deri në 1500 km. Distanca e karikuesit nga itinerari është gjeometrike; nuk përfaqëson devijimin me veturë, minutat shtesë ose qasje nga e njëjta anë e autostradës. Itinerari i Audi-t mund të ndryshojë.
- Për shumicën e rrjeteve nuk ka status të lirë/i zënë në këtë faqe; Fines ka kontroll sipas kërkesës te detajet. `charge`/`fee` janë tarifa të raportuara; nuk konvertohen në €/kWh dhe duhen konfirmuar te operatori.
- Nuk ka optimizim ndalesash sipas baterisë dhe nuk lexohen të dhëna nga vetura.
- Android Auto nuk shfaq një web-faqe të zakonshme drejtpërdrejt. Përdor myAudi për destinacionin ose një aplikacion navigimi të instaluar.
- Për fotot e kërkuara dërgohet emri i skedarit te Wikimedia Commons dhe merret thumbnail nga upload.wikimedia.org. Nuk dërgohet vendndodhja GPS atje.

Nuk ka lidhje automatike ose konfirmim dërgimi te Audi. Menuja e ndarjes duhet të provohet me myAudi; kur mungon ka alternativa.

## Privatësia

Vendndodhja kërkohet vetëm kur nis kërkimin përkatës. Qyteti/adresa dërgohet te Photon; zona e kërkimit te Overpass; origjina dhe destinacioni te OSRM. Ofruesit e hartave, fontet Google dhe CDN Leaflet marrin kërkesat përkatëse të shfletuesit. Destinacioni dërgohet te aplikacioni/faqja e navigimit kur e zgjedh përdoruesi. Preferencat, teksti i fundit i kërkimit dhe të ruajturat mbeten në localStorage; nuk ruhet historia e GPS-së. Fshirja e të dhënave të faqes i heq ato.

## Verifikimi

Testet kontrollojnë koordinatat, distancat, korridorin, filtrat për lidhës/fuqi, përjashtimin e karikuesve privatë, regjistrat e dyfishtë, qendrat e objekteve dhe lokacionin e ndarë. Kontrollet e sintaksës dhe testet lokale nuk zëvendësojnë provën në telefon. GitHub Actions kryen prova në Chromium. Skenarët e ndërfaqes përdorin fixture të dallueshme testimi; një provë më vete kërkon karikues realë nga regjistri i shkarkuar pranë Shkupit, me Photon/Overpass të bllokuar në shfletues për të verifikuar pavarësinë e kërkimit lokal. GPS fizik dhe dorëzimi në myAudi/MMI mbeten prova në pajisjen e përdoruesit.

Lista e provës në telefon: GPS i lejuar/refuzuar; tri kërkimet; qytete me emër të njëjtë; filtër CCS2 100 kW+; prekje në hartë; anulim gjatë kërkimit; ruajtje pas rifreskimit; ndarje myAudi; alternativat e kopjimit dhe Google Maps; gabim rrjeti; ekrane 360 px.

### Statusi “Në punë” (v1.5)
Butoni në hartë dhe filtri “Vetëm të konfirmuar në punë” përfshijnë vetëm pika me të paktën një lidhës të përshtatshëm të raportuar të lirë, në karikim ose të rezervuar. Fines është aktualisht burimi i vetëm me kontroll automatik operacional. Lidhësit offline/faulted përjashtohen. Regjistrat statikë, mungesat dhe raportet më të vjetra se 10 minuta shënohen të pakonfirmuara. Filtri është opsional: në fillim shfaqen të gjitha pikat. Të dhënat lexohen nga API publike e Fines, me cache së paku 2 minuta, pa polling automatik. “Në punë” nuk garanton lidhës të lirë, hyrje ose sukses të seancës.

### Nisje manuale dhe informacione të zgjeruara (v1.6)
Te “Në rrugë”, zgjidh GPS ose cakto nisjen me qytet/adresë/koordinata apo në hartë. Destinacioni mund të zgjidhet veçmas në hartë. Nëse GPS refuzohet ose dështon, formulari hapet me nisjen manuale dhe ruan destinacionin. Për kërkim pranë teje kalon te një vend manual. Koordinatat dhe preferencat ruhen vetëm në shfletues.

Kartat paraqesin operatorin, logon ose inicialet nëse logoja mungon, faqen e operatorit/lokacionit, aplikacionet Android/iOS kur janë të lidhura nga operatori, kontaktet, të gjithë lidhësit me fuqi/numër/V/A kur jepen, tarifat, orarin dhe qasjen. Detajet përfshijnë udhëzime hyrjeje, pajisje, pagesa, ID EVSE, referencat, fotot dhe prejardhjen e të dhënave. Nuk prodhojmë APK të operatorëve. Logot janë referenca të jashtme nga faqet zyrtare, me burim; nuk kopjohen si asete të Udhëmbarë.

Open Charge Map importohet nga eksporti publik zyrtar `openchargemap/ocm-export`, me checkout të pjesshëm për AL/BA/BG/GR/HR/ME/MK/RO/RS/SI/XK. Importohen vetëm regjistrimet e miratuara me DataProviderID=1 dhe licencë të hapur të konfirmuar te referencedata.json (aktualisht CC BY 4.0). Burimet e tjera të përziera nuk importohen automatikisht. Pikat private, të planifikuara, të hequra ose jofunksionale në regjistrim përjashtohen nga ky import. Statusi historik OCM nuk trajtohet si status aktual dhe nuk kualifikon për “Në punë”. Importi pasuron vlerat që mungojnë; regjistrat e drejtpërdrejtë të operatorëve kanë përparësi. Komentet personale dhe fotot OCM nuk ripublikohen pa licencë individuale.

### Lartësia përgjatë itinerarit dhe historiku (v1.7)
Çdo itinerar merr profil terreni nga Open-Meteo/Copernicus DEM GLO-90 (90 m), me Open Topo Data/SRTM90m si burim rezervë. Mostrat shtrihen nga nisja deri në fund, zakonisht çdo 350 m dhe maksimumi 400 pika; për rrugë të gjata intervali rritet dhe shfaqet në UI. Kërkesat ndahen në grupe deri në 100 pika. Fallback-u respekton intervalin së paku 1.1 sekonda. Në dështim të dy shërbimeve ndalen kërkesat e tjera dhe pjesët pa të dhëna mbeten gri. Itinerari dhe karikuesit funksionojnë pavarësisht profilit. Kërkesa e vjetër anulohet kur nis një tjetër.

Grafiku interaktiv dhe rruga përdorin të njëjtat segmente. Ngjyrimi ruan kthesat e gjeometrisë origjinale, pa prerë rrugën me vija të drejta ndërmjet mostrave. Ngjitje ≥4%: e kuqe; 1.5–4%: portokalli; terren ndërmjet -1.5% dhe 1.5%: e gjelbër; zbritje ≤-1.5%: e kaltër. Të panjohurat janë gri. Ngjyrat modelojnë vetëm ndikimin relativ të pjerrësisë në konsum, jo kWh, autonomi ose SOC. Nuk modelohen moti, shpejtësia, trafiku, masa dhe kufijtë e rigjenerimit. DEM-i jep terrenin, prandaj tunelet/urat mund të kenë lartësi të ndryshme nga rruga. Përdoret medianë e tre mostrave kundër majave të izoluara; boshllëqet nuk plotësohen si 0. Totali i ngjitjes/zbritjes anashkalon ndryshimet nën 3 m dhe është i përafërt.

Historiku mban deri në 30 kërkime/itinerare në localStorage të këtij shfletuesi: filtra, vendi i zgjidhur, nisja, destinacioni, rruga, koha dhe profili i lartësisë kur ekziston. Rrugët tepër të detajuara thjeshtohen me Ramer–Douglas–Peucker për ruajtje të kufizuar (maksimumi 2000 pika), duke ruajtur skajet dhe kthesat. Rihapja përdor koordinatat e ruajtura pa GPS ose rillogaritje të itinerarit dhe ripërdor profilin; karikuesit/statusi merren rishtazi. Koha e profilit të ruajtur shfaqet. Kërkimet e njëjta përditësojnë historikun në vend që ta mbushin me kopje. Mund të fshihet një hyrje ose gjithë historiku. Nuk sinkronizohet me llogari/server; kufizimi i hapësirës mund të mbajë më pak hyrje.

Atribuimi i lartësisë shfaqet te profili dhe katalogu i burimeve. API falas Open-Meteo është për përdorim personal/jokomercial, si kjo faqe pa reklama ose abonime; përdorimi komercial kërkon planin/marrëveshjen përkatëse. Burime: https://open-meteo.com/en/docs/elevation-api dhe https://open-meteo.com/en/terms .

### Panel minimalist dhe largësi/koha rrugore (v1.8)
Harta përdor OpenFreeMap Positron (të dhëna OpenMapTiles/OSM) për vija të holla, ngjyra të qeta dhe më pak zhurmë vizuale. MapLibre 4.7.1 lidhet me Leaflet përmes adapterit 0.1.3. OSM raster mbetet rezervë kur WebGL/CDN/stili nuk ngarkohet; pamja rezervë qetësohet vizualisht. Atribuimet mbeten në hartë. Kartat e listës janë të shkurtra; prekja e një shenje ose “Hap stacionin” hap panelin e veçantë me orarin, lidhësit, statusin dhe butonin myAudi. Informacionet e plota dhe lidhjet zyrtare janë pas hapjes së detajeve.

Rreshti i udhëtimit përdor distancën dhe kohëzgjatjen e rrugës automobilistike OSRM, me dy serverë dhe cache deri në 2 minuta për të njëjtin çift koordinatash. Nuk nxjerr kohë nga largësia në vijë ajrore dhe nuk pretendon trafik aktual. Përdoret GPS i marrë në minutën e fundit; përndryshe kërkohet GPS ose, kur ai mungon, nisje manuale / nisja e itinerarit me etiketë të qartë. Nisja manuale mund të jetë qytet, adresë, koordinata ose pikë në hartë. Kërkesa e stacionit të mëparshëm anulohet kur paneli mbyllet ose zgjidhet një tjetër. Dështimi nuk shfaq ETA të shpikur. Kjo llogaritje nuk e ndryshon itinerarin e planifikuar ose profilin e tij.

Burime: https://openfreemap.org/quick_start/ dhe https://project-osrm.org/docs/v5.24.0/api/ .

### Moti, radari dhe kontrasti (v1.9)
Pamje me kontrast më të lartë, tekst të errët, panele të çelëta dhe theks të verdhë, duke ruajtur identitetin Udhëmbarë. Butoni “☀ Moti” hap motin pa mbivendosur listën e stacioneve apo profilin. Parashikimi shfaqet si shenja të veçanta në hartë, pa zëvendësuar ngjyrimin e pjerrësisë.

Open-Meteo Forecast kërkohet me koordinata në grup, në deri 10 pika përgjatë gjithë itinerarit (rreth çdo 70 km, interval më i madh për rrugë të gjata). Për kërkim sipas vendit përdoret një pikë. Merren temperaturë °C, reshje mm/orë, probabilitet %, borë cm/orë, dukshmëri m, erë/rafale km/h dhe kod WMO, me orë UNIX/UTC të shfaqura sipas telefonit. Ora e kalimit përafrohet nga kohëzgjatja totale OSRM proporcionalisht me distancën, pa trafik/ndalesa. Kohëzgjatja ruhet tani në historik; për hyrje të vjetra pa të shfaqet ora e kërkimit. Rihapja e rrugës nuk përdor mot të vjetër nga historiku. Ka cache në memorie deri 10 minuta dhe rifreskim manual; kërkesat e vjetra anulohen. Shërbimi i motit nuk bllokon karikuesit ose itinerarin. Vlerat null nuk bëhen zero; dështimi nuk paraqitet si mot i kthjellët.

Sinjalet janë të app-it, jo alarme zyrtare: rafale ≥60 km/h (të theksuara ≥80); reshje ≥5 mm/orë (të theksuara ≥10); borë ≥0.2 cm/orë ose kod bore; dukshmëri <1000 m (e theksuar <200); stuhi/reshje të ngrira sipas kodit; mundësi ngrice kur temperatura ≤2°C dhe reshjet >0.1 mm/orë. Nuk matet temperatura/ngrica e asfaltit dhe mungesa e sinjaleve nuk garanton rrugë pa rreziqe. Lidhja me Meteoalarm jep qasje te paralajmërimet zyrtare për shtetet që mbulohen; CAP/alarme zyrtare nuk importohen.

RainViewer Weather Maps aktivizohet shprehimisht nga përdoruesi. Merren deri 13 pamje të kaluara, me zgjedhje kohe, animacion një kornizë/sekondë, transparencë dhe maskë mbulimi. Nuk importohen nowcast/infrared ose alarme private. Përdoret maxNativeZoom=7, pa pretenduar hollësi që burimi nuk i jep. Metadata ripërdoret deri 5 minuta; pamjet tepër të vjetra refuzohen. Zona pa radar nuk supozohet e thatë; maska dhe shënimet e sqarojnë. Animacioni ndalet kur paneli mbyllet ose faqja kalon në sfond. Shfaqet atribuimi Open-Meteo dhe RainViewer.

Burime: https://open-meteo.com/en/docs (CC BY 4.0, API falas vetëm jokomercial) dhe https://www.rainviewer.com/api/weather-maps-api.html (API personal/edukativ, pa garanci mbulimi/SLA).

### Rrufeja, e kaltra elektrike dhe renditja përgjatë itinerarit (v2.1)
Rikthehet forma fillestare e logos me rrufe, me të kaltër elektrike dhe të bardhë. Theksi kryesor, butonat dhe tema PWA përdorin të kaltrën. Ikona ka query versioni për të shmangur rikthimin e pamjes së vjetër nga cache.

Filtri ka edhe 300 m, 500 m, 1 km dhe 2 km; te itinerari ka shkurtoren “Vetëm përgjatë rrugës · 300 m”. Rrezja matet në të dyja anët përgjatë gjithë gjeometrisë së rrugës. Renditja fillestare ndjek progresin nga nisja drejt fundit, duke projektuar çdo stacion te pika e afërt e itinerarit dhe llogaritur gjatësinë e kumuluar të rrugës. Nuk renditet më sipas largësisë anësore. Ofrohen edhe renditja sipas largësisë në vijë ajrore nga nisja, si dhe sipas largësisë nga vija. Kur nisja merret nga GPS, rendi fillon nga ai vend; për nisje manuale ose itinerar të ruajtur përdoret nisja përkatëse. Nuk gjurmohet automatikisht përparimi gjatë drejtimit.

Lista dallon kilometrat përgjatë itinerarit nga largësia anësore; ato nuk paraqiten si devijim real ose rrugë automobilistike deri te karikuesi. ETA dhe largësia reale e OSRM mbeten te paneli i stacionit. Filtrat/renditja ruhen me kërkimin në historik dhe numrat e shenjave përputhen me listën.

Kartat e listës kanë pamje reale të hartës së vendndodhjes, me pllaka standarde OpenStreetMap në zoom 14 dhe pozicionim Web Mercator. Ngarkohen vetëm kartat që duken në panel, pa shkarkim paraprak ose ruajtje offline të pllakave. Pamja ka pikën e stacionit, atribuimin dhe veprim për të hapur detajet. Mungesat e pllakave shënohen; nuk krijohet një hartë e sajuar. Pamjet përshtaten me gjerësinë e kartës, pa krijuar një instancë të rëndë harte për çdo stacion.


### Radari, sinjalet përgjatë rrugës dhe GPS (v2.2)
Kornizat RainViewer përdorin edhe identifikues opakë me shkronja/numra; ruhet shtegu i API-së me validim, pa e interpretuar si timestamp. Pikat e parashikimit kërkohen çdo rreth 25 km deri në 20 pika, me një përmbledhje mbi hartë dhe listë sinjalesh me kilometrin/orën e kalimit. Mungesa e të dhënave tregohet veçmas nga mungesa e sinjaleve. Sinjalet burojnë nga parashikimi, nuk janë alarme zyrtare ose raporte policie.
GPS ka shenjë të veçantë blu me rreth saktësie dhe kohën e matjes. Pas lejes së përdoruesit, pozicioni përditësohet ndërsa faqja është në plan të parë; ndalet kur ajo fshihet. Një pikë manuale nuk etiketohet kurrë si vendndodhja aktuale. GPS i vjetër ose i padisponueshëm ngjyroset gri dhe emërtohet si vendndodhja e fundit.

### Udhëtimi me bateri, hartë e afërt dhe raportime (v3.0)

Logoja vektoriale ndjek referencën e përdoruesit: shenjë blu me rrufe të bardhë dhe kontur të bardhë. Kërkimet hapen në nivel lagjeje; kartat përdorin zoom 17 dhe stacioni i përzgjedhur afrohet në zoom 16+, sipër panelit. “Pamja e plotë” rikthen shtrirjen e gjithë itinerarit/rrezes.

“Udhëtimi” përfshin profil manual të veturës, kapacitet të përdorshëm, SoC, rezervë, konsum dhe kufij AC/DC. Planifikimi kontrollon matricë reale OSRM për deri në 16 kandidatë, rezervën në çdo segment, një kurbë orientuese karikimi dhe më pas rrugën reale me ndalesat. Motori i planifikimit dhe verifikimi përdorin të njëjtin server rrugor. Mungesa e një rruge ose e të dhënave nuk paraqitet si sukses. Temperaturat e parashikimit përdoren kur nuk është vendosur temperaturë manuale; terreni për energjinë kërkon masën dhe profilin e rrugës. Vlerësimet nuk janë telemetri myAudi ose kurba të matura të modelit.

Devijimi i stacionit llogarit dy rrugë automobilistike nga e njëjta nisje deri te destinacioni, me dhe pa ndalesën; distanca anësore nuk ripërdoret si devijim. Kostoja bazohet vetëm në tarifa që mund të lexohen, pa i trajtuar çmimet e panjohura si zero ose pa mbledhur valuta të ndryshme.

Indeksi `registry-index.json` ngarkon vetëm skedarët gjeografikë të nevojshëm nga `data/tiles/`. Regjistri i plotë dhe Overpass mbeten alternativa. OCM përfshin publikimet 100/200 dhe providerë me CC BY/CC0 të konfirmuar, pa licenca jo-komerciale dhe pa regjistra të hequr ose privatë.

Raportet/vlerësimet personale ruhen lokalisht. Dërgimi publik hap një draft të rishikueshëm në GitHub; nuk kryen dërgim automatik. Kontribuesi konfirmon CC BY 4.0 dhe mund të bashkëngjitë foto në GitHub. Vetëm çështjet me etiketën `station-approved` importohen nga `scripts/import-community.mjs`; mirëmbajtësi krijon etiketën dhe miraton raportet. Raporti historik nuk shndërrohet në status të lirë në kohë reale. Stacionet e reja të miratuara janë burim i veçantë me ID të çështjes dhe atribuim.

Udhëtimi dhe stacionet mund të ruhen në IndexedDB. Kopja offline shfaq datën dhe kufizimet; harta e re, statuset dhe llogaritja e një rruge të re kërkojnë rrjet. Nuk bëhet shkarkim masiv i pllakave OSM. Ndjekja e stacioneve me burim aktual kontrollon çdo 2 minuta vetëm ndërsa faqja është në plan të parë. Pagesat, rezervimet dhe komandat e nisjes së karikimit kërkojnë marrëveshje/API operatori dhe nuk simulohen si transaksione reale.

### Revizion i ndërfaqes dhe besueshmërisë (v3.1)

Menu më e qartë, filtra shtesë të grupuar, kontrolle më të mëdha dhe përdorim me tastierë. Korrigjohen tarifat e paqarta/falas, rillogaritja e kostos në rrugën reale, planet e vjetra pas dështimit, rikthimi i kandidatëve të përjashtuar, anulimi i kërkesave të ndara dhe përzierja e versioneve të regjistrit. Raportet e ndryshuara pas miratimit kërkojnë miratim të ri. Detajet dhe kufijtë e kontrollit janë te [REVIZIONI_3_1.md](docs/REVIZIONI_3_1.md).

## Modaliteti i vozitjes · 3.2

Menuja `⋯` → **Modaliteti i vozitjes** hap një pamje të qetë, me kartë të vetme, GPS, kohë rrugore, shkurtore CCS të shpejtë dhe navigim Waze/Audi. `Dil ×` rikthen pamjen e plotë. [Funksionet dhe shqyrtimi i EMPower, scraper-it dhe Powerly](docs/MODALITETI_VOZITJES_3_2.md).
