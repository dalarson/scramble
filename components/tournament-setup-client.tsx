"use client";

import { useEffect, useMemo, useState } from "react";
import type { Course, Player, TeeSet, Tournament } from "@/types";
import {
  createCourse,
  createHole,
  createPlayer,
  createTeam,
  createTeeSet,
  createTournament,
  listCourses,
  listPlayers,
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
  const [players, setPlayers] = useState<Player[]>([]);
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

  const [holeTeeSetId, setHoleTeeSetId] = useState("");
  const [holeNumber, setHoleNumber] = useState("1");
  const [holePar, setHolePar] = useState("4");
  const [holeYardage, setHoleYardage] = useState("");
  const [holeHandicap, setHoleHandicap] = useState("");

  const [playerName, setPlayerName] = useState("");
  const [playerGolfHandicap, setPlayerGolfHandicap] = useState("");
  const [playerBeerHandicap, setPlayerBeerHandicap] = useState("");

  const [tournamentName, setTournamentName] = useState("");
  const [tournamentDate, setTournamentDate] = useState("");
  const [tournamentCourseId, setTournamentCourseId] = useState("");
  const [tournamentTeeSetId, setTournamentTeeSetId] = useState("");

  const [teamName, setTeamName] = useState("");
  const [teamTournamentId, setTeamTournamentId] = useState("");
  const [teamCaptainId, setTeamCaptainId] = useState("");

  const teeSetsForSelectedTournamentCourse = useMemo(
    () => teeSets.filter((teeSet) => teeSet.courseId === tournamentCourseId),
    [teeSets, tournamentCourseId],
  );

  async function refresh() {
    setLoading(true);
    try {
      const [nextCourses, nextTeeSets, nextPlayers, nextTournaments] =
        await Promise.all([
          listCourses(),
          listTeeSets(),
          listPlayers(),
          listTournaments(),
        ]);
      setCourses(nextCourses);
      setTeeSets(nextTeeSets);
      setPlayers(nextPlayers);
      setTournaments(nextTournaments);
      setTeeCourseId((current) => current || nextCourses[0]?.id || "");
      setHoleTeeSetId((current) => current || nextTeeSets[0]?.id || "");
      setTournamentCourseId((current) => current || nextCourses[0]?.id || "");
      setTournamentTeeSetId((current) => current || nextTeeSets[0]?.id || "");
      setTeamTournamentId((current) => current || nextTournaments[0]?.id || "");
      setTeamCaptainId((current) => current || nextPlayers[0]?.id || "");
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
    void refresh();
  }, []);

  useEffect(() => {
    if (!tournamentCourseId) {
      return;
    }
    const first = teeSetsForSelectedTournamentCourse[0];
    if (first && !teeSetsForSelectedTournamentCourse.some((t) => t.id === tournamentTeeSetId)) {
      setTournamentTeeSetId(first.id);
    }
  }, [teeSetsForSelectedTournamentCourse, tournamentCourseId, tournamentTeeSetId]);

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
          value={holeTeeSetId}
          onChange={(event) => setHoleTeeSetId(event.target.value)}
        >
          <option value="">Select tee set</option>
          {teeSets.map((teeSet) => (
            <option key={teeSet.id} value={teeSet.id}>
              {teeSet.name}
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
          disabled={!holeTeeSetId || loading}
          onClick={async () => {
            const number = Number(holeNumber);
            const par = Number(holePar);
            if (!Number.isFinite(number) || !Number.isFinite(par)) {
              setNotice({ kind: "error", text: "Hole number and par must be numeric." });
              return;
            }
            try {
              await createHole({
                teeSetId: holeTeeSetId,
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
        <h2 className="font-medium">Add Player</h2>
        <input
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          placeholder="Player name"
          value={playerName}
          onChange={(event) => setPlayerName(event.target.value)}
        />
        <input
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          placeholder="Golf handicap (optional)"
          value={playerGolfHandicap}
          onChange={(event) => setPlayerGolfHandicap(event.target.value)}
        />
        <input
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          placeholder="Beer handicap (optional)"
          value={playerBeerHandicap}
          onChange={(event) => setPlayerBeerHandicap(event.target.value)}
        />
        <button
          className="rounded bg-zinc-900 px-3 py-2 text-sm text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
          disabled={!playerName.trim() || loading}
          onClick={async () => {
            try {
              const created = await createPlayer({
                name: playerName,
                golfHandicap: toNumberOrUndefined(playerGolfHandicap),
                beerHandicap: toNumberOrUndefined(playerBeerHandicap),
              });
              setPlayerName("");
              setPlayerGolfHandicap("");
              setPlayerBeerHandicap("");
              setNotice({ kind: "success", text: `Created player: ${created.name}` });
              await refresh();
            } catch (error) {
              setNotice({
                kind: "error",
                text: error instanceof Error ? error.message : "Failed to create player.",
              });
            }
          }}
        >
          Add Player
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
          value={tournamentTeeSetId}
          onChange={(event) => setTournamentTeeSetId(event.target.value)}
        >
          <option value="">Select tee set</option>
          {teeSetsForSelectedTournamentCourse.map((teeSet) => (
            <option key={teeSet.id} value={teeSet.id}>
              {teeSet.name}
            </option>
          ))}
        </select>
        <button
          className="rounded bg-zinc-900 px-3 py-2 text-sm text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
          disabled={
            !tournamentName.trim() ||
            !tournamentDate ||
            !tournamentCourseId ||
            !tournamentTeeSetId ||
            loading
          }
          onClick={async () => {
            try {
              const created = await createTournament({
                name: tournamentName,
                date: tournamentDate,
                courseId: tournamentCourseId,
                teeSetId: tournamentTeeSetId,
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

      <div className="grid gap-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
        <h2 className="font-medium">Create Team</h2>
        <input
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          placeholder="Team name"
          value={teamName}
          onChange={(event) => setTeamName(event.target.value)}
        />
        <select
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          value={teamTournamentId}
          onChange={(event) => setTeamTournamentId(event.target.value)}
        >
          <option value="">Select tournament</option>
          {tournaments.map((tournament) => (
            <option key={tournament.id} value={tournament.id}>
              {tournament.name}
            </option>
          ))}
        </select>
        <select
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          value={teamCaptainId}
          onChange={(event) => setTeamCaptainId(event.target.value)}
        >
          <option value="">Select captain</option>
          {players.map((player) => (
            <option key={player.id} value={player.id}>
              {player.name}
            </option>
          ))}
        </select>
        <button
          className="rounded bg-zinc-900 px-3 py-2 text-sm text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
          disabled={!teamName.trim() || !teamTournamentId || !teamCaptainId || loading}
          onClick={async () => {
            try {
              const created = await createTeam({
                name: teamName,
                tournamentId: teamTournamentId,
                captainPlayerId: teamCaptainId,
              });
              setTeamName("");
              setNotice({ kind: "success", text: `Created team: ${created.name}` });
            } catch (error) {
              setNotice({
                kind: "error",
                text: error instanceof Error ? error.message : "Failed to create team.",
              });
            }
          }}
        >
          Add Team
        </button>
      </div>
    </div>
  );
}
