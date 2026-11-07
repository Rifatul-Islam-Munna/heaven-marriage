# Municipality data used by Niqaha

Source: `iqbalhasandev/bangladesh-geo-json`, release `v1.0.0`.
Pinned download: `https://raw.githubusercontent.com/iqbalhasandev/bangladesh-geo-json/v1.0.0/bangladesh-geo.json`

This source contains 328 historical `pourashavas` (municipalities).
The Bogura municipality entry is excluded from the 2026 application catalogue
because Bogura became a city corporation in May 2026. The resulting **327 municipality
entries** span **all 64 districts** in the project's existing district naming convention.

The app treats these as `kind: 'area'` under an upazila, **never** as a city
corporation. This preserves existing `address.cityCorporation` and
`address.upazila` storage and search API compatibility. The separate city
corporation list contains the 13 official corporations.

The existing upazila list does not have 21 of the source's upazila names.
These are carried in `municipality-fallback-upazilas.json` to avoid losing
municipalities. This mapping is meant to be reviewed by administrators.

The source is an open reference dataset, not a live official government register.
Administrative names, boundaries and status should be reviewed against updated
Local Government Division gazettes before production deployment.

For reproducibility, `node scripts/compile-municipalities.cjs` reads
`staticData/municipality-source.json` and regenerates:
`municipality-areas.json`, `municipality-fallback-upazilas.json` and
`municipality-unmapped.json`. The latter is diagnostic only.

Automated check: `node scripts/smoke-municipality-catalog.cjs`.
