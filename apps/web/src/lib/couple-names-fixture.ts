import type { CitationDto } from "@name-atlas/contracts";
import type { GivenNameMeaningFacts, StoredReading } from "@name-atlas/truth";

/**
 * Test fixtures for the couple first-names page (TASK-156): three names'
 * meaning facts as `readGivenNameMeaning` returns them for the committed
 * files (`sources/given-name-meanings/`): MAŁGORZATA and PIOTR with a quoted
 * meaning, ANNA with an origin only. GENUINE entries, as the files hold them.
 */

const YONGE_LOCATOR =
  "Glossary of Christian Names (pp. xviii–cxliii), s.v. Malgorzata, which refers to p. 121";
const BURYAN_LOCATOR = "s. 4 (skan ZBC oai:zbc.uz.zgora.pl:82526, str. PDF 6)";

const work = (
  id: string,
  title: string,
  publisher: string,
  year: number,
  locator: string,
): CitationDto => ({
  id,
  title,
  publisher,
  publication_date: String(year),
  source_type: "DICTIONARY",
  locator,
  url: null,
  attribution: null,
  terms: null,
  retrieved_at: null,
  source_page_url: null,
});

const YONGE = {
  title: "History of Christian Names",
  author_or_publisher: "Charlotte M. Yonge",
  year: 1884,
};
const BURYAN = {
  title: "Skąd pochodzi twoje imię i nazwisko",
  author_or_publisher: "ks. Józef Buryan",
  year: 1933,
};

export const MALGORZATA_MEANING: GivenNameMeaningFacts = {
  state: "READY",
  claim_id: "claim-malgorzata",
  confidence: { status: "LIKELY", methodology_code: "given_name_origin_confidence@1" },
  works: [
    {
      work: YONGE,
      printed_form: "Malgorzata",
      origin: { code: "grc", as_printed: "Gr." },
      literal_gloss: "pearl",
      translation: { language: "pl", text: "perła", by: "Name Atlas" },
      locator: YONGE_LOCATOR,
      quotation: "Malgorzata, f. Pol. Gr. pearl, 121",
      citation: work("cit-yonge", YONGE.title, YONGE.author_or_publisher, 1884, YONGE_LOCATOR),
    },
    {
      work: BURYAN,
      printed_form: "Małgorzata",
      origin: { code: "grc", as_printed: "z greckich" },
      literal_gloss: null,
      translation: null,
      locator: BURYAN_LOCATOR,
      quotation: "Z greckich przyjęły się: […] Adolf, Małgorzata, Teodor i dalsze.",
      citation: work("cit-buryan", BURYAN.title, BURYAN.author_or_publisher, 1933, BURYAN_LOCATOR),
    },
  ],
};

export const PIOTR_MEANING: GivenNameMeaningFacts = {
  state: "READY",
  claim_id: "claim-piotr",
  confidence: { status: "POSSIBLE", methodology_code: "given_name_origin_confidence@1" },
  works: [
    {
      work: YONGE,
      printed_form: "Piotr",
      origin: { code: "grc", as_printed: "Gr." },
      literal_gloss: "rock",
      translation: { language: "pl", text: "skała", by: "Name Atlas" },
      locator: "Glossary of Christian Names (pp. xviii–cxliii), s.v. Piotr, which refers to p. 116",
      quotation: "Piotr, m. Pol. Gr. rock, 116",
      citation: work("cit-yonge", YONGE.title, YONGE.author_or_publisher, 1884, YONGE_LOCATOR),
    },
  ],
};

export const ANNA_MEANING: GivenNameMeaningFacts = {
  state: "READY",
  claim_id: "claim-anna",
  confidence: { status: "POSSIBLE", methodology_code: "given_name_origin_confidence@1" },
  works: [
    {
      work: BURYAN,
      printed_form: "Anna",
      origin: { code: "he", as_printed: "pochodzenia hebrajskiego" },
      literal_gloss: null,
      translation: null,
      locator: BURYAN_LOCATOR,
      quotation: "Z hebrajskich: […] Anna […].",
      citation: work("cit-buryan", BURYAN.title, BURYAN.author_or_publisher, 1933, BURYAN_LOCATOR),
    },
  ],
};

/** A reading that passes `checkReading` in both languages, as a stored row. */
export const SAMPLE_PL =
  "Wasze imiona przychodzą z tego samego języka: oba dzieła stawiają je przy grece. Yonge czyta Małgorzatę jako perłę, a Piotra jako skałę, i w tym zestawieniu widać dwie różne wytrzymałości. " +
  "Perła powstaje powoli, w ukryciu, z cierpliwości; skała trwa na widoku, odporna na wiatr i wodę. Jedno znaczenie mówi o tym, co drogocenne i delikatne, drugie o tym, co stałe i pewne. " +
  "Buryan, który podaje tylko pochodzenie, dodaje do tego samo źródło: oba słowa przyszły do polszczyzny z greki, każde inną drogą. " +
  "Postawione obok siebie, te dwa znaczenia opowiadają o parze rzeczy, które się uzupełniają: o tym, co warto chronić, i o tym, na czym można się oprzeć. " +
  "To wszystko, co mówią same słowa, tak jak je zapisały dzieła; reszta należy do Was.";

export const SAMPLE_EN =
  "Your names come from the same language: both works place them beside Greek. Yonge reads Małgorzata as a pearl and Piotr as a rock, and set side by side the two show two different kinds of endurance. " +
  "A pearl grows slowly, hidden, out of patience; a rock stands in the open, weathering wind and water. One meaning speaks of what is precious and delicate, the other of what is steady and sure. " +
  "Buryan, who gives only an origin, adds the shared source: both words came into Polish from Greek, each by its own road. " +
  "Placed next to each other, the two meanings tell of a pair of things that complete one another: what is worth protecting, and what one can lean on. " +
  "That is all the words themselves say, as the works wrote them down; the rest belongs to you.";

export const STORED_READING: StoredReading = {
  reading_id: "reading-1",
  given_name_a_id: "id-malgorzata",
  given_name_b_id: "id-piotr",
  claim_a_id: "claim-malgorzata",
  claim_b_id: "claim-piotr",
  prompt_version: "couple_names_reading@1",
  model: "test-model-2026",
  text_pl: SAMPLE_PL,
  text_en: SAMPLE_EN,
  created_at: "2026-10-06T12:00:00.000Z",
};
