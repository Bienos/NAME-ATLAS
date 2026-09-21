import type { AssetEligibility } from "@name-atlas/truth";
import type {
  InspectedClaim,
  InspectedRights,
  InspectedSnapshot,
  InspectedSourceRecord,
  Inspection,
} from "./inspect.js";

/**
 * The inspector's rendering (TASK-018), split from the page so it can be
 * rendered in a test without Next or a database.
 *
 * It prints stored values. It computes nothing, interprets nothing, and hides
 * nothing — least of all a `SUPERSEDED` claim, which is much of why the page
 * exists.
 */

function Tag({ kind, children }: { kind: "ok" | "stale" | "bad"; children: string }) {
  return <span className={`tag tag-${kind}`}>{children}</span>;
}

function statusTag(status: string) {
  if (status === "ACTIVE") return <Tag kind="ok">ACTIVE</Tag>;
  if (status === "SUPERSEDED") return <Tag kind="stale">SUPERSEDED</Tag>;
  return <Tag kind="bad">{status}</Tag>;
}

function SourceRecords({ records }: { records: readonly InspectedSourceRecord[] }) {
  return (
    <section>
      <h3>Source records</h3>
      <table>
        <thead>
          <tr>
            <th scope="col">Resource</th>
            <th scope="col">Registry</th>
            <th scope="col">Rows</th>
            <th scope="col">Checksum</th>
            <th scope="col">Retrieved</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.source_record_id}>
              <th scope="row">{record.external_record_id ?? "(none)"}</th>
              <td>
                {/* The D-018 decision, visible: which file the registry vouches for. */}
                {record.checksum_matches === null ? (
                  <Tag kind="bad">not in registry</Tag>
                ) : record.checksum_matches && record.row_count_matches === true ? (
                  <Tag kind="ok">authoritative</Tag>
                ) : (
                  <Tag kind="stale">not authoritative</Tag>
                )}
              </td>
              <td>
                {record.persisted_rows.toLocaleString("en-GB")}
                {record.registry_row_count === null
                  ? null
                  : ` / ${record.registry_row_count.toLocaleString("en-GB")}`}
              </td>
              <td>
                {record.content_hash.slice(0, 12)}…
                {record.registry_sha256 === null
                  ? null
                  : record.checksum_matches
                    ? " (matches)"
                    : ` (registry ${record.registry_sha256.slice(0, 12)}…)`}
              </td>
              <td>{record.retrieved_at}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Snapshots({ snapshots }: { snapshots: readonly InspectedSnapshot[] }) {
  return (
    <section>
      <h3>Snapshots and values</h3>
      <table>
        <thead>
          <tr>
            <th scope="col">Resource</th>
            <th scope="col">Level</th>
            <th scope="col">As of</th>
            <th scope="col">Group</th>
            <th scope="col">Values</th>
          </tr>
        </thead>
        <tbody>
          {snapshots.map((snapshot) => (
            <tr key={snapshot.distribution_snapshot_id}>
              <th scope="row">{snapshot.external_record_id ?? "(none)"}</th>
              <td>{snapshot.geography_level}</td>
              <td>{snapshot.as_of_date ?? "(none)"}</td>
              <td>{snapshot.comparability_group ?? "(none)"}</td>
              <td>
                {snapshot.values
                  .map((value) =>
                    value.place === null
                      ? String(value.count)
                      : `${value.place}${value.terc_code === null ? "" : ` (${value.terc_code})`} ${String(value.count)}`,
                  )
                  .join(" · ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Claim({ claim }: { claim: InspectedClaim }) {
  return (
    <div className="claim">
      <div className="claim-head">
        <strong>{claim.claim_type}</strong>
        {statusTag(claim.claim_status)}
        <span className="lineage">
          {claim.epistemic_type} · {claim.method_version}
          {claim.external_record_id === null ? null : ` · resource ${claim.external_record_id}`}
        </span>
      </div>
      <dl>
        <dt>Confidence</dt>
        <dd>
          {claim.confidence_status ?? "(none)"}
          {claim.assessment_method === null
            ? null
            : ` — ${claim.assessment_method}@${claim.assessment_version ?? "?"}`}
          {claim.human_review_required === true ? " · human review required" : null}
        </dd>
        <dt>Citation</dt>
        <dd>
          {claim.citation_title ?? "(none)"}
          {claim.citation_locator === null ? null : ` · ${claim.citation_locator}`}
          {claim.citation_terms === null ? null : ` · ${claim.citation_terms}`}
        </dd>
        <dt>Evidence</dt>
        <dd>
          {claim.evidence.length === 0
            ? "(none)"
            : claim.evidence.map((item) => (
                <div key={item.evidence_item_id}>
                  {item.evidence_type} · {item.verification_status}
                  {item.derivation_method === null ? null : ` · ${item.derivation_method}`}
                  {item.depends_on.length === 0 ? null : (
                    <span className="lineage">
                      {" ← "}
                      {item.depends_on.map((d) => d.role).join(", ")}
                    </span>
                  )}
                </div>
              ))}
        </dd>
      </dl>
      {/* Internal, and this is the one surface where it may be read
          (docs/canonical/11 §10.3 keeps it off every consumer surface). */}
      {claim.rationale === null ? null : <p className="rationale">{claim.rationale}</p>}
    </div>
  );
}

/**
 * The (asset kind x surface) decision matrix (TASK-021 AC-10, ADR-0007).
 *
 * A rights decision nobody can see is a rights decision nobody can check, and
 * this console is the only surface allowed to show one.
 */
function RightsMatrix({ matrix }: { matrix: readonly AssetEligibility[] }) {
  const surfaces = [...new Set(matrix.map((cell) => cell.surface))];
  const assets = [...new Set(matrix.map((cell) => cell.asset))];
  const at = (asset: string, surface: string): AssetEligibility | undefined =>
    matrix.find((cell) => cell.asset === asset && cell.surface === surface);

  return (
    <table className="matrix">
      <thead>
        <tr>
          <th scope="col">Asset</th>
          {surfaces.map((surface) => (
            <th scope="col" key={surface}>
              {surface}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {assets.map((asset) => (
          <tr key={asset}>
            <th scope="row">{asset}</th>
            {surfaces.map((surface) => {
              const cell = at(asset, surface);
              return (
                <td key={surface} className={cell?.decision.toLowerCase()}>
                  {cell?.decision ?? "—"}
                  <span className="reason">{cell?.reason_code}</span>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Rights({ rights }: { rights: readonly InspectedRights[] }) {
  return (
    <section>
      <h3>Rights in force</h3>
      {rights.map((profile) => (
        <div key={profile.rights_profile_id}>
          <dl>
            <dt>Source</dt>
            <dd>{profile.source_name}</dd>
            <dt>Matrix row</dt>
            <dd>{profile.rights_state}</dd>
            <dt>Governs</dt>
            <dd>
              {profile.record_count} source record{profile.record_count === 1 ? "" : "s"} —{" "}
              {profile.record_level_override ? "record-level override" : "source default"}
            </dd>
            <dt>Automated access</dt>
            <dd>{profile.automated_access}</dd>
            <dt>Commercial use</dt>
            <dd>{profile.commercial_use}</dd>
            <dt>Redistribution</dt>
            <dd>{profile.redistribution}</dd>
            <dt>Metadata</dt>
            <dd>{profile.metadata_rights}</dd>
            <dt>Transcription (OCR)</dt>
            <dd>{profile.transcription_rights}</dd>
            <dt>Image</dt>
            <dd>{profile.image_rights}</dd>
            <dt>Database</dt>
            <dd>{profile.database_rights}</dd>
            <dt>Reproduction eligible</dt>
            <dd>{profile.reproduction_eligible ? "yes" : "no"}</dd>
            <dt>Connector may run</dt>
            <dd>{profile.connector_executable ? "yes" : "no"}</dd>
            <dt>Attribution</dt>
            <dd>
              {profile.attribution_required ? "required — " : "not required — "}
              {profile.attribution_text ?? profile.source_owner ?? "(none recorded)"}
            </dd>
            <dt>Review</dt>
            <dd>{profile.review_status}</dd>
            <dt>Terms</dt>
            <dd>{profile.terms_version ?? "(none)"}</dd>
          </dl>
          <RightsMatrix matrix={profile.matrix} />
        </div>
      ))}
    </section>
  );
}

export function InspectionView({ inspection }: { inspection: Inspection }) {
  if (inspection.kind === "NOT_FOUND") {
    return (
      <section>
        <h3>Not found</h3>
        <p>
          No surname has the canonical key <code>{inspection.query}</code>. Absence here means no
          row exists, which is not the same as a surname with no bearers.
        </p>
      </section>
    );
  }

  const { identity, claims } = inspection;
  const active = claims.filter((claim) => claim.claim_status === "ACTIVE").length;
  return (
    <>
      <h2>{identity.canonical_display}</h2>
      <section>
        <h3>Identity</h3>
        <dl>
          <dt>Surname ID</dt>
          <dd>{identity.surname_id}</dd>
          <dt>Canonical key</dt>
          <dd>
            {identity.canonical_key} ({identity.canonical_key_version})
          </dd>
          <dt>Script</dt>
          <dd>
            {identity.primary_script}
            {identity.mixed_script ? " · mixed script" : ""}
            {identity.script_confusable_flag ? " · confusable" : ""}
          </dd>
          <dt>Entity status</dt>
          <dd>{identity.entity_status}</dd>
        </dl>
      </section>
      <SourceRecords records={inspection.source_records} />
      <Snapshots snapshots={inspection.snapshots} />
      <section>
        <h3>
          Claims — {String(active)} active of {String(claims.length)}
        </h3>
        {claims.length === 0 ? (
          <p>No claim has been derived for this surname.</p>
        ) : (
          claims.map((claim) => <Claim key={claim.claim_id} claim={claim} />)
        )}
      </section>
      <Rights rights={inspection.rights} />
    </>
  );
}
