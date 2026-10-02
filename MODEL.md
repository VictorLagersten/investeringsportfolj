# INVESTERNING – Investeringsmodell v2

## Syfte
Modellen ska hitta attraktiva investeringar genom att kombinera fundamental kvalitet, tillväxt, värdering, risk, momentum, insiderbild och katalysatorer. Den ska inte kopiera en enskild investerare.

## Kärnprinciper
1. **Business quality** – uthållig avkastning på kapital, marginaler, kassaflöde och konkurrensfördel.
2. **Growth** – omsättning, EPS/FCF och återinvesteringsmöjlighet.
3. **Valuation** – priset måste vägas mot kvalitet, tillväxt och framtida kassaflöden.
4. **Risk** – balansräkning, volatilitet, likviditet och vad som kan gå fel.
5. **Momentum** – används som timing-/bekräftelsesignal, inte som ensam köpsignal.
6. **Insider/ägande** – ledningens incitament och förändringar.
7. **Catalysts** – rapporter, nya produkter, kontrakt, regulatoriska händelser och andra tydliga värdedrivare.
8. **Small-cap filter** – särskilt fokus på skalbara nischer, insiderägande, lönsam tillväxt och låg informationsgrad.

## Viktning v2
- Kvalitet 20%
- Tillväxt 20%
- Värdering 15%
- Momentum 10%
- Insider/ägande 10%
- Katalysatorer 5%
- Balansräkning 10%
- Risk 10%

En score ska inte räknas som ett automatiskt köp. Datatäckning och kvalitativ analys måste kontrolleras först.

## Inspiration
- Fundsmith: hög och uthållig avkastning på kapital, kassaflöde, konkurrensfördelar, återinvestering och attraktiv värdering.
- Oaktree/Howard Marks: andra-nivåns tänkande och explicit analys av risk.
- Spargurun: extern idégenerator; hans idéer ska testas mot vår egen modell.
- Småbolags-/entreprenöriellt tänkande: leta efter mindre bolag med skalbar affär och asymmetrisk potential.
- Kvantitativa metoder: ranking, faktoranalys och backtesting för att skilja robusta signaler från berättelser.

## Köpregler
En kandidat ska normalt:
- ha tillräcklig verifierad datatäckning,
- klara kvalitet/tillväxt/risk-grunden,
- ha en värdering som ger rimlig risk/reward,
- ha en begriplig investeringshypotes,
- ha tydliga invalidationspunkter.

## Sälj-/omprövningsregler
Ompröva när:
- investeringshypotesen bryts,
- fundamenta försämras strukturellt,
- kapitalbehov/skuldsättning ändras materiellt,
- värderingen blir oproportionerlig,
- konkurrensfördel eller tillväxtförutsättning försvagas.

Ett vanligt prisfall är inte i sig en säljsignal.

## Backtesting
Varje modellversion ska testas mot historiska data innan viktningen ändras på grund av kortsiktigt utfall. Följ minst:
- CAGR
- totalavkastning
- max drawdown
- volatilitet
- Sharpe/Sortino
- hit rate
- genomsnittlig vinst/förlust
- turnover
- relativ utveckling mot relevant benchmark

Undvik look-ahead bias, survivorship bias och överoptimering.

## Trade journal
För varje beslut sparas:
- datum
- ticker
- score
- köpeskäl
- förväntad katalysator
- värderingsantagande
- viktigaste risken
- invalidationspunkt
- faktisk utveckling
- vad modellen lärde sig

Detta används för att förbättra modellen, inte för att efterhandsförklara dåliga beslut.

## Viktig begränsning
Dashboarden använder inte automatiskt verifierad realtidsfundamental data. Saknade datapunkter ska förbli saknade. Inga köp eller försäljningar genomförs automatiskt.

## Data layer v1
Scannern använder ett explicit datafält per bolag: marknadsvärde, 3-årig omsättningstillväxt, EPS-tillväxt, ROIC, rörelsemarginal, FCF-marginal, nettoskuld/EBITDA, P/E, EV/EBIT, 6/12 månaders momentum, insiderägande, analytikertäckning, likviditet, sektor, katalysator, risknotering, källa och datum.

### Två separata scores
- **Business Score**: kvalitet, tillväxt, balansräkning och insiderägande.
- **Investment Score**: Business Score kompletterat med värdering, momentum och risk.

Detta minskar risken att ett fantastiskt bolag automatiskt blir en fantastisk investering till vilket pris som helst.

### Datadisciplin
CSV-importen kräver inga påhittade värden. Saknade fält förblir saknade och sänker datatäckningen. Varje rad bör ha källa och datum. Innan data används i ett investeringsbeslut ska den verifieras mot primärkälla eller annan tillförlitlig marknadsdata.

