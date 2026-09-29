"""B0: profile the voivodeship files, pairing v1 statistics and voivodeship denominators (2026-01-20)."""
import pandas as pd
from common import (load_woj, load_nat, pair_key_series, paired_woj, VOIV_ORDER, teryt, vname, ensure_out,
                    PAIRING_VERSION)

out = ensure_out()

# 1. File totals
for date in ("2026-01-20", "2025-02-24", "2017-12-31"):
    for sex in ("M", "F"):
        d = load_woj(sex, date)
        print(f"woj {date} {sex}: rows={len(d):,} entries={d.n.sum():,} distinct forms={d.form.nunique():,}")
for sex in ("M", "F"):
    d = load_nat(sex)
    print(f"nat 2026-01-20 {sex}: rows={len(d):,} entries={d.n.sum():,}")

# 2. Pairing kinds (2026 voivodeship files and national files)
for src, loader in (("woj", load_woj), ("nat", load_nat)):
    for sex in ("M", "F"):
        d = loader(sex)
        d["key"], d["kind"] = pair_key_series(d["form"], sex)
        g = d.groupby("kind")["n"].agg(["size", "sum"])
        print(f"pairing kinds {src} {sex} 2026:\n", g.to_string())

# 3. Ambiguity: men whose registered form itself ends in -SKA/-CKA/-DZKA (national 2026)
m = load_nat("M"); f = load_nat("F")
cross_m = m[m.form.str.endswith(("SKA", "CKA", "DZKA"))].sort_values("n", ascending=False)
print("M forms ending -SKA/-CKA/-DZKA: distinct", len(cross_m), "entries", cross_m.n.sum())
print(cross_m.head(15).to_string(index=False))
fm = f[f.form.str.endswith(("SKA", "CKA", "DZKA"))]
amb = fm.merge(cross_m, on="form", suffixes=("_f", "_m"))
print("F -SKA/-CKA/-DZKA forms that also occur as a M form (ambiguous pairing):", len(amb),
      "F entries", amb.n_f.sum(), "of", fm.n.sum())
amb["ratio_m_to_f"] = amb.n_m / amb.n_f
print(amb.sort_values("n_f", ascending=False).head(15).to_string(index=False))
cross_f = f[f.form.str.endswith(("SKI", "CKI", "DZKI"))].sort_values("n", ascending=False)
print("F forms ending -SKI/-CKI/-DZKI: distinct", len(cross_f), "entries", cross_f.n.sum())
print(cross_f.head(10).to_string(index=False))

# 4. Voivodeship denominators, 2026-01-20 (entries listed in the voivodeship files = cells with >=2 entries)
p = paired_woj("2026-01-20")
tot = p.groupby("voiv")[["n_m", "n_f", "n"]].sum().reindex(VOIV_ORDER)
tot["share_of_all_entries"] = tot["n"] / tot["n"].sum()
tot = tot.reset_index()
tot.insert(0, "teryt", tot.voiv.map(teryt))
tot["voivodeship"] = tot.voiv.map(vname)
tot = tot[["teryt", "voivodeship", "n_m", "n_f", "n", "share_of_all_entries"]]
tot.columns = ["teryt", "voivodeship", "entries_m", "entries_f", "entries_total", "share_of_all_entries"]
tot["share_of_all_entries"] = tot["share_of_all_entries"].round(5)
tot["dataset"] = "PESEL 1681woj living, voivodeship of permanent registered residence, 2026-01-20; cells <2 suppressed at source"
tot.to_csv(f"{out}/voivodeship_totals_2026.csv", index=False)
print(tot.to_string(index=False))
print("TOTAL", tot.entries_total.sum(), "M", tot.entries_m.sum(), "F", tot.entries_f.sum())
print("distinct paired keys 2026 woj:", p.key.nunique(), PAIRING_VERSION)
