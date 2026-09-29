"""Build the bilingual (PL default, EN switch) Fact Lab page from the two language templates.

Each language keeps its own markup and script. IDs get a language suffix, each script runs in its
own scope, SVG pattern IDs get a language prefix, and a small switch shows one language at a time.
The English template gets the same copy fixes that were applied to the Polish one.
"""
import re

D = "/tmp/claude-0/-home-user-NAME-ATLAS/f70b4aa4-a600-5fb5-92ab-ec4cf8d12498/scratchpad/demo"
pl = open(f"{D}/fact-lab-pl.template.html", encoding="utf-8").read()
en = open(f"{D}/fact-lab-en.template.html", encoding="utf-8").read()


def rep(s, old, new, count=1):
    assert s.count(old) == count, (old[:70], s.count(old))
    return s.replace(old, new)


# ---- English copy fixes (mirror the Polish republish) ----
en = rep(en, 'chapter("More names, not more people", "The list of surnames keeps getting longer",',
         'chapter("More forms, few more entries", "The list of surnames keeps getting longer",')
en = rep(en, '"Many -ski surnames were formed from place names. The state register of geographic names lists the adjective of every village and town, so we can show the places whose adjective matches this surname exactly."',
         '"The state register of geographic names lists the official adjective of every village and town. These are the places whose adjective is exactly this surname. A match alone does not mean the surname comes from them."')
en = rep(en, '"The dictionary accepts two forms here. Both are correct; families usually keep the one closest to the written surname."',
         '"The dictionary accepts two forms here, and both are correct."')
en = rep(en, 'text: `In the sjp.pl dictionary, “${s.word.word}” means ${s.word.gloss}. That is a fact about the word, not an explanation of where the surname comes from — for that we need an onomastic source, and without one the answer stays “insufficient data”.`',
         'text: `“${s.word.word}” appears in the sjp.pl word list as an ordinary word. That is a fact about the word, not an explanation of where the surname comes from. For that we need an onomastic source; without one the answer stays “insufficient data”.`')
en = rep(en, "const tie = byLq[1] && top.lq - byLq[1].lq < 0.05 ? byLq[1] : null;",
         "const tie = byLq[1] && ((top.lq - byLq[1].lq) / top.lq < 0.15 || top.n < 100) ? byLq[1] : null;")
en = rep(en, "entries for this form have no voivodeship in the regional file.`),",
         "entries for this form have no voivodeship in the regional file. This is a research prototype: the decision on using these files in the product (D-004) is still open.`),")
en = rep(en, "Race and Hispanic-origin columns are dropped on load and never used.\"],",
         "Race and Hispanic-origin columns are dropped on load and never used. The 2010 file is public domain (CC0); the terms of the 2020 file still need confirming.\"],")
en = rep(en, 'el("span", { class: "data", text: `${chk.total} cross-checks · ${chk.failed.length} failed` }));',
         'el("span", { class: "data", text: `${chk.total} cross-checks · ${chk.total - chk.failed.length} agree` }));')
en = rep(en, '["Method", "Ranks are competition ranks within one list. “× the national rate” compares a voivodeship\'s share of the form\'s attributed entries with the voivodeship\'s share of all entries in the same list. Map bands are five equal steps from zero. Scripts and result tables are in research_notes/Name Atlas data fact lab/ on the claude/amazing-allen-zjl819 branch."],',
         '["Method", `Ranks are competition ranks within one list. “× the national rate” compares a voivodeship\'s share of the form\'s attributed entries with the voivodeship\'s share of all entries in the same list. Map bands are equal steps from zero. Every figure was recomputed from the source files and compared with the analysts\' tables: ${chk.total - chk.failed.length} of ${chk.total} checks agree.${chk.failed[0] ? ` The one difference (${String(chk.failed[0][0]).split(" ")[0]}: ${Number(chk.failed[0][1]).toFixed(1)}% vs ${Number(chk.failed[0][2]).toFixed(1)}%) is a method choice: this page counts the exact spelling, the analysis pooled it with the spelling without Polish letters.` : ""} Scripts and result tables are in research_notes/Name Atlas data fact lab/ on the claude/amazing-allen-zjl819 branch.`],')
en = rep(en, '  ["The 2019 release is dated June.", "Every later release is dated January, so the first interval is seven months shorter than it looks."],\n];',
         '  ["The 2019 release is dated June.", "Every later release is dated January, so the first interval is seven months shorter than it looks."],\n  ["Upper Silesia is poorly located in the casualty lists.", "Entries with a place of birth in Königshütte (Chorzów), Ratibor (Racibórz) or Beuthen (Bytom) could hardly be placed on the map, so the shares of Śląskie and Opolskie on the historical maps are understated."],\n];')
en = rep(en, '{ t: "vs national", n: 1 }', '{ t: "× national", n: 1 }')


def split(doc):
    head_end = doc.index('<div class="page"')
    body_end = doc.index("\n<script>")
    script = doc[body_end:].strip()
    assert script.startswith("<script>") and script.endswith("</script>")
    return doc[:head_end], doc[head_end:body_end], script[len("<script>"):-len("</script>")]


