"""Rerun the diaspora/history fact-lab pipeline in order (research prototype). Takes about 9 minutes.
prng_cache.py is needed only if prng_points.csv is missing from the scratchpad. Each script's printed output is saved
to <scratchpad>/analysis/diaspora_history/logs/<script>.log (never to the repo)."""
import subprocess, sys, time, os
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from common import WORK
STEPS = ['c1_c2_us.py', 'c3_us_similar.py', 'c4_wwi_coverage_match.py', 'c5a_gov_ids.py', 'c5b_entry_locations.py',
         'c5c_location_summary.py', 'c6_persistence.py', 'c7_showcase_wwi.py', 'z_notes_numbers.py']
if __name__ == '__main__':
    os.makedirs(os.path.join(WORK, 'logs'), exist_ok=True)
    for s in STEPS:
        t = time.time()
        r = subprocess.run([sys.executable, os.path.join(HERE, s)], cwd=HERE, capture_output=True, text=True)
        with open(os.path.join(WORK, 'logs', s.replace('.py', '.log')), 'w') as fh:
            fh.write(r.stdout + r.stderr)
        print(f'{s}: exit {r.returncode}, {time.time() - t:.0f}s')
        if r.returncode:
            print(r.stderr[-3000:]); sys.exit(r.returncode)
