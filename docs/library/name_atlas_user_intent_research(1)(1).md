# NAME ATLAS — USER INTENT RESEARCH

## Methodology note

This is a **qualitative intent study**, not a population survey. I reviewed current public search results, Polish and international genealogy discussions, Reddit threads, Genealodzy.pl, FamilySearch/Ancestry/Geneanet flows, Trustpilot feedback, surname tools and adjacent self-discovery products. The evidence is useful for identifying **recurring motivations, questions, trust failures and progression patterns**, but it does **not** tell us the percentage of users belonging to each intent.

I use four labels throughout:

- **FACT** — directly supported by observed source/data.
- **INFERENCE** — interpretation of repeated evidence.
- **HYPOTHESIS** — something Name Atlas should validate experimentally.
- **RECOMMENDATION** — product decision derived from the evidence.

---

# 1. EXECUTIVE SUMMARY — 10 findings

### 1. People rarely start with „genealogy”

**FACT:** A surname is often the easiest entry point into a much deeper problem. Existing products reflect this: FamilySearch starts with „Find your last name’s meaning and origin”, then immediately introduces historical records and family trees; Ancestry surname pages combine meaning, historical geographic distribution and counts of records.

Source: https://www.familysearch.org/en/surname

**RECOMMENDATION:** Name Atlas should not present itself initially as a family-tree tool. The first promise should be extremely simple:

> **Enter a surname. Discover where it leads.**

---

### 2. „What does my surname mean?” is usually not the final question

**FACT:** Geneanet explicitly moves users from surname meaning → map → spelling changes → shared ancestry → genealogy. Findmypast similarly explains that after learning a surname's origin, users can map it across census years and then search local records.

Sources:
- https://en.geneanet.org/surnames/articles/origin-of-last-names
- https://www.findmypast.co.uk/guides/surname-origins

**INFERENCE:** The surname result creates subsequent questions naturally.

Typical progression:

> What does it mean?  
> → Where did it come from?  
> → Why is it concentrated there?  
> → Was my family from there?  
> → Can you find my ancestors?

That progression should be the fundamental Name Atlas loop.

---

### 3. Geography is probably one of the strongest bridges from trivia to personal relevance

A Polish user described genealogical research becoming fascinating after discovering that ancestors from 300 years ago lived roughly where the user lives today.

Source: https://www.reddit.com/r/PolskaNaLuzie/comments/1tnc76i/ile_pokole%C5%84_wstecz_kojarzycie/

Another discovered that both sides of the family came from the same Podkarpackie village, which triggered deeper research.

Source: https://www.reddit.com/r/Polska/comments/1gc6n0z

**INFERENCE:** A map can transform abstract etymology into:

> **„Wait — my grandfather actually came from there.”**

This is one of the most valuable moments Name Atlas can create.

---

### 4. Rarity is disproportionately good for acquisition and sharing

A Reddit thread built almost entirely around comparing rare surnames generated enthusiastic responses like people reporting fewer than 20, 50 or 80 bearers worldwide.

Source: https://www.reddit.com/r/Genealogy/comments/1niaw5i/who_has_one_of_the_worlds_rarest_surnames/

**INFERENCE:** Rarity is likely:

- fast to understand,
- emotionally neutral enough to share,
- competitive,
- easy to compare,
- less trust-heavy than genealogy.

**RECOMMENDATION:** Rarity should be a FREE social object, not a premium feature.

---

### 5. Family stories and gaps are where curiosity becomes emotionally valuable

One Polish user began researching because little was remembered beyond grandparents and a vague story about a great-grandmother from Siberia.

Source: https://www.reddit.com/r/Polska/comments/zhs1la

Another surname-origin request began with family lore that a great-grandfather may have been a Hungarian merchant, combined with uncertainty and missing information.

Source: https://groups.google.com/g/pl.soc.genealogia/c/3Y43zucNWmI

**INFERENCE:** „Grandma always said…” is a substantially stronger premium trigger than generic etymology.

---

### 6. Life events can abruptly increase intent depth

Current discussions show genealogy being triggered by:

- death of relatives,
- discovery of old photographs,
- inheritance of documents,
- marriage/name changes,
- adoption/unknown biological family,
- DNA surprises.

A Polish Reddit user found old family photographs and immediately felt urgency to document them because „po ledwo 100 latach wiedza o tych ludziach ginie.”

Source: https://www.reddit.com/r/Polska/comments/1no5q71

Wedding discussions also show surname as a strong identity object rather than just a label.

Source: https://www.reddit.com/r/weddingplanning/comments/1624pjh/changing_your_last_name/

---

### 7. „Same surname = related?” is a real curiosity path

Users repeatedly ask whether people with the same surname are connected, including rare-name cases where people even purchase DNA tests to investigate.

Source: https://www.reddit.com/r/Genealogy/comments/1tyjxay/my_small_town_has_a_large_number_of_people_with/

Geneanet explicitly explains that shared surnames may have independent origins and says genealogy is required to establish actual relationship.

Source: https://en.geneanet.org/surnames/articles/origin-of-last-names

**RECOMMENDATION:** This can become a later high-engagement feature:

> **Could these two surname lines be connected?**

But never output a relationship from surname alone.

---

### 8. Trust failure is particularly dangerous in genealogy

Users are unusually sensitive to hallucination and unsourced inference. Recent genealogy discussions contain detailed complaints about AI inventing names, books, census families and locations.

Source: https://www.reddit.com/r/Genealogy/comments/1u0uyg7/my_experience_with_ai_genealogy_was_so_very_bad/

Ancestry reviews similarly praise record access but warn that hints and AI transcription need verification.

Source: https://www.trustpilot.com/review/www.ancestry.com

**RECOMMENDATION:** Source/probability UI is not secondary polish. It is a core feature.

---

### 9. Heritage / heraldry has strong curiosity but also very high misinformation risk

Users actively investigate „family crests”, but experienced genealogy/heraldry communities repeatedly warn that surname-level crests are often falsely attributed and do not automatically belong to every bearer of the surname.

Source: https://www.reddit.com/r/Ancestry/comments/z8quju

**RECOMMENDATION:** Heraldry is a useful acquisition topic, but not MVP core positioning.

Correct framing:

