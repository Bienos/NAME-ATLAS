import { describe, expect, it } from "vitest";
import type { ListFacts, ListFactsArtefact } from "@name-atlas/contracts";
import { atlasLayout, STRIP_DOT } from "./list-atlas-layout.js";
import { LIST_FACTS_FIXTURE } from "./list-atlas.fixture.js";

/** TASK-040: the atlas's drawings, laid out once per artefact. Geometry only. */

const { male: M, female: F } = LIST_FACTS_FIXTURE.lists;

function withLists(male: ListFacts, female: ListFacts): ListFactsArtefact {
  return { ...LIST_FACTS_FIXTURE, lists: { male, female } };
}

describe("atlasLayout", () => {
  it("lays an artefact out once: the same artefact returns the very same layout", () => {
    const first = atlasLayout(LIST_FACTS_FIXTURE);
    expect(atlasLayout(LIST_FACTS_FIXTURE)).toBe(first);
  });

  it("lays out afresh an artefact that only shares the checksums", () => {
    const first = atlasLayout(LIST_FACTS_FIXTURE);
    const copy = withLists(
      { ...M, crowd: { ...M.crowd, example: { ...M.crowd.example, seed: 99 } } },
      F,
    );
    expect(copy.lists.male.source.sha256).toBe(M.source.sha256);
    const other = atlasLayout(copy);
    expect(other).not.toBe(first);
    expect(other.male.crowd).not.toEqual(first.male.crowd);
    expect(other.female).toEqual(first.female);
  });

  it("orders keyed entries by their key, never trusting their position", () => {
    const reversed = withLists(
      {
        ...M,
        collision: { ...M.collision, curve: [...M.collision.curve].reverse() },
        crowd: { ...M.crowd, expected_distinct: [...M.crowd.expected_distinct].reverse() },
      },
      F,
    );
    const straight = atlasLayout(LIST_FACTS_FIXTURE).male;
    const layout = atlasLayout(reversed).male;
    expect(layout.curve.path).toBe(straight.curve.path);
    expect(layout.curve.first).toBe(2);
    expect(layout.curve.last).toBe(300);
    expect(layout.spark).toEqual(straight.spark);
    expect(layout.spark.points.map((p) => p.n)).toEqual([100, 1000, 10000, 100000, 1000000]);
    // The line runs left to right: its x never goes back.
    const xs = [...layout.curve.path.matchAll(/[ML]([\d.]+) /gu)].map((m) => Number(m[1]));
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
  });

  it("gives both columns one strip height and one room size, so they line up", () => {
    const layout = atlasLayout(LIST_FACTS_FIXTURE);
    const levels = Math.max(...layout.male.strip.levels, ...layout.female.strip.levels);
    expect(layout.stripHeight).toBe((levels + 1) * STRIP_DOT + 6);
    expect(layout.male.room.height).toBe(layout.female.room.height);
    expect(layout.male.room.seats).toHaveLength(layout.female.room.seats.length);
    // A fuller room on one list gives both rooms its rows; the extra seats are empty.
    const fuller = withLists(M, {
      ...F,
      collision: {
        ...F.collision,
        example_rooms: { ...F.collision.example_rooms, showcase_pair: [150, 190] },
      },
    });
    const wide = atlasLayout(fuller);
    expect(wide.male.room.seats).toHaveLength(16 * 12);
    expect(wide.female.room.seats).toHaveLength(16 * 12);
  });

  it("marks the seats up to n_half: a line stepping down beside that seat, wall to wall", () => {
    const at = (list: ListFacts, n_half: number): ListFacts => ({
      ...list,
      collision: { ...list.collision, n_half },
    });
    // Seat 82 is the tenth of its row of twelve: the line steps down after it.
    const room = atlasLayout(withLists(at(M, 82), F)).male.room;
    const seat = room.seats[81]!;
    const next = room.seats[82]!;
    expect(next.y).toBe(seat.y);
    expect(room.half?.path).toBe(
      `M${String(room.width - 4)} ${String(seat.y - 5)}H${String((seat.x + next.x) / 2)}V${String(seat.y + 5)}H4`,
    );
    expect(room.half?.y).toBeCloseTo((seat.y - 5) / room.height);
    // The last seat of a row: a straight line under it.
    const end = atlasLayout(withLists(at(M, 84), F)).male.room;
    const last = end.seats[83]!;
    expect(end.half?.path).toBe(`M${String(end.width - 4)} ${String(last.y + 5)}H4`);
    // More than the room holds: no line rather than one in the wrong place.
    expect(atlasLayout(withLists(at(M, 100000), F)).male.room.half).toBeNull();
  });

  it("draws one dot per example room and one mark per person in the crowd", () => {
    const layout = atlasLayout(LIST_FACTS_FIXTURE);
    for (const [side, list] of [
      ["male", M],
      ["female", F],
    ] as const) {
      expect(layout[side].strip.xs).toHaveLength(list.collision.example_rooms.first_pair_at.length);
      const marks = [...layout[side].crowd.loners, ...layout[side].crowd.members].join("");
      expect(marks.match(/h0/gu)).toHaveLength(list.crowd.example.n);
    }
  });
});
