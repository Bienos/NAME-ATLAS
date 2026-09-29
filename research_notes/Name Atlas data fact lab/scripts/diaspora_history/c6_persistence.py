"""C6 - Persistence test: do surnames keep their regional pattern between the 1914-1919 casualty lists and 2026?
(method persist-v1; inputs from c4 (wwi_keys.parquet) and c5b (wwi_entry_loc.parquet)).

WWI side  : list entries whose cleaned surname matches a 2026 male-file form (wwimatch-v1) and whose Ort was located in
            today's Poland with a voivodeship (loc-v1). The place is the one printed with the entry (documented as the
            Geburtsort). Entries are list entries, not people.
2026 side : PESEL 1681 living persons by voivodeship of PERMANENT REGISTERED RESIDENCE, 2026-01-20, MALE file
            (the casualty lists are soldiers, i.e. male surname forms), spellings pooled by fold-v1 key. Paired male+female
            (pair-v1.1) is a sensitivity variant. 2026 cells are published only for >= 2 entries: a missing cell is
            '<2 or absent' - it is set to 0 (lower bound) in the primary run and to 1 (upper bound) in a sensitivity run;
            it is never read as a true zero without saying so. Entries without a voivodeship in the voivodeship files
            (about a fifth of national entries) are outside both distributions.
Region set: only voivodeships the WWI data actually cover (located entries >= 10,000; the gap in the data is
            1,969 vs 56,200), i.e. the formerly (largely) Prussian voivodeships (R9). Variant 'R_core': voivodeships of R9
            where >= 10 of the 100 most frequent surname forms among located 1914-1919 entries are also among the 100
            most frequent forms in the 2026 male voivodeship file (region-level continuity of the surname mix; the
            data show 0 or >= 13). Variant R7: R9 without the under-located śląskie and opolskie.
Measure   : overlap = sum_i min(p_i, q_i) between the surname's WWI share vector p and its 2026 share vector q over the
            region set (1 = identical, 0 = disjoint). Secondary: Bhattacharyya coefficient sum_i sqrt(p_i q_i).
Baseline  : shuffled-surname baseline - q vectors permuted across the same surnames (B = 1000, seed fixed), mean
            overlap per permutation; one-sided p = (1 + #perm >= observed) / (B + 1). Per surname: percentile of its own
            overlap among overlaps with every other surname's q (0.5 = chance).
Outputs (repo): persistence_summary.csv, persistence_by_surname.csv (aggregate per surname form, no person rows),
persistence_voivodeships.csv.
"""
import time
import numpy as np, pandas as pd
from common import *
from common import _read_pesel

B = 1000
SEED = 20260929
MIN_LOCATED = 10_000


def pesel_voiv_fold(sex_files, paired=False):
    """fold key x voivodeship counts from the 2026 voivodeship files (published cells only)."""
    parts = []
    for path, sex in sex_files:
        p = _read_pesel(path); p['sex'] = sex
        parts.append(p)
    p = pd.concat(parts, ignore_index=True)
    if paired:
        p['role'] = [pair_role(s, x) for s, x in zip(p.surname, p.sex)]
        p = p[p.role != 'f_unpaired_maleform']
        p['k'] = [fold(male_key(s, x)) for s, x in zip(p.surname, p.sex)]
    else:
        p['k'] = p['surname'].map(fold)
    return p.groupby(['k', 'voiv'], as_index=False)['n'].sum()


def matrices(W, Pz, keys, R, fill_missing):
    """Share matrices for keys over region set R. W: WWI counts (true zeros). Pz: PESEL long table (published cells only)."""
    wm = W.reindex(index=keys, columns=R).fillna(0).to_numpy(float)
    pw = Pz[Pz.voiv.isin(R) & Pz.k.isin(keys)].pivot(index='k', columns='voiv', values='n').reindex(index=keys, columns=R)
    n_missing = int(pw.isna().to_numpy().sum())
    pm = pw.fillna(fill_missing).to_numpy(float)       # explicit: missing = '<2 or absent' -> fill_missing (0 or 1)
    return wm / wm.sum(1, keepdims=True), pm / pm.sum(1, keepdims=True), n_missing, pw