> „A family with this surname appears in heraldic source X.”

Never:

> „This is your family crest.”

---

### 10. The most important shift is from **surname history** to **my family's history**

This is the commercial transition.

> **NAME LEVEL**  
> „Where did this surname come from?”

↓

> **FAMILY LEVEL**  
> „Did MY family come from there?”

↓

> **PERSON LEVEL**  
> „Who exactly were my ancestors?”

That is the route from FREE → 29 → 79 → 199 → human research.

---

# 2. RESEARCH EVIDENCE — what users actually say

Several recurring user statements are particularly revealing.

### „I know almost nothing beyond grandparents.”

A Polish user wrote:

> „w mojej rodzinie, niestety, nie bardzo pamięta się o przodkach”

and wanted to start researching older generations.

Source: https://www.reddit.com/r/Polska/comments/zhs1la

This is not surname curiosity anymore. The underlying job is:

**recover what the family stopped remembering.**

---

### „I only know a surname.”

Another Polish user asked how to find a great-great-grandfather while knowing only the surname and rough circumstances of his death.

Source: https://www.reddit.com/r/Polska/comments/1ltpaem

This shows a natural escalation:

```text
surname
→ approximate place
→ approximate period
→ records
→ identity of person
```

---

### „Family lore says…”

A genealogy post starts with uncertainty about surnames and a family rumor about Hungarian origins.

Source: https://groups.google.com/g/pl.soc.genealogia/c/3Y43zucNWmI

This is a separate intent from ordinary etymology:

**validate or disprove inherited family lore.**

---

### „I discovered something geographically surprising.”

A Polish researcher found both sides of the family converging on one village.

Source: https://www.reddit.com/r/Polska/comments/1gc6n0z

Geography therefore becomes:

**evidence + emotion**, not merely visualization.

---

### „I want to know whether another person with my surname is related.”

This behavior is explicit across genealogy communities.

Source: https://www.reddit.com/r/Genealogy/comments/1tyjxay/my_small_town_has_a_large_number_of_people_with/

---

### „My surname feels like part of my identity.”

Wedding/name-change discussions are full of language about surname and identity; one user wrote that her identity **is** her family surname.

Source: https://www.reddit.com/r/weddingplanning/comments/1624pjh/changing_your_last_name/

Another described concern about losing a connection to heritage when changing surname.

Source: https://www.reddit.com/r/namenerds/comments/1i9tapf

This matters because Name Atlas is not only genealogy.

It is also an **identity product**.

---

### „I want to preserve this before it's lost.”

Old photographs commonly trigger the urge to identify, digitize and record family history.

Source: https://www.reddit.com/r/Polska/comments/1no5q71

---

### „I want to give the research to someone.”

Genealogy users actively make physical books for parents, grandparents and relatives, often because existing software presents family research badly.

Source: https://hr.reddit.com/r/Genealogy/comments/1kaogp6/family_tree_reports_for_noncomputer_literate/

Storyworth has built an entire paid product around transforming family stories into keepsake books, currently priced at $69/$99/$199 tiers.

Source: https://help.storyworth.com/en_US/book-pricing

---

# 3. COMPLETE USER INTENT TAXONOMY

Research supports **15 distinct intents** worth designing around.

---

## INTENT 01 — QUICK MEANING

### JTBD
**WHEN** I notice or think about my surname,  
**I WANT TO** understand what it means,  
**SO I CAN** satisfy my curiosity and know something I have never known about my own name.

**User question:**  
> „Co właściwie oznacza moje nazwisko?”

**Trigger:** Google query, conversation, social content, unusual surname.

**First 10 sec expectation:** immediate meaning/origin.

**First wow:** a non-obvious linguistic interpretation.

**Second question:**  
> „Why does it mean that?” / „Where did that come from?”

**Depth:** 1/5.

**Driver:** curiosity.

**WTP:** **VERY LOW — INFERENCE**.

**Natural product:** FREE.

**Trust:** source for etymology.

**Failure:** generic AI paragraph.

**Privacy:** LOW.

**Time:** immediate.

**Shareability:** medium.

**Acquisition:** SEO / Google / social.

**Device:** mobile-heavy likely, but **not a demographic fact**.

**Best personalization question:** none before answer.

---

## INTENT 02 — ORIGIN / IDENTITY

### JTBD
**WHEN** I wonder what my surname says about where I come from,  
**I WANT TO** see its likely geographic and linguistic origin,  
**SO I CAN** understand part of my identity.

**Question:**  
> „Skąd naprawdę pochodzi moje nazwisko?”

**Trigger:** ethnicity discussion, family conversation, travel, DNA interest, surname that sounds foreign.

**Expectation:** country/region quickly.

**First wow:** origin differs from what user assumed.

**Second question:**  
> „Was my family actually from there?”

**Depth:** 2–3.

**Driver:** belonging + identity.

**WTP:** **LOW→MEDIUM — HYPOTHESIS.**

**Natural product:** FREE → Name Report → Family Origin.

**Trust:** linguistic source + geographic evidence + probability.

**Failure:** „your surname is Polish” with no evidence.

**Privacy:** LOW.

**Time:** immediate initially.

**Shareability:** high if result is distinctive.

**Acquisition:** SEO, TikTok/IG discovery, referral.

**Best extra question:**  
`Jaki region najbardziej kojarzysz ze swoją rodziną?`

---

## INTENT 03 — RARITY / UNIQUENESS

### JTBD
WHEN I wonder how unusual my surname is,  
I WANT TO compare it to other surnames,  
SO I CAN understand whether it is distinctive.

**Question:**  
> „Ile osób ma takie nazwisko jak ja?”

**Trigger:** meeting someone with same surname, social post, unusual spelling.

**Expectation:** number immediately.

**Wow:** very small bearer count / strong geographic concentration.

**Next:**  
> „Where are the other people?”

**Depth:** 1–2.

**Driver:** uniqueness/status/play.

**WTP:** VERY LOW — **INFERENCE**.

**Natural:** FREE.

**Trust:** official population dataset.

**Failure:** fabricated „rarity score”.

**Privacy:** LOW.

**Time:** instant.

**Share:** VERY HIGH.

**Channel:** social + SEO.

