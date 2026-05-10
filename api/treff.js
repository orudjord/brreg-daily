// Server-funksjon som henter nyetableringer fra Brreg og filtrerer.
// Kjører på Vercel som "serverless function" — gratis.

const NAERINGSKODER = {
  // Servering & uteliv
  "56.101": { kategori: "Servering", navn: "Restauranter og kafeer" },
  "56.102": { kategori: "Servering", navn: "Gatekjøkken" },
  "56.210": { kategori: "Servering", navn: "Cateringvirksomhet" },
  "56.290": { kategori: "Servering", navn: "Kantiner" },
  "56.301": { kategori: "Servering", navn: "Puber" },
  "56.309": { kategori: "Servering", navn: "Barer" },
  // Overnatting
  "55.101": { kategori: "Overnatting", navn: "Hoteller med restaurant" },
  "55.102": { kategori: "Overnatting", navn: "Hoteller uten restaurant" },
  "55.201": { kategori: "Overnatting", navn: "Vandrerhjem" },
  "55.202": { kategori: "Overnatting", navn: "Ferieleiligheter" },
  "55.300": { kategori: "Overnatting", navn: "Campingplasser" },
  // Trening, velvære og helse
  "93.130": { kategori: "Trening & velvære", navn: "Treningssentre" },
  "96.022": { kategori: "Trening & velvære", navn: "Frisering og skjønnhetspleie" },
  "96.040": { kategori: "Trening & velvære", navn: "Kropp og velvære" },
  "86.901": { kategori: "Trening & velvære", navn: "Fysioterapi" },
  // Detaljhandel
  "47.110": { kategori: "Detaljhandel", navn: "Dagligvarer" },
  "47.190": { kategori: "Detaljhandel", navn: "Bredt vareutvalg" },
  "47.711": { kategori: "Detaljhandel", navn: "Dameklær" },
  "47.712": { kategori: "Detaljhandel", navn: "Herreklær" },
  "47.721": { kategori: "Detaljhandel", navn: "Skotøy" },
  "47.750": { kategori: "Detaljhandel", navn: "Kosmetikk" },
  // Eiendom
  "68.209": { kategori: "Eiendom", navn: "Utleie av fast eiendom (kjøpesentre)" },
  // Underholdning og fritid
  "93.110": { kategori: "Underholdning", navn: "Drift av idrettsanlegg" },
  "93.291": { kategori: "Underholdning", navn: "Fornøyelses- og temaparker" },
  "93.299": { kategori: "Underholdning", navn: "Andre fritidsaktiviteter" },
  // Transport
  "49.320": { kategori: "Transport", navn: "Drosjebiltransport" },
};

function igår() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function nDagerSiden(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

async function hentForPeriode(fra, til) {
  const enheter = [];
  let page = 0;
  const size = 1000;

  while (true) {
    const url = new URL("https://data.brreg.no/enhetsregisteret/api/enheter");
    url.searchParams.set("fraRegistreringsdatoEnhetsregisteret", fra);
    url.searchParams.set("tilRegistreringsdatoEnhetsregisteret", til);
    url.searchParams.set("size", size);
    url.searchParams.set("page", page);

    const r = await fetch(url, { headers: { Accept: "application/json" } });
    if (!r.ok) {
      throw new Error(`Brreg svarte ${r.status} ${r.statusText}`);
    }
    const data = await r.json();
    const batch = data?._embedded?.enheter ?? [];
    enheter.push(...batch);

    const totalPages = data?.page?.totalPages ?? 1;
    page++;
    if (page >= totalPages) break;
  }
  return enheter;
}

function erAvInteresse(enhet) {
  for (const felt of ["naeringskode1", "naeringskode2", "naeringskode3"]) {
    const kode = enhet[felt]?.kode;
    if (kode && NAERINGSKODER[kode]) {
      return { kode, ...NAERINGSKODER[kode] };
    }
  }
  return null;
}

function forenkle(enhet, match) {
  const adr = enhet.forretningsadresse ?? {};
  return {
    orgnr: enhet.organisasjonsnummer,
    navn: enhet.navn,
    organisasjonsform: enhet.organisasjonsform?.kode,
    registrertDato: enhet.registreringsdatoEnhetsregisteret,
    naeringskode: match.kode,
    naeringNavn: match.navn,
    kategori: match.kategori,
    naeringBeskrivelse:
      enhet.naeringskode1?.beskrivelse ||
      enhet.naeringskode2?.beskrivelse ||
      enhet.naeringskode3?.beskrivelse ||
      "",
    adresse: (adr.adresse ?? []).join(" "),
    postnummer: adr.postnummer ?? "",
    poststed: adr.poststed ?? "",
    kommune: adr.kommune ?? "",
    hjemmeside: enhet.hjemmeside ?? "",
  };
}

export default async function handler(req, res) {
  try {
    const fra = req.query.fra ?? nDagerSiden(7);
    const til = req.query.til ?? igår();

    const enheter = await hentForPeriode(fra, til);

    const treff = [];
    for (const e of enheter) {
      const match = erAvInteresse(e);
      if (match) treff.push(forenkle(e, match));
    }

    treff.sort((a, b) => {
      if (a.registrertDato !== b.registrertDato) {
        return b.registrertDato.localeCompare(a.registrertDato);
      }
      if (a.kategori !== b.kategori) return a.kategori.localeCompare(b.kategori);
      return a.navn.localeCompare(b.navn);
    });

    res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=3600");
    res.status(200).json({
      fra,
      til,
      totalt_hentet: enheter.length,
      antall_treff: treff.length,
      treff,
    });
  } catch (e) {
    res.status(500).json({ feil: String(e) });
  }
}