### Portföljrisk
Dashboarden visar toppvikt och ett enkelt koncentrationsmått (HHI) för registrerade innehav. Nästa steg är sektorkorrelation, volatilitet, beta och samlad riskbudget.

### Nästa utvecklingssteg
1. Koppla scanner-importen till en verifierad finansiell datakälla.
2. Bygga historiskt universum med survivorship-/look-ahead-kontroll.
3. Göra walk-forward backtest av faktorvikterna.
4. Lägga till revisionsdata, FCF-avkastning, EV/Sales, ROIC-trend och kapitalallokering.
5. Göra portföljoptimering utifrån korrelation och riskbudget, inte bara bolagsscore.


## Automatisk marknadsdata v2
Dashboarden hämtar nu automatiskt marknadsdata via GitHub Actions och lagrar senaste hämtning i `data/market.json`. Dashboarden läser filen löpande och uppdaterar registrerade innehav samt scannerpriser när nya data finns.

Marknadsdata används för:
- aktuell portföljvärdering,
- dagsrörelse,
- scannerpris,
- tidsstämplad dataproveniens.

Fundamentala faktorer, insiderdata, katalysatorer och värderingsmått ska fortfarande komma från verifierade källor. Kursdata ensam får inte skapa en automatisk köp- eller säljsignal.

## Beslutsmotor
Köpbeslut ska bygga på hela informationskedjan:
1. **Business Score** – kvalitet, tillväxt, balansräkning och ägarbild.
2. **Investment Score** – business score plus värdering, momentum och risk.
3. **Data confidence** – datatäckning och källans färskhet.
4. **Catalyst/thesis** – varför värdet kan realiseras.
5. **Portfolio fit** – positionens storlek, koncentration och korrelation.
6. **Sell/review triggers** – bruten tes, strukturellt försämrade fundamenta, för hög värdering eller förändrad risk.

Ett köp kräver alltså både ett attraktivt bolag och ett rimligt investeringsläge. Ett prisfall är inte ensamt en säljsignal.


## Handelsbanken ISK trading universe
The paper portfolio is designed to simulate a real Handelsbanken ISK. The stock universe must therefore be restricted to instruments practically tradable through Handelsbanken's retail channels: Nordic markets, the United States, France, the Netherlands and Germany, subject to instrument/account eligibility. The model must exclude private/unlisted shares and markets outside this practical universe. Current Handelsbanken documentation should be rechecked periodically because available markets can change.

## Trading friction
Portfolio decisions must account for realistic Handelsbanken trading friction, including brokerage and FX conversion for foreign securities. Small proposed trades should be rejected or deferred when expected edge is too small after estimated transaction costs.


## Modellförbättringar v3 – genomförda
- Handelsbanken-ISK-universum är ett hårt filter: endast praktiskt relevanta börser/marknader får bli investeringskandidater.
- Trading friction: modellen uppskattar courtage, eventuell valutakostnad och minsta rimliga affärsstorlek innan en transaktion kan bli kandidat.
- Broad discovery: universumet upptäcks automatiskt dagligen; discovery-data är aldrig tillräcklig för köpbeslut i sig.
- Portfolio risk: positioner ska bedömas tillsammans med koncentration och sektorexponering, inte enbart bolagsscore.
- Hidden gems: småbolag kan prioriteras som idéer men måste klara samma datadisciplin, likviditet och balansräkning som större bolag.
- Model learning: backtests ska vara walk-forward och out-of-sample. Faktorvikter får inte justeras enbart efter kortsiktigt paper trading-resultat.
- Kill-switch: om en faktor eller modellversion visar stabil försämring i out-of-sample-test ska den kunna sänkas/inaktiveras i stället för att optimeras mot historiska utfall.
- Ingen automatisk orderläggning. Systemet producerar beslutsunderlag och paper trades.


## Anti-bottleneck operating standard
The model should continuously improve across six layers:
1. **Universe:** maximize coverage of instruments actually tradable through the simulated Handelsbanken ISK while excluding non-tradable/private instruments.
2. **Data:** prioritize primary-source financial statements, fresh market data, ownership/insider information, estimates and corporate events. Every datapoint has source and timestamp where possible.
3. **Research:** separate discovery, screening and deep underwriting. Discovery can generate candidates; only verified data can generate decisions.
4. **Portfolio:** optimize marginal capital allocation, concentration, sector exposure, liquidity, volatility and transaction costs.
5. **Testing:** use point-in-time data, walk-forward validation and out-of-sample evaluation. Never tune parameters on future information.
6. **Learning:** keep a decision journal and evaluate factor/model contribution. Poorly performing factors can be reduced or disabled; successful factors must survive out-of-sample testing before receiving more weight.

### Decision hierarchy
**Universe eligibility → data freshness → business quality → growth → valuation → risk → catalyst/thesis → portfolio fit → transaction friction → final decision.**