Research evidence: users enthusiastically compare how many people share extremely rare surnames.

Source: https://www.reddit.com/r/Genealogy/comments/1niaw5i/who_has_one_of_the_worlds_rarest_surnames/

---

## INTENT 04 — GEOGRAPHIC DISTRIBUTION

### JTBD
WHEN I see my surname as something inherited,  
I WANT TO know where people with it live,  
SO I CAN see whether it points toward a place.

**Question:**  
> „Gdzie występuje moje nazwisko?”

**Trigger:** surname lookup/search result.

**Expectation:** map.

**Wow:** visible regional cluster.

**Next:**  
> „Why there?”

then:

> „Was my family from there too?”

**Depth:** 2–3.

**Driver:** discovery/belonging.

**WTP:** LOW→MEDIUM — hypothesis.

**Premium:** historical maps / Family Origin.

**Trust:** date of population dataset.

**Failure:** map implying historic origin from current residence.

**Privacy:** LOW.

**Time:** immediate.

**Share:** HIGH.

**Channel:** SEO + organic social.

---

## INTENT 05 — FAMILY STORY VALIDATION

### JTBD
WHEN my family has repeated a story about where we came from,  
I WANT TO test it against evidence,  
SO I CAN know whether the story has a historical basis.

**Question:**  
> „Czy to, co zawsze mówiła babcia, może być prawdą?”

**Trigger:** family conversation, old story, reunion, document.

**Expectation:** initial evidence, not generic surname page.

**Wow:** a source, location or historical variant aligns with family lore.

**Next:**  
> „Can we identify the actual family line?”

**Depth:** 4.

**Driver:** mystery + identity + validation.

**WTP:** **MEDIUM/HIGH — INFERENCE**, not measured.

**Natural product:** Family Origin 79.

**Trust:** source chain and explicit uncertainty.

**Failure:** AI confidently validating a family myth.

**Privacy:** MEDIUM.

**Time:** willing to wait minutes/days.

**Share:** low public / high within family.

**Channel:** Google, referrals, Facebook/family groups.

Polish examples explicitly combine surname research with family lore.

Source: https://groups.google.com/g/pl.soc.genealogia/c/3Y43zucNWmI

---

## INTENT 06 — MIGRATION / DISPLACEMENT

### JTBD
WHEN my family moved between regions or countries,  
I WANT TO reconstruct where they came from and where they went,  
SO I CAN understand our journey.

**Question:**  
> „Skąd przyjechała moja rodzina?”

**Triggers:** post-war relocation, diaspora, foreign-sounding surname, immigration story.

**First wow:** timeline connects two known locations.

**Next:**  
> „Who was the first person to move?”

**Depth:** 4.

**Driver:** identity + narrative.

**WTP:** MEDIUM/HIGH — inference.

**Product:** Family Origin / Deep Research.

**Trust:** historical record dates.

**Failure:** surname distribution interpreted as individual migration.

**Privacy:** MEDIUM.

**Time:** patient.

**Share:** medium.

**Acquisition:** SEO / diaspora communities / referral.

Findmypast itself recommends using historic census/parish/news sources to map surname movement through time.

Source: https://www.findmypast.co.uk/guides/surname-origins

---

## INTENT 07 — FIND MY ANCESTORS

### JTBD
WHEN I know a few relatives but my knowledge stops,  
I WANT TO find the previous generation,  
SO I CAN extend my family history.

**Question:**  
> „Jak znaleźć swoich przodków?”

**Trigger:** family-tree start.

**First expectation:** actual people/records.

**Wow:** first credible record tied to a known relative.

**Next:**  
> „Who were their parents?”

**Depth:** 5.

**Driver:** puzzle-solving + legacy.

**WTP:** HIGH relative to surname trivia — **INFERENCE supported by existence of paid genealogy services**, not a measured Name Atlas conversion.

**Product:** 199 / human research.

**Trust:** highest.

**Failure:** false person match.

**Privacy:** HIGH.

**Time:** days acceptable.

**Share:** mostly family/private.

**Channel:** Google, genealogy communities.

Polish users explicitly request help when they know only a surname or limited grandparent data.

Source: https://www.reddit.com/r/Polska/comments/1ltpaem

---

## INTENT 08 — BRICK WALL / MISSING PERSON DETAIL

Examples:

- grandmother's maiden name,
- unknown birthplace,
- missing great-grandfather,
- unknown parents.

### JTBD
WHEN one missing detail prevents further research,  
I WANT TO identify it,  
SO I CAN continue the family line.

**Question:**  
> „Jak miała na nazwisko panieńskie moja prababcia?”

**Trigger:** active research becomes stuck.

**Wow:** one record resolves the missing field.

**Next:** next generation.

**Depth:** 5.

**Driver:** puzzle resolution.

**WTP:** HIGH / VERY HIGH — inference.

**Product:** Deep Research / Human.

**Trust:** exact original source.

**Failure:** plausible-but-wrong match.

**Privacy:** HIGH.

**Time:** can wait.

**Share:** low.

**Channel:** SEO long-tail, genealogy forums.

This exact problem repeatedly appears in genealogy communities.

Source: https://www.reddit.com/r/Genealogy/comments/1s1s02k/help_with_finding_great_grandmothers_maiden_name/

---

## INTENT 09 — LOST CONNECTION / UNKNOWN BIOLOGICAL FAMILY

### JTBD
WHEN part of my biological family is unknown or disconnected,  
I WANT TO understand who they are,  
SO I CAN resolve a personal identity question.

**Question:**  
> „Who is my biological father/family?”

**Trigger:** letter, adoption information, DNA match, deathbed revelation.

**Wow:** credible close relationship evidence.

**Next:**  
> „Should I contact them?”

**Depth:** 5.

**Driver:** identity + uncertainty + sometimes grief.

**WTP:** potentially VERY HIGH — **HYPOTHESIS**.

**Product:** not Name Report; specialist/deep research.

**Trust:** exceptionally high.

**Failure:** false relationship or unsafe contact recommendation.

**Privacy:** VERY HIGH.

**Time:** research acceptable.

**Share:** LOW.

**Channel:** DNA/genealogy communities.

Real cases show users discovering non-parentage and seeking biological family; users themselves caution that contact can have serious family consequences.

