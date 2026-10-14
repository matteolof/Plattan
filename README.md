# Plattan Online v7

Komplett GitHub/Render-projekt. Fyra fasta spelarplatser med 50×50 byggytor och 10 grå rutor mellan tomterna.

## Nytt i v7
- Servern behåller en plats i upp till **120 sekunder utan kontakt**. Aktivt spel skickar fortsatt uppdateringar automatiskt. Att stänga fliken skickar fortfarande en omedelbar utloggning.
- Startskärmen visar en minikarta med fyra tomter och ledig/upptagen status från servern. Status uppdateras var tredje sekund innan inloggning.
- Klicka på en ledig tomt för att välja spelarplats. Upptagna tomter kan inte väljas. Servern kontrollerar fortfarande att platsen är ledig vid inloggning.

## Render
Node, `npm install`, `npm start`, miljövariabel `GAME_PASSWORD=Tulle`.

Ladda upp **alla filerna** från ZIP-filen till GitHub (ersätt befintliga). Detta är en kod- och syntaxkontrollerad version; flerspelartest i webbläsare rekommenderas.


## Version 8 – säkra startpositioner
- Vid inläsning och när gåläge startas flyttas spelaren till närmaste fria plats om startpunkten överlappar en vägg.
- Nya och sparade djur placeras utanför väggar; en alternativ ledig plats söks om den önskade platsen är blockerad.
- Kontroll av både väggarnas höjd och djurens storlek.


## v9
Långt hår syns under huvudbonader, större mössor/hattar/kepsar, färgprov med 47 % transparens och grön aktiv plattknapp. Uppdatera index.html.
