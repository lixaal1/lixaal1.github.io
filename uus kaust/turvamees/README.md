# Turvamees (Node.js + kaamera + heli)

See rakendus kuulab kaamera pilti ja teeb erinevat heli vastavalt sellele, kuidas objekt liigub.

## Mida rakendus teeb

- Kui objekt liigub vasakule, kostab madal kaksiktoon.
- Kui objekt liigub paremale, kostab korge kaksiktoon.
- Kui objekt liigub ules, kostab kiire piiks.
- Kui objekt liigub alla, kostab aeglasem ja madal piiks.
- Kui objekt liigub kaamerast eemale (tagasi), kostab hoiatav sireen.
- Kui objekt liigub kaamerale lahemale (edasi), kostab kasvav heli.

## Kaivitamine

1. Ava terminal selles kaustas.
2. Paigalda paketid:
   npm install
3. Kaivita rakendus:
   npm start
4. Ava brauseris:
   http://localhost:3000

## Portfoolio link

Avalehel on portfoolio link failis `public/index.html`.
Asenda see enda aadressiga:

- `https://your-portfolio.example.com`

## 10 lahedat lisafunktsiooni

1. Luba kasutajal igale suunale oma WAV/MP3 heli fail valida.
2. Lisa reziim "Vaikne ohtuvalgus", kus heli asemel vilgub taust punaselt.
3. Luba mitu jalgitavat tsooni (vasak nurk, uks, aken), igal tsoonil oma alarm.
4. Salvesta liikumise logi koos kellaajaga.
5. Lisa "valvurikoer" animatsioon, mis reageerib liikumise suunale.
6. Lisa tundlikkuse liugur, et valehaireid oleks vahem.
7. Luba saata teavitus Telegrami voi e-posti, kui liikumine kestab ule 3 sekundi.
8. Lisa pildigalerii, mis salvestab liikumise hetkel kaadri.
9. Lisa eri teemad (neoon, retro, kino) koos erinevate taustade ja helidega.
10. Lisa "mangu mood", kus ekraanil olevad objektid porkavad servadelt tagasi nagu pallid ja iga porke teeb heli.

## GitHubisse uleslaadimine

1. Loo GitHubis uus repository.
2. Kaivita terminalis:

   git init
   git add .
   git commit -m "Esimene versioon: Turvamees rakendus"
   git branch -M main
   git remote add origin <SINU_REPO_URL>
   git push -u origin main

Marge: `.gitignore` on juba lisatud, et `node_modules` ei laheks repositorysse.
