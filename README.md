# Tests automatisés — Two Ships

> ⚠️ **Le jeu de ce dépôt n'est pas de moi.**
> C'est l'entrée js13kGames 2021 de **[@razh](https://github.com/razh)**, jouable sur
> [razh.github.io/js13k-2021](https://razh.github.io/js13k-2021).
>
> Ce dépôt est une copie utilisée comme cible d'un exercice de tests automatisés pendant ma
> formation (2023). **Ma contribution se limite à `tests/`, `nightwatch/examples/twoshipstest/`,
> `vrt/` et la configuration associée.**

---

## Les trois niveaux de test

**Unitaire** — `tests/math.test.js`, en Jest, sur les helpers de `src/math.js` :
`randFloatSpread` (bornes de l'intervalle), `mapLinear` et `lerp` (valeurs attendues, y compris
en extrapolation hors de l'intervalle source). Ce sont les seules fonctions du jeu qui soient
pures, donc les seules testables isolément.

**End-to-end** — `nightwatch/examples/twoshipstest/`, en Nightwatch : démarrer une partie,
maintenir le tir avec `clickAndHold`, lire le score dans `.s` et vérifier qu'il a progressé.

**Régression visuelle** — `vrt/`, avec les trois dossiers habituels : `baseline` (les captures
de référence), `latest` (celles du dernier run) et `diff` (les écarts). Sur un jeu en canvas,
c'est le seul moyen de détecter qu'un rendu a changé, puisque rien de l'affichage n'est
observable dans le DOM.

## Ce que j'y ai buté

Les commentaires dans `canimove.js` disent honnêtement où ça coince : sur un jeu entièrement
dessiné en canvas, il n'y a presque rien à asserter. Deux tests se contentent d'attendre que le
canvas soit toujours visible, faute de mieux, et l'assertion sur le score est enfermée dans une
condition qui la rend non bloquante. Ce sont des tests qui exécutent le chemin sans vraiment le
valider.

C'est exactement le problème que la régression visuelle est censée couvrir, et la raison pour
laquelle les jeux en canvas exposent en général un état de debug quand ils veulent être
testables.

## Lancer

```bash
npm install
npm test                  # Jest
npx nightwatch            # e2e, jeu servi sur http://localhost:5500
```

Le build et le fonctionnement du jeu relèvent du
[dépôt d'origine](https://github.com/razh/js13k-2021).
