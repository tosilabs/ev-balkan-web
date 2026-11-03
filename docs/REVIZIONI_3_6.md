# Revizioni 3.6: më pak ndërhyrje mbi hartë

## Ndërfaqja

- Kërkimi dhe menuja kryesore qëndrojnë në një shirit. Të ruajturat, historiku, burimet dhe cilësimet gjenden në menu.
- Vetëm vendndodhja dhe butoni Harta qëndrojnë në një grup anësor. Harta hap motin, profilin, raportimet, pamjen e plotë, zgjedhjen e pikës, filtrin Në punë dhe zmadhimin.
- Paneli i listës i vendos shënimet e burimeve dhe filtrat e plotë në një seksion të palosur; gabimet e hapin automatikisht. Mjetet anësore fshihen kur hapet një panel, që të mos mbulojnë mbylljen apo përmbajtjen.
- Poshtë mbeten Filtrat, Udhëtimi dhe Karikuesit. Nisja e navigimit, kërkimi në zonë dhe sinjalet e motit grupohen mbi këtë shirit. Konteksti fshihet kur hapet një panel informacioni.
- Profili i lartësisë llogaritet pa hapur automatikisht panelin mbi hartë. Pikat e motit në hartë janë opsionale dhe zgjedhja ruhet në këtë telefon. Parashikimi dhe sinjalet e itinerarit vazhdojnë të llogariten.
- Stacioni jep përparësi navigimit dhe dërgimit te Audi. Lidhjet e tjera hapen te Më shumë. Informacioni i plotë i operatorit, lidhësve dhe burimeve mbetet i aksesueshëm.
- Navigimi mban udhëzimin, hartën dhe përmbledhjen e udhëtimit. 3D, zëri, raportimet dhe Waze janë në një menu. Rikthimi te GPS shfaqet pasi përdoruesi e lëviz hartën.
- Kontrast blu, sipërfaqe të bardha, hierarki më e qartë, zona prekëse të paktën 44 px dhe trajtim i tastit Escape/fokusit.

## Probleme funksionale të korrigjuara

1. Kohëmatësit e GPS-it dhe raportimeve ndaleshin me pagehide pa rifilluar në rikthimin nga BFCache. Një ndihmës i përbashkët i pezullon dhe i rifillon vetëm një herë; rikthimi kontrollon menjëherë skadimin.
2. Raportimet e pandryshuara rivizatoheshin çdo 30 sekonda. Tani përditësohet vetëm mosha; markerët, popup-et dhe rreshtat nuk zëvendësohen pa ndryshim të të dhënave/filtrit.
3. Aktivizimi i zërit në mes të navigimit mund të mos lexonte udhëzimin aktual. Pas aktivizimit rillogaritet udhëzimi.
4. Kur del nga rruga, mundësia për ta rillogaritur manualisht shfaqet menjëherë. Rikthimi në rrugë e fsheh.
5. Hapësira e rezervuar nga kamera 3D përshtatet me lartësinë e hartës, për të shmangur koordinata të pavlefshme në ekrane të ulëta.
6. Dokumentacioni kryesor tani tregon versionin dhe adresën reale të publikuar.

## Verifikimi dhe kufijtë

Kontrollet e sintaksës dhe testet Node përfshijnë ciklin e ri pagehide/pageshow. Skenarët Chromium kontrollojnë kërkimin, detajet, profilin, motin, ruajtjen offline, profilin e baterisë, driving mode, çelësat e enkriptuar, navigimin 3D/2D dhe raportimet Waze. Rrjedhat e ndërfaqes kontrollohen edhe në gjerësi 320 px, telefon dhe desktop, si dhe navigimi në landscape. Pipeline publikon vetëm kur kontrollet e detyrueshme kalojnë.

Testet e kontrolluara përdorin të dhëna provë. OSRM dhe API-të publike të motit kontrollohen veçmas pa kredenciale. Raportimet me çelësin personal të përdoruesit dhe vozitja reale në telefon/Audi nuk mund të konfirmohen nga këto teste. Një hartë 3D me GPS nuk barazohet me një sistem navigimi të certifikuar; përgatitja e rrugës dhe konfigurimi bëhen kur je i ndalur.
