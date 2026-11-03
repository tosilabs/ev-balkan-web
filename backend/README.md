# Ndërmjetësi privat i Udhëmbarë

Statusi: kodi është përgatitur dhe testohet pa kredenciale reale. **Nuk është publikuar në Cloudflare dhe nuk është lidhur me faqen.** `API_ENABLED=false` është i qëllimshëm. Faqja vazhdon të përdorë burimet ekzistuese publike.

```text
Telefoni / GitHub Pages → Worker /api/evchargers → API Ninjas
                         Secret në server       X-Api-Key
```

Adresa e Worker-it dhe kodi burim mund të jenë publikë. Vlera reale e `API_NINJAS_KEY` qëndron vetëm si **Secret** në Cloudflare. Shfletuesi nuk e merr atë. `.env`, `.env.*`, `.dev.vars` dhe `.wrangler/` përjashtohen nga Git; serveri është jashtë dosjes `dist/` që publikohet në GitHub Pages.

## Publikimi

1. Në Cloudflare → Workers & Pages, lidhe repository-n `tosilabs/ev-balkan-web` dhe zgjidh dosjen rrënjë **backend**. Komanda e publikimit: `npx wrangler@4 deploy`. Konfigurimi krijon edhe `ApiQuota`, një Durable Object me SQLite. Alternativisht, nga kompjuteri yt, me Wrangler të instaluar dhe llogarinë të autentikuar: `npx wrangler@4 deploy --config backend/wrangler.toml`.
2. Te Worker → Settings → Variables and Secrets → Add, vendos emrin **API_NINJAS_KEY**, llojin **Secret**, dhe vlerën reale privatisht. Mos e vendos si tekst në `wrangler.toml`, GitHub, URL, mesazh bisede ose skedar në `dist/`. Cloudflare e mban të fshehur pas ruajtjes. Alternativa CLI që e kërkon vlerën interaktivisht: `npx wrangler@4 secret put API_NINJAS_KEY --config backend/wrangler.toml`.
3. Pas verifikimit të planit/licencës së API Ninjas, ndrysho `API_ENABLED` në `"true"` te konfigurimi dhe publiko përsëri. `ALLOWED_ORIGINS` mbetet `https://tosilabs.github.io`; këtu vendoset origjina, pa `/ev-balkan-web/`. Secrets nuk shkruhen te `[vars]` dhe nuk duhen zëvendësuar me variabla që futen në build-in e frontend-it.
4. Provo kërkimet rreth Shkupit, Prishtinës, Tiranës dhe Sofjes. Krahaso rezultatet me regjistrin ekzistues përpara se ta aktivizosh burimin në faqen publike. URL-ja e Worker-it mund të ndahet; çelësi jo.

Publikimi i faqes ekzistuese në GitHub Pages **nuk publikon Worker-in**. Pasi Worker-i të funksionojë, lidhim frontend-in vetëm me URL-në e tij; çelësi nuk bëhet parametër i frontend-it. Nuk është krijuar ende ky lidhim dhe nuk pretendohet mbulim i verifikuar në Ballkan.

## Mbrojtjet e implementuara