Source: https://www.reddit.com/r/AncestryDNA/comments/1uvn9n8/my_results/

**RECOMMENDATION:** **not MVP.**

---

## INTENT 10 — HERALDRY / NOBILITY

### JTBD
WHEN I hear that my surname might be noble,  
I WANT TO check historical sources,  
SO I CAN know whether there is any credible connection.

**Question:**  
> „Czy moje nazwisko było szlacheckie?”

**Trigger:** family story, crest object, internet result.

**Wow:** an actual historical armiger/family with the surname.

**Next:**  
> „Am I descended from them?”

**Depth:** 3→5.

**Driver:** pride/status/mystery.

**WTP:** MEDIUM — hypothesis.

**Product:** Name Report → human lineage verification.

**Trust:** extremely high.

**Failure:** „surname = your crest.”

**Privacy:** LOW initially.

**Share:** high if framed correctly.

**Channel:** SEO.

Community evidence shows exactly why this needs careful qualification.

Source: https://www.reddit.com/r/Ancestry/comments/z8quju

---

## INTENT 11 — SAME-SURNAME CONNECTION

### JTBD
WHEN I meet someone with my unusual surname,  
I WANT TO know whether we may share ancestry,  
SO I CAN understand if the coincidence means something.

**Question:**  
> „Czy jesteśmy rodziną?”

**Trigger:** coworker/friend/local business/same surname online.

**Wow:** same rare surname + same historical region.

**Next:**  
> „Where could our lines meet?”

**Depth:** 3–5.

**Driver:** social mystery.

**WTP:** medium — hypothesis.

**Product:** comparison / Family Origin.

**Trust:** must emphasize surname alone does not prove relation.

**Privacy:** MEDIUM/HIGH if comparing real persons.

**Time:** moderate.

**Share:** HIGH.

**Channel:** social/referral.

Evidence: users explicitly investigate same-surname relationships and sometimes escalate to DNA.

Source: https://www.reddit.com/r/Genealogy/comments/1tyjxay/my_small_town_has_a_large_number_of_people_with/

---

## INTENT 12 — PRESERVATION / LEGACY

### JTBD
WHEN I realize older relatives and their knowledge will not be here forever,  
I WANT TO preserve what we know,  
SO I CAN pass it to future generations.

**Question:**  
> „How do I make sure this family history isn't lost?”

**Trigger:** death, aging grandparents, old photographs, cleaning family home.

**Wow:** seeing fragmented material organized as a coherent history.

**Next:**  
> „Can I turn this into a book?”

**Depth:** 4.

**Driver:** legacy + nostalgia + grief.

**WTP:** HIGH — inference.

**Product:** Family Origin + premium physical/digital book.

**Trust:** high.

**Privacy:** HIGH.

**Time:** weeks acceptable.

**Share:** primarily private family.

**Channel:** referral, gift, Facebook, PR.

A Polish photo thread expresses exactly this fear of family knowledge disappearing.

Source: https://www.reddit.com/r/Polska/comments/1no5q71

---

## INTENT 13 — GIFT

### JTBD
WHEN I want to give a parent/grandparent something meaningful,  
I WANT TO turn their family history into a tangible story,  
SO I CAN give them something personal rather than generic.

**Question:**  
> „Can I turn our surname/history into a gift?”

**Trigger:** birthday, Christmas, anniversary, retirement.

**First wow:** personalized cover.

**Next:**  
> „Can we include their parents/photos/stories?”

**Depth:** 3–4.

**Driver:** bonding + legacy.

**WTP:** HIGH relative to casual surname lookup — inference.

**Product:** Gift Edition.

**Trust:** important because physical object persists.

**Privacy:** medium.

**Time:** delivery deadline matters.

**Share:** physical / family.

**Channel:** paid social, seasonal SEO, referral.

Actual genealogy users repeatedly ask about books and research as gifts.

Source: https://www.reddit.com/r/Genealogy/comments/jj893v

Ancestry and Storyworth both sell dedicated family-history gifts.

Source: https://www.ancestry.com/c/gift-selection

---

## INTENT 14 — SURNAME AS PERSONAL IDENTITY / LIFE EVENT

### JTBD
WHEN my surname may change or be passed to a child,  
I WANT TO understand what it represents,  
SO I CAN make a more meaningful identity decision.

**Question:**  
> „What am I keeping or giving up if I change this name?”

**Trigger:** engagement, marriage, child.

**Wow:** the surname has a specific regional or family story.

**Next:**  
> „Which family history do I want to preserve?”

**Depth:** 2–4.

**Driver:** identity + continuity.

**WTP:** low initially; medium for keepsake — hypothesis.

**Product:** Name Report / Couple Comparison / Gift.

**Trust:** medium/high.

**Privacy:** LOW initially.

**Time:** not urgent research-wise.

**Share:** medium.

**Channel:** wedding SEO/social.

Surname identity appears explicitly in current marriage discussions.

Source: https://www.reddit.com/r/weddingplanning/comments/1624pjh/changing_your_last_name/

---

## INTENT 15 — SOCIAL EXPLORATION / COMPARISON

### JTBD
WHEN I'm casually exploring with friends/partner,  
I WANT TO compare our surnames,  
SO I CAN have a fun personalized discovery.

**Question:**  
> „Whose surname is rarer / where are we each from?”

**Trigger:** TikTok, date, friends, family dinner.

**Wow:** contrast.

**Next:**  
> „Could our families have crossed paths?”

**Depth:** 1–2 initially.

**Driver:** entertainment/social identity.

**WTP:** VERY LOW initially.

**Product:** FREE acquisition.

**Privacy:** LOW.

**Time:** immediate.

**Share:** VERY HIGH.

**Channel:** TikTok, IG, referral.

This is structurally analogous to Spotify Wrapped: personal data becomes a shareable identity object. Spotify reports more than **630 million shares** for Wrapped 2025.

Source: https://newsroom.spotify.com/2026-02-10/spotify-q4-2025-earnings/

---

# 4. USER INTENT MATRIX

WTP below is **qualitative inference/hypothesis, not measured conversion data**.

