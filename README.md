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
