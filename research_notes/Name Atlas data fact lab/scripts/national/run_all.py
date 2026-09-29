"""Run the national fact-lab scripts in order (python3 run_all.py). Output: data/national/*.csv"""
import importlib
import time

STEPS = ["a00_data_quality", "a01_a02_baseline_trends", "a03_movers_suffix", "a04_a05_diversity_entry_exit",
         "a06_a07_gender_hyphen", "a08_deceased", "a09_a10_a11_language", "a12_showcase_extra", "a13_diacritic_variants",
         "z_assemble_showcase"]

if __name__ == "__main__":
    for name in STEPS:
        t = time.time()
        print(f"=== {name}")
        importlib.import_module(name).main()
        print(f"=== {name} done in {time.time() - t:.1f}s")