def localise(body, script, lang, hidden):
    body = re.sub(r'(id|aria-labelledby)="([a-z-]+)"', rf'\1="\2-{lang}"', body)
    body = body.replace('<div class="page" lang="pl">', f'<div class="page" lang="{lang}" id="page-{lang}"{" hidden" if hidden else ""}>', 1)
    body = body.replace('<div class="page">', f'<div class="page" lang="{lang}" id="page-{lang}"{" hidden" if hidden else ""}>', 1)
    assert f'id="page-{lang}"' in body
    script = re.sub(r'getElementById\("([a-z-]+)"\)', rf'getElementById("\1-{lang}")', script)
    script = rep(script, "const DATA = /*__DATA__*/null;\nconst GEO = /*__GEO__*/null;\n", "")
    script = rep(script, 'const id = "m" + (++mapSeq);', f'const id = "{lang}-m" + (++mapSeq);')
    old_click = 'b.addEventListener("click", () => { current = i; chips.querySelectorAll(".chip").forEach((c, j) => c.setAttribute("aria-pressed", String(j === i))); renderSurname(); });'
    script = rep(script, old_click, 'b.addEventListener("click", () => selectSurname(i));')
    script = rep(script, "DATA.surnames.forEach((s, i) => {\n  const b = el(\"button\", { class: \"chip\"",
                 "function selectSurname(i) { current = i; chips.querySelectorAll(\".chip\").forEach((c, j) => c.setAttribute(\"aria-pressed\", String(j === i))); renderSurname(); window.__naSel = i; }\n"
                 "DATA.surnames.forEach((s, i) => {\n  const b = el(\"button\", { class: \"chip\"")
    script = rep(script, "renderSurname();\nrenderStories();\n",
                 f"renderSurname();\nrenderStories();\nwindow.__naApi = window.__naApi || {{}};\nwindow.__naApi[\"{lang}\"] = {{ select: selectSurname, current: () => current }};\n")
    return body, "<script>\n(() => {\n" + script + "\n})();\n</script>"


head_pl, body_pl, script_pl = split(pl)
_, body_en, script_en = split(en)
body_pl, script_pl = localise(body_pl, script_pl, "pl", hidden=False)
body_en, script_en = localise(body_en, script_en, "en", hidden=True)

LANG_CSS = """
/* language switch */
.langwrap { max-width: 1180px; margin: 0 auto; padding-inline: 16px; padding-top: 16px; display: flex; justify-content: flex-end; }
@media (min-width: 600px) { .langwrap { padding-inline: 32px; } }
@media (min-width: 900px) { .langwrap { padding-inline: 48px; padding-top: 24px; } }
.langwrap .seg button { min-height: 36px; min-width: 48px; font-size: 13px; letter-spacing: .04em; }
"""
head = rep(head_pl, "</style>", LANG_CSS + "</style>")
switch = """<div class="langwrap"><div class="seg" role="group" aria-label="Język / Language"><button type="button" data-lang-btn="pl" aria-pressed="true" aria-label="Polski">PL</button><button type="button" data-lang-btn="en" aria-pressed="false" aria-label="English">EN</button></div></div>
"""
toggle = """<script>
(() => {
  const btns = document.querySelectorAll("[data-lang-btn]");
  const pages = { pl: document.getElementById("page-pl"), en: document.getElementById("page-en") };
  const titles = { pl: "Laboratorium faktów Name Atlas", en: "Name Atlas Fact Lab" };
  function setLang(l, remember) {
    for (const [k, p] of Object.entries(pages)) p.hidden = k !== l;
    btns.forEach(b => b.setAttribute("aria-pressed", String(b.dataset.langBtn === l)));
    document.title = titles[l];
    const api = window.__naApi && window.__naApi[l];
    if (api && window.__naSel != null && api.current() !== window.__naSel) api.select(window.__naSel);
    if (remember) { try { localStorage.setItem("na-lang", l); } catch (e) { /* storage unavailable: the switch still works */ } }
  }
  btns.forEach(b => b.addEventListener("click", () => setLang(b.dataset.langBtn, true)));
  let initial = "pl";
  if (location.hash === "#en") initial = "en";
  else if (location.hash !== "#pl") { try { const s = localStorage.getItem("na-lang"); if (s === "en" || s === "pl") initial = s; } catch (e) { /* ignore */ } }
  setLang(initial, false);
})();
</script>"""

page = (head + switch + body_pl + "\n" + body_en + "\n"
        + "<script>\nconst DATA = /*__DATA__*/null;\nconst GEO = /*__GEO__*/null;\n</script>\n"
        + script_pl + "\n" + script_en + "\n" + toggle + "\n")
open(f"{D}/fact-lab-bilingual.template.html", "w", encoding="utf-8").write(page)

data = open(f"{D}/data.json", encoding="utf-8").read()
geo = open(f"{D}/voivodeships.json", encoding="utf-8").read()
out = page.replace("/*__DATA__*/null", data.replace("</", "<\\/"), 1).replace("/*__GEO__*/null", geo.replace("</", "<\\/"), 1)
assert "/*__DATA__*/" not in out and "/*__GEO__*/" not in out
open(f"{D}/fact-lab.html", "w", encoding="utf-8").write(out)
print("fact-lab.html", round(len(out.encode()) / 1024), "KB")
