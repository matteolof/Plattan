# Plattan Online – första multiplayer-versionen

Fyra fasta spelarplatser, 50×50 plattor per spelare och 10 rutors grått mellanrum. Baserat på det egna Magnatail-byggspelet och röstchattens signalering från Blockryttarna.

## Starta lokalt

Installera Node.js 20 eller senare och kör `npm start`. Öppna `http://localhost:8080`. Standardlösenord: `Tulle`. Sätt miljövariabeln `GAME_PASSWORD` på Render.

## GitHub + Render

Ladda upp **filerna i denna mapp** till roten av ett GitHub-repository. Skapa en Web Service på Render och anslut repositoryt. Start command: `npm start`, build command: `npm install`. Ange `GAME_PASSWORD=Tulle` under Environment (lägg inte lösenord i källkoden om det senare ska vara hemligt). Render ger en HTTPS-adress som behövs för mikrofonen.

## Vad första versionen gör

- Fyra spelarplatser; en ansluten användare per plats.
- Andra spelares positioner och byggen visas i realtid genom polling.
- Endast din egen tomt är redigerbar. Andras plattor är visningsobjekt.
- Gemensam textchatt och WebRTC-röstchatt med signalering från servern.
- Varje spelare sparar/exporterar/importerar sin egen lokala byggfil. Servern lagrar inte byggen permanent.

## Kända begränsningar att förbättra

- Den första versionen behöver webbläsartestas med fyra spelare.
- Fjärrdjur visas förenklat och deras rörelse synkas inte lika detaljerat som egna djur.
- Andras byggnader är visuella men inte fullständigt kollisionsaktiva.
- Den lokala byggvärldens ursprung är den egna tomten. Tomterna ligger 60 rutor isär; byggfiler sparas i lokala koordinater.
- WebRTC använder STUN; i vissa nätverk krävs TURN-server.
- Render Free kan somna när ingen använder servern, och serverns aktiva rum nollställs vid omstart.
- Lösenordet är ett gemensamt inträdeslösenord, inte ett säkert personligt konto.
