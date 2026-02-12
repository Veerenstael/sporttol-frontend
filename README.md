# Veerenstael Stappen Frontend

Frontend voor de "Op naar de 10 Miljoen Stappen" challenge.  
Gehost op GitHub Pages — laadt altijd direct, ongeacht of de backend actief is.

## Deploy op GitHub Pages

1. Maak een **nieuwe GitHub repo** aan (bijv. `stappen-challenge`)
2. Push alle bestanden naar de `main` branch
3. Ga naar repo **Settings** → **Pages**
4. Source: **Deploy from a branch** → `main` → `/ (root)`
5. Save — je site is live op `https://JOUW-USERNAME.github.io/stappen-challenge/`

## Configuratie

Open `js/config.js` en vul je Render backend URL in:

```js
const API_URL = 'https://jouw-render-app.onrender.com';
```

## Bestanden toevoegen

Zet je eigen bestanden in de root:
- `favicon.png` — Favicon (tabblad icoon)
- `header.png` — Header logo in de navigatiebalk

## Structuur

```
├── index.html          ← Dashboard
├── invoer.html         ← Stappen invoeren
├── admin.html          ← Admin paneel
├── favicon.png         ← Zelf toevoegen
├── header.png          ← Zelf toevoegen
├── css/
│   └── style.css       ← Veerenstael branding
└── js/
    ├── config.js       ← ⚙️ API URL instellen
    ├── dashboard.js    ← Dashboard logica
    ├── invoer.js       ← Invoer logica
    └── admin.js        ← Admin logica
```
