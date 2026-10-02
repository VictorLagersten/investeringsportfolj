# INVESTERNING · portföljdashboard

En lättläst dashboard för paperportföljen i projektet Investerning.

## Vad du ser

- Portföljvärde, kassa, dagens förändring och total utveckling från startkapitalet 50 000 kr.
- Innehav: Sandvik (40), NIBE B (328) och BONESUPPORT (44).
- Jämförelse med OMXS30, fördelningen mellan aktier och kassa, och registrerad affärshistorik.
- Värdekurva som ritas från sparade dagsvärden.
- Manuell uppdatering av verifierade stängningskurser och kassa.
- Säkerhetskopia som JSON-fil.

## Öppna

Öppna `index.html` i webbläsaren. Sidan fungerar utan installation.

## Uppdatera historiken

Välj **Uppdatera kurser** efter att du har verifierat dagens stängningskurser. Dashboarden räknar om portföljvärdet och sparar datumets värde automatiskt. **Spara dagens värde** låter dig registrera en värdering separat. Historiken visas lokalt i samma webbläsare.

Startvärdena är från projektets senaste stängningsrapport för 30 september 2026. Dagsvärden i historiken är 50 000 kr (28 sep), 50 197,08 kr (29 sep) och 50 589,64 kr (30 sep). De tre affärerna är registrerade utan exakta affärsdatum eftersom de inte fanns i projektanteckningarna.

## Viktigt om data

Det här är en paperportfölj, inte en koppling till Avanza eller Nordnet. Webbsidan hämtar inte automatiskt livekurser och sparar inte data till GitHub eller mellan enheter. Kurser måste verifieras innan de matas in. Ingen handel genomförs här och vyn är inte finansiell rådgivning. Dagsrapporten kl. 18 körs i ChatGPT och behöver aktuell verifierbar marknadsdata.

## Historik, kalender och planering

- Fliken **Historik** listar registrerade köp och försäljningar. De tre ursprungliga köpen saknar affärsdatum i projektanteckningarna och visas därför som "Datum saknas". Nya affärer kan läggas till i webbläsaren.
- Fliken **Kalender** visar datum där portföljvärden har sparats. Klicka på en markerad dag för totalvärdet och, för nya sparade värderingar, även kassa och innehav per aktie. Äldre dagar har endast registrerade totalvärden.
- Fliken **Planering** är en lokal anteckningslista för möjliga ändringar inför tisdagens genomgång kl. 10. Planer är inte order och genomför ingen handel.
- Fliken **Slutsats** sammanfattar registrerat resultat, fördelning, affärshistorik och nästa genomgång.
- Historik, planer och affärer sparas lokalt i webbläsaren och delas inte mellan enheter. Dashboarden är inte kopplad till en mäklare och handlar inte automatiskt.



## Investeringsmotorn v3

Fliken **Investeringsmotor** visar nu modellens tio faktorvikter, faktorernas bidrag till Investment Engine Score, scoreförändringar över tid och en jämförelse mellan befintliga innehav och verifierade kandidater. Okända faktorer räknas neutralt (50/100), men sänker datatäckningen. Minst fyra faktorer krävs för score och minst 75% dataconfidence för beslut. Scorehistoriken sparas i den aktuella webbläsaren.

Inga kandidatpoäng publiceras utan tillräckliga verifierade datapunkter. Paperportföljens innehav och handelsjournal ligger kvar i `data/portfolio-journal.json`.



Under poängsatta kandidater visas nu även en researchkö med sex befintliga bevakningsspår, senaste noterade datapunkt, vad som behöver verifieras härnäst och länk till källa. Researchspåren saknar medvetet score tills faktaunderlaget räcker.
