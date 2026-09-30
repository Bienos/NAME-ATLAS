# US Census 2010 surname file — availability and rights check

Checked 2026-09-30 (UTC). Evidence: `docs/sources/acquisition/2026-09-30/`.
Post-MVP source: multi-country coverage is an MVP non-goal (`PRODUCT.md` §8 item 9).

**Status: the full file could not be downloaded from this environment. The top-1,000 extract and the technical
documentation were downloaded and hashed. Nothing ingested.**

## The file

From the Census Bureau's own technical documentation ("Frequently Occurring Surnames in the 2010 Census",
Joshua Comenetz, October 2016, `www2.census.gov/topics/genealogy/2010surnames/surnames.pdf`):

- "The publicly released table of surnames includes all with a frequency of 100 or more. These 162,253 names
  cover 90 percent of the people with surnames recorded in the 2010 Census".
- "All punctuation marks and spaces that were part of surnames were deleted. SMITH-JONES and SMITH JONES were
  changed to SMITHJONES." Polish double surnames therefore appear run together.
- The Top-1,000 xlsx notes: "Fields suppressed for confidentiality are assigned the value (S)." Suppressed is
  not zero.

The directory listing `www2.census.gov/topics/genealogy/2010surnames/` (captured) shows three files, all dated
2016-12-15: `names.zip` (12M), `Names_2010Census_Top1000.xlsx` (92K), `surnames.pdf` (89K).

Besides count and rank, each row carries six race and Hispanic-origin percentages. `docs/canonical/19` §35
forbids building an "ethnicity segment" of users. Whether showing surname-level race percentages is acceptable
is not settled by any project document and needs privacy review before use.

## What happened on download

| URL | Result |
|---|---|
| `www2.census.gov/topics/genealogy/2010surnames/names.zip` | **Blocked.** HTTP 200 with a 247-byte HTML page, "Request Rejected … Your support ID is …" (the Census web firewall). Same with curl's default client string. Not retried further and no disguised client used. |
| `…/2010surnames/Names_2010Census_Top1000.xlsx` | Downloaded, 94,119 bytes, valid xlsx, 1,000 surname rows. |
| `…/2010surnames/surnames.pdf` | Downloaded, 90,917 bytes. |
| `www.census.gov/topics/population/genealogy/data/2010_surnames.html` | **Intermittent.** Of 6 requests whose response was inspected, 3 returned the real page (~331,800 bytes) ("Frequently Occurring Surnames from the 2010 Census", linking the three files above) and 3 returned "Page not found" (26,711 bytes, HTTP 404 where the code was captured). A script that fetches this page first will sometimes see only the error page. That may explain the 2026-09-18 run's `HTML_ERROR_PAGE_NOT_DATA`, but the cause of that run's failure was not established. |
| `api.census.gov/data/2010/surname` | Redirects to `missing_key.html`: the Census Data API now requires a free key. No key was requested, because sign-up needs an email address. |

**To get the full file:** download `names.zip` in a normal browser, or request a free Census API key and query
`/data/2010/surname`. This project has no trusted checksum for `names.zip` yet; record one on first download.

## Rights

- Works of the US federal government are not subject to US copyright (17 U.S.C. §105). This is the statute,
  not a statement found on a census.gov page. No census.gov page captured in this session attaches a licence
  to this file, and none addresses reuse outside the US.
- The Census Data API Terms of Service (captured, `census.gov/data/developers/about/terms-of-service.html`)
  bind API use: users must not "use these data, alone or in combination with any other Census or non-Census
  data, to identify any individual person, household, business or other entity", and services using the API
  "should display the following notice prominently within the application: 'This product uses the Census
  Bureau Data API but is not endorsed or certified by the Census Bureau.'"
- No terms were found that prohibit commercial reuse or automated access to the static files. The firewall
  rejection above is a technical block, not a stated term.

## Newer release

The genealogy data index also links "Frequently Occurring First Names and Last Names in the 2020 Census"
(`…/genealogy/data/2020_names.html`, page dated April 14, 2026), with last-name files under
`www2.census.gov/topics/genealogy/2020surnames/`. The 2026-09-18 archive holds a file it labels
`us_census_2020_surnames` (`acquisition/2026-09-18/ACQUISITION_REPORT.md`). Neither was examined here. If the
diaspora use is still wanted after the MVP, the 2020 release should be compared with 2010 first.