| Intent | Trigger | Primary question | First wow | Next question | Driver | Depth | WTP | Premium fit | Trust | Share | Acquisition | Priority |
|---|---|---|---|---|---|---:|---|---|---|---|---|---|
| Meaning | search/social | What does it mean? | unexpected etymology | where from? | curiosity | 1 | Very low | Free | Medium | Medium | SEO | High |
| Origin/identity | heritage curiosity | Where from? | unexpected region | was my family there? | belonging | 3 | Low–Med | 29/79 | High | High | SEO/social | **Very high** |
| Rarity | curiosity | How rare? | small count | where are others? | uniqueness | 1 | Very low | Free | Medium | **Very high** | social/SEO | **Very high** |
| Geography | map query | Where found? | cluster | why there? | discovery | 2 | Low | 29 | High | High | SEO | **Very high** |
| Family lore | conversation/story | Was grandma right? | evidence matches lore | which branch? | mystery | 4 | Med–High | 79 | **Very high** | Low public | SEO/referral | **Very high** |
| Migration | diaspora story | Where did we move from? | route matches known family | who moved first? | identity | 4 | Med–High | 79/199 | Very high | Medium | SEO/diaspora | High |
| Find ancestors | missing generations | Who came before? | actual record | their parents? | discovery | 5 | High | 199/human | Maximum | Low | SEO | High later |
| Brick wall | research stuck | What's missing? | record solves gap | next generation? | puzzle | 5 | High | 199/human | Maximum | Low | long-tail SEO | High revenue |
| Lost connection | DNA/adoption | Who is biological family? | credible match | contact? | identity | 5 | potentially very high | specialist | Extreme | Low | DNA communities | Not MVP |
| Heraldry | family story/object | Noble? | historic source | related to me? | status/mystery | 3 | Medium | 29/human | Extreme | High | SEO | Medium |
| Same surname relation | meet same surname | Related? | same rare region | common ancestor? | social mystery | 4 | Medium | 79 | High | **Very high** | social/referral | High later |
| Preservation | old photos/death | How preserve? | coherent story | book? | legacy | 4 | High | Gift/79+ | High | Family | referral/FB | High |
| Gift | occasion | meaningful gift? | personalized cover | can add family? | bonding | 3 | High | Gift | High | Medium | seasonal/social | High |
| Life-event identity | marriage/child | What does this name mean to me? | family history | keep/pass name? | identity | 3 | Low–Med | 29/Gift | High | Medium | SEO/social | Medium |
| Social comparison | friends/partner | Which is rarer? | contrast | are histories connected? | play | 1 | Very low | Free | Medium | **Very high** | social | High acquisition |

---

# 5. TOP 5 MVP INTENTS

## #1 Origin / Identity

### Why important
It connects the simple surname input to emotionally meaningful discovery.

### Entry
Google:
> `pochodzenie nazwiska X`  
> `skąd pochodzi nazwisko X`

### FREE
- meaning,
- likely linguistic origin,
- likely region,
- confidence,
- modern map.

### First wow
> Unexpected regional/language connection.

### Next question
> **„Czy moja rodzina rzeczywiście pochodziła z tego regionu?”**

### Premium
29 → historical surname report  
79 → Family Origin.

### Additional data?
Optional family region.

### Technical difficulty
Moderate.

### SEO
Very high programmatic potential.

### Share
High.

---

## #2 Geography

### FREE
Modern distribution map and concentration.

### Wow
A very strong cluster.

### Next
> „Why there?”

then:

> „Was it also there historically?”

### Premium
Historical maps + place connections.

### Technical
Relatively achievable early.

### SEO
Strong.

### Share
Very strong visual output.

---

## #3 Rarity

### Why
Fastest payoff and strongest share mechanic.

### FREE
- count,
- national rank,
- 1-in-X,
- rarity descriptor.

### Next
> „Where are the other people?”

### Premium
Do **not** monetize rarity directly.

Use rarity to route to geography/origin.

### Technical
Easy where official counts exist.

### SEO
Strong.

### Share
Probably one of the highest.

---

## #4 Family Story Validation

### Why
This is where emotional investment and WTP begin to increase.

### FREE
Surname-level evidence.

### First wow
Surname data aligns—or conflicts—with family story.

### Next
> „Can you check MY family?”

### Premium
79 PLN Family Origin.

### Additional data
Region.

### Technical
Moderate/high.

### SEO
Lower volume than generic surname, but high-value long-tail.

### Share
Low publicly, high within family.

---

## #5 Family History / Early Genealogy

Not „find every ancestor” yet.

### MVP version
> **Help me move from a surname to my first real family clue.**

### FREE
educational transition.

### Premium
79 Family Origin.

### Later
199 Deep Research.

### Additional information
- known region,
- oldest known relative,
- approximate year.

### Technical
Harder.

### Why include
It validates whether Name Atlas can become a business beyond novelty.

---

# 6. INTENT PROGRESSION MAP

The most likely product paths are not one funnel but several.

## PATH A — casual → serious

```text
QUICK CURIOSITY
      ↓
MEANING
      ↓
ORIGIN
      ↓
GEOGRAPHY
      ↓
FAMILY STORY
      ↓
FAMILY ORIGIN
      ↓
GENEALOGY
      ↓
DEEP RESEARCH
```

---

## PATH B — viral

```text
RARITY
   ↓
MAP
   ↓
SHARE
   ↓
COMPARE WITH FRIEND/PARTNER
   ↓
SAME-SURNAME CONNECTION
   ↓
ORIGIN
```

---

## PATH C — emotional

```text
OLD PHOTO / DOCUMENT / DEATH
            ↓
PRESERVATION
            ↓
FAMILY MYSTERY
            ↓
MIGRATION / PLACE
            ↓
FAMILY ORIGIN
            ↓
DEEP RESEARCH
            ↓
FAMILY BOOK
```

---

## PATH D — genealogy

```text
KNOWN GRANDPARENT
       ↓
MISSING DETAIL
       ↓
BRICK WALL
       ↓
RECORD
       ↓
NEXT GENERATION
       ↓
HUMAN RESEARCH
```

---

## PATH E — life event

```text
WEDDING / CHILD
      ↓
SURNAME IDENTITY
      ↓
MEANING / ORIGIN
      ↓
PARTNER COMPARISON
      ↓
LEGACY
      ↓
GIFT / FAMILY BOOK
```

