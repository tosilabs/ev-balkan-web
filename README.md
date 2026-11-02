# EV Balkan Web — versioni 1.4

**Gjendja:** versioni burimor është përgatitur dhe kontrollet lokale kaluan. Kontrollo ekzekutimin më të fundit te Actions për gjendjen e publikimit. Nëse Pages nuk është aktivizuar ende, ndiq hapat te seksioni GitHub Pages.

Web-faqe në shqip për kërkim karikuesish në Ballkan, e përshtatur për telefon dhe Audi e-tron evropian 2023. Nuk kërkon APK, llogari ose çelës API. Burimi i karikuesve është OpenStreetMap, jo lista e plotë e operatorëve.

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

Fotot Commons ngarkohen vetëm me veprim të përdoruesit, me autorin, licencën dhe lidhjen origjinale kur metadata lejon shfaqjen. Lidhjet e tjera të fotove dhe Mapillary hapen në burimin e tyre. Nuk kopjohen foto nga Google/PlugShare dhe nuk sajohet një foto për lokacionet ku mungon. Reviews ofrohen si kërkim i jashtëm në Google Maps, pa importuar yje ose komente dhe pa garantuar përputhje automatike të listing-ut. Përdoruesi kontrollon vendin që hapet.

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
2. Te **Actions**, zgjidh **Check and publish EV Balkan → Run workflow**, ose bëj push në main.
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

Kartat paraqesin operatorin, logon ose inicialet nëse logoja mungon, faqen e operatorit/lokacionit, aplikacionet Android/iOS kur janë të lidhura nga operatori, kontaktet, të gjithë lidhësit me fuqi/numër/V/A kur jepen, tarifat, orarin dhe qasjen. Detajet përfshijnë udhëzime hyrjeje, pajisje, pagesa, ID EVSE, referencat, fotot dhe prejardhjen e të dhënave. Nuk prodhojmë APK të operatorëve. Logot janë referenca të jashtme nga faqet zyrtare, me burim; nuk kopjohen si asete të EV Balkan.

Open Charge Map importohet nga eksporti publik zyrtar `openchargemap/ocm-export`, me checkout të pjesshëm për AL/BA/BG/GR/HR/ME/MK/RO/RS/SI/XK. Importohen vetëm regjistrimet e miratuara me DataProviderID=1 dhe licencë të hapur të konfirmuar te referencedata.json (aktualisht CC BY 4.0). Burimet e tjera të përziera nuk importohen automatikisht. Pikat private, të planifikuara, të hequra ose jofunksionale në regjistrim përjashtohen nga ky import. Statusi historik OCM nuk trajtohet si status aktual dhe nuk kualifikon për “Në punë”. Importi pasuron vlerat që mungojnë; regjistrat e drejtpërdrejtë të operatorëve kanë përparësi. Komentet personale dhe fotot OCM nuk ripublikohen pa licencë individuale.
