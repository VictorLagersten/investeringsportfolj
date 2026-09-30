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
