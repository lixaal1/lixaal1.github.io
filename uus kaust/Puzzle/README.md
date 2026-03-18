# Pixel Puzzle

Interaktiivne puslemang, kus pilt loigatakse tuukkideks ja kasutaja paneb selle uuesti kokku.

## Funktsioonid

- Tume teema ja modernne UI.
- Pildi laadimine failist voi kaamerast.
- Dynamic Slicer: 3x3, 4x4, 5x5 voi 10x10.
- Kujureziimid: ruut, kolmnurk, juhuslik hulknurk.
- Ghost Image vihje nupuga "Vaata".
- Drag-and-drop kokkupanek Assembly Field alale.
- Snap-to-grid "magnet" + heli.
- Win Explosion osakeste ilutulestik.
- Taustamuusika valik (Web Audio).
- Taimer, liidrite tabel ja rekordi JSON eksport.
- Lingid portfolio pealehele ja GitHub repo-le.

## Kasutamine lokaalselt

1. Ava kaust VS Code'is.
2. Ava [index.html](index.html) brauseris (voi kasuta Live Server extensionit).
3. Lae pilt, vali raskusaste/kuju, vajuta "Cut into puzzles".
4. Lohista tukkid Storage alast Assembly Field-i.

## GitHub Pages deploy

Kui soovid lisada projekti repo-sse https://github.com/lixaal1/lixaal1.github.io:

1. Kopeeri failid (index.html, style.css, script.js, README.md) selle repo root-kausta voi alamkausta.
2. Tee commit ja push.
3. Ava repo Settings > Pages ning sea branch (tavaliselt main / root).
4. Kontrolli avalikku URL-i: https://lixaal1.github.io/ (voi alamkaustaga URL).

## Rekordite salvestus

Brauseri turvapiirangute tottu staatiline HTML ei saa serveri JSON-faili otse kirjutada.

- Rekordid salvestatakse localStorage'isse.
- Nupp "Lae rekordid JSON" laeb alla JSON faili.
- Soovi korral saab selle faili hiljem repo-sse commitida.
