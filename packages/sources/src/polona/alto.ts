import { PolonaShapeError } from "./errors.js";

/**
 * One page of Polona OCR, as served by
 *
 *   GET https://polona.pl/api/download/digital-content/{resourceId}
 *
 * where `{resourceId}` comes from a full-text hit's `resourceUrl`. The one page
 * observed (TASK-031) is ALTO v2 from ABBYY Recognition Server 4.0: word
 * boxes in pixels, and no word confidence (`WC`) at all.
 *
 * This is a reader for that shape only, not a general XML or ALTO parser. It
 * accepts the elements and attributes the observed page uses and refuses
 * everything else — comments, a DOCTYPE, an unknown entity, an ALTO element it
 * has not seen, or a `WC` attribute — so a change in Polona's OCR output is
 * reported rather than half-read.
 */

export interface PolonaAltoBox {
  readonly hpos: number;
  readonly vpos: number;
  readonly width: number;
  readonly height: number;
}

export interface PolonaAltoString extends PolonaAltoBox {
  /** `CONTENT`, entity-decoded, otherwise as served. */
  readonly content: string;
  readonly style: "bold" | null;
}

export interface PolonaAltoLine extends PolonaAltoBox {
  readonly strings: readonly PolonaAltoString[];
  /** The line's `CONTENT` values joined by one space, as its `SP` elements separate them. */
  readonly text: string;
}

export interface PolonaAltoPage {
  readonly measurementUnit: "pixel";
  readonly processingDateTime: string;
  readonly software: { readonly creator: string; readonly name: string; readonly version: string };
  readonly pageId: string;
  readonly physicalImageNumber: number;
  readonly printSpace: PolonaAltoBox;
  /** Every `TextLine`, in document order. */
  readonly lines: readonly PolonaAltoLine[];
}

export const ALTO_V2_NAMESPACE = "http://www.loc.gov/standards/alto/ns-v2#";

interface XmlElement {
  readonly name: string;
  readonly path: string;
  readonly attributes: Readonly<Record<string, string>>;
  readonly children: XmlElement[];
  text: string;
}

