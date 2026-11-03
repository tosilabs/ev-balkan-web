# Revizioni i Udhëmbarë 3.1

Data: 3 nëntor 2026. Baza e krahasimit: v3.0.1, commit `ddc07f46ea03134e9b3e0e435329431efcb448d9`.

U kontrolluan modulet e hartës dhe stacioneve, udhëtimi, energjia/tarifat, operatorët, importet, databaza rajonale, ruajtja offline dhe rrjedhat e ndërfaqes. Ndryshimet mbajnë logon dhe të kaltrën elektrike të zgjedhur nga përdoruesi.

## Problemet e korrigjuara

| Fusha | Problemi i gjetur | Korrigjimi |
| --- | --- | --- |
| Çmimi | “Free parking” mund të njihej si karikim falas. | Falas pranohet vetëm si deklaratë e qartë për tarifën; parkimi dhe kushtet nuk bëhen energji falas. |
| Çmimi | Tarifa shtesë pa njësi, ose dy tarifa energjie, mund të reduktoheshin në një çmim të vetëm. | Rastet e paqarta mbeten të paplota/të panjohura dhe nuk përdoren si kosto e garantuar. |
| Plani | Pas dështimit të një alternative, vija dhe shenjat e planit të mëparshëm mund të mbeteshin në hartë. | Rezultati i mëparshëm hiqet kur fillon llogaritja e re. |
| Plani | Përjashtimi i stacionit të vetëm mund ta linte përdoruesin pa komandën për ta përfshirë përsëri. | Komanda e rikthimit mbetet jashtë rezultatit, edhe pas dështimit. |
| Plani | Ndryshimi i profilit gjatë llogaritjes mund të linte një rezultat të bazuar në profilin e vjetër. | Ndryshimi anulon llogaritjen dhe heq planin e vjetër. |
| Energjia | Lartësi të keqformuara mund të prodhonin NaN në llogaritje. | Pikat jo numerike trajtohen si mungesë të dhënash; vlerat e pavlefshme të energjisë refuzohen. |
| Buxheti | Verifikimi i rrugës reale nuk përditësonte të gjitha vlerat e energjisë së shtuar/kostos. | Rillogariten mbërritja, energjia, koha dhe çmimi për çdo ndalesë; buxheti kontrollohet përsëri. |
| Optimizimi | Krahasimi i baterisë me përqindje të rrumbullakosura mund të hiqte një kandidat të vlefshëm. | Dominimi i kandidatëve përdor baterinë pa rrumbullakim. |
| Operatori | Anulimi nga një ekran mund të dëmtonte kërkesën e përbashkët për një tjetër. | Anulimi veçohet për secilin konsumues; kërkesa e ndarë mbetet e përdorshme. |
| Databaza | Një rifreskim paralel i indeksit mund të përziente versionet e skedarëve rajonalë. | Çdo kërkesë mban snapshot-in e vet; cache përdor edhe versionin në çelës. |
| Databaza | Indeksi i pavlefshëm ose pjesët e paplota kërkonin kontroll më të fortë. | Kufijtë, datat dhe përputhja e versioneve validhen përpara kthimit të rezultateve. |
| Offline | Hapja e bllokuar e IndexedDB mund të mbetej pa përfundim të qartë. | Ka timeout, trajtim të bllokimit dhe gabime të kuptueshme për ruajtjen/leximin. |
| Offline | Mesazhi i humbjes së internetit mund të fshihej nga stili i statusit të hartës. | Tregues i veçantë i lidhjes, i dukshëm edhe në telefon të ngushtë. |
| Raportet | Një raport i ndryshuar pas miratimit mund të importohej si ende i miratuar. | Verifikohet ngjarja e miratimit dhe data e ndryshimit; ndryshimet kërkojnë miratim të ri. Hash-i dhe versioni i miratuar ruhen për importet e pandryshuara. |
| Kërkimi | “Në punë pranë…” mund të ngatërrohej me emrin e qytetit. | Kushtet veçohen përpara nxjerrjes së vendit. |
| Lidhjet | Lidhjet dalëse kishin nevojë për validim të njëtrajtshëm. | URL-të e jashtme kontrollohen edhe në shtresën e ndërfaqes. |

## Ndryshimet e ndërfaqes

- Krye më i qartë: logo, kërkim, të ruajturat dhe menuja. Historiku, profili, offline, raportimet dhe ndihma janë në menu.
- Filtrat e zakonshëm mbeten të dukshëm; filtrat shtesë grupohen me numërues të kushteve aktive.
- Navigim i poshtëm i njëtrajtshëm dhe gjendje e dallueshme për panelin e zgjedhur.
- Kontrollet kryesore kanë sipërfaqe prekjeje të paktën 44 px. Fushat përdorin tekst 16 px për të shmangur zmadhimin e padëshiruar në telefon.
- Tituj, kontrast, kufij dhe hapësira më të njëtrajtshme. Butoni i kërkimit qëndron i arritshëm gjatë lëvizjes së formularit.
- Mbyllje me Escape dhe rikthim i fokusit te butoni/shenja përkatëse. Fushat kontrollohen për etiketa të aksesueshme.
- CSS është formatuar pa ndryshuar rendin e rregullave ekzistuese; rishikimi vizual është i ndarë me komente.

## Verifikimi

Testet e regresionit mbulojnë tarifat e paqarta, rifreskimin paralel të regjistrit, anulimin e kërkesave të përbashkëta, lartësinë e pavlefshme, rikontrollin e buxhetit dhe miratimin e raporteve. Provat në Chromium mbulojnë kërkimin/GPS-in, menunë, historikun, të ruajturat, telefonin 320/390 px, pamjen desktop, tastierën, planifikimin, dështimin e alternativës dhe rikthimin, devijimin real, raportet dhe kopjen offline. Screenshot-et ruhen në artifact-in e workflow-t të publikimit.

Ky revizion përfshin kontrolle automatike dhe inspektim vizual; nuk është certifikim i plotë WCAG apo test i pajisjes fizike Audi. Disponueshmëria dhe çmimet mbeten të varura nga operatorët. Bateria dhe koha e karikimit mbeten vlerësime, me të dhënat dhe kufijtë e treguar në app.

Për moderatorët: pas ndryshimit të një raporti të miratuar, hiqeni dhe rivendoseni etiketën `station-approved` vetëm pasi të kontrolloni versionin e ri. Leximi i API-së në CI përdor token-in standard GitHub vetëm me leje leximi; nuk dërgon komente ose mesazhe.
