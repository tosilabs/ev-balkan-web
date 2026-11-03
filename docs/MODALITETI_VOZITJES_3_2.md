# Udhëmbarë 3.2 · Modaliteti i vozitjes

Hap menunë `⋯` → **Modaliteti i vozitjes**. Dalja `Dil ×` rikthen të gjitha mundësitë. Pamja e zgjedhur ruhet në telefon; nuk ruhet një pozicion GPS nga ky modul. Përgatite itinerarin kur je i ndalur. Navigimin me udhëzime e vazhdon Waze ose sistemi i veturës.

## Çfarë është implementuar

- Hartë me më pak kontrolle dhe një kartë të vetme stacioni. Butonat kryesorë janë të paktën 56 px të lartë. Foto, formularë, të dhëna të gjata dhe legjenda mbeten te pamja e plotë.
- Tre shkurtore: **Pranë meje** (10 km, CCS2 / Type 2), **CCS i shpejtë** (10 km, CCS2 ≥50 kW), **Në rrugë** (përdor itinerarin aktual ose hap përgatitjen e itinerarit në pamjen e plotë).
- **Tjetri** kalon te alternativa pasuese. Stacioni i zgjedhur mbetet i qëndrueshëm gjatë përditësimit të GPS-it, derisa të mos përputhet më me filtrat.
- Renditja përdor GPS aktual; në itinerar hiqen pikat e kaluara kur vetura është brenda 1.5 km nga vija. Jashtë saj nuk pretendojmë se dimë progresin në rrugë. Renditja është gjeografike, jo garanci për rrugën më të shkurtër me veturë.
- Largësia rrugore dhe koha llogariten veçmas me OSRM për kartën e zgjedhur; rifreskohen pas 30 sekondash ose 500 m lëvizje. Nuk përdoret trafik në kohë reale. Në dështim, vetëm largësia ajrore etiketohet qartë.
- Shenja e GPS-it mbetet. Butoni `◎` ndjek vendndodhjen; tërheqja manuale e hartës ndalon ndjekjen. GPS më i vjetër se 30 sekonda nuk paraqitet si pozicion aktual në llogaritjen e kartës.
- Statusi i panjohur shfaqet si i panjohur; stacionet e konfirmuara aktualisht jashtë shërbimit përjashtohen. Në punë dhe i lirë mbeten gjendje të dallueshme.
- Ekrani mbahet zgjuar vetëm kur shfletuesi e mbështet Screen Wake Lock dhe faqja është aktive. Dalja / fshehja e faqes e liron.
- Sinjalet ekzistuese të motit mbeten në një buton të përmbledhur; hapja e tyre rikthen pamjen e plotë.
- Në mungesë GPS-i mbetet kërkimi manual; nuk shpiket pozicioni. Shtresat e të dhënave dhe të gjitha funksionet ekzistuese vazhdojnë në pamjen e plotë.

## Burimet e shqyrtuara më 3 nëntor 2026

| Burimi | Çfarë u verifikua | Vendimi për Udhëmbarë |
| --- | --- | --- |
| [Argyexar/empower-showcase](https://github.com/Argyexar/empower-showcase) | Pema përmban README dhe 6 imazhe. README e deklaron prezantim publik pa implementimin. Nuk ka databazë ose API të përdorshme në repository. | Frymëzim për hierarkinë hartë → stacion → lidhës → veprim. Implementim origjinal; nuk importohen asetet ose kodi. Rezervimi në demonstrim nuk jep kontroll mbi operatorët tanë. |
| [cryptprosteel/ev-charge-finder](https://github.com/cryptprosteel/ev-charge-finder) | Pema reale përmban vetëm README; struktura Python dhe JSON në tekst janë shembuj, jo skedarë. Nuk ka scraper, APK ose databazë për importim. I njëjti URL ishte dërguar dy herë. | Pa import. Të dhënat OCM i marrim tashmë drejtpërdrejt nga eksporti publik me filtrimin e licencës. |
| [Powerly Open Source](https://www.powerly.app/open-source/) | Lidh aplikacionet Android/iOS dhe dokumentacionin e API-së. [Licenca Android](https://github.com/powerly-ev/open-ev-charge-android-app/blob/main/LICENSE) përmban Apache 2.0 me kushte shtesë; e quan API-në proprietare dhe kërkon miratim. [Dokumentacioni](https://api.powerly.app/docs/) kërkon `API-Key` për çdo kërkesë dhe Bearer për operacionet e autentikuara. | API e dokumentuar nuk është databazë falas pa kushte. Nuk vendosen çelësa në faqen publike dhe nuk thirren shembujt e kredencialeve. Integrimi real për foto/reviews/status/karikim kërkon akses, verifikim të mbulimit dhe një backend. |

## Zhvillimi me vlerë më pas

1. Integrim Powerly në server vetëm pasi të sigurohet akses dhe të provohen stacione reale në shtetet tona. Modeli duhet të mbajë EVSE/lidhës, tarifë, timestamp dhe burim për secilin status.
2. Përditësim i ndalesës sipas baterisë dhe devijimit real, duke përdorur planifikuesin ekzistues, pa e ngarkuar ekranin e vozitjes me formularë.
3. Rezervim / nisje karikimi vetëm me marrëveshje operatori dhe konfirmim të rezultatit; një animacion ose ndryshim statusi lokal nuk zëvendëson kontrollin e karikuesit.

Verifikimi përfshin teste të renditjes/filtrimit dhe prova në Chromium: hyrje/dalje, kontrolle të fshehura, kartë kompakte, navigim, alternativë, GPS, filtri CCS, ruajtja e modalitetit, mungesa e GPS-it dhe pamje telefon/desktop.
