"use client";

import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { BeerScoringMode, Course, Team, TeeSet, Tournament } from "@/types";
import { listTeams } from "@/services/liveTournament";
import {
  createCourse,
  createHole,
  createTeeSet,
  createTournament,
  listCourses,
  listTeeSets,
  listTournaments,
} from "@/services/tournamentSetup";

type Notice = {
  kind: "success" | "error";
  text: string;
};

function toNumberOrUndefined(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default function TournamentSetupClient() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [teeSets, setTeeSets] = useState<TeeSet[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(false);

  const [courseName, setCourseName] = useState("");
  const [courseLocation, setCourseLocation] = useState("");

  const [teeCourseId, setTeeCourseId] = useState("");
  const [teeName, setTeeName] = useState("");
  const [teeRating, setTeeRating] = useState("72.0");
  const [teeSlope, setTeeSlope] = useState("120");
  const [teePar, setTeePar] = useState("72");

  const [holeCourseId, setHoleCourseId] = useState("");
  const [holeTeeSetId, setHoleTeeSetId] = useState("");
  const [holeNumber, setHoleNumber] = useState("1");
  const [holePar, setHolePar] = useState("4");
  const [holeYardage, setHoleYardage] = useState("");
  const [holeHandicap, setHoleHandicap] = useState("");

  const [tournamentName, setTournamentName] = useState("");
  const [tournamentDate, setTournamentDate] = useState("");
  const [tournamentCourseId, setTournamentCourseId] = useState("");
  const [tournamentTeeSetId, setTournamentTeeSetId] = useState("");
  const [tournamentBirdieJuiceEnabled, setTournamentBirdieJuiceEnabled] = useState(false);
  const [tournamentBeerScoringMode, setTournamentBeerScoringMode] =
    useState<BeerScoringMode>("gross");

  const teeSetsForSelectedTournamentCourse = useMemo(
    () => teeSets.filter((teeSet) => teeSet.courseId === tournamentCourseId),
    [teeSets, tournamentCourseId],
  );
  const teeSetsForSelectedHoleCourse = useMemo(
    () => teeSets.filter((teeSet) => teeSet.courseId === holeCourseId),
    [teeSets, holeCourseId],
  );
  const coursesById = useMemo(
    () => new Map(courses.map((course) => [course.id, course])),
    [courses],
  );
  const tournamentsById = new Map(tournaments.map((tournament) => [tournament.id, tournament]));
  const effectiveTournamentTeeSetId = teeSetsForSelectedTournamentCourse.some(
    (teeSet) => teeSet.id === tournamentTeeSetId,
  )
    ? tournamentTeeSetId
    : (teeSetsForSelectedTournamentCourse[0]?.id ?? "");
  const effectiveHoleTeeSetId = teeSetsForSelectedHoleCourse.some(
    (teeSet) => teeSet.id === holeTeeSetId,
  )
    ? holeTeeSetId
    : (teeSetsForSelectedHoleCourse[0]?.id ?? "");

  async function refresh() {
    setLoading(true);
    try {
      const [nextCourses, nextTeeSets, nextTournaments, nextTeams] =
        await Promise.all([
          listCourses(),
          listTeeSets(),
          listTournaments(),
          listTeams(),
        ]);
      setCourses(nextCourses);
      setTeeSets(nextTeeSets);
      setTeams(nextTeams);
      setTournaments(nextTournaments);
      setTeeCourseId((current) => current || nextCourses[0]?.id || "");
      setHoleCourseId((current) => current || nextCourses[0]?.id || "");
      setHoleTeeSetId((current) => current || nextTeeSets[0]?.id || "");
      setTournamentCourseId((current) => current || nextCourses[0]?.id || "");
      setTournamentTeeSetId((current) => current || nextTeeSets[0]?.id || "");
    } catch (error) {
      setNotice({
        kind: "error",
        text: error instanceof Error ? error.message : "Failed to refresh setup data.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <div className="space-y-6">
      {notice ? (
        <p
          className={
            notice.kind === "success"
              ? "rounded-md bg-emerald-100 px-3 py-2 text-sm text-emerald-800"
              : "rounded-md bg-red-100 px-3 py-2 text-sm text-red-800"
          }
        >
          {notice.text}
        </p>
      ) : null}

      <div className="grid gap-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
        <h2 className="font-medium">Create Course</h2>
        <input
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          placeholder="Course name"
          value={courseName}
          onChange={(event) => setCourseName(event.target.value)}
        />
        <input
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          placeholder="Location (optional)"
          value={courseLocation}
          onChange={(event) => setCourseLocation(event.target.value)}
        />
        <button
          className="rounded bg-zinc-900 px-3 py-2 text-sm text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
          disabled={!courseName.trim() || loading}
          onClick={async () => {
            try {
              const created = await createCourse({
                name: courseName,
                location: courseLocation,
              });
              setCourseName("");
              setCourseLocation("");
              setNotice({ kind: "success", text: `Created course: ${created.name}` });
              await refresh();
            } catch (error) {
              setNotice({
                kind: "error",
                text: error instanceof Error ? error.message : "Failed to create course.",
              });
            }
          }}
        >
          Add Course
        </button>
      </div>

      <div className="grid gap-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
        <h2 className="font-medium">Create Tee Set</h2>
        <select
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          value={teeCourseId}
          onChange={(event) => setTeeCourseId(event.target.value)}
        >
          <option value="">Select course</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.name}
            </option>
          ))}
        </select>
        <input
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          placeholder="Tee set name"
          value={teeName}
          onChange={(event) => setTeeName(event.target.value)}
        />
        <input
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          placeholder="Course rating"
          value={teeRating}
          onChange={(event) => setTeeRating(event.target.value)}
        />
        <input
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          placeholder="Slope rating"
          value={teeSlope}
          onChange={(event) => setTeeSlope(event.target.value)}
        />
        <input
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          placeholder="Total par"
          value={teePar}
          onChange={(event) => setTeePar(event.target.value)}
        />
        <button
          className="rounded bg-zinc-900 px-3 py-2 text-sm text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
          disabled={!teeCourseId || !teeName.trim() || loading}
          onClick={async () => {
            const courseRating = Number(teeRating);
            const slopeRating = Number(teeSlope);
            const totalPar = Number(teePar);
            if (!Number.isFinite(courseRating) || !Number.isFinite(slopeRating) || !Number.isFinite(totalPar)) {
              setNotice({ kind: "error", text: "Tee set values must be numeric." });
              return;
            }
            try {
              const created = await createTeeSet({
                courseId: teeCourseId,
                name: teeName,
                courseRating,
                slopeRating,
                totalPar,
              });
              setTeeName("");
              setNotice({ kind: "success", text: `Created tee set: ${created.name}` });
              await refresh();
            } catch (error) {
              setNotice({
                kind: "error",
                text: error instanceof Error ? error.message : "Failed to create tee set.",
              });
            }
          }}
        >
          Add Tee Set
        </button>
      </div>

      <div className="grid gap-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
        <h2 className="font-medium">Add Hole</h2>
        <select
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          value={holeCourseId}
          onChange={(event) => setHoleCourseId(event.target.value)}
        >
          <option value="">Select course</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.name}
            </option>
          ))}
        </select>
        <select
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          value={effectiveHoleTeeSetId}
          onChange={(event) => setHoleTeeSetId(event.target.value)}
        >
          <option value="">Select tee set</option>
          {teeSetsForSelectedHoleCourse.map((teeSet) => (
            <option key={teeSet.id} value={teeSet.id}>
              {teeSet.name} ({coursesById.get(teeSet.courseId)?.name ?? "Unknown course"})
            </option>
          ))}
        </select>
        <input
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          placeholder="Hole number"
          value={holeNumber}
          onChange={(event) => setHoleNumber(event.target.value)}
        />
        <input
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          placeholder="Par"
          value={holePar}
          onChange={(event) => setHolePar(event.target.value)}
        />
        <input
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          placeholder="Yardage (optional)"
          value={holeYardage}
          onChange={(event) => setHoleYardage(event.target.value)}
        />
        <input
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          placeholder="Handicap (optional)"
          value={holeHandicap}
          onChange={(event) => setHoleHandicap(event.target.value)}
        />
        <button
          className="rounded bg-zinc-900 px-3 py-2 text-sm text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
          disabled={!effectiveHoleTeeSetId || loading}
          onClick={async () => {
            const number = Number(holeNumber);
            const par = Number(holePar);
            if (!Number.isFinite(number) || !Number.isFinite(par)) {
              setNotice({ kind: "error", text: "Hole number and par must be numeric." });
              return;
            }
            try {
              await createHole({
                teeSetId: effectiveHoleTeeSetId,
                number,
                par,
                yardage: toNumberOrUndefined(holeYardage),
                handicap: toNumberOrUndefined(holeHandicap),
              });
              setNotice({ kind: "success", text: `Added hole ${number}.` });
            } catch (error) {
              setNotice({
                kind: "error",
                text: error instanceof Error ? error.message : "Failed to create hole.",
              });
            }
          }}
        >
          Add Hole
        </button>
      </div>

      <div className="grid gap-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
        <h2 className="font-medium">Create Tournament</h2>
        <input
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          placeholder="Tournament name"
          value={tournamentName}
          onChange={(event) => setTournamentName(event.target.value)}
        />
        <input
          type="date"
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          value={tournamentDate}
          onChange={(event) => setTournamentDate(event.target.value)}
        />
        <select
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          value={tournamentCourseId}
          onChange={(event) => setTournamentCourseId(event.target.value)}
        >
          <option value="">Select course</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.name}
            </option>
          ))}
        </select>
        <select
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          value={effectiveTournamentTeeSetId}
          onChange={(event) => setTournamentTeeSetId(event.target.value)}
        >
          <option value="">Select tee set</option>
          {teeSetsForSelectedTournamentCourse.map((teeSet) => (
            <option key={teeSet.id} value={teeSet.id}>
              {teeSet.name} ({coursesById.get(teeSet.courseId)?.name ?? "Unknown course"})
            </option>
          ))}
        </select>
        <label className="flex items-center justify-between rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600">
          <span className="font-medium">Enable birdie juice</span>
          <input
            checked={tournamentBirdieJuiceEnabled}
            className="h-4 w-4"
            onChange={(event) => setTournamentBirdieJuiceEnabled(event.target.checked)}
            type="checkbox"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Beer scoring mode</span>
          <select
            className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
            value={tournamentBeerScoringMode}
            onChange={(event) =>
              setTournamentBeerScoringMode(event.target.value as BeerScoringMode)
            }
          >
            <option value="gross">Gross (every beer counts -1)</option>
            <option value="net">Net (beers count after handicap)</option>
          </select>
        </label>
        <button
          className="rounded bg-zinc-900 px-3 py-2 text-sm text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
          disabled={
            !tournamentName.trim() ||
            !tournamentDate ||
            !tournamentCourseId ||
            !effectiveTournamentTeeSetId ||
            loading
          }
          onClick={async () => {
            try {
              const created = await createTournament({
                name: tournamentName,
                date: tournamentDate,
                courseId: tournamentCourseId,
                teeSetId: effectiveTournamentTeeSetId,
                birdieJuiceEnabled: tournamentBirdieJuiceEnabled,
                beerScoringMode: tournamentBeerScoringMode,
              });
              setTournamentName("");
              setTournamentDate("");
              setNotice({
                kind: "success",
                text: `Created tournament (${created.joinCode}): ${created.name}`,
              });
              await refresh();
            } catch (error) {
              setNotice({
                kind: "error",
                text: error instanceof Error ? error.message : "Failed to create tournament.",
              });
            }
          }}
        >
          Add Tournament
        </button>
      </div>

      {teams.length > 0 ? (
        <div className="grid gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
          <h2 className="font-medium">Team QR Codes</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Print or share each team's QR code. Scanning it opens the team's
            live scoring view directly — no login needed.
          </p>
          {teams.map((team) => {
            const tournament = tournamentsById.get(team.tournamentId);
            const path = `/tournament/${team.tournamentId}/team/${team.id}?access=${team.accessToken}`;
            const fullUrl =
              typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
            return (
              <div
                key={team.id}
                className="grid gap-3 rounded-lg border border-zinc-200 p-3 sm:grid-cols-[auto_1fr] dark:border-zinc-700"
              >
                <div className="flex justify-center sm:justify-start">
                  <QRCodeSVG
                    value={fullUrl}
                    size={120}
                    className="rounded"
                  />
                </div>
                <div className="flex flex-col justify-between gap-2">
                  <div>
                    <div className="font-medium">{team.name}</div>
                    <div className="mt-0.5 text-xs text-zinc-500">
                      {tournament?.name ?? "Tournament"}
                    </div>
                    <div className="mt-2 break-all rounded bg-zinc-100 px-2 py-1.5 text-[10px] dark:bg-zinc-900">
                      {fullUrl}
                    </div>
                  </div>
                  <button
                    className="self-start rounded border border-zinc-300 px-3 py-1.5 text-xs dark:border-zinc-700"
                    onClick={async () => {
                      await navigator.clipboard.writeText(fullUrl);
                      setNotice({ kind: "success", text: `Copied link for ${team.name}.` });
                    }}
                  >
                    Copy Link
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
