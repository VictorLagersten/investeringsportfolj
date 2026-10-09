# INVESTERNING · portföljdashboard

En publik dashboard för en **simulerad paperportfölj**. Den är inte kopplad till Avanza eller Nordnet och lägger aldrig riktiga börsorder.

## Senast avstämda pappersportfölj · 6 oktober 2026

- Startkapital: **50 000 kr**
- ASSA ABLOY B: **41 aktier**
- NIBE B: **332 aktier**
- BONESUPPORT: **87 aktier**
- Kassa: **2,12 kr**
- Totalt registrerat courtage: **80,00 kr**

Detta är det senaste bokförda paperläget, inte en aktuell realtidsvärdering. Referenspriserna i `portfolio.json` är från olika tidpunkter och marknadsfilen är en fördröjd feed. Totalvärde och avkastning ska därför inte anges som verifierade förrän kurserna är tidsmässigt jämförbara.

De tre ursprungliga affärerna saknar verifierade datum och transaktionsavgifter per affär. De visas som okända. Det ursprungliga aggregerade courtaget **35,96 kr** är härlett från startkapital, ursprungliga bruttoköp och dokumenterad kassaresten; senare kända avgifter är 9,00 kr, 13,04 kr, 13,00 kr och 9,00 kr. Därför blir totalen 80,00 kr, medan ursprungsavgifterna inte fördelas på enskilda köp.

## Datakällor

- `portfolio.json`: startkapital, aktuella innehav, kassa, referenspriser och avgiftssammanställning.
- `ledger.json`: köp och försäljningar. Okända datum och avgifter är null.
- `data/portfolio-journal.json`: analyser, källor, research och beslutsnoteringar.
- `data/market.json`: separat, fördröjd Yahoo Finance-marknadsfeed.

Dashboarden hämtar portfölj och ledger från samma GitHub Pages-origin med cache-busting vid sidladdning och därefter var femte minut. Analysjournalen läses också in och kontrolleras var femte minut.

## När data uppdateras

GitHub Actions hämtar marknadskurser ungefär **en gång i timmen, vid minut 17**. GitHub kan starta schemalagda körningar försenat. Feedens priser kan också vara fördröjda och är inte orderkurser.

Dashboarden använder den marknadsfilen för portföljvärdering endast när filen är högst 90 minuter gammal och innehåller färska kurser för alla tre innehaven. Annars visar den referenspriserna från `portfolio.json` och anger detta i statusraden. TradingView-remsan är en separat widget och kan uppdateras vid en annan tid än portföljvärdet.

Ändringar av innehav, affärer eller analyser publiceras genom commit på `main`; GitHub Pages bygger då om sidan. En öppen dashboard kontrollerar GitHub-filerna var femte minut. Efter en lyckad publicering ska en omladdning visa masterdata direkt.

## Paperhandel och analys

Paperhandelsgenomgångar är schemalagda **tisdagar och fredagar kl. 10.00 Europe/Stockholm**. En daglig analysrapport är schemalagd kl. 18.00. Om en handelsgenomgång kommer efter handelsfönstret eller viktiga data inte kan verifieras, registreras ingen retroaktiv affär. Schemat garanterar inte att en automation startar exakt på minuten.

Allt är paperhandel. Affärer som bygger på referenspris markeras som sådana; de är inte bekräftade verkliga fyllnader. Dashboarden kan inte automatiskt läsa alla ChatGPT-chattar. En verifierad analys eller affär måste publiceras till journalfilerna för att synas där.

## Historik och begränsningar

Historikdiagrammet visar registrerade dagsvärderingar, inte varje intradagsrörelse. Saknade historiska priser, datum och transaktionsavgifter ska förbli okända tills de kan styrkas. Marknadsdata är en analysfeed, inte ett exekveringsflöde eller garanterad realtidsdata.
