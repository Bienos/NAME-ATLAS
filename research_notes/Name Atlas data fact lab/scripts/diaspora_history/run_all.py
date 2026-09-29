"""Rerun the diaspora/history fact-lab pipeline in order (research prototype). Takes about 10 minutes.
prng_cache.py is needed only if prng_points.csv is missing from the scratchpad."""
import subprocess, sys, time, os
HERE = os.path.dirname(os.path.abspath(__file__))
STEPS = ['c1_c2_us.py', 'c3_us_similar.py', 'c4_wwi_coverage_match.py', 'c5a_gov_ids.py', 'c5b_entry_locations.py',
         'c5c_location_summary.py', 'c6_persistence.py', 'c7_showcase_wwi.py', 'z_notes_numbers.py']
if __name__ == '__main__':
    for s in STEPS:
        t = time.time()
        r = subprocess.run([sys.executable, os.path.join(HERE, s)], cwd=HERE, capture_output=True, text=True)
        print(f'{s}: exit {r.returncode}, {time.time() - t:.0f}s')
        if r.returncode:
            print(r.stderr[-3000:]); sys.exit(r.returncode)
