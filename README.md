# e-mentasti.github.io

Sito personale di Enrico Mentasti, online su **https://e-mentasti.github.io**

## Com'è fatto

Sito statico: nessun server, nessun database, nessuna build. Solo file che il
browser scarica e disegna. GitHub Pages pubblica automaticamente il contenuto
del branch `main`.

```
index.html    la pagina
.gitignore    cosa git deve ignorare
README.md     questo file
```

## Come si lavora

Anteprima in locale, dalla cartella del progetto:

```bash
python3 -m http.server 4321
```

Poi si apre `http://localhost:4321` nel browser. Quello che si vede lì è
esattamente quello che finirà online.

Per pubblicare:

```bash
git add -A && git commit -m "descrizione della modifica" && git push
```

Il sito si aggiorna da solo dopo circa un minuto.