A candidate that fails an earlier hard gate cannot be rescued by a high score elsewhere.


## Adaptive capital engine v4

Investerning använder nu tre samtidiga tidshorisonter:
- **Kort:** 0–8 veckor, där momentum, katalysatorer och förändringstakt väger tungt.
- **Medel:** 2–12 månader, där vinst-/omsättningsacceleration, omvärdering och katalysatorer kombineras.
- **Lång:** 12+ månader, där kvalitet, återinvestering och uthållig FCF-/vinsttillväxt får större betydelse.

Den slutliga portföljvikten är adaptiv och baseras på:
**modellscore + conviction + förväntad avkastning + nedsiderisk + tesstyrka + portföljpassning + transaktionsfriktion.**

### Expected-return engine
Varje kandidat ska, när data finns, ha separata förväntade avkastningar för kort, medel och lång sikt. Dessa kombineras till en adaptiv opportunity score. Förväntad avkastning får aldrig ersätta datakvalitet eller riskkontroll.

### Earnings acceleration
Modellen ska prioritera förändringstakt, inte bara nivå: omsättning, EPS/FCF, marginaler, guidance och estimatrevideringar ska analyseras som acceleration/deceleration när historiska datapunkter finns.

### Smart momentum
Momentum ska delas upp i prisstyrka och fundamental bekräftelse. Ett stigande pris utan förbättrade fundamenta ska inte behandlas lika som stigande pris tillsammans med positiva estimatrevideringar, marginaler eller katalysatorer.

### 10x/asymmetry radar
Små bolag får en separat möjlighetspremie endast när kvalitet, likviditet, balansräkning, ägarbild och verifierad katalysator klarar hårda gate-krav. Målet är asymmetri, inte att förutsäga en viss multipel.

### Sell-before-buy
Varje ny köpkandidat ska jämföras mot befintliga innehav. Kapital flyttas endast när den nya möjligheten har tillräckligt hög relativ opportunity/conviction efter risk, portföljpassning och transaktionskostnader.

### Kill list
Varje innehav ska ha en tes, invalidationspunkt och relevanta negativa triggers. Prisfall ensamt räcker inte; strukturell försämring, bruten tes, för hög värdering eller förbrukad katalysator kan göra att kapitalet bör roteras.

### Självlärande journal
Varje beslut bör lagra förväntad avkastning, tidshorisont, conviction, katalysator, risk, invalidation och senare faktiskt utfall. Modellens faktorvikter får endast förändras efter tillräckligt många observationer och helst med walk-forward/out-of-sample-stöd.

### Modellstyrning
Modellversioner ska jämföras mot varandra med CAGR, totalavkastning, max drawdown, volatilitet, Sharpe/Sortino, turnover, hit rate, genomsnittlig vinst/förlust och benchmark. Kort paper-performance får inte ensam styra viktförändringar.

### Datagates
Market-, fundamental-, ownership- och catalyst-freshness ska behandlas separat. En färsk kurs får inte göra gamla fundamenta "färska". Discovery-data är idédata och får inte ensam skapa köpbeslut.

### Portföljoptimering
Position sizing ska ta hänsyn till toppvikt, sektor, korrelation, volatilitet och marginalbidrag till portföljrisken när sådana data finns. Diversifiering är ett riskverktyg, inte ett självändamål.

### Operativ regel
Vid varje tisdag/fredag 10:00-genomgång ska modellen i princip ställa:
**"Om hela kapitalet var kontant nu, vilka positioner skulle ge bäst riskjusterad kapitaltillväxt över de tre tidshorisonterna?"**
Sedan jämförs svaret med den faktiska portföljen och endast meningsfulla kapitalförflyttningar föreslås.



## Dashboard Investment Engine v3 · 2026-10-02

The current dashboard score uses ten factors on a 0–100 scale. Its canonical weights are recorded in `data/portfolio-journal.json` under `investmentEngine`:

- Momentum 16%, growth 14%, quality 14%, valuation 10%
- Catalysts 12%, balance sheet 10%, risk control 10%, insider/ownership 5%
- Market-regime fit 5%, small-cap potential 4%

Weights sum to 100%. A missing factor contributes a neutral 50 to the weighted calculation and never a positive score. A total Investment Engine Score is shown only after at least four of ten factor fields are present. Decision confidence remains a separate gate: below 75%, no buy or sell decision is produced. The interface shows the factor contributions and data coverage alongside the score.

The change detector stores the prior score per ticker in that browser's local storage; its first observation is a baseline. Rotation review compares a current holding only with the best eligible candidate when both have at least 75% confidence. A gap of 10 points raises a review prompt, not an automatic trade. If verified candidate data is absent, the dashboard leaves scores and score gaps blank.
