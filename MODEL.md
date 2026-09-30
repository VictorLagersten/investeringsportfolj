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
