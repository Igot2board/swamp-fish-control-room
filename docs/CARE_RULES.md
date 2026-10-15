# Care rules and evidence

Checked 2026-10-15. Keep detailed references out of the main everyday interface.

## Sources

- API, manufacturer: https://www.apifishcare.com/products/api-freshwater-master-test-kit — physical kit/chart and its own preparation instructions.
- API axolotl care: https://www.apifishcare.com/blog/caring-for-your-axolotl — ammonia/nitrite zero, nitrate below 20 ppm, ideal water temperature 60–65°F and ideal pH 7.2–7.6. General hardness and carbonate hardness also matter; the app is not a complete habitat certification.
- Axolotl Central, authored cycling guide: https://www.axolotlcentral.com/cycling-guide — final processing goal is 2 ppm ammonia to zero ammonia and nitrite within 24 hours. A lower-ammonia trial is useful progress but not this final criterion.

## Implemented choices

The original handoff called a 1 ppm trial final. Research found a conflict, so v2 requires measured start ≥2 ppm, nitrite zero, temperature 60–65°F, and an explicit empty-tank confirmation. This does not prescribe an ammonia dose. The app points to the product instructions and records measured concentration only.

The start measurement must be within the last hour when starting the timer. The subsequent zero measurement must occur after start and within 24 hours, with temperature recorded. Any logged water change, extra dose, or filter replacement between start and endpoint invalidates the trial. Interventions after a demonstrated pass do not erase that historical pass. Current positive readings still block readiness.

The final current-reading gates require zero ammonia/nitrite, nitrate <20, temperature 60–65°F, and recorded pH plus keeper-confirmed final home checks. The inherited pH band 7.2–8.4 is a review band, not an ideal-range claim; API's narrower ideal range is shown in the detailed check explanation. The keeper must check stability and suitability. No automatic chemical pH correction is advised. GH/KH are not measured by these photos, so app gates must not be described as comprehensive safety certification.

Current data expires from readiness after 24 hours; final challenge evidence after seven days. These are conservative app policies, not claimed biological thresholds. Missing parameters never pass. Low-range pH reaching the scale ceiling cannot substitute for a high-range reading.

No medications, ammonia product dose calculations, or blanket additives are recommended. Occupied-tank behavior never suggests fishless ammonia dosing. Water-change math includes replacement-water nitrate, uses actual water volume, and requires a retest.

Test timing uses an explicit keeper attestation to the printed kit instructions. Reagent-specific drop counts and timers are deferred until matched to the actual kit insert; there is no invented generic timer.