def test(P, Q, rng):
    own = np.minimum(P, Q).sum(1)
    own_bc = np.sqrt(P * Q).sum(1)
    tp, tq = P.argmax(1), Q.argmax(1)
    perm_means = np.empty(B); perm_bc = np.empty(B); perm_top = np.empty(B)
    n = len(P)
    for b in range(B):
        idx = rng.permutation(n)
        perm_means[b] = np.minimum(P, Q[idx]).sum(1).mean()
        perm_bc[b] = np.sqrt(P * Q[idx]).sum(1).mean()
        perm_top[b] = (tp == tq[idx]).mean()
    # per-surname percentile vs all other surnames' q
    pct = np.empty(n); chance = np.empty(n)
    for s in range(0, n, 200):
        o = np.minimum(P[s:s + 200, None, :], Q[None, :, :]).sum(2)      # (chunk, n)
        for r in range(o.shape[0]):
            i = s + r
            others = np.delete(o[r], i)
            chance[i] = others.mean()
            pct[i] = (others < own[i]).mean() + 0.5 * (others == own[i]).mean()
    return {'obs': own.mean(), 'base_mean': perm_means.mean(), 'base_lo': np.percentile(perm_means, 2.5), 'base_hi': np.percentile(perm_means, 97.5),
            'p': (1 + (perm_means >= own.mean()).sum()) / (B + 1), 'obs_bc': own_bc.mean(), 'base_bc': perm_bc.mean(),
            'p_bc': (1 + (perm_bc >= own_bc.mean()).sum()) / (B + 1), 'pct_mean': pct.mean(), 'share_above_chance': (own > chance).mean(),
            'top_obs': (tp == tq).mean(), 'top_base': perm_top.mean(), 'top_base_hi': np.percentile(perm_top, 97.5),
            'own': own, 'chance': chance, 'pct': pct}


