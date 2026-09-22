# Backlog §13 — Support DOCX/HTML/Markdown avancé

## Quoi

Extension du pipeline d'ingestion (Sprint 2) pour accepter DOCX, HTML et Markdown en plus
de PDF/TXT, avec extraction de la structure en sections (titres) plutôt que juste des pages.

## Pourquoi

**Premier item du backlog §13, pas un choix arbitraire** : le cahier des charges liste
"Support DOCX/HTML/Markdown avancé" en tête du backlog post-MVP. C'est aussi l'extension la
plus naturelle à faire en premier : elle prolonge un pipeline déjà testé (Sprint 2) sans
toucher à l'architecture (pas de nouvelle table, pas de nouveau service d'infrastructure),
contrairement à des items comme le multi-tenant ou le SSO qui changeraient la structure du
projet en profondeur.

**Extraction par sections, pas juste par pages** : DOCX, HTML et Markdown ont tous les
trois une notion de titre/en-tête que PDF et TXT n'ont pas nativement. Le champ
`Chunk.section` existait dans le schéma depuis le Sprint 2 (prévu dès le départ, §6 du
cahier des charges) mais n'était jamais rempli — extraire par section plutôt que par page
donne des citations plus précises ("section Politique de congés du document RH.docx" plutôt
que "page 1 du document RH.docx", qui n'a pas de sens pour un DOCX de toute façon).

**HTML : parcours du DOM, pas une regex sur le texte aplati** : une tentation naturelle
aurait été de réutiliser la même logique regex que pour Markdown (chercher des motifs de
titre dans le texte extrait). Ça ne fonctionne pas pour HTML : une fois qu'on appelle
`.get_text()`, les balises `<h1>`-`<h6>` ont disparu — impossible de les distinguer du reste
du texte a posteriori. Il faut parcourir l'arbre HTML directement pour capturer la structure
avant de la perdre.

**DOCX sans notion de page fiable** : `python-docx` n'expose pas les sauts de page de
façon exploitable (Word les calcule dynamiquement au rendu, ils ne sont pas stockés comme
une métadonnée simple dans le XML). Plutôt que d'inventer une fausse pagination, `page=1`
partout pour les DOCX, documenté comme limite assumée — la granularité de citation vient de
`section`, pas de `page`, pour ce format.

**Vérification de signature en plus du Content-Type déclaré, comme au Sprint 6** : un DOCX
est en réalité un fichier ZIP (format Office Open XML) — sa signature binaire commence par
`PK\x03\x04`. Un fichier HTML légitime contient un `<` près du début. Ces vérifications
suivent le même principe que `detect_mismatched_signature()` introduite au Sprint 6 : ne
jamais faire confiance uniquement à l'en-tête `Content-Type` fourni par le client.

## Comment

**`app/services/extraction.py`** — chaque fonction `extract_pages_from_*()` retourne
désormais une liste de triplets `(page, section, texte)` au lieu de `(page, texte)` :
- `extract_pages_from_pdf()` / `extract_pages_from_txt()` : `section=None` (inchangé dans
  l'esprit, juste le triplet).
- `extract_pages_from_docx()` : découpe sur les paragraphes de style `Heading*`/`Title`.
- `extract_pages_from_html()` : parcourt `soup.find_all(h1..h6, p, li)` dans l'ordre du
  document, accumule le texte sous le dernier titre vu.
- `extract_pages_from_markdown()` : regex sur les lignes commençant par `#` à `######`.

**`app/services/chunking.py`** — `fixed_size_chunks()` accepte maintenant des triplets
`(page, section, texte)` et propage `section` sur chaque `ChunkResult`.

**`app/services/validation.py`** — `ALLOWED_MIME_TYPES` étendu, `detect_mismatched_signature()`
gère les 3 nouveaux types.

**`app/services/ingestion.py`** — branche `result.section` sur la création du `Chunk`.

**Nouvelles dépendances** : `python-docx==1.1.2`, `beautifulsoup4==4.12.3`.

**Tester** :
```bash
pytest -v tests/test_extraction_formats.py tests/test_chunking.py \
  tests/test_file_signature.py tests/test_validation.py \
  tests/test_ingestion_new_formats.py
```

## Limites connues

- L'extraction HTML est une heuristique simple (paragraphes/listes rattachés au dernier
  titre vu) — une mise en page HTML complexe (tableaux imbriqués, sections sans balises de
  titre claires) sera moins bien découpée que par un vrai parseur de structure de document.
- DOCX n'a pas de pagination fiable (voir "Pourquoi") — `page=1` partout pour ce format.
- Pas de support des images/tableaux intégrés dans DOCX/HTML — texte uniquement, comme pour
  PDF (l'OCR et l'extraction de tableaux structurés restent des items séparés du backlog §13).