- Vetëm `GET /api/evchargers` me `lat`, `lon`, `distance` dhe `level`. Refuzohen URL të tjera, parametra të panjohur/dublikuar dhe koordinata të pavlefshme. `limit`/`offset` nuk aktivizohen pa plan Premium.
- Destinacion fiks HTTPS për API Ninjas; nuk është proxy i përgjithshëm. Header-at e klientit, cookies dhe Authorization nuk përcillen. Redirect-et e ofruesit nuk ndiqen.
- Çelësi dërgohet vetëm në header-in e kërkesës nga serveri te API Ninjas. Gabimet e ofruesit, HTML, stack traces dhe fushat shtesë nuk kthehen në faqe. Ka timeout 8 sekonda dhe kufi 100 KB për përgjigjen. Nuk bëhen riprovime automatike që konsumojnë kuotë shtesë.
- `Cache-Control: no-store`; nuk ruhen përgjigjet e stacioneve në cache, databazë ose historik nga Worker-i. Ruajtja/offline në frontend nuk duhet ta përfshijë këtë burim pa leje sipas planit të API Ninjas.
- Origjina e lejuar kontrollohet saktësisht; mungesa e saj refuzohet. **CORS nuk është autentikim:** një program jashtë shfletuesit mund ta imitojë header-in Origin. Ndërmjetësi nuk garanton që vetëm përdoruesit tanë do ta thërrasin.
- Për këtë arsye, para çdo thirrjeje paguhet një rezervim atomik në Durable Object: parazgjedhja **6 kërkesa/minutë për IP**, **60/orë globalisht**, **2,000/muaj globalisht**. Numëruesi ruhet përtej rinisjeve dhe ndahet mes rajoneve. Dështimi i numëruesit e ndalon kërkesën; nuk vazhdon pa kufij.
- Ruhen vetëm numërues dhe hash-e të IP-ve për dritaren e minutës së fundit të përdorur; jo IP të plota, koordinata, çelësa ose rezultate karikuesish. Hash-et zëvendësohen me kërkesën e parë të minutës së re. Ky nuk është sistem identiteti; klientët pas të njëjtit IP e ndajnë kufirin. IP të ndryshme e ndajnë sërish buxhetin global.
- Buxheti është vetëm për kërkesat e këtij Worker-i dhe nuk mat kërkesat që mund të bëhen diku tjetër me të njëjtin çelës. Muaji rrotullohet në UTC, jo sipas faturës. Thirrjet e dështuara e konsumojnë rezervimin në mënyrë konservative. Mos fshi objektin/migrimet dhe mos ndrysho emrin për të rivendosur kuotën pa verifikuar përdorimin real.
- Nuk ka `console.log` të kërkesave/sekreteve dhe observability është e çaktivizuar në konfigurim. Nëse aktivizohen logs nga operatori, mos regjistro `env`, header-at e ofruesit ose koordinatat pa nevojë.

Për kontroll më të fortë të klientëve mund të shtojmë Cloudflare Turnstile ose hyrje me llogari. Këto nuk janë të implementuara; kufijtë e mësipërm kufizojnë përdorimin e ofruesit, por nuk eliminojnë mundësinë e shterimit të buxhetit ose kostot e platformës nga trafik abuziv.

## Çfarë nuk e fsheh çelësin

- Repository privat nëse çelësi futet më pas në JavaScript-in e publikuar.
- GitHub Actions Secret nëse build-i e shkruan në skedarët e faqes.
- Emra `VITE_*`, `NEXT_PUBLIC_*`, Base64, minifikim ose obfuskimi.
- Një fushë ku përdoruesi e shkruan çelësin në faqen publike dhe ai ruhet në localStorage.

Nëse çelësi ekspozohet, revokoje/rigjeneroje te API Ninjas dhe zëvendëso Secret-in e serverit. Vetëm fshirja e commit-it të fundit nuk e bën një çelës të ekspozuar sërish privat.

## Testet dhe kushtet

`node --test tests/api-worker.test.mjs` kontrollon header-at e serverit, mungesën e çelësit në përgjigje, filtrimin e origjinës, parametrat, redirect-et, gabimet e ofruesit, kufijtë e trupit dhe buxhetet për kërkesa paralele. Provat përdorin të dhëna dhe kredenciale të rreme, pa kërkesa reale te API Ninjas. Prova në runtime-in e Cloudflare dhe aktivizimi kërkojnë llogarinë e publikimit.

Burime: [Cloudflare Secrets](https://developers.cloudflare.com/workers/configuration/secrets/), [Durable Objects dhe plani Free me SQLite](https://developers.cloudflare.com/durable-objects/platform/pricing/), [API Ninjas EV Charger](https://api-ninjas.com/api/evcharger), [kushtet e planeve](https://api-ninjas.com/pricing). API-ja falas është për vlerësim/demonstrim; zgjerimi publik duhet të respektojë planin/licencën, veçmas nga mbrojtja teknike e çelësit.