const DECLARATION = /^<\?xml version="1\.0" encoding="UTF-8" standalone="yes"\?>/;
const TAG = /<(\/?)([A-Za-z][\w:.-]*)((?:\s+[A-Za-z][\w:.-]*="[^"<]*")*)\s*(\/?)>/y;
const ATTRIBUTE = /\s+([A-Za-z][\w:.-]*)="([^"<]*)"/g;
const ENTITY = /&(?:(lt|gt|amp|quot|apos)|#([0-9]{1,7})|#x([0-9A-Fa-f]{1,6}));/y;
const NAMED: Readonly<Record<string, string>> = {
  lt: "<",
  gt: ">",
  amp: "&",
  quot: '"',
  apos: "'",
};

function xmlError(path: string, message: string): PolonaShapeError {
  return new PolonaShapeError("invalid_xml", path, message);
}

function decodeEntities(raw: string, path: string): string {
  let out = "";
  let at = 0;
  for (let amp = raw.indexOf("&"); amp !== -1; amp = raw.indexOf("&", at)) {
    out += raw.slice(at, amp);
    ENTITY.lastIndex = amp;
    const match = ENTITY.exec(raw);
    if (match === null)
      throw xmlError(
        path,
        `unsupported character reference at ${JSON.stringify(raw.slice(amp, amp + 12))}`,
      );
    const [, named, decimal, hex] = match;
    out +=
      named !== undefined
        ? NAMED[named]!
        : String.fromCodePoint(Number.parseInt(decimal ?? hex!, decimal !== undefined ? 10 : 16));
    at = ENTITY.lastIndex;
  }
  return out + raw.slice(at);
}

/** Builds the element tree, refusing any XML construct the observed page does not use. */
function parseXml(input: string): XmlElement {
  const source = input.startsWith("\uFEFF") ? input.slice(1) : input;
  const declaration = DECLARATION.exec(source);
  if (declaration === null) throw xmlError("alto", "the observed XML declaration is absent");

  const stack: XmlElement[] = [];
  let root: XmlElement | null = null;
  let sawRoot = false;
  let pos = declaration[0].length;

  while (pos < source.length) {
    const lt = source.indexOf("<", pos);
    const chunk = source.slice(pos, lt === -1 ? source.length : lt);
    const open = stack.at(-1);
    if (open === undefined) {
      if (chunk.trim() !== "") throw xmlError("alto", "text outside the root element");
    } else {
      open.text += decodeEntities(chunk, open.path);
    }
    if (lt === -1) break;
    if (source.startsWith("<!", lt) || source.startsWith("<?", lt)) {
      throw xmlError(open?.path ?? "alto", "comment, CDATA, DOCTYPE or processing instruction");
    }
    TAG.lastIndex = lt;
    const tag = TAG.exec(source);
    if (tag === null) throw xmlError(open?.path ?? "alto", `malformed tag at offset ${lt}`);
    const [, closing, name, attributeText, selfClosing] = tag as unknown as [
      string,
      string,
      string,
      string,
      string,
    ];

    if (closing === "/") {
      if (attributeText !== "" || selfClosing === "/")
        throw xmlError(open?.path ?? "alto", "malformed closing tag");
      const element = stack.pop();
      if (element === undefined || element.name !== name)
        throw xmlError(open?.path ?? "alto", `</${name}> closes nothing open`);
      if (stack.length === 0) root = element;
    } else {
      if (open === undefined) {
        if (sawRoot) throw xmlError(name, "more than one root element");
        sawRoot = true;
      }
      const attributes: Record<string, string> = {};
      const path = open === undefined ? name : `${open.path}/${name}`;
      for (const [, key, value] of attributeText.matchAll(ATTRIBUTE)) {
        if (Object.hasOwn(attributes, key!)) throw xmlError(path, `duplicate attribute ${key}`);
        attributes[key!] = decodeEntities(value!, `${path}@${key}`);
      }
      const element: XmlElement = { name, path, attributes, children: [], text: "" };
      open?.children.push(element);
      if (selfClosing === "/") {
        if (open === undefined) root = element;
      } else {
        stack.push(element);
      }
    }
    pos = TAG.lastIndex;
  }

  if (stack.length !== 0) throw xmlError(stack.at(-1)!.path, "element is never closed");
  if (root === null) throw xmlError("alto", "no root element");
  return root;
}

interface ElementRule {
  readonly required: readonly string[];
  readonly optional?: readonly string[];
  /** Child elements allowed; `"text"` for a leaf holding text. */
  readonly children: readonly string[] | "text";
  /** Children that must appear exactly once. */
  readonly once?: readonly string[];
  /** Attributes whose every observed value is listed. */
  readonly values?: Readonly<Record<string, readonly string[]>>;
}

const BOX = ["HPOS", "VPOS", "WIDTH", "HEIGHT"] as const;
const BLOCKS = ["TextBlock", "ComposedBlock", "GraphicalElement"] as const;

/** Every element and attribute the observed page uses, and nothing else. */
const RULES: Readonly<Record<string, ElementRule>> = {
  alto: {
    required: ["xmlns", "xmlns:xlink", "xmlns:xsi", "xsi:schemaLocation"],
    children: ["Description", "Styles", "Layout"],
    once: ["Description", "Styles", "Layout"],
  },
  Description: {
    required: [],
    children: ["MeasurementUnit", "OCRProcessing"],
    once: ["MeasurementUnit", "OCRProcessing"],
  },
  MeasurementUnit: { required: [], children: "text" },
  OCRProcessing: { required: ["ID"], children: ["ocrProcessingStep"], once: ["ocrProcessingStep"] },
  ocrProcessingStep: {
    required: [],
    children: ["processingDateTime", "processingSoftware"],
    once: ["processingDateTime", "processingSoftware"],
  },
  processingDateTime: { required: [], children: "text" },
  processingSoftware: {
    required: [],
    children: ["softwareCreator", "softwareName", "softwareVersion"],
    once: ["softwareCreator", "softwareName", "softwareVersion"],
  },
  softwareCreator: { required: [], children: "text" },
  softwareName: { required: [], children: "text" },
  softwareVersion: { required: [], children: "text" },
  Styles: { required: [], children: ["TextStyle", "ParagraphStyle"] },
  TextStyle: { required: ["ID", "FONTFAMILY", "FONTSIZE"], children: [] },
  ParagraphStyle: {
    required: ["ID", "ALIGN", "LEFT", "RIGHT", "FIRSTLINE"],
    optional: ["LINESPACE"],
    children: [],
  },
  Layout: { required: [], children: ["Page"], once: ["Page"] },
  Page: { required: ["ID", "PHYSICAL_IMG_NR"], children: ["PrintSpace"], once: ["PrintSpace"] },
  PrintSpace: { required: BOX, children: BLOCKS },
  ComposedBlock: {
    required: ["ID", "TYPE", ...BOX],
    children: BLOCKS,
    values: { TYPE: ["container"] },
  },
  GraphicalElement: { required: ["ID", ...BOX], children: [] },
  TextBlock: { required: ["ID", "STYLEREFS", ...BOX], children: ["TextLine"] },
  TextLine: { required: BOX, optional: ["STYLEREFS"], children: ["String", "SP"] },
  String: {
    required: ["CONTENT", ...BOX],
    optional: ["STYLE", "STYLEREFS"],
    children: [],
    values: { STYLE: ["bold"] },
  },
  SP: { required: ["HPOS", "VPOS", "WIDTH"], children: [] },
};

const INTEGER = /^[0-9]+$/;

function validate(element: XmlElement): void {
  const rule = RULES[element.name];
  if (rule === undefined) {
    throw new PolonaShapeError(
      "unexpected_element",
      element.path,
      "element is not in the observed ALTO shape",
    );
  }
  for (const key of rule.required) {
    if (!Object.hasOwn(element.attributes, key)) {
      throw new PolonaShapeError(
        "missing_field",
        `${element.path}@${key}`,
        "required attribute is absent",
      );
    }
  }
  for (const key of Object.keys(element.attributes)) {
    if (!rule.required.includes(key) && !(rule.optional ?? []).includes(key)) {
      throw new PolonaShapeError(
        "unexpected_field",
        `${element.path}@${key}`,
        "attribute is not in the observed ALTO shape",
      );
    }
    const allowed = rule.values?.[key];
    if (allowed !== undefined && !allowed.includes(element.attributes[key]!)) {
      throw new PolonaShapeError(
        "unexpected_value",
        `${element.path}@${key}`,
        `${JSON.stringify(element.attributes[key])} was not observed`,
      );
    }
    if ([...BOX, "PHYSICAL_IMG_NR"].includes(key) && !INTEGER.test(element.attributes[key]!)) {
      throw new PolonaShapeError(
        "wrong_type",
        `${element.path}@${key}`,
        `expected an integer, found ${JSON.stringify(element.attributes[key])}`,
      );
    }
  }
  if (rule.children === "text") {
    if (element.children.length !== 0) {
      throw new PolonaShapeError(
        "unexpected_element",
        element.children[0]!.path,
        "a text element holds an element",
      );
    }
    return;
  }
  if (element.text.trim() !== "") {
    throw new PolonaShapeError(
      "unexpected_value",
      element.path,
      "text where the observed shape has only elements",
    );
  }
  // This element's own structure is checked before any child's, so a report
  // names the outermost change (a second <Page>, not what that page lacks).
  for (const child of element.children) {
    if (!rule.children.includes(child.name)) {
      throw new PolonaShapeError(
        "unexpected_element",
        child.path,
        `<${child.name}> is not observed inside <${element.name}>`,
      );
    }
  }
  for (const name of rule.once ?? []) {
    const n = element.children.filter((child) => child.name === name).length;
    if (n !== 1) {
      throw new PolonaShapeError(
        n === 0 ? "missing_field" : "unexpected_element",
        `${element.path}/${name}`,
        `observed exactly once, found ${n}`,
      );
    }
  }
  for (const child of element.children) validate(child);
}

function only(element: XmlElement, name: string): XmlElement {
  return element.children.find((child) => child.name === name)!;
}

function box(element: XmlElement): PolonaAltoBox {
  const read = (key: string) => Number.parseInt(element.attributes[key]!, 10);
  return { hpos: read("HPOS"), vpos: read("VPOS"), width: read("WIDTH"), height: read("HEIGHT") };
}

function collectLines(element: XmlElement, into: PolonaAltoLine[]): void {
  for (const child of element.children) {
    if (child.name !== "TextLine") {
      collectLines(child, into);
      continue;
    }
    const strings = child.children
      .filter((node) => node.name === "String")
      .map((node): PolonaAltoString => ({
        ...box(node),
        content: node.attributes["CONTENT"]!,
        // Validated against the observed values by `validate`.
        style: (node.attributes["STYLE"] as "bold" | undefined) ?? null,
      }));
    into.push({ ...box(child), strings, text: strings.map((s) => s.content).join(" ") });
  }
}

/** Parses one ALTO page as served by Polona's download endpoint. */
export function parsePolonaAltoPage(text: string): PolonaAltoPage {
  const root = parseXml(text);
  if (root.name !== "alto") {
    throw new PolonaShapeError("unexpected_element", root.path, "the root element is not <alto>");
  }
  validate(root);
  if (root.attributes["xmlns"] !== ALTO_V2_NAMESPACE) {
    throw new PolonaShapeError(
      "unexpected_value",
      "alto@xmlns",
      `namespace ${JSON.stringify(root.attributes["xmlns"])} is not ALTO v2`,
    );
  }

  const description = only(root, "Description");
  const unit = only(description, "MeasurementUnit").text;
  if (unit !== "pixel") {
    throw new PolonaShapeError(
      "unexpected_value",
      "alto/Description/MeasurementUnit",
      `unit ${JSON.stringify(unit)} was not observed`,
    );
  }
  const step = only(only(description, "OCRProcessing"), "ocrProcessingStep");
  const software = only(step, "processingSoftware");

  const page = only(only(root, "Layout"), "Page");
  const printSpace = only(page, "PrintSpace");

  const lines: PolonaAltoLine[] = [];
  collectLines(printSpace, lines);

  return {
    measurementUnit: "pixel",
    processingDateTime: only(step, "processingDateTime").text,
    software: {
      creator: only(software, "softwareCreator").text,
      name: only(software, "softwareName").text,
      version: only(software, "softwareVersion").text,
    },
    pageId: page.attributes["ID"]!,
    physicalImageNumber: Number.parseInt(page.attributes["PHYSICAL_IMG_NR"]!, 10),
    printSpace: box(printSpace),
    lines,
  };
}