---

# 7. QUERY → EXPERIENCE MAP

The biggest design implication:

## Do **not** show everyone the same first reveal.

| Query / Entry | First result | Secondary | Curiosity bridge | Premium |
|---|---|---|---|---|
| `co oznacza nazwisko X` | Meaning | linguistic origin | „Meaning points toward a region” | 29 |
| `pochodzenie nazwiska X` | Origin | map | „Current map differs from historic clues” | 29 |
| `ile osób ma nazwisko X` | Count | rarity | „Here is where they live” | free→origin |
| `czy nazwisko X jest rzadkie` | Rarity | ranking | map | free |
| `mapa nazwiska X` | **Map first** | concentration | historical layer | 29 |
| `historia nazwiska X` | timeline/meaning | variants | archive sources | 29 |
| `herb nazwiska X` | heraldic disclaimer + documented references | lineage requirement | ancestry verification | human/deep |
| `czy ludzie o nazwisku X są rodziną` | explain probabilities | rarity + map | compare regions | 79 |
| `jak znaleźć przodków X` | family research input | records coverage | first candidate sources | 199 |
| `skąd pochodzi moja rodzina` | surname + region input | surname origin | family-specific refinement | 79 |
| social/TikTok | rarity + map | origin | share/compare | later |
| gift | gift preview | report contents | personalize recipient | Gift |

---

# 8. ENTRY-POINT PERSONALISATION

## Recommended architecture

### `/surname/[name]`
Broad overview.

### `/meaning/[name]`
Meaning first.

### `/origin/[name]`
Origin first.

### `/map/[name]`
Map first.

### `/history/[name]`
History/variants first.

### `/family-origin`
Personal research funnel.

### `/gift`
Recipient-first flow.

**RECOMMENDATION:** These should not be superficial copies with reordered cards. Each intent page should have genuinely different introductory content and first interaction.

The underlying surname data object remains the same.

---

# 9. EMOTIONAL ARC — 5 core intents

## A. QUICK CURIOSITY

**Before**  
„Ciekawe, co to znaczy.”

↓

**Answer**  
Meaning appears instantly.

↓

**Surprise**  
Origin is less obvious than assumed.

↓

**New question**  
„Why that region?”

↓

**Trust**  
source + likelihood.

↓

**Investment**  
map.

↓

**Purchase intent**  
„Show me how the name changed historically.”

---

## B. RARITY

**Before**  
„Pewnie prawie nikt tak się nie nazywa.”

↓

**Answer**  
exact count.

↓

**Surprise**  
much rarer/commoner than expected.

↓

**Question**  
„Where are they?”

↓

**Map**

↓

**Emotional investment**  
one region strongly dominates.

↓

**Next question**  
„Why there?”

Rarity itself should not force premium.

---

## C. ORIGIN / IDENTITY

**Before**  
„Skąd właściwie jesteśmy?”

↓

**Answer**  
likely linguistic/geographic origin.

↓

**Surprise**  
unexpected place/language.

↓

**Question**  
„Was MY family actually there?”

↓

**Trust**  
source + confidence.

↓

**Investment**  
family region entered.

↓

**Purchase**  
Family Origin.

---

## D. FAMILY MYSTERY

**Before**  
„Babcia mówiła, że pochodzimy z X.”

↓

**Free answer**  
surname-level data.

↓

**Surprise**  
one clue aligns or conflicts.

↓

**Question**  
„Can this be checked?”

↓

**Trust**  
Name Atlas explains surname-level ≠ family-level.

↓

**Investment**  
user enters region.

↓

**Purchase**  
Family Origin / Deep Research.

---

## E. PRESERVATION

**Before**  
„We’re losing this history.”

↓

**Answer**  
surname becomes structured story.

↓

**Surprise**  
more history exists than family remembered.

↓

**Question**  
„Can I save all this?”

↓

**Trust**  
sources + export.

↓

**Investment**  
add people/photos/stories.

↓

**Purchase**  
Family Edition / book.

---

# 10. MOMENTS THAT MATTER

| Moment | User thought | Emotion | UX requirement | Trust requirement | CTA | Risk |
|---|---|---|---|---|---|---|
| 1. Search recognized | „They know my surname” | validation | instant match | correct normalization | Discover | wrong surname |
| 2. Count appears | „There are X of us” | curiosity | huge number | source/date | See rarity | stale data |
| 3. Rarity | „That's unusual” | pride/play | context | methodology | Share | arbitrary score |
| 4. Map | „They're all THERE” | surprise | strong visualization | current vs historic label | Explore region | origin inference |
| 5. Meaning | „I didn't know that” | learning | concise explanation | citation | Why? | generic AI |
| 6. Confidence | „They admit uncertainty” | trust | readable confidence | methodology | Sources | jargon |
| 7. First historic variant | „It used to look different” | discovery | tangible example | dated source | Explore variants | invented spelling |
| 8. Historical place clue | „That place matters” | mystery | map/time context | evidence type | Explore place | overclaim |
| 9. Family overlap | „My grandfather was from there” | personal relevance | ask optional region | clear data use | Refine | creepiness |
| 10. Discovery index | „There's genuinely more” | anticipation | real counts | scope disclosure | Continue | fake counts |
| 11. Family question | „Now this is about us” | investment | 1 relevant question | privacy explanation | Add region | friction |
| 12. Premium preview | „I can see what I'll get” | ownership | personalized report | sample/source | Open report | generic paywall |
| 13. First paid discovery | „Worth it” | reward | strongest credible item early | citation | Continue | weak report |
| 14. Deep research transition | „Can we identify people?” | ambition | explain limits | strong caution | Research family | overpromise |

---

# 11. COMMERCIAL INTENT MAP

No segment-size claim is being made.

## A. HIGH-TRAFFIC / LOW-WTP

Likely candidates:

- meaning;
- rarity;
- count;
- map;
- basic origin.

**Role:** acquisition.

Not the revenue center.

---

## B. MEDIUM-TRAFFIC / MEDIUM-WTP

- surname history;
- migration;
- heraldry;
- identity;
- life events;
- same-surname comparison.

**Role:** Name Report / Family Origin.

---

## C. LOWER-TRAFFIC / HIGH-WTP

- brick wall;
- unknown ancestor;
- document interpretation;
- migration reconstruction;
- professional verification.

**Role:** 199 / human research.

---

## D. VIRAL USERS

- rarity;
- map;
- same-surname comparison;
- partner comparison;
- surprising origin.

**Do not paywall their first social result.**

---

## E. GIFT USERS

- preservation;
- family-book;
- birthday/Christmas/retirement;
- parent/grandparent research.

Physical or premium digital artifact > subscription.

---

## F. SERIOUS GENEALOGY USERS

Need:

- originals,
- citations,
- search variants,
- date/place filters,
- evidence logs.

They will reject „magic AI”.

Recent genealogy communities demonstrate extreme sensitivity to unsourced AI outputs.

Source: https://www.reddit.com/r/Genealogy/comments/1u0uyg7/my_experience_with_ai_genealogy_was_so_very_bad/

---

# Who should NOT be MVP target?

## Unknown biological parent / adoption investigation
Too sensitive and evidence-heavy.

## DNA interpretation
Requires specialized expertise/regulatory considerations.

## Legal inheritance/citizenship proof
Different product requirements and liability.

## Full heraldic lineage verification
Specialist task.

## Professional genealogists
Their needs are research-workflow oriented, not consumer discovery oriented.

---

# 12. PERSONALISATION MAP

Only ask something if it materially changes the result.

| Intent | Question | Why | Unlock | Privacy cost | Friction |
|---|---|---|---|---|---|
| Origin | „Z jakim regionem kojarzy się Twoja rodzina?” | compare surname vs family | Family Origin | Low | Low |
| Geography | none initially | map already works | — | none | none |
| Rarity | none | unnecessary | — | none | none |
| Family story | „Jaki region pojawia się w tej rodzinnej historii?” | test lore | focused sources | Low | Low |
| Migration | „Czy znasz kraj/region, z którego ktoś wyemigrował?” | define route | migration source search | Low | Low |
| Early genealogy | „Kto jest najstarszą osobą, której dane znasz?” | anchor | person-level search | Medium | Medium |
| Brick wall | „Jakiego jednego faktu brakuje?” | define research goal | focused lookup | Medium | Medium |
| Gift | „Dla kogo jest raport?” | tone/cover | gift edition | Low | Low |
| Preservation | „Czy masz miejsce/rok związany z najstarszym materiałem?” | contextualize artifact | historical context | Medium | Medium |
| Same-surname | „Czy obie rodziny mają znany region?” | test plausibility | geographic comparison | Medium | Medium |

### Important

Do **not** ask grandmother's maiden name just because it is useful in genealogy.

Ask it only when the user enters **person-level family research**, and explain:

> „Nazwisko rodowe pozwala szukać jej przed ślubem w aktach urodzeń i małżeństw.”

---

# 13. COPY BY INTENT — 10 key intents

## 1. MEANING

**Hero PL:**  
**Co oznacza Twoje nazwisko?**

**EN:**  
**What does your surname mean?**

**First result PL:**  
„Najbardziej prawdopodobna interpretacja językowa to…”

**EN:**  
„The strongest linguistic interpretation is…”

**Bridge PL:**  
„Znaczenie to tylko jedna część historii. Zobaczmy, gdzie nazwisko występowało.”

**EN:**  
„Meaning is only one part of the story. Now see where the name appears.”

**Premium PL:**  
„Otwórz pełną historię nazwiska.”

**EN:**  
„Open the full history of the surname.”

---

## 2. ORIGIN

**PL:**  
**Skąd może pochodzić Twoje nazwisko?**

**EN:**  
**Where might your surname come from?**

**First:**  
„Najsilniejsze dowody wskazują na…”

 /  
„The strongest evidence points toward…”

**Bridge:**  
„Czy ten region pojawia się również w historii Twojej rodziny?”

 /  
„Does this region appear in your family's story too?”

**Premium:**  
„Zawęź research do swojej gałęzi rodziny.”

 /  
„Narrow the research to your family branch.”

---

## 3. RARITY

**PL:**  
**Jak rzadkie jest Twoje nazwisko?**

**EN:**  
**How rare is your surname?**

**First:**  
„To nazwisko nosi [X] osób.”

 /  
„[X] people currently carry this surname.”

**Bridge:**  
„Większość mieszka w kilku konkretnych regionach.”

 /  
„Most are concentrated in a small number of regions.”

**Premium transition:** none immediately.

CTA:

**Zobacz mapę / View the map**

---

## 4. GEOGRAPHY

**PL:**  
**Gdzie żyje Twoje nazwisko?**

**EN:**  
**Where does your surname live today?**

**First:**  
„Największe współczesne skupisko znajduje się…”

**Bridge:**  
„Dzisiejsza mapa nie musi wyglądać tak jak historyczna.”

**EN:**  
„Today's map may not look like the historical one.”

**Premium:**  
„Cofnij mapę w czasie.”

 /  
„Move the map back through time.”

---

## 5. FAMILY MYSTERY

**PL:**  
**Rodzinne historie często zostawiają ślady.**

**EN:**  
**Family stories often leave traces.**

**First:**  
„Na poziomie nazwiska znaleźliśmy…”

**Bridge:**  
„To jeszcze nie dowodzi historii Twojej rodziny. Możemy ją zawęzić.”

**EN:**  
„This doesn't yet prove your family's story. We can narrow the research.”

**Premium:**  
**Zbadaj historię swojej gałęzi.**

 /  
**Research your family branch.**

---

## 6. MIGRATION

**PL:**  
**Nazwiska przemieszczają się razem z ludźmi.**

**EN:**  
**Surnames move with people.**

**First:**  
„Historyczne źródła pokazują nazwisko również w…”

**Bridge:**  
„Czy ten ruch pokrywa się z historią Twojej rodziny?”

**Premium:**  
„Zbuduj mapę rodzinnej drogi.”

 /  
„Build your family's migration map.”

---

## 7. GENEALOGY

**PL:**  
**Zacznij od osoby, którą jeszcze pamiętasz.**

**EN:**  
**Start with the person you still know.**

**First:**  
„Najlepszym punktem zaczepienia jest…”

**Bridge:**  
„Ten rekord może prowadzić do poprzedniego pokolenia.”

**Premium:**  
„Przeszukaj źródła dla tej osoby.”

 /  
„Search the historical sources for this person.”

---

## 8. SAME-SURNAME

**PL:**  
**To samo nazwisko nie zawsze oznacza tę samą rodzinę.**

**EN:**  
**The same surname doesn't always mean the same family.**

**First:**  
„Rzadkość i geografia mogą nam powiedzieć, czy warto szukać dalej.”

**Bridge:**  
„Obie linie łączy jeden region.”

**Premium:**  
„Porównaj obie gałęzie.”

 /  
„Compare both family lines.”

---

## 9. HERALDRY

**PL:**  
**Nazwisko może pojawiać się w herbarzu. To nie znaczy jeszcze, że herb należy do Twojej rodziny.**

**EN:**  
**A surname may appear in heraldic records. That doesn't yet make the arms yours.**

**First:**  
„Znaleźliśmy udokumentowane odniesienie…”

**Bridge:**  
„Aby połączyć je z Twoją rodziną, potrzebna jest genealogia.”

**Premium:**  
„Sprawdź linię pochodzenia.”

 /  
„Research the lineage.”

---

## 10. GIFT / LEGACY

**PL:**  
**Podaruj historię, której rodzina jeszcze nie zna.**

**EN:**  
**Give them a family story they haven't discovered yet.**

**First:** personalized cover.

**Bridge:**  
„Dodaj rodzinny region lub osobę, od której mamy zacząć.”

**EN:**  
„Add a family region or the person we should start from.”

**Premium:**  
**Stwórz Family Edition.**

---

# 14. PRODUCT IMPLICATIONS

## Onboarding

Do not ask:

> „What are you here for?”

with 8 abstract choices.

Use **entry context** whenever possible.

Google query already tells us the intent.

If direct traffic:

simple surname input → generic discovery flow.

---

# First reveal

Must change by intent.

### Meaning query
Meaning first.

### Map query
Map first.

### Rarity query
Count first.

### Family origin query
Surname + optional family region.

This is a major departure from designing one universal reveal sequence.

---

# Navigation

Instead of SaaS tabs:

**TODAY**  
**ORIGIN**  
**PLACES**  
**THROUGH TIME**  
**SOURCES**  
**YOUR FAMILY**

The last section is the intentional transition from surname to genealogy.

---

# Report structure

The report should differentiate:

### Surname-level
What is known about the surname generally.

### Family-level
What may relate to the user's branch.

Never mix them visually.

---

# Paywall

Paywall should change with intent.

### Casual origin user
**Full Name Atlas — 29/49**

### Family mystery user
**Family Origin — 79**

### Brick-wall user
**Deep Research — 199+**

A single universal „Unlock Premium” would waste intent information.

---

# Sharing

Best shareable FREE outputs:

1. rarity;
2. 1-in-X;
3. map;
4. origin region;
5. number of variants;
6. compare two surnames.

Spotify demonstrates the scale identity-data sharing can reach when every result becomes an explicit shareable story object.

Source: https://newsroom.spotify.com/2025-12-03/2025-wrapped-user-experience/

---

# Premium products

This intent map strongly supports:

```text
FREE DISCOVERY
    ↓
NAME REPORT
    ↓
FAMILY ORIGIN
    ↓
DEEP RESEARCH
    ↓
HUMAN RESEARCH
```

because every stage answers a **different question** rather than selling „more features”.

---

# FINAL MVP RECOMMENDATION

I would build the first version around **three primary entry experiences**, even though five intents are supported.

## FLOW A — Surname Discovery

Covers:

- meaning,
- rarity,
- geography,
- origin.

```text
Search
↓
intent-aware first answer
↓
other free dimensions
↓
map
↓
one historical clue
↓
Name Report
```

---

## FLOW B — Family Origin

Covers:

- family story,
- migration,
- identity.

```text
Surname
↓
surname-level origin
↓
"What region do you associate with your family?"
↓
compare with surname evidence
↓
family relevance emerges
↓
79 PLN Family Origin
```

---

## FLOW C — Share / Compare

Covers:

- rarity,
- partner/friends,
- same surname.

```text
Surname
↓
rarity
↓
map
↓
share card
↓
"Compare another surname"
↓
second search
↓
origins / possible overlaps
```

This is the growth loop.

---

# The single most important question in the whole product

The user's initial question may be:

> **„What does my surname mean?”**

But the question Name Atlas wants to help the user *earn* is:

> **„Does this history have anything to do with MY family?”**

That is the transition point.

Before it, Name Atlas is a **surname utility**.

After it, Name Atlas becomes a **personal family-history product**.

And one further question creates the high-value research product:

> **„Can we identify the actual people?”**

So the strategic ladder is:

# WHAT DOES THE NAME MEAN?

↓

# WHERE DID THE NAME COME FROM?

↓

# DID MY FAMILY COME FROM THERE?

↓

# WHO WERE THEY?

That is the most coherent route from one-time curiosity to a deep personal experience that I found in the research.

---

# Core evidence sources

- FamilySearch surname discovery and progression into historical records: https://www.familysearch.org/en/surname
- Geneanet surname origin, maps, variants and transition into genealogy: https://en.geneanet.org/surnames/articles/origin-of-last-names
- Findmypast surname origin → historical maps → records/tree progression: https://www.findmypast.co.uk/guides/surname-origins
- Polish beginner/family-gap genealogy behaviors: https://www.reddit.com/r/Polska/comments/zhs1la
- Rarity and same-surname social behavior: https://www.reddit.com/r/Genealogy/comments/1niaw5i/who_has_one_of_the_worlds_rarest_surnames/
- Trust risks around unsourced AI genealogy: https://www.reddit.com/r/Genealogy/comments/1u0uyg7/my_experience_with_ai_genealogy_was_so_very_bad/
- Gift/preservation behavior: https://www.reddit.com/r/Genealogy/comments/jj893v
- Surname identity around marriage/life events: https://www.reddit.com/r/weddingplanning/comments/1624pjh/changing_your_last_name/
- Identity-data sharing benchmark from Spotify Wrapped: https://newsroom.spotify.com/2026-02-10/spotify-q4-2025-earnings/