def main():
    t0 = time.time()
    K = pd.read_parquet(WORK + '/wwi_keys.parquet', columns=['key', 'matched_m'])
    L = pd.read_parquet(WORK + '/wwi_entry_loc.parquet', columns=['country', 'voiv'])
    plv = (L['country'] == 'Poland') & (L['voiv'] != '')
    Mn = _read_pesel(PESEL_M_2026); Mn['k'] = Mn.surname.map(fold); Mnat = Mn.groupby('k')['n'].sum()
    Fn = _read_pesel(PESEL_F_2026)

    # ---- region set supported by the data
    vt = L[plv].groupby('voiv').size()
    matched = K['matched_m'].to_numpy()
    m100 = K['key'].map(Mnat).ge(100).to_numpy()
    PzM = pesel_voiv_fold([(PESEL_WOJ_M_2026, 'M')])
    print('voivodeship values in the 2026 M voivodeship file:', sorted(PzM.voiv.unique()))
    pv_tot = PzM.groupby('voiv')['n'].sum()
    rows = []
    kk = K['key'].to_numpy()
    for v in VOIV_ORDER:
        sel = (plv & (L['voiv'] == v)).to_numpy()
        n = int(sel.sum())
        wtop = pd.Series(kk[sel & (kk != '')]).value_counts()
        ptop = PzM[PzM.voiv == v].set_index('k')['n'].sort_values(ascending=False)
        rows.append({'voivodeship': v, 'wwi_located_entries': n, 'wwi_matched_entries': int((sel & matched).sum()),
                     'share_matched_pct': round((sel & matched).sum() / max(1, n) * 100, 1),
                     'share_matched_m100_pct': round((sel & m100).sum() / max(1, n) * 100, 1),
                     'top100_forms_overlap': len(set(wtop.index[:100]) & set(ptop.index[:100])),
                     'top500_forms_overlap': len(set(wtop.index[:500]) & set(ptop.index[:500])),
                     'pesel_m_2026_voiv_file_entries': int(pv_tot.get(v, 0)),
                     'wwi_located_per_1000_pesel_m': round(n / pv_tot.get(v, np.nan) * 1000, 2)})
    VT = pd.DataFrame(rows)
    R9 = VT.loc[VT.wwi_located_entries >= MIN_LOCATED, 'voivodeship'].tolist()
    # R_core: region sets where the most frequent surname forms of the located 1914-1919 entries are still among the most
    # frequent male-file forms today (top-100 overlap >= 10; the data show 0 vs >= 13, no values in between)
    RC = VT.loc[(VT.wwi_located_entries >= MIN_LOCATED) & (VT.top100_forms_overlap >= 10), 'voivodeship'].tolist()
    VT['in_R9'] = VT.voivodeship.isin(R9); VT['in_R_core'] = VT.voivodeship.isin(RC)
    VT.insert(0, 'method', 'persist-v1 region-set table; WWI located = loc-v1; matched = wwimatch-v1; m100 = form has >= 100 entries in 2026 national M file; topN overlap = shared forms among the N most frequent (WWI located entries vs 2026 M voivodeship file)')
    VT.to_csv(REPO_OUT + '/persistence_voivodeships.csv', index=False)
    print(VT.drop(columns=['method']).to_string(index=False))
    print('R9', R9); print('R_core', RC)
    gap_lo = VT.loc[~VT.in_R9, 'wwi_located_entries'].max(); gap_hi = VT.loc[VT.in_R9, 'wwi_located_entries'].min()
    print('gap', gap_lo, gap_hi)

    # ---- WWI counts per key x voivodeship (matched, located with voivodeship)
    E = pd.DataFrame({'k': K['key'][plv & K['matched_m']], 'voiv': L['voiv'][plv & K['matched_m']]})
    W = E.groupby(['k', 'voiv']).size().unstack(fill_value=0)
    PzP = pesel_voiv_fold([(PESEL_WOJ_M_2026, 'M'), (PESEL_WOJ_F_2026, 'F')], paired=True)
    print('prep secs', round(time.time() - t0, 1))

    variants = [
        ('primary', R9, 50, 100, 0, 'M'),
        ('missing cells = 1 (upper bound)', R9, 50, 100, 1, 'M'),
        ('paired M+F 2026 (pair-v1.1)', R9, 50, 100, 0, 'MF'),
        ('low thresholds 20/20', R9, 20, 20, 0, 'M'),
        ('high thresholds 200/500', R9, 200, 500, 0, 'M'),
        ('R_core region set', RC, 50, 100, 0, 'M'),
        ('R9 without the under-located śląskie and opolskie', [v for v in R9 if v not in ('śląskie', 'opolskie')], 50, 100, 0, 'M'),
    ]
    S = []
    keep = None
    for name, R, mw, mp, fillm, pfile in variants:
        rng = np.random.default_rng(SEED)
        Pz = PzM if pfile == 'M' else PzP
        wn = W.reindex(columns=R).fillna(0).sum(axis=1)
        pn = Pz[Pz.voiv.isin(R)].groupby('k')['n'].sum()
        keys = sorted(set(wn[wn >= mw].index) & set(pn[pn >= mp].index))
        P, Q, nmiss, pw = matrices(W, Pz, keys, R, fillm)
        r = test(P, Q, rng)
        S.append({'variant': name, 'region_set': '|'.join(R), 'n_voivodeships': len(R), 'min_wwi_located_entries': mw,
                  'min_pesel_entries_in_region': mp, 'pesel_file_2026': 'male file' if pfile == 'M' else 'male + paired female (pair-v1.1)',
                  'missing_cell_rule': f'<2 or absent -> {fillm}', 'n_surname_forms': len(keys),
                  'wwi_entries_used': int(wn.reindex(keys).sum()), 'pesel_entries_used': int(pn.reindex(keys).sum()),
                  'suppressed_cells': nmiss, 'cells': len(keys) * len(R),
                  'observed_mean_overlap': round(r['obs'], 4), 'baseline_mean_overlap': round(r['base_mean'], 4),
                  'baseline_2.5pct': round(r['base_lo'], 4), 'baseline_97.5pct': round(r['base_hi'], 4), 'p_one_sided': round(r['p'], 4),
                  'observed_mean_bhattacharyya': round(r['obs_bc'], 4), 'baseline_mean_bhattacharyya': round(r['base_bc'], 4), 'p_bc': round(r['p_bc'], 4),
                  'mean_own_percentile_vs_other_surnames': round(r['pct_mean'], 4), 'share_surnames_own_above_chance': round(r['share_above_chance'], 4),
                  'same_top_voivodeship_observed': round(r['top_obs'], 4), 'same_top_voivodeship_baseline': round(r['top_base'], 4),
                  'same_top_voivodeship_baseline_97.5pct': round(r['top_base_hi'], 4),
                  'permutations': B, 'seed': SEED})
        print(name, {k: S[-1][k] for k in ['n_surname_forms', 'suppressed_cells', 'observed_mean_overlap', 'baseline_mean_overlap', 'baseline_2.5pct',
                                            'baseline_97.5pct', 'p_one_sided', 'mean_own_percentile_vs_other_surnames', 'share_surnames_own_above_chance',
                                            'same_top_voivodeship_observed', 'same_top_voivodeship_baseline']},
              'secs', round(time.time() - t0, 1))
        if name == 'primary':
            keep = (keys, P, Q, r, R, wn, pn)
    SS = pd.DataFrame(S)
    SS.insert(0, 'method', 'persist-v1: overlap sum(min(p,q)) vs shuffled-surname baseline; WWI 1914-1919 list entries (loc-v1, wwimatch-v1) vs PESEL 1681woj 2026-01-20')
    SS.to_csv(REPO_OUT + '/persistence_summary.csv', index=False)

    # ---- per surname (primary variant)
    keys, P, Q, r, R, wn, pn = keep
    D = pd.DataFrame({'key_fold': keys})
    Mn2 = Mn.sort_values('n', ascending=False).drop_duplicates('k').set_index('k')['surname']
    D['pesel_m_spelling'] = D.key_fold.map(Mn2)
    D['wwi_entries_located_in_region'] = wn.reindex(keys).astype(int).values
    D['pesel_m_2026_entries_in_region'] = pn.reindex(keys).astype(int).values
    top_w = P.argmax(1); top_q = Q.argmax(1)
    D['wwi_top_voivodeship'] = [R[i] for i in top_w]; D['wwi_top_share_pct'] = (P.max(1) * 100).round(1)
    D['pesel_top_voivodeship'] = [R[i] for i in top_q]; D['pesel_top_share_pct'] = (Q.max(1) * 100).round(1)
    D['pesel_share_in_wwi_top_voivodeship_pct'] = (Q[np.arange(len(keys)), top_w] * 100).round(1)
    D['overlap'] = r['own'].round(3); D['chance_overlap_mean_other_surnames'] = r['chance'].round(3)
    D['own_percentile'] = r['pct'].round(3)
    for i, v in enumerate(R):
        D[f'wwi_pct_{v}'] = (P[:, i] * 100).round(1)
    for i, v in enumerate(R):
        D[f'pesel_m_pct_{v}'] = (Q[:, i] * 100).round(1)
    D = D.sort_values('wwi_entries_located_in_region', ascending=False)
    D.insert(0, 'method', 'persist-v1 primary (R9, >=50 WWI located, >=100 PESEL M in region, missing->0)')
    D.to_parquet(WORK + '/persistence_by_surname_full.parquet', index=False)
    D.head(600).to_csv(REPO_OUT + '/persistence_by_surname.csv', index=False)
    print('per-surname rows', len(D), 'written 600')
    print(D.drop(columns=['method'] + [c for c in D.columns if c.startswith(('wwi_pct_', 'pesel_m_pct_'))]).head(30).to_string(index=False))
    # distribution of own vs chance
    print('own overlap quartiles', np.percentile(r['own'], [25, 50, 75]).round(3), 'chance quartiles', np.percentile(r['chance'], [25, 50, 75]).round(3))
    agree = (D.wwi_top_voivodeship == D.pesel_top_voivodeship).mean()
    print('same top voivodeship then and now:', round(agree, 4))
    print('secs', round(time.time() - t0, 1))


if __name__ == '__main__':
    main()
