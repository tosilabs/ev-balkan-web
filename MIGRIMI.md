# Udhëmbarë — kalimi te repository i ri

**Emri i zgjedhur:** Udhëmbarë  
**Slogani:** Çdo rrugë, më e menduar.  
**Repository i synuar:** `tosilabs/udhembare`  
**Adresa e synuar e faqes:** `https://tosilabs.github.io/udhembare/`

Emri shqip “Udhëmbarë” i përshtatet udhëtimit dhe planifikimit të rrugës. Kontrolli paraprak i emrit nuk është regjistrim marke tregtare. Emri dhe logoja mund të ndryshohen përpara publikimit.

## Gjendja

Projekti është përgatitur si kopje më vete, me emër, ikonë, PWA dhe tekste në shqip. Repository i ri ende duhet të krijohet. Mos e konsidero adresën e synuar si faqe të publikuar. Ribrandimi mund të publikohet ndërkohë në adresën ekzistuese https://tosilabs.github.io/ev-balkan-web/; kjo nuk krijon repository-n e ri.

Lidhja GitHub e kësaj seance lejon shkrimin në repository ekzistues, por nuk ka mjet për krijimin e repository-ve. GitHub CLI i mjedisit gjithashtu nuk ka autentikim të vlefshëm. Nuk nevojitet të dërgosh fjalëkalim ose token.

## Krijimi dhe publikimi

1. Krijo një repository publik bosh me emrin **udhembare** në llogarinë **tosilabs**: https://github.com/new?name=udhembare&description=Aplikacion%20shqip%20per%20udhetime%20elektrike&visibility=public . Mund të shtosh README nëse dëshiron; të dyja rastet mbështeten për importimin e kodit.
2. Dërgo lidhjen e repository-t në bisedë, që projekti i përgatitur të vendoset atje. Nëse lidhja GitHub përdor qasje vetëm për repository të zgjedhur, përfshi edhe repository-n e ri.
3. Për faqen publike, te **Settings → Pages → Build and deployment → Source**, zgjidh **GitHub Actions**, nëse ende nuk është zgjedhur.
4. Workflow “Kontrollo dhe publiko Udhëmbarë” kontrollon kodin, rindërton burimet, provon pamjen në telefon dhe publikon faqen nga `main`. Publikimi nuk ekzekutohet nga degë të tjera.

## Historiku dhe të ruajturat

Në të njëjtin shfletues dhe domain GitHub Pages, Udhëmbarë kopjon gjashtë çelësat e njohur të variantit të mëparshëm (`evb-*`) te hapësira e vet (`udhembare-*`) kur çelësat e rinj mungojnë. Të dhënat e vjetra nuk fshihen dhe të dhënat e reja nuk mbishkruhen. Në domain tjetër ose shfletues tjetër kjo bartje automatike nuk është e mundur. Nuk lexohen të dhëna të aplikacioneve të tjera.

## Të dhënat dhe adresat

`project.json` përmban identitetin dhe repository-n e parazgjedhur. Në GitHub Actions përdoret automatikisht `GITHUB_REPOSITORY` për adresat e publikimit, që kodi të funksionojë edhe në repository të ri.

`BOOTSTRAP_DATA_URL` është një rezervë opsionale për kopjen publike të regjistrit gjatë publikimit të parë. Workflow e ka të vendosur te faqja e mëparshme vetëm për këtë rezervë; burimet publike shkarkohen dhe publikohen në repository-n e ri. Snapshot-i i vetë projektit ka gjithmonë përparësi. Pas publikimit të parë kjo vlerë mund të hiqet.

## Kontrollet lokale

- `npm run check`
- `npm test`

Këto kontrolle nuk publikojnë faqen. Për provat në shfletues përdoret workflow pas importimit në repository-n e ri.
