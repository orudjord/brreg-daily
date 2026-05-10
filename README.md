# Brreg Daily

Live webapp som viser nyetableringer fra Brønnøysundregistrene,
filtrert på næringer av interesse. Henter direkte fra Brregs API hver gang
appen åpnes – ingen mellomlagring, alltid ferskt.

## URL

**https://brreg-daily.vercel.app**

Åpen for alle. Kan legges til iPhone-hjemskjerm via Safari → Del → Add to Home Screen.

## Funksjoner

- Datovelger (default: siste 7 dager)
- Gruppering på kategori (Servering, Overnatting, Trening, Detaljhandel, osv.)
- Klikkbare organisasjonsnummer (åpner Brregs offentlige oppslag)
- Mørk modus (følger systemet)
- Optimalisert for iPhone

## Teknisk

- Statisk HTML/CSS/JavaScript frontend
- Serverless API på Vercel (Node.js) som proxyer mot data.brreg.no
- Cache: 15 minutter på Vercels edge-nettverk
- Hosting: Vercel (gratis Hobby-plan)
- Kildekode: https://github.com/orudjord/brreg-daily

## Filer

- `index.html` – frontend
- `api/treff.js` – serverless funksjon som henter og filtrerer fra Brreg
- `vercel.json` – ruting-konfigurasjon
- `package.json` – Node.js-spesifikasjon

## Endre filterlista

Næringskoder ligger i `NAERINGSKODER`-objektet øverst i `api/treff.js`.

## Publiseringsflyt

Endre kode lokalt, deretter: