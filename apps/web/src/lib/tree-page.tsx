import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { HIDDEN_FIELDS } from "@name-atlas/family";
import type { CardRead, TreePersonRead, TreeRead } from "@name-atlas/family";
import { accountsRuntime } from "./accounts-runtime.js";
import { db } from "./db.js";
import { familyTreeEnabled } from "./family-config.js";
import { familyRuntime } from "./family-runtime.js";
import { legalPath } from "./legal-text.js";
import { formatDate } from "./messages.js";
import type { Lang } from "./messages.js";
import { sessionCookieName } from "./session-cookie.js";
import { SiteShell } from "./site-shell.js";
import { TreeMapView } from "./tree-map-view.js";
import { TreeConstellation } from "./tree-stars.js";
import { loadTreePage } from "./tree-load.js";
import type { PersonFormData, Query, TreePageData, TreeSession } from "./tree-load.js";
import {
  DRAFT_FIELDS,
  draftQuery,
  HIDE_FIELD,
  INVITATION_TOKEN,
  treeActionPath,
  treeExportPath,
  treePath,
  treeTarget,
} from "./tree-paths.js";
import type {
  PersonDraft,
  SlotRole,
  TreeAction,
  TreePage as TreePageName,
  TreeTarget,
} from "./tree-paths.js";
import { fullName, GENERATIONS } from "./tree-pedigree.js";
import type { Question, Slot } from "./tree-pedigree.js";
import { placeRegions, searchPlaces } from "./tree-places.js";
import { statusChip, TREE_TEXT, treeStatusWords, yearsLine } from "./tree-text.js";

/**
 * The tree's pages (TASK-076; the Konstelacja, TASK-091): `/pl/konto/drzewa/[[...rest]]` and
 * `/en/account/trees/[[...rest]]`. Plain HTML forms that post to
 * `/api/tree/<action>` and need no script, drawn in the dusk direction
 * (ADR-0021) after the chosen mockups: the dashboard, the consent step, the
 * Rodowód with its cards and dashed empty places, one question per screen,
 * and a person's form.
 *
 * Invitations and claims (TASK-094): a person's page carries the owner's
 * invitation and shows a claimed row read-only with its hidden fields marked;
 * the invitation page shows the invited person their own row and the three
 * answers; a claimant's cards and one card with its form are their own pages.
 *
 * `tree-load.ts` decides and reads; this file only renders what it returns.
 * The pages are `noindex` and `no-store`, and the one lookup outside the tree
 * (a birthplace in TERYT) is a GET of the same page with the draft in its
 * query, so a reload loses nothing and nothing is stored before the last POST.
 */

export function treeMetadata(lang: Lang, page: TreePageName): Metadata {
  return {
    title: `${TREE_TEXT[lang].headings[page]} — Name Atlas`,
    robots: { index: false, follow: false },
    referrer: "same-origin",
  };
}

function Status({
  lang,
  page,
  word,
  text,
}: {
  lang: Lang;
  page: TreePageName;
  word: string | null;
  text?: string;
}) {
  const status = treeStatusWords(lang, page, word);
  if (status === null) return null;
  return (
    <p
      className={`account-status account-status-${status.tone}`}
      role={status.tone === "problem" ? "alert" : "status"}
    >
      {text ?? status.text}
    </p>
  );
}

function Form({
  action,
  lang,
  children,
  label,
  className = "",
}: {
  readonly action: TreeAction;
  readonly lang: Lang;
  readonly children: ReactNode;
  readonly label: string;
  readonly className?: string;
}) {
  return (
    <form
      className={`offer-form account-form tree-form ${className}`.trim()}
      method="post"
      action={treeActionPath(action)}
      aria-label={label}
    >
      <input type="hidden" name="lang" value={lang} />
      {children}
    </form>
  );
}

function Send({
  children,
  ghost = false,
}: {
  readonly children: ReactNode;
  readonly ghost?: boolean;
}) {
  return (
    <button type="submit" className={ghost ? "offer-send account-danger" : "offer-send"}>
      {children}
    </button>
  );
}

function Text({
  name,
  label,
  value,
  maxLength,
  hint,
  required = false,
  mono = false,
}: {
  readonly name: string;
  readonly label: string;
  readonly value: string;
  readonly maxLength: number;
  readonly hint?: string;
  readonly required?: boolean;
  readonly mono?: boolean;
}) {
  return (
    <label>
      <span>{label}</span>
      <input
        name={name}
        type="text"
        defaultValue={value}
        maxLength={maxLength}
        required={required}
        autoCapitalize="words"
        spellCheck={false}
        className={mono ? "tree-mono" : undefined}
        inputMode={mono ? "numeric" : undefined}
      />
      {hint === undefined ? null : <small>{hint}</small>}
    </label>
  );
}

function Check({
  name,
  label,
  checked,
  value = "1",
}: {
  readonly name: string;
  readonly label: string;
  readonly checked: boolean;
  /** The box's value; several boxes of one name carry their own (the hide boxes, TASK-094). */
  readonly value?: string;
}) {
  return (
    <label className="account-check">
      <input type="checkbox" name={name} value={value} defaultChecked={checked} />
      <span>{label}</span>
    </label>
  );
}

/** The fields of one person, as the one-question flow and the person's form share them. */
/** The birthplace: the typed name, the TERYT lookup as a GET of the page, the matches as radios. */
function PlaceFields({
  lang,
  form,
  pagePath,
}: {
  readonly lang: Lang;
  readonly form: PersonFormData;
  readonly pagePath: string;
}) {
  const t = TREE_TEXT[lang].form;
  const d = form.draft;
  const chosen = form.search.kind === "found" ? form.search.matches : [];
  return (
    <>
      <div className="tree-place">
        <Text
          name={DRAFT_FIELDS.placeText}
          label={t.place}
          value={d.placeText}
          maxLength={120}
          hint={t.placeHint}
        />
        <button
          type="submit"
          className="tree-search"
          formMethod="get"
          formAction={pagePath}
          name="search"
          value="1"
        >
          {t.search}
        </button>
      </div>
      {form.search.kind === "none" ? (
        d.placeCode === "" ? null : (
          <input type="hidden" name={DRAFT_FIELDS.placeCode} value={d.placeCode} />
        )
      ) : (
        <fieldset className="tree-matches">
          <legend>{t.matches}</legend>
          {form.search.kind === "empty" ? <p>{t.noMatch}</p> : null}
          {form.search.kind === "unavailable" ? <p>{t.unavailable}</p> : null}
          {chosen.map((m, i) => (
            <label key={m.code} className="account-check">
              <input
                type="radio"
                name={DRAFT_FIELDS.placeCode}
                value={`${m.code} ${m.name}`}
                defaultChecked={d.placeCode === m.code || (d.placeCode === "" && i === 0)}
              />
              <span>
                {m.name}
                {m.district === null && m.region === null ? null : (
                  <small>
                    {" · "}
                    {[m.district, m.region].filter((x) => x !== null).join(" · ")}
                  </small>
                )}
              </span>
            </label>
          ))}
          <label className="account-check">
            <input
              type="radio"
              name={DRAFT_FIELDS.placeCode}
              value=""
              defaultChecked={chosen.length === 0}
            />
            <span>{t.keepTyped}</span>
          </label>
        </fieldset>
      )}
    </>
  );
}

function PersonFields({
  lang,
  form,
  pagePath,
}: {
  readonly lang: Lang;
  readonly form: PersonFormData;
  /** The page itself, which the TERYT lookup is a GET of. */
  readonly pagePath: string;
}) {
  const t = TREE_TEXT[lang].form;
  const d = form.draft;
  return (
    <>
      <Text name={DRAFT_FIELDS.given} label={t.given} value={d.given} maxLength={120} required />
      <Text
        name={DRAFT_FIELDS.surname}
        label={t.surname}
        value={d.surname}
        maxLength={120}
        required
      />
      <Text
        name={DRAFT_FIELDS.birthSurname}
        label={t.birthSurname}
        value={d.birthSurname}
        maxLength={120}
      />
      <div className="tree-year">
        <Text
          name={DRAFT_FIELDS.birthYear}
          label={t.birthYear}
          value={d.birthYear}
          maxLength={4}
          mono
        />
        <Check name={DRAFT_FIELDS.birthApprox} label={t.approx} checked={d.birthApprox} />
      </div>
      <PlaceFields lang={lang} form={form} pagePath={pagePath} />
      <fieldset className="tree-living">
        <legend>{t.livingHeading}</legend>
        {(["LIVING", "DECEASED", "UNKNOWN"] as const).map((status) => (
          <label key={status} className="account-check">
            <input
              type="radio"
              name={DRAFT_FIELDS.living}
              value={status}
              defaultChecked={d.living === status}
            />
            <span>{t.living[status]}</span>
          </label>
        ))}
        <small>{t.livingHint}</small>
      </fieldset>
      <div className="tree-year">
        <Text
          name={DRAFT_FIELDS.deathYear}
          label={t.deathYear}
          value={d.deathYear}
          maxLength={4}
          mono
        />
        <Check name={DRAFT_FIELDS.deathApprox} label={t.approx} checked={d.deathApprox} />
      </div>
      <Text
        name={DRAFT_FIELDS.sourceNote}
        label={t.sourceNote}
        value={d.sourceNote}
        maxLength={500}
        hint={t.sourceHint}
      />
      <label>
        <span>{t.notes}</span>
        <textarea name={DRAFT_FIELDS.notes} rows={3} maxLength={2000} defaultValue={d.notes} />
      </label>
    </>
  );
}

function Chip({ person, lang }: { person: TreePersonRead; lang: Lang }) {
  const chip = statusChip(person, lang);
  return <span className={`tree-chip tree-chip-${chip.kind}`}>{chip.text}</span>;
}

function placeLine(person: TreePersonRead): string | null {
  return person.birth.place_text;
}

function PersonCard({
  person,
  lang,
  href,
}: {
  person: TreePersonRead;
  lang: Lang;
  href: string | null;
}) {
  const body = (
    <>
      <span className="tree-card-name">{fullName(person)}</span>
      <span className="tree-card-years">{yearsLine(person, lang)}</span>
      {placeLine(person) === null ? null : (
        <span className="tree-card-place">{placeLine(person)}</span>
      )}
      <Chip person={person} lang={lang} />
    </>
  );
  return href === null ? (
    <div className="tree-card">{body}</div>
  ) : (
    <a className="tree-card" href={href}>
      {body}
    </a>
  );
}

function QuestionCard({
  lang,
  tree,
  question,
}: {
  lang: Lang;
  tree: TreeRead;
  question: Question;
}) {
  const t = TREE_TEXT[lang].question;
  const treeId = tree.tree.id;
  if (tree.tree.role === "VIEWER") return null;
  return (
    <aside className="tree-ask" aria-labelledby="tree-ask">
      <p className="tree-eyebrow" id="tree-ask">
        {t.heading}
      </p>
      {question.kind === "start" ? (
        <>
          <h3>{t.start}</h3>
          <p>{t.startLede}</p>
          <a className="offer-send" href={treePath(lang, { page: "add", treeId })}>
            {TREE_TEXT[lang].pedigree.addFirst}
          </a>
        </>
      ) : null}
      {question.kind === "ask" ? (
        <>
          <p className="tree-card-name">{fullName(question.child)}</p>
          <h3>{t.ask(question.role)}</h3>
          <p>{t.emptyIsFine}</p>
          <a
            className="offer-send"
            href={treePath(
              lang,
              { page: "add", treeId },
              { child: question.childId, role: question.role },
            )}
          >
            {t.answer}
          </a>
        </>
      ) : null}
      {question.kind === "complete" ? <p>{t.complete}</p> : null}
    </aside>
  );
}

function TreesView({ data }: { data: Extract<TreePageData, { kind: "trees" }> }) {
  const { lang } = data;
  const t = TREE_TEXT[lang];
  return (
    <>
      <section>
        <h2>{t.headings.trees}</h2>
        <p className="page-lede">{t.dashboard.lede}</p>
        <Status lang={lang} page="trees" word={data.status} />
        {data.trees.length === 0 ? <p>{t.dashboard.none}</p> : null}
        <ul className="tree-list">
          {data.trees.map((tree) => (
            <li key={tree.tree_id}>
              <a href={treePath(lang, { page: "tree", treeId: tree.tree_id })}>
                <span className="tree-card-name">{tree.title}</span>
                <span className="tree-card-years">
                  {t.dashboard.people(tree.person_count)} · {t.dashboard.role[tree.role]} ·{" "}
                  {t.dashboard.changed}{" "}
                  <time dateTime={tree.updated_at.slice(0, 10)}>
                    {formatDate(tree.updated_at.slice(0, 10), lang)}
                  </time>
                </span>
              </a>
            </li>
          ))}
        </ul>
        {data.cards.length > 0 ? (
          <p className="tree-cards-link">
            <a href={treePath(lang, { page: "cards" })}>
              {t.cards.dashboardLink(data.cards.length)}
            </a>
          </p>
        ) : null}
        <h3>{t.dashboard.newTree}</h3>
        <Form action="create-tree" lang={lang} label={t.dashboard.newTree}>
          <Text
            name="title"
            label={t.dashboard.title}
            value=""
            maxLength={120}
            hint={t.dashboard.titleHint}
            required
          />
          <Send>{t.dashboard.create}</Send>
        </Form>
      </section>
      {data.firstTree !== null && data.question !== null ? (
        <QuestionCard lang={lang} tree={data.firstTree} question={data.question} />
      ) : null}
      <aside className="tree-ask" aria-labelledby="tree-privacy">
        <p className="tree-eyebrow" id="tree-privacy">
          {t.dashboard.privacyHeading}
        </p>
        <ul>
          {t.dashboard.privacy.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <a href={legalPath("terms", lang)}>{t.dashboard.rules}</a>
      </aside>
    </>
  );
}

/** Rodowód · Konstelacja · Mapa (TASK-091, TASK-092): the views of one tree, the page's own marked. */
function ViewSwitch({
  lang,
  treeId,
  current,
}: {
  lang: Lang;
  treeId: string;
  current: "tree" | "constellation" | "map";
}) {
  const t = TREE_TEXT[lang].constellation;
  const views = ["tree", "constellation", "map"] as const;
  return (
    <nav className="tree-seg" aria-label={t.viewsLabel}>
      {views.map((view) => (
        <a
          key={view}
          href={treePath(lang, { page: view, treeId })}
          aria-current={current === view ? "page" : undefined}
        >
          {t.views[view]}
        </a>
      ))}
    </nav>
  );
}

function MapView({ data }: { data: Extract<TreePageData, { kind: "map" }> }) {
  const { lang, tree } = data;
  const t = TREE_TEXT[lang];
  const treeId = tree.tree.id;
  const canEdit = tree.tree.role !== "VIEWER";
  return (
    <section className="tree-wide">
      <p className="tree-eyebrow">
        <a href={treePath(lang, { page: "trees" })}>{t.pedigree.back}</a>
      </p>
      <h2>{tree.tree.title}</h2>
      <p className="page-lede">{t.map.lede}</p>
      <ViewSwitch lang={lang} treeId={treeId} current="map" />
      {canEdit ? null : <p className="account-status">{t.pedigree.viewer}</p>}
      {tree.hidden_living_count > 0 ? (
        <p className="account-status">{t.pedigree.hiddenCount(tree.hidden_living_count)}</p>
      ) : null}
      {data.slots.length === 0 ? (
        <p className="account-links">
          {t.question.startLede}{" "}
          {canEdit ? (
            <a href={treePath(lang, { page: "add", treeId })}>{t.pedigree.addFirst}</a>
          ) : null}
        </p>
      ) : (
        <TreeMapView
          lang={lang}
          treeId={treeId}
          canEdit={canEdit}
          slots={data.slots}
          places={data.places}
          picked={data.picked}
        />
      )}
      {data.unplacedCount > 0 ? (
        <p className="account-status">
          {t.constellation.outside(data.unplacedCount)}{" "}
          <a href={treePath(lang, { page: "tree", treeId })}>{t.constellation.outsideLink}</a>
        </p>
      ) : null}
    </section>
  );
}

function ConstellationView({ data }: { data: Extract<TreePageData, { kind: "constellation" }> }) {
  const { lang, tree } = data;
  const t = TREE_TEXT[lang];
  const treeId = tree.tree.id;
  const canEdit = tree.tree.role !== "VIEWER";
  return (
    <section className="tree-wide">
      <p className="tree-eyebrow">
        <a href={treePath(lang, { page: "trees" })}>{t.pedigree.back}</a>
      </p>
      <h2>{tree.tree.title}</h2>
      <p className="page-lede">{t.constellation.lede}</p>
      <ViewSwitch lang={lang} treeId={treeId} current="constellation" />
      {canEdit ? null : <p className="account-status">{t.pedigree.viewer}</p>}
      {tree.hidden_living_count > 0 ? (
        <p className="account-status">{t.pedigree.hiddenCount(tree.hidden_living_count)}</p>
      ) : null}
      {data.slots.length === 0 ? (
        <p className="account-links">
          {t.question.startLede}{" "}
          {canEdit ? (
            <a href={treePath(lang, { page: "add", treeId })}>{t.pedigree.addFirst}</a>
          ) : null}
        </p>
      ) : (
        <TreeConstellation
          lang={lang}
          treeId={treeId}
          canEdit={canEdit}
          slots={data.slots}
          picked={data.picked}
        />
      )}
      {data.unplacedCount > 0 ? (
        <p className="account-status">
          {t.constellation.outside(data.unplacedCount)}{" "}
          <a href={treePath(lang, { page: "tree", treeId })}>{t.constellation.outsideLink}</a>
        </p>
      ) : null}
    </section>
  );
}

function TreeView({ data }: { data: Extract<TreePageData, { kind: "tree" }> }) {
  const { lang, tree } = data;
  const t = TREE_TEXT[lang];
  const treeId = tree.tree.id;
  const canEdit = tree.tree.role !== "VIEWER";
  const byGeneration = new Map<number, Slot[]>();
  for (const slot of data.slots) {
    const list = byGeneration.get(slot.generation) ?? [];
    list.push(slot);
    byGeneration.set(slot.generation, list);
  }
  const addedText =
    data.status === "added" && data.person !== null
      ? t.pedigree.added(fullName(data.person))
      : undefined;
  return (
    <>
      <section className="tree-wide">
        <p className="tree-eyebrow">
          <a href={treePath(lang, { page: "trees" })}>{t.pedigree.back}</a>
        </p>
        <h2>{tree.tree.title}</h2>
        <p className="page-lede">{t.pedigree.lede}</p>
        <ViewSwitch lang={lang} treeId={treeId} current="tree" />
        <Status lang={lang} page="tree" word={data.status} text={addedText} />
        {canEdit ? null : <p className="account-status">{t.pedigree.viewer}</p>}
        {tree.hidden_living_count > 0 ? (
          <p className="account-status">{t.pedigree.hiddenCount(tree.hidden_living_count)}</p>
        ) : null}
        <QuestionCard lang={lang} tree={tree} question={data.question} />
        {data.slots.length === 0 ? null : (
          <div className="tree-pedigree" role="list" aria-label={t.headings.tree}>
            {[...byGeneration.entries()].map(([generation, slots]) => (
              <div key={generation} className="tree-generation" role="listitem">
                <p className="tree-eyebrow">
                  {t.pedigree.generation[generation] ?? `${generation + 1}`}
                </p>
                <div className="tree-cards">
                  {slots.map((slot) => {
                    if (slot.person !== null) {
                      return (
                        <PersonCard
                          key={slot.n}
                          person={slot.person}
                          lang={lang}
                          href={treePath(lang, {
                            page: "person",
                            treeId,
                            personId: slot.person.id,
                          })}
                        />
                      );
                    }
                    if (slot.hidden) {
                      return (
                        <div key={slot.n} className="tree-card tree-card-hidden">
                          <span className="tree-card-name">{t.pedigree.hidden}</span>
                        </div>
                      );
                    }
                    if (!canEdit || slot.childId === null || slot.role === null) {
                      return (
                        <div
                          key={slot.n}
                          className="tree-card tree-card-empty"
                          aria-hidden="true"
                        />
                      );
                    }
                    return (
                      <a
                        key={slot.n}
                        className="tree-card tree-card-empty"
                        href={treePath(
                          lang,
                          { page: "add", treeId },
                          { child: slot.childId, role: slot.role },
                        )}
                      >
                        <span className="tree-card-name">{t.pedigree.empty(slot.role)}</span>
                      </a>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        {data.unplaced.length === 0 ? null : (
          <>
            <h3>{t.pedigree.unplaced}</h3>
            <div className="tree-cards">
              {data.unplaced.map((person) => (
                <PersonCard
                  key={person.id}
                  person={person}
                  lang={lang}
                  href={treePath(lang, { page: "person", treeId, personId: person.id })}
                />
              ))}
            </div>
          </>
        )}
        {canEdit ? (
          <p className="account-links">
            <a href={treePath(lang, { page: "add", treeId })}>{t.pedigree.addPerson}</a>
          </p>
        ) : null}
      </section>
      <section className="tree-export">
        <p className="account-links">
          <a href={treeExportPath(lang, treeId)} download>
            {t.pedigree.exportLink}
          </a>
        </p>
        <p className="tree-panel-note">{t.pedigree.exportHint}</p>
      </section>
      {tree.tree.role === "OWNER" ? (
        <section>
          <h3>{t.pedigree.deleteHeading}</h3>
          <p>{t.pedigree.deleteLede}</p>
          <Form action="delete-tree" lang={lang} label={t.pedigree.deleteHeading}>
            <input type="hidden" name="tree" value={treeId} />
            <Check name="confirm" label={t.pedigree.deleteConfirm} checked={false} />
            <Send ghost>{t.pedigree.deleteSubmit}</Send>
          </Form>
        </section>
      ) : null}
    </>
  );
}

function AddView({ data }: { data: Extract<TreePageData, { kind: "add" }> }) {
  const { lang, tree, child, role } = data;
  const t = TREE_TEXT[lang];
  const treeId = tree.tree.id;
  const back = treePath(lang, { page: "tree", treeId });
  const query = {
    ...draftQuery(data.form.draft),
    ...(child !== null && role !== null ? { child: child.id, role } : {}),
  };
  const pagePath = treePath(lang, { page: "add", treeId });
  const first = tree.persons.length === 0;

  if (child !== null && role === null) {
    const missing = (["FATHER", "MOTHER"] as const).filter((r) => !data.childHas.includes(r));
    return (
      <section>
        <p className="tree-eyebrow">
          <a href={back}>{tree.tree.title}</a> · {fullName(child)}
        </p>
        <h2>{t.form.parentsHeading}</h2>
        <p className="page-lede">{t.form.parentsLede}</p>
        <div className="tree-cards">
          {missing.map((r) => (
            <a
              key={r}
              className="tree-card tree-card-empty"
              href={treePath(lang, { page: "add", treeId }, { child: child.id, role: r })}
            >
              <span className="tree-card-name">{t.form.chooseRole(r)}</span>
            </a>
          ))}
        </div>
        <p className="account-links">
          <a href={back}>{t.question.skip}</a>
        </p>
      </section>
    );
  }

  const heading =
    role !== null ? t.form.whatHeading(role) : first ? t.form.firstHeading : t.form.anyHeading;
  return (
    <section>
      <p className="tree-eyebrow">
        <a href={back}>{tree.tree.title}</a>
        {child !== null && role !== null ? ` · ${t.form.yourParent(role, fullName(child))}` : null}
      </p>
      <h2>{heading}</h2>
      {role === null && first ? (
        <p className="page-lede">{t.form.firstLede}</p>
      ) : (
        <p className="page-lede">{t.question.emptyIsFine}</p>
      )}
      <Status lang={lang} page="add" word={data.status} />
      <Form action="add-person" lang={lang} label={heading}>
        <input type="hidden" name="tree" value={treeId} />
        {child !== null && role !== null ? (
          <>
            <input type="hidden" name="child" value={child.id} />
            <input type="hidden" name="role" value={role} />
          </>
        ) : null}
        <PersonFields lang={lang} form={data.form} pagePath={pagePath} />
        <Send>{t.form.add}</Send>
      </Form>
      <p className="account-links">
        <a href={treePath(lang, { page: "add", treeId }, query)} hidden>
          {t.question.skip}
        </a>
        <a href={back}>{t.question.skip}</a>
      </p>
    </section>
  );
}

function PersonView({ data }: { data: Extract<TreePageData, { kind: "person" }> }) {
  const { lang, tree, person } = data;
  const t = TREE_TEXT[lang];
  const treeId = tree.tree.id;
  const back = treePath(lang, { page: "tree", treeId });
  const pagePath = treePath(lang, { page: "person", treeId, personId: person.id });
  const held: SlotRole[] = [];
  const unknownParents =
    data.parents.known.filter((p) => p.role === "PARENT").length + data.parents.hidden;
  if (data.parents.known.some((p) => p.role === "FATHER") || unknownParents >= 1)
    held.push("FATHER");
  if (data.parents.known.some((p) => p.role === "MOTHER") || unknownParents >= 2)
    held.push("MOTHER");
  const isRoot = tree.tree.root_person_id === person.id;
  return (
    <>
      <section>
        <p className="tree-eyebrow">
          <a href={back}>{tree.tree.title}</a>
        </p>
        <h2>{fullName(person)}</h2>
        <p className="page-lede">
          {yearsLine(person, lang)} <Chip person={person} lang={lang} />
        </p>
        <Status lang={lang} page="person" word={data.status} />
        {person.contact_declined ? (
          <p className="tree-panel-note">{t.invite.declinedNote}</p>
        ) : null}
        {person.claimed && !person.claimed_by_me ? (
          <ClaimedRow lang={lang} person={person} />
        ) : (
          <>
            <p>{t.person.lede}</p>
            <Form action="update-person" lang={lang} label={t.form.save}>
              <input type="hidden" name="tree" value={treeId} />
              <input type="hidden" name="person" value={person.id} />
              <PersonFields lang={lang} form={data.form} pagePath={pagePath} />
              <Send>{t.form.save}</Send>
            </Form>
          </>
        )}
      </section>
      <section>
        <h3>{t.person.parents}</h3>
        {data.parents.known.length === 0 && data.parents.hidden === 0 ? (
          <p>{t.person.noParents}</p>
        ) : null}
        {data.parents.hidden > 0 ? <p>{t.person.hiddenParents(data.parents.hidden)}</p> : null}
        <ul className="tree-list">
          {data.parents.known.map(({ person: parent, role }) => (
            <li key={parent.id}>
              <a href={treePath(lang, { page: "person", treeId, personId: parent.id })}>
                <span className="tree-card-name">{fullName(parent)}</span>
                <span className="tree-card-years">
                  {t.person.roles[role]} · {yearsLine(parent, lang)}
                </span>
              </a>
              <Form
                action="remove-parent"
                lang={lang}
                label={t.person.unlink}
                className="tree-inline"
              >
                <input type="hidden" name="tree" value={treeId} />
                <input type="hidden" name="child" value={person.id} />
                <input type="hidden" name="parent" value={parent.id} />
                <Send ghost>{t.person.unlink}</Send>
              </Form>
            </li>
          ))}
        </ul>
        <div className="tree-cards">
          {(["FATHER", "MOTHER"] as const)
            .filter((r) => !held.includes(r))
            .map((r) => (
              <a
                key={r}
                className="tree-card tree-card-empty"
                href={treePath(lang, { page: "add", treeId }, { child: person.id, role: r })}
              >
                <span className="tree-card-name">{t.person.addParent(r)}</span>
              </a>
            ))}
        </div>
        {data.others.length > 0 && held.length < 2 ? (
          <Form action="set-parent" lang={lang} label={t.person.link}>
            <input type="hidden" name="tree" value={treeId} />
            <input type="hidden" name="child" value={person.id} />
            <label>
              <span>{t.person.linkWho}</span>
              <select name="parent">
                {data.others.map((other) => (
                  <option key={other.id} value={other.id}>
                    {fullName(other)} · {yearsLine(other, lang)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t.person.linkRole}</span>
              <select name="role">
                {(["MOTHER", "FATHER", "PARENT"] as const).map((r) => (
                  <option key={r} value={r}>
                    {t.person.roles[r]}
                  </option>
                ))}
              </select>
            </label>
            <Send ghost>{t.person.link}</Send>
          </Form>
        ) : null}
      </section>
      {tree.tree.role === "OWNER" ? (
        <section>
          {isRoot ? (
            <p>{t.person.isRoot}</p>
          ) : (
            <Form action="set-root" lang={lang} label={t.person.setRoot}>
              <input type="hidden" name="tree" value={treeId} />
              <input type="hidden" name="person" value={person.id} />
              <Send ghost>{t.person.setRoot}</Send>
            </Form>
          )}
        </section>
      ) : null}
      {tree.tree.role === "OWNER" &&
      person.treated_as_living &&
      !person.claimed &&
      !person.contact_declined ? (
        <InviteSection lang={lang} treeId={treeId} person={person} invitation={data.invitation} />
      ) : null}
      <section>
        <h3>{t.person.deleteHeading}</h3>
        <Form action="delete-person" lang={lang} label={t.person.deleteHeading}>
          <input type="hidden" name="tree" value={treeId} />
          <input type="hidden" name="person" value={person.id} />
          <Check name="confirm" label={t.person.deleteConfirm} checked={false} />
          <Send ghost>{t.person.deleteSubmit}</Send>
        </Form>
      </section>
    </>
  );
}

/** A row someone has claimed, as the owner and the members see it: read-only, a hidden field marked (TASK-094, §2.6.22). */
function ClaimedRow({ lang, person }: { readonly lang: Lang; readonly person: TreePersonRead }) {
  const t = TREE_TEXT[lang];
  const hidden = (field: (typeof HIDDEN_FIELDS)[number]): boolean =>
    person.hidden_fields.includes(field);
  const mark = <em className="tree-hidden-mark">{t.invite.hiddenMark}</em>;
  const about = lang === "pl" ? "ok. " : "c. ";
  return (
    <div className="tree-panel tree-claimed">
      <p className="tree-panel-note">{t.invite.claimedNote}</p>
      <dl>
        <dt>{t.form.birthYear}</dt>
        <dd>
          {hidden("birth_year")
            ? mark
            : person.birth.year === null
              ? "—"
              : `${person.birth.approx ? about : ""}${person.birth.year}`}
        </dd>
        <dt>{t.form.place}</dt>
        <dd>{hidden("birth_place") ? mark : (person.birth.place_text ?? "—")}</dd>
        <dt>{t.form.birthSurname}</dt>
        <dd>{hidden("birth_surname") ? mark : (person.birth_surname ?? "—")}</dd>
      </dl>
    </div>
  );
}

/** The owner's invitation of a living person: the form, or the state of the last one (TASK-094, §2.6.20). */
function InviteSection({
  lang,
  treeId,
  person,
  invitation,
}: {
  readonly lang: Lang;
  readonly treeId: string;
  readonly person: TreePersonRead;
  readonly invitation: Extract<TreePageData, { kind: "person" }>["invitation"];
}) {
  const t = TREE_TEXT[lang];
  const day = (iso: string): string => formatDate(iso.slice(0, 10), lang);
  const pending = invitation !== null && invitation.pending;
  let state: string | null = null;
  if (invitation !== null) {
    if (invitation.answered_at !== null && invitation.answer !== null) {
      state = t.invite.answered[invitation.answer](day(invitation.answered_at));
    } else if (pending) {
      state = t.invite.pending(day(invitation.sent_at), day(invitation.expires_at));
    } else {
      state = t.invite.expired(day(invitation.sent_at));
    }
  }
  return (
    <section className="tree-invite">
      <h3>{t.invite.heading}</h3>
      {state === null ? null : <p className="tree-panel-note">{state}</p>}
      {pending ? null : (
        <>
          <p>{t.invite.lede}</p>
          <Form action="invite" lang={lang} label={t.invite.heading}>
            <input type="hidden" name="tree" value={treeId} />
            <input type="hidden" name="person" value={person.id} />
            <label>
              <span>{t.invite.email}</span>
              <input type="email" name="email" maxLength={254} required autoComplete="off" />
            </label>
            <Check name="consent" label={t.invite.consent} checked={false} />
            <Send>{t.invite.send}</Send>
          </Form>
        </>
      )}
    </section>
  );
}

/** The invited person's or the claimant's own row with the parents' names (TASK-094, §2.6.21). */
function CardFacts({
  lang,
  card,
  parentsHeading,
  noParents,
}: {
  readonly lang: Lang;
  readonly card: CardRead;
  readonly parentsHeading: string;
  readonly noParents: string;
}) {
  const t = TREE_TEXT[lang];
  const p = card.person;
  const about = lang === "pl" ? "ok. " : "c. ";
  return (
    <div className="tree-panel tree-card-facts">
      <dl>
        <dt>{t.form.given}</dt>
        <dd>{p.given_names}</dd>
        <dt>{t.form.surname}</dt>
        <dd>{p.surname}</dd>
        {p.birth_surname === null ? null : (
          <>
            <dt>{t.form.birthSurname}</dt>
            <dd>{p.birth_surname}</dd>
          </>
        )}
        <dt>{t.form.birthYear}</dt>
        <dd>{p.birth.year === null ? "—" : `${p.birth.approx ? about : ""}${p.birth.year}`}</dd>
        <dt>{t.form.place}</dt>
        <dd>{p.birth.place_text ?? "—"}</dd>
      </dl>
      <h3>{parentsHeading}</h3>
      {card.parents.length === 0 ? (
        <p>{noParents}</p>
      ) : (
        <ul>
          {card.parents.map((parent, i) => (
            <li key={i}>
              {t.person.roles[parent.role]}: {parent.given_names} {parent.surname}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function InvitationView({ data }: { data: Extract<TreePageData, { kind: "invitation" }> }) {
  const { lang } = data;
  const t = TREE_TEXT[lang];
  const word =
    data.status ??
    (data.state.kind === "expired"
      ? "expired"
      : data.state.kind === "answered"
        ? "answered"
        : data.state.kind === "missing"
          ? "not-found"
          : null);
  return (
    <section>
      <h2>{t.headings.invitation}</h2>
      {data.state.kind === "open" ? <p className="page-lede">{t.invitation.lede}</p> : null}
      <Status lang={lang} page="invitation" word={word} />
      {data.state.kind === "open" && data.token !== null ? (
        <>
          <h3>{t.invitation.yourRow}</h3>
          <CardFacts
            lang={lang}
            card={data.state.card}
            parentsHeading={t.invitation.parents}
            noParents={t.invitation.noParents}
          />
          <h3>{t.invitation.question}</h3>
          <Form action="answer-invitation" lang={lang} label={t.invitation.question}>
            <input type="hidden" name={INVITATION_TOKEN} value={data.token} />
            <div className="tree-answers">
              <button type="submit" className="offer-send" name="answer" value="me">
                {t.invitation.me}
              </button>
              <button
                type="submit"
                className="offer-send account-danger"
                name="answer"
                value="not-me"
              >
                {t.invitation.notMe}
              </button>
              <button
                type="submit"
                className="offer-send account-danger"
                name="answer"
                value="no-contact"
              >
                {t.invitation.noContact}
              </button>
            </div>
          </Form>
          <ul className="tree-explain">
            {t.invitation.explain.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </>
      ) : null}
      <p>
        <a href={treePath(lang, { page: "trees" })}>{t.headings.trees}</a>
      </p>
    </section>
  );
}

function CardsView({ data }: { data: Extract<TreePageData, { kind: "cards" }> }) {
  const { lang } = data;
  const t = TREE_TEXT[lang];
  return (
    <section>
      <p className="tree-eyebrow">
        <a href={treePath(lang, { page: "trees" })}>{t.headings.trees}</a>
      </p>
      <h2>{t.headings.cards}</h2>
      <p className="page-lede">{t.cards.lede}</p>
      <Status lang={lang} page="cards" word={data.status} />
      {data.cards.length === 0 ? <p>{t.cards.none}</p> : null}
      <ul className="tree-list">
        {data.cards.map((card) => (
          <li key={card.person_id}>
            <a href={treePath(lang, { page: "card", personId: card.person_id })}>
              <span className="tree-card-name">
                {card.given_names} {card.surname}
              </span>
              <span className="tree-card-years">
                {t.cards.claimed}{" "}
                <time dateTime={card.claimed_at.slice(0, 10)}>
                  {formatDate(card.claimed_at.slice(0, 10), lang)}
                </time>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The claimant's own form: the shared fields, the birthplace lookup, the hide boxes (TASK-094, §2.6.22). */
function CardView({ data }: { data: Extract<TreePageData, { kind: "card" }> }) {
  const { lang, card } = data;
  const t = TREE_TEXT[lang];
  const f = t.form;
  const d = data.form.draft;
  const pagePath = treePath(lang, { page: "card", personId: card.person.id });
  return (
    <>
      <section>
        <p className="tree-eyebrow">
          <a href={treePath(lang, { page: "cards" })}>{t.headings.cards}</a>
        </p>
        <h2>{t.headings.card}</h2>
        <p className="page-lede">{t.card.lede}</p>
        <Status lang={lang} page="card" word={data.status} />
        <Form action="update-card" lang={lang} label={t.card.save}>
          <input type="hidden" name="person" value={card.person.id} />
          <Text
            name={DRAFT_FIELDS.given}
            label={f.given}
            value={d.given}
            maxLength={120}
            required
          />
          <Text
            name={DRAFT_FIELDS.surname}
            label={f.surname}
            value={d.surname}
            maxLength={120}
            required
          />
          <Text
            name={DRAFT_FIELDS.birthSurname}
            label={f.birthSurname}
            value={d.birthSurname}
            maxLength={120}
          />
          <div className="tree-year">
            <Text
              name={DRAFT_FIELDS.birthYear}
              label={f.birthYear}
              value={d.birthYear}
              maxLength={4}
              mono
            />
            <Check name={DRAFT_FIELDS.birthApprox} label={f.approx} checked={d.birthApprox} />
          </div>
          <PlaceFields lang={lang} form={data.form} pagePath={pagePath} />
          <fieldset className="tree-hide">
            <legend>{t.card.hideHeading}</legend>
            {HIDDEN_FIELDS.map((field) => (
              <Check
                key={field}
                name={HIDE_FIELD}
                value={field}
                label={t.card.hide[field]}
                checked={card.person.hidden_fields.includes(field)}
              />
            ))}
            <small>{t.card.hideHint}</small>
          </fieldset>
          <Send>{t.card.save}</Send>
        </Form>
      </section>
      <section>
        <CardFacts
          lang={lang}
          card={card}
          parentsHeading={t.card.parents}
          noParents={t.card.noParents}
        />
      </section>
      <section>
        <h3>{t.card.leaveHeading}</h3>
        <p>{t.card.leaveLede}</p>
        <Form action="leave-tree" lang={lang} label={t.card.leaveHeading}>
          <input type="hidden" name="person" value={card.person.id} />
          <Check name="confirm" label={t.card.leaveConfirm} checked={false} />
          <Send ghost>{t.card.leaveSubmit}</Send>
        </Form>
      </section>
    </>
  );
}

function ConsentView({ data }: { data: Extract<TreePageData, { kind: "consent" }> }) {
  const { lang, tree } = data;
  const t = TREE_TEXT[lang];
  const treeId = tree.tree.id;
  const draft: PersonDraft = data.form.draft;
  const subjectQuery: Readonly<Record<string, string>> =
    data.subject.kind === "update"
      ? { person: data.subject.person.id }
      : data.subject.child !== null && data.subject.role !== null
        ? { child: data.subject.child.id, role: data.subject.role }
        : {};
  const backTarget: TreeTarget =
    data.subject.kind === "update"
      ? { page: "person", treeId, personId: data.subject.person.id }
      : { page: "add", treeId };
  const back = treePath(lang, backTarget, {
    ...draftQuery(draft),
    ...(data.subject.kind === "update" ? {} : subjectQuery),
  });
  const who = `${draft.given} ${draft.surname}`.trim();
  return (
    <section className="tree-consent">
      <p className="tree-eyebrow">
        <a href={treePath(lang, { page: "tree", treeId })}>{tree.tree.title}</a>
        {who === "" ? null : ` · ${who}`}
      </p>
      <h2>{t.headings.consent}</h2>
      <p className="page-lede">{t.consent.lede}</p>
      <ul>
        {t.consent.points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
      <Status lang={lang} page="consent" word={data.status} />
      <Form action="accept-living-terms" lang={lang} label={t.headings.consent}>
        <input type="hidden" name="tree" value={treeId} />
        {Object.entries(subjectQuery).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        {Object.entries(draftQuery(draft)).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <label className="account-check">
          <input type="checkbox" name="terms" value="on" required />
          <span>
            {t.consent.check}
            <a href={legalPath("terms", lang)} target="_blank" rel="noopener">
              {t.consent.termsLink}
            </a>
            {t.consent.termsAfter}
          </span>
        </label>
        <Send>{t.consent.submit}</Send>
      </Form>
      <p className="account-links">
        <a href={back}>{t.consent.cancel}</a>
      </p>
    </section>
  );
}

export function TreePageView({ data }: { readonly data: TreePageData }) {
  const { lang } = data;
  const other: Lang = lang === "pl" ? "en" : "pl";
  const otherTarget: TreeTarget =
    data.kind === "trees"
      ? { page: "trees" }
      : data.kind === "consent"
        ? { page: "trees" }
        : data.kind === "tree"
          ? { page: "tree", treeId: data.tree.tree.id }
          : data.kind === "constellation"
            ? { page: "constellation", treeId: data.tree.tree.id }
            : data.kind === "map"
              ? { page: "map", treeId: data.tree.tree.id }
              : data.kind === "add"
                ? { page: "add", treeId: data.tree.tree.id }
                : data.kind === "invitation"
                  ? { page: "invitation" }
                  : data.kind === "cards"
                    ? { page: "cards" }
                    : data.kind === "card"
                      ? { page: "card", personId: data.card.person.id }
                      : { page: "person", treeId: data.tree.tree.id, personId: data.person.id };
  const otherQuery: Readonly<Record<string, string>> =
    data.kind === "invitation" && data.token !== null ? { [INVITATION_TOKEN]: data.token } : {};
  return (
    <SiteShell
      lang={lang}
      otherPath={treePath(other, otherTarget, otherQuery)}
      world={{ mode: "quiet" }}
      mainClassName={`reading account tree tree-${data.kind}`}
      current="trees"
    >
      {data.kind === "trees" ? <TreesView data={data} /> : null}
      {data.kind === "tree" ? <TreeView data={data} /> : null}
      {data.kind === "constellation" ? <ConstellationView data={data} /> : null}
      {data.kind === "map" ? <MapView data={data} /> : null}
      {data.kind === "add" ? <AddView data={data} /> : null}
      {data.kind === "person" ? <PersonView data={data} /> : null}
      {data.kind === "consent" ? <ConsentView data={data} /> : null}
      {data.kind === "invitation" ? <InvitationView data={data} /> : null}
      {data.kind === "cards" ? <CardsView data={data} /> : null}
      {data.kind === "card" ? <CardView data={data} /> : null}
    </SiteShell>
  );
}

/**
 * The route's page: reads the session, loads, renders. A server component, so
 * it may read the cookie; the tree is read only after a session is found.
 */
export async function TreePage({
  lang,
  params,
  searchParams,
}: {
  readonly lang: Lang;
  readonly params: Promise<{ readonly rest?: string[] }>;
  readonly searchParams: Promise<Query>;
}) {
  const segments = (await params).rest;
  const query = await searchParams;
  const enabled = familyTreeEnabled();
  const runtime = enabled ? familyRuntime() : null;
  if (runtime === null || treeTarget(lang, segments) === null) notFound();

  let session: TreeSession | null = null;
  const token = (await cookies()).get(sessionCookieName(runtime.secure))?.value;
  try {
    const found = token === undefined ? null : await runtime.accounts.sessionFromToken(token);
    if (found !== null) session = { userId: found.userId, termsVersion: found.termsVersion };
  } catch {
    session = null;
  }

  const accounts = accountsRuntime();
  const decision = await loadTreePage({
    enabled: accounts !== null,
    lang,
    segments,
    query,
    session,
    deps: {
      family: runtime.family,
      places: (typed) => searchPlaces(db(), typed),
      regions: (codes) => placeRegions(db(), codes),
    },
  });
  if (decision.kind === "not-found") notFound();
  if (decision.kind === "redirect") redirect(decision.to);
  return <TreePageView data={decision.data} />;
}

export async function treeMetadataFor(
  lang: Lang,
  params: Promise<{ readonly rest?: string[] }>,
): Promise<Metadata> {
  const target = treeTarget(lang, (await params).rest);
  return target === null ? {} : treeMetadata(lang, target.page);
}

export { GENERATIONS };
