# Service OCR — Deploiement Render

## Architecture

```
Frontend (Vercel) --> API Fastify (Render node) --> OCR Service (Render python)
                                                    -> pytesseract + pdf2image
```

- **API Node** : `apps/api/src/modules/ocr/ocr.routes.ts` expose
  `POST /api/ocr/upload` et `POST /api/purchases/ocr` en JSON `{ file_b64, mime, filename }`.
  Proxy en `multipart/form-data` vers `POST {OCR_SERVICE_URL}/extract`.
- **OCR Python** : `apps/ocr/` (FastAPI) expose `POST /extract` qui accepte
  un UploadFile et retourne `ExtractionResult` (fields, lines, confidence).

## Variables d'environnement

### API (zenadmin-api)
- `OCR_SERVICE_URL` : https://zenadmin-ocr.onrender.com (ou URL Render)
- `OCR_SERVICE_API_KEY` : cle partagee (sync: false — a definir cote Render)

### OCR (zenadmin-ocr)
- `OCR_SERVICE_API_KEY` : meme valeur que cote API
- `API_ORIGIN` : https://omni-gerant-api.onrender.com (pour CORS)
- `PYTHON_VERSION` : 3.11

## Commandes

### Local
```bash
cd apps/ocr
pip install -r requirements.txt
# Tesseract local requis : sudo apt install tesseract-ocr tesseract-ocr-fra poppler-utils
uvicorn main:app --reload --port 8001
```

### Tests
```bash
curl -F "file=@facture.pdf" http://localhost:8001/extract
```

### Deploy
Push sur `main` → Render re-lit `render.yaml` et cree (ou met a jour) le service
`zenadmin-ocr`. **Note** : plan free Render Python necessite buildpack `apt.txt` pour
installer Tesseract — a ajouter comme suit :

```
# apps/ocr/apt.txt
tesseract-ocr
tesseract-ocr-fra
poppler-utils
```

## Limites actuelles

- Render free Python : cold start 30-45 s (premiere requete OCR sera lente).
- pytesseract single-core : <10 req/s.
- Pas de file d'attente ; pour passer en production il faudra migrer vers
  Redis+BullMQ (skill 019) + workers dedies.
- LayoutLM/Donut : desactives (`OCR_ENGINE=tesseract` par defaut). Pour upgrader,
  voir `apps/ocr/services/ocr_engine.py` — support `donut` en beta.

## Observabilite

- Health API : `GET /api/ocr/health` verifie `OCR_SERVICE_URL` et appelle
  `/health` du service Python. Si `OCR_SERVICE_URL` manque, renvoie 503 avec
  `OCR_UNAVAILABLE`.
- Logs API : `ocr proxy failed` taggue les erreurs upstream.
