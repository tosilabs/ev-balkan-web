# EV Balkan Web — versioni 1.1

**Gjendja:** versioni burimor është përgatitur dhe kontrollet lokale kaluan. Kontrollo ekzekutimin më të fundit te Actions për gjendjen e publikimit. Nëse Pages nuk është aktivizuar ende, ndiq hapat te seksioni GitHub Pages.

Web-faqe në shqip për kërkim karikuesish në Ballkan, e përshtatur për telefon dhe Audi e-tron evropian 2023. Nuk kërkon APK, llogari ose çelës API. Burimi i karikuesve është OpenStreetMap, jo lista e plotë e operatorëve.

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
- [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) për karikuesit: overpass-api.de dhe si rezervë overpass.kumi.systems. Kërkesat kanë afat kohor dhe kufi memorie. Në dështim tregohet gabim; nuk paraqiten të dhëna të sajuara.
- [Photon](https://github.com/komoot/photon) për qytete/adresa. Kërkohet vetëm kur shtypet butoni; nuk ka kërkesa automatike për çdo shkronjë. Përdorimi demonstrues nuk ka SLA.
- [OSRM](https://project-osrm.org/) për itinerarin. Shërbim publik demonstrues, jo SLA prodhimi. Kërkohen itinerare deri në 1500 km. Distanca e karikuesit nga itinerari është gjeometrike; nuk përfaqëson devijimin me veturë, minutat shtesë ose qasje nga e njëjta anë e autostradës. Itinerari i Audi-t mund të ndryshojë.
- Nuk ka status të lirë/i zënë në kohë reale. `charge`/`fee` janë tarifa të raportuara; nuk konvertohen në €/kWh dhe duhen konfirmuar te operatori.
- Nuk ka optimizim ndalesash sipas baterisë dhe nuk lexohen të dhëna nga vetura.
- Android Auto nuk shfaq një web-faqe të zakonshme drejtpërdrejt. Përdor myAudi për destinacionin ose një aplikacion navigimi të instaluar.
- Nuk ka lidhje automatike ose konfirmim dërgimi te Audi. Menuja e ndarjes duhet të provohet me myAudi; kur mungon ka alternativa.

## Privatësia

Vendndodhja kërkohet vetëm kur nis kërkimin përkatës. Qyteti/adresa dërgohet te Photon; zona e kërkimit te Overpass; origjina dhe destinacioni te OSRM. Ofruesit e hartave, fontet Google dhe CDN Leaflet marrin kërkesat përkatëse të shfletuesit. Destinacioni dërgohet te aplikacioni/faqja e navigimit kur e zgjedh përdoruesi. Preferencat, teksti i fundit i kërkimit dhe të ruajturat mbeten në localStorage; nuk ruhet historia e GPS-së. Fshirja e të dhënave të faqes i heq ato.

## Verifikimi

Testet kontrollojnë koordinatat, distancat, korridorin, filtrat për lidhës/fuqi, përjashtimin e karikuesve privatë, regjistrat e dyfishtë, qendrat e objekteve dhe lokacionin e ndarë. Kontrollet e sintaksës dhe testet lokale nuk zëvendësojnë provën në telefon. GitHub Actions kryen prova në Chromium. Skenarët e ndërfaqes përdorin fixture të dallueshme testimi; një provë më vete kërkon karikues realë nga regjistri i shkarkuar pranë Shkupit, me Photon/Overpass të bllokuar në shfletues për të verifikuar pavarësinë e kërkimit lokal. GPS fizik dhe dorëzimi në myAudi/MMI mbeten prova në pajisjen e përdoruesit.

Lista e provës në telefon: GPS i lejuar/refuzuar; tri kërkimet; qytete me emër të njëjtë; filtër CCS2 100 kW+; prekje në hartë; anulim gjatë kërkimit; ruajtje pas rifreskimit; ndarje myAudi; alternativat e kopjimit dhe Google Maps; gabim rrjeti; ekrane 360 px.
