// app/programs/[programId]/teams/[teamId]/seasons/[seasonId]/SeasonRosterClient.tsx
"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

import SeasonBudgetControls from "./SeasonBudgetControls";
import ScholarshipWhatIf from "./ScholarshipWhatIf";
import { Avatar } from "@/components/Avatar";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";

type ScholarshipUnit = "percent" | "equivalency" | "amount";

type RosterEntry = {
  id: string;
  teamSeasonId: string;
  athleteId: string | null;
  programRecruitId: string | null;
  status: string | null;
  role: string | null;

  name: string;
  email: string | null;
  avatarUrl: string | null;

  gradYear: number | null;
  scholarshipAmount: number | null;
  scholarshipUnit: string | null;
  scholarshipNotes: string | null;
  createdAt: string | null;
  eventGroup?: string | null; // if you already have this, keep it
  events?: { eventCode: string; isPrimary: boolean }[];
};

type RecruitEntry = {
  programRecruitId: string;
  athleteId: string;
  fullName: string;
  gradYear: number | null;
  status: string | null;
  profileType: string | null;
  gender: string | null;
};

type ScholarshipSummary = {
  hasBudget: boolean;
  budgetEquiv: number | null;
  usedEquiv: number | null;
  remainingEquiv: number | null;
  budgetAmount: number | null;
  usedAmount: number | null;
  remainingAmount: number | null;
};

type BudgetHistoryRow = {
  id: string;
  timestamp: string;
  coach: string;
  oldEquiv: number | null;
  newEquiv: number | null;
  oldAmount: number | null;
  newAmount: number | null;
  notes: string | null;
};

type Props = {
  programId: string;
  teamId: string;
  seasonId: string;
  isManager: boolean;
  isLocked: boolean;
  teamGender: string | null;
  initialGroupQuotas: Record<string, number | null>;
  roster: RosterEntry[];

  // Scholarship budget tools
  scholarshipSummary: ScholarshipSummary;
  budgetHistory: BudgetHistoryRow[];
  initialBudgetEquiv: number | null;
  initialBudgetAmount: number | null;
  budgetCurrency: string;
  initialSeasonLocked: boolean; // coach lock state for SeasonBudgetControls
};

type AuditSortKey = "name" | "equiv" | "amount";

type ActiveTool = "none" | "recruits" | "budget";

type ScholarshipAuditRow = {
  id: string;
  name: string;
  gradYear: number | null;
  unit: ScholarshipUnit;
  rawAmount: number | null;
  equiv: number | null;
  dollar: number | null;
  notes: string | null;
};

function formatCurrency(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "-";
  return `$${Number(value).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  })}`;
}

// Gender normalization helper
function normalizeGender(value: string | null | undefined): "men" | "women" | null {
  if (!value) return null;
  const v = value.toLowerCase().trim();

  // Handle common variants
  if (["m", "male", "man", "mens", "men", "boys", "boy"].some((g) => v.startsWith(g))) {
    return "men";
  }
  if (
    ["f", "female", "woman", "womens", "women", "girls", "girl"].some((g) =>
      v.startsWith(g)
    )
  ) {
    return "women";
  }

  return null;
}

export default function SeasonRosterClient({
  programId,
  teamId,
  seasonId,
  isManager,
  isLocked,
  teamGender,
  initialGroupQuotas,
  roster: initialRoster,
  scholarshipSummary,
  budgetHistory,
  initialBudgetEquiv,
  initialBudgetAmount,
  budgetCurrency,
  initialSeasonLocked,
}: Props) {
  const router = useRouter();

  const [roster, setRoster] = useState<RosterEntry[]>(initialRoster);
  const [recruits, setRecruits] = useState<RecruitEntry[]>([]);
  const [loadingRecruits, setLoadingRecruits] = useState(false);
  const [recruitsError, setRecruitsError] = useState<string | null>(null);
  const [recruitGenderFilter, setRecruitGenderFilter] =
    useState<"program" | "all">("program");
  const [previewRecruitId, setPreviewRecruitId] = useState<string | null>(null);
  const [previewRecruitRect, setPreviewRecruitRect] = useState<{
    top: number;
    left: number;
  } | null>(null);


  // Event group UI state
  const [groupExpanded, setGroupExpanded] = useState<Record<string, boolean>>({});
  const [groupQuotas, setGroupQuotas] = useState<Record<string, number | null>>(
    initialGroupQuotas || {}
  );
  // Drag-and-drop removal confirmation state
  const [pendingRemovalRosterId, setPendingRemovalRosterId] =
    useState<string | null>(null);
  const [pendingRemovalName, setPendingRemovalName] = useState<string | null>(
    null
  );
  // Drag hover state for slot placeholders
  const [hoverSlotKey, setHoverSlotKey] = useState<string | null>(null);
  // Avatar upload state
  const [avatarUploadingId, setAvatarUploadingId] = useState<string | null>(null);

    // Add-athlete modal state
  const [showAddAthlete, setShowAddAthlete] = useState(false);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newGradYear, setNewGradYear] = useState<string>("");
  const [newEventGroup, setNewEventGroup] = useState<string>("");
  const [newJerseyNumber, setNewJerseyNumber] = useState<string>("");
  const [newStatus, setNewStatus] = useState<string>("active");
  const [newScholarshipAmount, setNewScholarshipAmount] = useState<string>("");
  const [newScholarshipUnit, setNewScholarshipUnit] =
    useState<ScholarshipUnit>("percent");
  const [newNotes, setNewNotes] = useState<string>("");
  const [savingNewAthlete, setSavingNewAthlete] = useState(false);
  const [addAthleteError, setAddAthleteError] = useState<string | null>(null);

  // Bulk import (CSV) modal state
  const [showImportRoster, setShowImportRoster] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importPreviewCount, setImportPreviewCount] = useState<number | null>(
    null
  );
  const [importCsvText, setImportCsvText] = useState<string | null>(null);

  const [suggestedMapping, setSuggestedMapping] = useState<
    Record<string, string | null> | null
  >(null);
  const [mappingLoading, setMappingLoading] = useState(false);

  const [isParsingImport, setIsParsingImport] = useState(false);

  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  // Duplicate identity detection (DB-outward)
  type DuplicateIdentityAction = {
    id: string;
    label: string;
    method?: string;
    url?: string;
    body?: any;
  };

  type DuplicateIdentityPayload = {
    error?: string;
    message?: string;
    identity?: {
      mode?: "weak" | "strong" | string;
      key?: string;
      input?: any;
    };
    candidates?: any[];
    resolver?: {
      actions?: DuplicateIdentityAction[];
    };
  };

  type DuplicateQueueItem =
    | {
        source: "import";
        row: ImportRow;
        response: DuplicateIdentityPayload | null;
      }
    | {
        source: "manual";
        input: { firstName: string; lastName: string; gradYear: number | null };
        response: DuplicateIdentityPayload | null;
      };

  const [duplicateQueue, setDuplicateQueue] = useState<DuplicateQueueItem[]>([]);
  const [pendingImportCursor, setPendingImportCursor] = useState<number | null>(null);
  const [pendingImportRow, setPendingImportRow] = useState<ImportRow | null>(null);

  type ImportRow = {
    first_name: string;
    last_name: string;
    grad_year?: number | null;
    event_group?: string | null;
    jersey_number?: string | null;
    status?: string | null;
    scholarship_amount?: number | null;
    scholarship_unit?: string | null;
    notes?: string | null;
    email?: string | null;
  };
  
  type ImportFieldKey =
  | "first_name"
  | "last_name"
  | "grad_year"
  | "event_group"
  | "jersey_number"
  | "status"
  | "scholarship_amount"
  | "scholarship_unit"
  | "notes"
  | "email";

  function detectDelimiter(line: string): "," | "\t" | ";" {
    if (line.includes("\t")) return "\t";
    if (line.includes(";")) return ";";
    return ",";
  }

  function coerceGradYear(value: string | null): number | null {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;

  // 1) Extract a 4-digit year anywhere in the string (best-case)
  const four = v.match(/\b(19\d{2}|20\d{2})\b/);
  if (four) return Number(four[1]);

  // 2) Two-digit year like "25" -> 2025
  const two = v.match(/\b(\d{2})\b/);
  if (two) {
    const yy = Number(two[1]);
    // assume 2000-2049 for 00-49, else 1900s
    return yy <= 49 ? 2000 + yy : 1900 + yy;
  }

  // 3) Common word pattern: "twenty twenty five"
  const normalized = v.toLowerCase().replace(/\s+/g, " ").trim();
  const wordMap: Record<string, number> = {
    "twenty twenty four": 2024,
    "twenty twenty five": 2025,
    "twenty twenty six": 2026,
    "twenty twenty seven": 2027,
    "twenty twenty eight": 2028,
    "twenty twenty nine": 2029,
    "twenty thirty": 2030,
  };
  if (normalized in wordMap) return wordMap[normalized];

  return null;
}

  function splitDelimitedLine(line: string, delimiter: string): string[] {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];

      if (ch === '"') {
        const next = line[i + 1];
        if (inQuotes && next === '"') {
          cur += '"';
          i += 1;
          continue;
        }
        inQuotes = !inQuotes;
        continue;
      }

      if (!inQuotes && ch === delimiter) {
        out.push(cur.trim());
        cur = "";
        continue;
      }

      cur += ch;
    }

    out.push(cur.trim());
    return out;
  }

  function normalizeHeaderName(value: string): string {
    return value
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/[^a-z0-9 #/%_-]/g, "")
      .trim();
  }

  function coerceSuggestedMapping(
    raw: Record<string, string | null>
  ): Record<ImportFieldKey, string | null> {
    return {
      first_name: raw.first_name ?? null,
      last_name: raw.last_name ?? null,
      grad_year: raw.grad_year ?? null,
      event_group: raw.event_group ?? null,
      jersey_number: raw.jersey_number ?? null,
      status: raw.status ?? null,
      scholarship_amount: raw.scholarship_amount ?? null,
      scholarship_unit: raw.scholarship_unit ?? null,
      notes: raw.notes ?? null,
      email: raw.email ?? null,
    };
  }

function parseCsvWithMapping(
  csvText: string,
  mapping: Record<ImportFieldKey, string | null>
): ImportRow[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitDelimitedLine(lines[0], delimiter).map((h) => h.trim());
  const normalizedHeaders = headers.map((h) => normalizeHeaderName(h));

  // Build field → column index map
  const fieldIndexMap: Partial<Record<ImportFieldKey, number>> = {};

  (Object.keys(mapping) as ImportFieldKey[]).forEach((field) => {
    const headerName = mapping[field];
    if (!headerName) return;

    const target = normalizeHeaderName(headerName);
    const idx = normalizedHeaders.findIndex((h) => h === target);

    if (idx !== -1) {
      fieldIndexMap[field] = idx;
    }
  });

  const dataLines = lines.slice(1);
  const out: ImportRow[] = [];

  for (const line of dataLines) {
    const cells = splitDelimitedLine(line, delimiter).map((c) => c.trim());

    const get = (field: ImportFieldKey): string | null => {
      const idx = fieldIndexMap[field];
      if (idx === undefined) return null;
      const raw = cells[idx] ?? "";
      const trimmed = raw.trim();
      return trimmed === "" ? null : trimmed;
    };

    const firstName = (get("first_name") ?? "").trim();
    const lastName = (get("last_name") ?? "").trim();

    // Match existing importer behavior: skip rows with no clear name
    if (!firstName || !lastName) continue;

    const gradYear = coerceGradYear(get("grad_year"));

    const scholarshipAmount = (() => {
      const v = get("scholarship_amount");
      if (!v) return null;
      const cleaned = v.replace("%", "");
      const n = Number(cleaned);
      return Number.isFinite(n) && n >= 0 ? n : null;
    })();

    const row: ImportRow = {
      first_name: firstName,
      last_name: lastName,
      grad_year: gradYear,
      event_group: get("event_group"),
      jersey_number: get("jersey_number"),
      status: get("status") || "active",
      scholarship_amount: scholarshipAmount,
      scholarship_unit: get("scholarship_unit") || "percent",
      notes: get("notes"),
      email: get("email"),
    };

    out.push(row);
  }

  return out;
}

  function parseCsvToNormalizedRows(text: string): ImportRow[] {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      throw new Error("File must contain a header row and at least one data row.");
    }

    const headerLine = lines[0];
    const delimiter = detectDelimiter(headerLine);
    const headers = splitDelimitedLine(headerLine, delimiter)
      .map((h) => normalizeHeaderName(h));

    function getValue(rowCols: string[], key: string): string | null {
      const idx = headers.indexOf(normalizeHeaderName(key));
      if (idx === -1) return null;
      const raw = rowCols[idx] ?? "";
      const trimmed = raw.trim();
      return trimmed === "" ? null : trimmed;
    }

    const rows: ImportRow[] = [];

    for (let i = 1; i < lines.length; i += 1) {
      const line = lines[i];
      if (!line) continue;

      const cols = splitDelimitedLine(line, delimiter);
      const firstName = getValue(cols, "first_name") ?? getValue(cols, "first") ?? "";
      const lastName = getValue(cols, "last_name") ?? getValue(cols, "last") ?? "";

      if (!firstName || !lastName) {
        // Skip rows with no clear name; we can add better diagnostics later
        continue;
      }

      const gradYear = coerceGradYear(
        getValue(cols, "grad_year") ??
          getValue(cols, "gradyear") ??
          getValue(cols, "class_year") ??
          null
      );

      const scholarshipStr =
        getValue(cols, "scholarship_amount") ??
        getValue(cols, "scholarship") ??
        getValue(cols, "award") ??
        null;
      let scholarshipAmount: number | null = null;
      if (scholarshipStr) {
        const parsed = Number(scholarshipStr);
        if (Number.isFinite(parsed) && parsed >= 0) {
          scholarshipAmount = parsed;
        }
      }

      const row: ImportRow = {
        first_name: firstName,
        last_name: lastName,
        grad_year: gradYear,
        event_group:
          getValue(cols, "event_group") ?? getValue(cols, "group") ?? null,
        jersey_number:
          getValue(cols, "jersey_number") ?? getValue(cols, "jersey") ?? null,
        status: getValue(cols, "status") ?? null,
        scholarship_amount: scholarshipAmount,
        scholarship_unit:
          getValue(cols, "scholarship_unit") ??
          getValue(cols, "unit") ??
          "percent",
        notes: getValue(cols, "notes"),
        email: getValue(cols, "email"),
      };

      rows.push(row);
    }

    return rows;
  }

    async function requestSuggestedMappingFromServer(
    headers: string[],
    sampleRows: string[][]
  ) {
    setMappingLoading(true);
    setSuggestedMapping(null);

    try {
      const res = await fetch(
        `/api/programs/${programId}/teams/${teamId}/seasons/${seasonId}/roster/import/suggest-mapping`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ headers, sampleRows }),
        }
      );

      const body = await res.json();

      if (!res.ok) {
        console.error(
          "[SeasonRosterClient] suggest-mapping error:",
          body
        );
        return;
      }

      console.log(
        "[SeasonRosterClient] suggested mapping:",
        body.mapping
      );
      setSuggestedMapping(body.mapping as Record<string, string | null>);
    } catch (err) {
      console.error("[SeasonRosterClient] suggest-mapping error:", err);
    } finally {
      setMappingLoading(false);
    }
  }

    function handleImportFileChange(e: ChangeEvent<HTMLInputElement>) {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsParsingImport(true);
      setImportError(null);
      setImportPreviewCount(null);

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target?.result;
          if (typeof text !== "string") {
            throw new Error("Could not read file as text.");
          }
          setImportCsvText(text);

          // --- NEW: extract headers + a few sample rows for mapping ---
          const allLines = text
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter((l) => l.length > 0);

          if (allLines.length >= 1) {
            const headerLine = allLines[0];
            const delimiter = detectDelimiter(headerLine);
            const headers = splitDelimitedLine(headerLine, delimiter).map((h) => h.trim());

            const sampleLines = allLines.slice(1, Math.min(allLines.length, 6));
            const sampleRows = sampleLines.map((line) =>
              splitDelimitedLine(line, delimiter).map((c) => c.trim())
            );

            // Fire-and-forget: get suggested mapping based on this file
            void requestSuggestedMappingFromServer(headers, sampleRows);
          }

          // --- EXISTING behavior: normalize rows using current heuristic ---
          const normalized = parseCsvToNormalizedRows(text);

          setImportRows(normalized);
          setImportPreviewCount(normalized.length);

          console.log(
            "[SeasonRosterClient] Normalized roster import rows:",
            normalized
          );
        } catch (err: any) {
          console.error("[SeasonRosterClient] Import parse error:", err);
          setImportError(err?.message || "Failed to parse CSV file.");
        } finally {
          setIsParsingImport(false);
        }
      };

      reader.onerror = () => {
        setIsParsingImport(false);
        setImportError("Failed to read file.");
      };

      reader.readAsText(file);
    }

    useEffect(() => {
      if (!importCsvText) return;
      if (!suggestedMapping) return;

      try {
        const coerced = coerceSuggestedMapping(suggestedMapping);
        const normalized = parseCsvWithMapping(importCsvText, coerced);
        setImportRows(normalized);
        setImportPreviewCount(normalized.length);

        console.log(
          "[SeasonRosterClient] Normalized roster import rows (mapped):",
          normalized
        );
      } catch (err) {
        console.error("[SeasonRosterClient] Import re-parse (mapped) error:", err);
      }
    }, [importCsvText, suggestedMapping]);

    const activeDuplicate = duplicateQueue.length ? duplicateQueue[0] : null;

  // --- State and helpers for missing grad year during import ---
  const [missingGradYearValue, setMissingGradYearValue] = useState<string>("");
  const [applyGradYearToAllMissing, setApplyGradYearToAllMissing] = useState<boolean>(true);

  function isMissingGradYearModal(item: DuplicateQueueItem | null): boolean {
    if (!item) return false;
    const msg = (item as any)?.response?.message;
    const err = (item as any)?.response?.error;
    return err === "MISSING_GRAD_YEAR" || msg === "Missing grad year";
  }

  function getMissingGradYearRow(item: DuplicateQueueItem | null): ImportRow | null {
    if (!item) return null;
    if (item.source !== "import") return null;
    return item.row;
  }

  function handleResolveMissingGradYearSkip() {
    const cursor = pendingImportCursor;
    // drop this modal/queue item
    closeDuplicateModal();
    router.refresh();
    if (cursor != null) {
      void runImportFrom(cursor + 1);
    }
  }

  function handleResolveMissingGradYearApply() {
    const cursor = pendingImportCursor;
    if (cursor == null) return;

    const raw = missingGradYearValue.trim();
    if (!raw) {
      alert("Please enter a grad year.");
      return;
    }

    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 1900 || parsed > 2100) {
      alert("Grad year must be a valid year (e.g. 2027). ");
      return;
    }

    setImportRows((prev) => {
      const next = [...prev];

      if (applyGradYearToAllMissing) {
        for (let i = cursor; i < next.length; i += 1) {
          if (next[i].grad_year == null) next[i] = { ...next[i], grad_year: parsed };
        }
      } else {
        const current = next[cursor];
        if (current) next[cursor] = { ...current, grad_year: parsed };
      }

      return next;
    });

    // close modal and resume import at SAME cursor (now fixed)
    closeDuplicateModal();
    router.refresh();
    void runImportFrom(cursor);
  }

function closeDuplicateModal() {
  setDuplicateQueue((prev) => prev.slice(1));
  setPendingImportCursor(null);
  setPendingImportRow(null);
}

async function runImportFrom(startIndex: number) {
  if (!importRows.length) {
    setImportError("No rows to import. Please upload a CSV first.");
    return;
  }

  if (!isManager || isLocked) {
    setImportError("You do not have permission to modify this roster.");
    return;
  }

  setIsImporting(true);
  setImportError(null);

  let successCount = 0;
  let failureCount = 0;

  for (let i = startIndex; i < importRows.length; i += 1) {
    const row = importRows[i];

    // --- Intercept missing grad year BEFORE API call ---
    if (row.grad_year == null) {
      console.warn("[SeasonRosterClient] Import row missing grad_year; pausing for resolution:", row);
      setPendingImportCursor(i);
      setPendingImportRow(row);
      setMissingGradYearValue("");
      setApplyGradYearToAllMissing(true);
      setDuplicateQueue((prev) => [
        ...prev,
        { source: "import", row, response: { error: "MISSING_GRAD_YEAR", message: "Missing grad year" } },
      ]);
      setImportError(
        "One or more athletes are missing a required grad year. Resolve the row to continue."
      );
      setIsImporting(false);
      return;
    }

    try {
      const res = await fetch(
        `/api/programs/${programId}/teams/${teamId}/seasons/${seasonId}/roster/add-athlete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            first_name: row.first_name,
            last_name: row.last_name,
            grad_year: row.grad_year ?? null,
            event_group: row.event_group ?? null,
            jersey_number: row.jersey_number ?? null,
            status: row.status || "active",
            scholarship_amount: row.scholarship_amount ?? null,
            scholarship_unit: (row.scholarship_unit as ScholarshipUnit | null) ?? "percent",
            notes: row.notes ?? null,
          }),
        }
      );

      if (!res.ok) {
        if (res.status === 409) {
          let body: any = null;
          try {
            body = await res.json();
          } catch {
            body = null;
          }

          console.warn("[SeasonRosterClient] Duplicate identity detected during import:", row, body);

          setPendingImportCursor(i);
          setPendingImportRow(row);
          setDuplicateQueue((prev) => [...prev, { source: "import", row, response: body }]);

          setImportError(
            "One or more athletes appear to already exist. Resolve duplicates before continuing."
          );

          setIsImporting(false);
          return;
        }

        try {
          const body = await res.json();
          console.error("[SeasonRosterClient] Import row failed:", row, body);
        } catch {
          console.error("[SeasonRosterClient] Import row failed:", row);
        }
        failureCount += 1;
        continue;
      }

      successCount += 1;
    } catch (err) {
      console.error("[SeasonRosterClient] Import row error:", row, err);
      failureCount += 1;
    }
  }

  setIsImporting(false);

  if (failureCount > 0) {
    setImportError(`Imported ${successCount} rows, ${failureCount} failed. Check console for details.`);
  } else {
    setShowImportRoster(false);
    setImportPreviewCount(null);
    setImportRows([]);
    setImportError(null);
  }

  router.refresh();
}

async function executeDuplicateAction(action: DuplicateIdentityAction) {
  if (!action?.url) {
    alert("This resolution action is not yet wired on the server.");
    return;
  }

  try {
    const method = (action.method || "POST").toUpperCase();
    const res = await fetch(action.url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: action.body ? JSON.stringify(action.body) : undefined,
    });

    let body: any = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }

    if (!res.ok) {
      console.error("[SeasonRosterClient] Duplicate resolver action failed", action, body);
      alert(body?.error || body?.message || "Failed to resolve duplicate.");
      return;
    }

    const cursor = pendingImportCursor;
    closeDuplicateModal();
    router.refresh();

    if (cursor != null) {
      void runImportFrom(cursor + 1);
    }
  } catch (err) {
    console.error("[SeasonRosterClient] Duplicate resolver action error", err);
    alert("Unexpected error resolving duplicate – check console for details.");
  }
}

   async function handleConfirmImport() {
      void runImportFrom(0);
    }

  // Per-athlete scholarship edit state
  const [editingScholarshipRosterId, setEditingScholarshipRosterId] =
    useState<string | null>(null);
  const [editingScholarshipName, setEditingScholarshipName] = useState<string | null>(
    null
  );
  const [editingScholarshipAmount, setEditingScholarshipAmount] =
    useState<string>("");
  const [editingScholarshipUnit, setEditingScholarshipUnit] =
    useState<ScholarshipUnit>("percent");
  const [editingScholarshipNotes, setEditingScholarshipNotes] =
    useState<string>("");
  const [savingScholarship, setSavingScholarship] = useState(false);
  const [scholarshipError, setScholarshipError] = useState<string | null>(null);

  // Memoized preview recruit for peek card overlay
  const previewRecruit = useMemo(
    () =>
      recruits.find((r) => r.programRecruitId === previewRecruitId) ?? null,
    [recruits, previewRecruitId]
  );

  async function handleAvatarUpload(entry: RosterEntry, file: File) {
    if (!entry.athleteId) return;

    try {
      setAvatarUploadingId(entry.id);

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/athletes/${entry.athleteId}/avatar`, {
        method: "POST",
        body: formData,
      });

      let body: any = null;
      try {
        body = await res.json();
      } catch {
        // ignore JSON parse errors
      }

      if (!res.ok) {
        console.error(
          "[SeasonRosterClient] Avatar upload failed",
          res.status,
          body
        );
        if (body?.error) {
          alert(`Avatar upload failed: ${body.error}`);
        } else {
          alert(`Avatar upload failed (status ${res.status})`);
        }
        return;
      }

      // Success: refresh to pull new avatarUrl
      router.refresh();
    } catch (err) {
      console.error("[SeasonRosterClient] Error uploading avatar", err);
      alert("Unexpected error uploading avatar – check console for details.");
    } finally {
      setAvatarUploadingId(null);
    }
  }

  // Audit pane state (sorting)
  const [auditSortKey, setAuditSortKey] = useState<AuditSortKey>("equiv");
  const [auditSortDir, setAuditSortDir] = useState<"asc" | "desc">("desc");

  const [activeTool, setActiveTool] = useState<ActiveTool>("none");

  const isToolPanelOpen = activeTool !== "none";

  // Collapsible scholarship sections in the tools panel
  const [showBudgetControls, setShowBudgetControls] = useState(true);
  const [showWhatIf, setShowWhatIf] = useState(true);
  const [showScholarshipAudit, setShowScholarshipAudit] = useState(false);


  // Keep local roster in sync if server sends a new one
  useEffect(() => {
    setRoster(initialRoster);
  }, [initialRoster]);

  // Keep group quotas in sync with server-provided initial values
  useEffect(() => {
    setGroupQuotas(initialGroupQuotas || {});
  }, [initialGroupQuotas]);

  // Group roster entries by event group (fall back to "Unassigned")
  const groupedRoster = useMemo(() => {
    const buckets: Record<string, RosterEntry[]> = {};
    for (const entry of roster) {
      const key = entry.eventGroup || "Unassigned";
      if (!buckets[key]) buckets[key] = [];
      buckets[key].push(entry);
    }
    return Object.entries(buckets).sort(([a], [b]) => a.localeCompare(b));
  }, [roster]);

  // Ensure each group has an expansion state entry
  useEffect(() => {
    setGroupExpanded((prev) => {
      const next = { ...prev };
      for (const [key] of groupedRoster) {
        if (!(key in next)) next[key] = true;
      }
      return next;
    });
  }, [groupedRoster]);

  // Load recruits for "Add from recruits"
  async function loadRecruits() {
    setLoadingRecruits(true);
    setRecruitsError(null);

    try {
      const res = await fetch(`/api/programs/${programId}/recruits`);
      const body = await res.json();

      if (!res.ok) {
        setRecruitsError(body.error || "Failed to load recruits");
        setLoadingRecruits(false);
        return;
      }

      // Now guaranteed: body = { recruits: [...] }
      const raw = (body.recruits ?? []) as any[];

      // Build a set of program_recruit_id values already on this roster
      const alreadyOnRosterByRecruitId = new Set(
        roster
          .map((r) => r.programRecruitId)
          .filter((id): id is string => !!id)
      );

            const mapped: RecruitEntry[] = raw
              .map((r) => ({
                programRecruitId: r.program_recruit_id as string,
                athleteId: (r.athlete_id as string | null) ?? "",
                fullName: (r.full_name as string) ?? "Athlete",
                gradYear: (r.grad_year as number | null) ?? null,
                status: (r.status as string | null) ?? null,
                profileType: (r.profile_type as string | null) ?? null,
                gender: (r.gender as string | null) ?? null,
              }))
              // Require a valid program_recruit_id and filter out someone already on this roster
              .filter(
                (r) =>
                  !!r.programRecruitId &&
                  !alreadyOnRosterByRecruitId.has(r.programRecruitId)
              );

            // Store the full list; gender filtering is handled in the recruits aside toggle.
            setRecruits(mapped);
    } catch (e: any) {
      setRecruitsError(e?.message || "Unexpected error");
    }

    setLoadingRecruits(false);
  }

  useEffect(() => {
    loadRecruits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

    async function handleAddAthleteSubmit() {
    if (!isManager || isLocked) return;

    const firstName = newFirstName.trim();
    const lastName = newLastName.trim();
    const gradYearStr = newGradYear.trim();

    if (!firstName || !lastName) {
      setAddAthleteError("First and last name are required.");
      return;
    }

    // --- Require grad year; must be provided and valid ---
    let gradYear: number | null = null;
    if (!gradYearStr) {
      setAddAthleteError("Grad year is required.");
      return;
    }

    const parsed = Number(gradYearStr);
    if (!Number.isFinite(parsed) || parsed < 1900 || parsed > 2100) {
      setAddAthleteError("Grad year must be a valid year (e.g. 2027). ");
      return;
    }
    gradYear = parsed;

    const scholarshipStr = newScholarshipAmount.trim();
    let scholarshipAmount: number | null = null;
    if (scholarshipStr) {
      const parsed = Number(scholarshipStr);
      if (!Number.isFinite(parsed) || parsed < 0) {
        setAddAthleteError(
          "Scholarship amount must be a non-negative number, or leave blank."
        );
        return;
      }
      scholarshipAmount = parsed;
    }

    setSavingNewAthlete(true);
    setAddAthleteError(null);

    try {
      const res = await fetch(
        `/api/programs/${programId}/teams/${teamId}/seasons/${seasonId}/roster/add-athlete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            first_name: firstName,
            last_name: lastName,
            grad_year: gradYear,
            event_group: newEventGroup.trim() || null,
            jersey_number: newJerseyNumber.trim() || null,
            status: newStatus || "active",
            scholarship_amount: scholarshipAmount,
            scholarship_unit: newScholarshipUnit,
            notes: newNotes.trim() || null,
          }),
        }
      );

      let body: any = null;
      try {
        body = await res.json();
      } catch {
        // ignore parse error on empty body
      }

      if (!res.ok) {
        if (res.status === 409) {
          console.warn("[SeasonRosterClient] Duplicate identity detected on add-athlete", body);

          setAddAthleteError(
            "This athlete may already exist in the system. Review the match candidates to continue."
          );

          setDuplicateQueue([
            {
              source: "manual",
              input: { firstName, lastName, gradYear },
              response: body,
            },
          ]);

          return;
        }

        const msg =
          body?.error ||
          body?.message ||
          "Failed to add athlete to roster – please try again.";
        setAddAthleteError(msg);
        return;
      }

      // Reset + close modal
      setShowAddAthlete(false);
      setNewFirstName("");
      setNewLastName("");
      setNewGradYear("");
      setNewEventGroup("");
      setNewJerseyNumber("");
      setNewStatus("active");
      setNewScholarshipAmount("");
      setNewScholarshipUnit("percent");
      setNewNotes("");
      setAddAthleteError(null);

      // Let the server recompute roster + scholarship summary
      router.refresh();
    } catch (err: any) {
      setAddAthleteError(
        err?.message || "Unexpected error while adding athlete."
      );
    } finally {
      setSavingNewAthlete(false);
    }
  }

  // --- Scholarship focus for edit modal ---
  function handleFocusScholarship(rosterId: string) {
    if (!isManager || isLocked) return;

    const entry = roster.find((r) => r.id === rosterId);
    if (!entry) return;

    setEditingScholarshipRosterId(entry.id);
    setEditingScholarshipName(entry.name);
    setEditingScholarshipAmount(
      entry.scholarshipAmount != null ? String(entry.scholarshipAmount) : ""
    );
    setEditingScholarshipUnit(
      ((entry.scholarshipUnit as ScholarshipUnit | null) ?? "percent")
    );
    setEditingScholarshipNotes(entry.scholarshipNotes ?? "");
    setScholarshipError(null);
  }

  async function handleSaveScholarshipEdit() {
    if (!editingScholarshipRosterId) return;
    if (!isManager || isLocked) return;

    try {
      setSavingScholarship(true);
      setScholarshipError(null);

      const trimmed = editingScholarshipAmount.trim();
      let amount: number | null = null;

      if (trimmed !== "") {
        const parsed = Number(trimmed);
        if (!Number.isFinite(parsed) || parsed < 0) {
          setScholarshipError(
            "Scholarship amount must be a non-negative number."
          );
          setSavingScholarship(false);
          return;
        }
        amount = parsed;
      }

      const payload: Record<string, unknown> = {
        scholarship_unit: editingScholarshipUnit,
        scholarship_notes: editingScholarshipNotes.trim() || null,
      };

      // Explicitly send null when clearing the amount
      payload.scholarship_amount = amount;

      const res = await fetch(
        `/api/programs/${programId}/teams/${teamId}/seasons/${seasonId}/roster/${editingScholarshipRosterId}/scholarship`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      let body: any = null;
      try {
        body = await res.json();
      } catch {
        // ignore JSON parse errors
      }

      if (!res.ok) {
        const msg =
          body?.error ||
          body?.message ||
          "Failed to update scholarship for this athlete.";
        setScholarshipError(msg);
        return;
      }

      // Success: close modal and refresh data
      setEditingScholarshipRosterId(null);
      setEditingScholarshipName(null);
      setEditingScholarshipAmount("");
      setEditingScholarshipNotes("");
      setScholarshipError(null);

      router.refresh();
    } catch (err: any) {
      setScholarshipError(
        err?.message || "Unexpected error updating scholarship."
      );
    } finally {
      setSavingScholarship(false);
    }
  }

  function handleCancelScholarshipEdit() {
    setEditingScholarshipRosterId(null);
    setEditingScholarshipName(null);
    setEditingScholarshipAmount("");
    setEditingScholarshipNotes("");
    setScholarshipError(null);
  }

  // --- Audit pane derived data ---

  const auditRows = useMemo<ScholarshipAuditRow[]>(() => {
    const rows: ScholarshipAuditRow[] = [];

    for (const entry of roster) {
      if (entry.scholarshipAmount == null) continue;

      const unit = (entry.scholarshipUnit ??
        "percent") as ScholarshipUnit;
      const raw = entry.scholarshipAmount;

      let equiv: number | null = null;
      let dollar: number | null = null;

      if (unit === "percent") {
        // 100% = 1.0 equivalency
        equiv = raw / 100;
      } else if (unit === "equivalency") {
        equiv = raw;
      } else if (unit === "amount") {
        dollar = raw;
      }

      rows.push({
        id: entry.id,
        name: entry.name,
        gradYear: entry.gradYear,
        unit,
        rawAmount: raw,
        equiv,
        dollar,
        notes: entry.scholarshipNotes,
      });
    }

    // Sorting
    const sorted = [...rows];
    sorted.sort((a, b) => {
      let av: number | string | null;
      let bv: number | string | null;

      if (auditSortKey === "name") {
        av = a.name.toLowerCase();
        bv = b.name.toLowerCase();
        if (av < bv) return auditSortDir === "asc" ? -1 : 1;
        if (av > bv) return auditSortDir === "asc" ? 1 : -1;
        return 0;
      }

      if (auditSortKey === "equiv") {
        av = a.equiv ?? 0;
        bv = b.equiv ?? 0;
      } else {
        // "amount"
        av = a.dollar ?? 0;
        bv = b.dollar ?? 0;
      }

      if (av < bv) return auditSortDir === "asc" ? -1 : 1;
      if (av > bv) return auditSortDir === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [roster, auditSortKey, auditSortDir]);

  const totalEquiv = useMemo(
    () =>
      auditRows.reduce(
        (sum, row) => (row.equiv != null ? sum + row.equiv : sum),
        0
      ),
    [auditRows]
  );

  const totalDollar = useMemo(
    () =>
      auditRows.reduce(
        (sum, row) => (row.dollar != null ? sum + row.dollar : sum),
        0
      ),
    [auditRows]
  );

  function handleAuditSort(nextKey: AuditSortKey) {
    setAuditSortKey((currentKey) => {
      if (currentKey === nextKey) {
        // toggle direction on same key
        setAuditSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return currentKey;
      } else {
        setAuditSortDir("desc");
        return nextKey;
      }
    });
  }

  // --- Add from recruits ---

  async function handleAddFromRecruit(
    rec: RecruitEntry,
    eventGroup?: string | null
  ) {
    if (!isManager || isLocked) return;

    try {
      const res = await fetch(
        `/api/programs/${programId}/teams/${teamId}/seasons/${seasonId}/roster/add-recruit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            program_recruit_id: rec.programRecruitId,
            status: "active",
            event_group: eventGroup ?? null,
          }),
        }
      );

      const body = await res.json();

      if (!res.ok) {
        alert(body.error || "Failed to add athlete to roster");
        return;
      }

      // Remove from local recruit list
      setRecruits((prev) =>
        prev.filter((r) => r.programRecruitId !== rec.programRecruitId)
      );

      // Let the server recompute roster + scholarship summary
      router.refresh();
    } catch (e: any) {
      alert(e?.message || "Unexpected error");
    }
  }

  async function handleRemoveFromRoster(rosterId: string) {
    if (!isManager || isLocked) return;

    try {
      const res = await fetch(
        `/api/programs/${programId}/teams/${teamId}/seasons/${seasonId}/roster/${rosterId}`,
        {
          method: "DELETE",
        }
      );

      let body: any = null;
      try {
        body = await res.json();
      } catch {
        // ignore JSON parse errors; some DELETE handlers may return no body
      }

      if (!res.ok) {
        const msg = body?.error || body?.message || "Failed to remove athlete";
        alert(msg);
        return;
      }

      setPendingRemovalRosterId(null);
      setPendingRemovalName(null);

      // Let the server recompute roster + scholarship summary + recruits
      router.refresh();
    } catch (e: any) {
      alert(e?.message || "Unexpected error");
    }
  }

  async function persistGroupQuotas(next: Record<string, number | null>) {
    try {
      const res = await fetch(
        `/api/programs/${programId}/teams/${teamId}/seasons/${seasonId}/event-group-quotas`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quotas: next }),
        }
      );

      if (!res.ok) {
        console.error("[SeasonRosterClient] Failed to persist group quotas");
      }
    } catch (err) {
      console.error("[SeasonRosterClient] Error persisting group quotas", err);
    }
  }

  function toggleGroup(key: string) {
    setGroupExpanded((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  function updateQuota(key: string, value: string) {
    const trimmed = value.trim();
    const parsed = trimmed === "" ? null : Number(trimmed);
    if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0)) return;

    setGroupQuotas((prev) => {
      const next = { ...prev, [key]: parsed };
      void persistGroupQuotas(next);
      return next;
    });
  }

  function formatGroupLabel(key: string) {
    if (key === "Unassigned") return "Unassigned / Other";
    return key;
  }

  return (
    <>
      {activeDuplicate && isMissingGradYearModal(activeDuplicate) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-xl rounded-xl border border-slate-800 bg-slate-900 shadow-2xl">
            <div className="border-b border-slate-800 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Import needs attention
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-100">
                Missing required grad year
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Grad year is required for identity + duplicate prevention. Enter a grad year to continue, or skip this row.
              </p>
            </div>

            <div className="px-4 py-3">
              {(() => {
                const row = getMissingGradYearRow(activeDuplicate);
                if (!row) return null;
                return (
                  <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                    <p className="text-sm font-semibold text-slate-100">
                      {row.first_name} {row.last_name}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-slate-400">
                      {row.event_group && (
                        <span className="rounded-full border border-sky-400/40 bg-sky-900/40 px-2 py-0.5 text-sky-100">
                          {row.event_group}
                        </span>
                      )}
                      {row.jersey_number && (
                        <span className="rounded-full border border-slate-500/40 bg-slate-900/60 px-2 py-0.5">
                          Jersey {row.jersey_number}
                        </span>
                      )}
                      {row.status && (
                        <span className="rounded-full border border-slate-500/40 bg-slate-900/60 px-2 py-0.5">
                          {row.status}
                        </span>
                      )}
                      {row.email && (
                        <span className="rounded-full border border-slate-500/40 bg-slate-900/60 px-2 py-0.5">
                          {row.email}
                        </span>
                      )}
                    </div>
                    {row.notes && (
                      <p className="mt-2 text-[11px] text-slate-400">Notes: {row.notes}</p>
                    )}
                  </div>
                );
              })()}

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Grad year
                  </label>
                  <input
                    value={missingGradYearValue}
                    onChange={(e) => setMissingGradYearValue(e.target.value)}
                    placeholder="e.g. 2027"
                    inputMode="numeric"
                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
                  />
                </div>

                <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                  <input
                    id="apply-all-missing-grad"
                    type="checkbox"
                    checked={applyGradYearToAllMissing}
                    onChange={(e) => setApplyGradYearToAllMissing(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <label
                    htmlFor="apply-all-missing-grad"
                    className="text-[11px] text-slate-300"
                  >
                    Apply this grad year to all remaining rows missing grad year
                  </label>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-slate-800 px-4 py-3 md:flex-row md:items-center md:justify-between">
              <button
                type="button"
                onClick={handleResolveMissingGradYearSkip}
                className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-[11px] font-semibold text-slate-200 hover:border-rose-400/60 hover:text-rose-100"
              >
                Skip this row
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    closeDuplicateModal();
                    setImportError("Import paused. Resolve missing grad year to continue.");
                  }}
                  className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-[11px] font-semibold text-slate-200 hover:border-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleResolveMissingGradYearApply}
                  className="rounded-md bg-sky-500 px-3 py-2 text-[11px] font-semibold text-slate-950 hover:bg-sky-400"
                >
                  Apply & continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 md:flex-row md:items-stretch">
      {/* Main content: tools bar + roster + audit */}
      <div className="w-full md:flex-1">
        {/* Header + lock status removed, now handled below */}

        {/* Header + Tools */}
        <div className="mb-3 flex flex-col md:flex-row md:items-center md:justify-between">
          {/* Left side: Title + Lock */}
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold uppercase tracking-wide text-slate-300">
              Season Roster
            </h1>
            {isLocked && (
              <span className="rounded-full border border-rose-500/40 bg-rose-900/40 px-2 py-0.5 text-[10px] text-rose-100">
                Locked
              </span>
            )}
          </div>

                    {/* Right side: tools */}
          <div className="mt-2 flex flex-wrap items-center gap-2 md:mt-0">
            {isManager && !isLocked && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddAthlete(true);
                    setAddAthleteError(null);
                  }}
                  className="rounded-full bg-brand px-3 py-1 text-[11px] font-semibold text-slate-950 hover:bg-brand-soft"
                >
                  Add athlete
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowImportRoster(true);
                    setImportError(null);
                    setImportPreviewCount(null);
                  }}
                  className="rounded-full border border-subtle bg-surface/80 px-3 py-1 text-[11px] font-semibold text-muted hover:border-brand-soft hover:text-foreground"
                >
                  Import roster
                </button>
              </>
            )}

            <span className="text-[10px] uppercase tracking-wide text-slate-500">
              Tools:
            </span>

            <button
              type="button"
              onClick={() =>
                setActiveTool((current) =>
                  current === "recruits" ? "none" : "recruits"
                )
              }
              className={`rounded-full border px-3 py-0.5 text-[11px] transition-colors ${
                activeTool === "recruits"
                  ? "border-sky-400/60 bg-sky-900/60 text-sky-100"
                  : "border-slate-700 bg-slate-900/80 text-slate-300 hover:border-sky-400/60 hover:text-sky-100"
              }`}
            >
              Recruits
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveTool((current) =>
                  current === "budget" ? "none" : "budget"
                )
              }
              className={`rounded-full border px-3 py-0.5 text-[11px] transition-colors ${
                activeTool === "budget"
                  ? "border-amber-400/60 bg-amber-900/60 text-amber-100"
                  : "border-slate-700 bg-slate-900/80 text-slate-300 hover:border-amber-400/60 hover:text-amber-100"
              }`}
            >
              Scholarship tools
            </button>
          </div>
        </div>

        {/* Roster groups */}
        {groupedRoster.length === 0 ? (
          <p className="text-[11px] text-slate-500">
            No athletes on this season&apos;s roster yet.
          </p>
        ) : (
          <div className="space-y-3">
            {groupedRoster.map(([groupKey, athletes]) => {
              const expanded = groupExpanded[groupKey] ?? true;
              const quota = groupQuotas[groupKey] ?? null;
              const filled = athletes.length;
              const emptySlots = quota !== null ? Math.max(quota - filled, 0) : 0;

              return (
                <div
                  key={groupKey}
                  className="rounded-lg border border-slate-800 bg-slate-950/60"
                >
                  {/* Group header */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(groupKey)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-slate-900/80"
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-100">
                        {formatGroupLabel(groupKey)}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {quota !== null
                          ? `${filled} / ${quota} positions filled`
                          : `${filled} athletes`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        inputMode="numeric"
                        className="w-16 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-sky-500"
                        placeholder="Quota"
                        value={quota ?? ""}
                        onChange={(e) => updateQuota(groupKey, e.target.value)}
                      />
                      <span className="text-[14px] text-slate-400">
                        {expanded ? "▾" : "▸"}
                      </span>
                    </div>
                  </button>

                  {/* Group body */}
                  {expanded && (
                    <div
                      className="border-t border-slate-800 px-3 py-2 flex flex-wrap gap-3"
                    >
                      {athletes.map((entry) => {
                        let displayScholarship: string;
                        if (entry.scholarshipAmount == null) {
                          displayScholarship = "None";
                        } else {
                          const unit = (entry.scholarshipUnit ??
                            "percent") as ScholarshipUnit;
                          if (unit === "percent") {
                            displayScholarship = `${entry.scholarshipAmount}%`;
                          } else if (unit === "equivalency") {
                            displayScholarship =
                              entry.scholarshipAmount.toString();
                          } else {
                            displayScholarship = `$${entry.scholarshipAmount.toLocaleString(
                              undefined,
                              { maximumFractionDigits: 0 }
                            )}`;
                          }
                        }

                        return (
                          <div
                            key={entry.id}
                            className="flex w-45 max-w-full flex-col rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2"
                            style={{
                              aspectRatio: "2 / 3.75", // width / height; ~1.875:1 height/width
                            }}
                            draggable={isManager && !isLocked}
                            onDragStart={(e) => {
                              if (!isManager || isLocked) return;
                              try {
                                e.dataTransfer.setData(
                                  "text/plain",
                                  `roster:${entry.id}`
                                );
                                e.dataTransfer.effectAllowed = "move";
                              } catch {
                                // ignore
                              }
                            }}
                            onDragEnd={(e) => {
                              // no-op for now; hook available for future visual feedback
                            }}
                          >
                            {/* Top row: photo + bio/events */}
                            <div className="flex gap-3">
                              <div
                                className="relative overflow-hidden rounded-md bg-slate-800 text-xs font-semibold text-slate-100 cursor-pointer basis-[35%]"
                                style={{
                                  aspectRatio: "2 / 3.75", // same as the card: width / height (~1.875:1 height/width)
                                }}
                                onClick={(e) => {
                                  const input = e.currentTarget.querySelector<HTMLInputElement>(
                                    'input[type="file"]'
                                  );
                                  if (input) input.click();
                                }}
                              >
                                <Avatar
                                  src={entry.avatarUrl || undefined}
                                  name={entry.name}
                                  size="lg"
                                  variant="square"
                                  bordered={false}
                                  className="h-full w-full"
                                />

                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    void handleAvatarUpload(entry, file);
                                  }}
                                />

                                {avatarUploadingId === entry.id && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 text-[10px] text-slate-100">
                                    Uploading…
                                  </div>
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-xs md:text-sm font-medium text-slate-100">
                                    {entry.name}
                                    {entry.gradYear && (
                                      <span className="ml-2 text-[10px] text-slate-400">
                                        • {entry.gradYear}
                                      </span>
                                    )}
                                  </p>
                                </div>
                                <div className="mt-0.5 flex flex-wrap gap-1 text-[9px] md:text-[10px] text-slate-400">
                                  {entry.eventGroup && (
                                    <span className="rounded-full border border-sky-400/40 bg-sky-900/40 px-2 py-0.5 text-sky-100">
                                      {entry.eventGroup}
                                    </span>
                                  )}
                                  {entry.status && (
                                    <span className="rounded-full border border-slate-500/40 bg-slate-900/60 px-2 py-0.5">
                                      {entry.status}
                                    </span>
                                  )}
                                </div>
                                {entry.events && entry.events.length > 0 && (
                                  <p className="mt-0.5 text-[9px] md:text-[10px] text-slate-400">
                                    Events:{" "}
                                    {entry.events
                                      .map((ev) =>
                                        ev.isPrimary
                                          ? `${ev.eventCode} (primary)`
                                          : ev.eventCode
                                      )
                                      .join(", ")}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Scholarship line full width */}
                            <div className="mt-1 border-t border-slate-800 pt-1">
                              <p className="text-[10px] md:text-[11px] text-slate-400">
                                Scholarship:{" "}
                                <span className="font-medium text-slate-100">
                                  {displayScholarship}
                                </span>
                                {entry.scholarshipAmount != null && (
                                  <>
                                    {entry.scholarshipUnit === "amount" &&
                                      " (amount)"}
                                    {entry.scholarshipUnit === "percent" &&
                                      " (percent)"}
                                    {entry.scholarshipUnit === "equivalency" &&
                                      " (equiv)"}
                                  </>
                                )}
                              </p>
                              {isManager && !isLocked && (
                                <button
                                  type="button"
                                  className="mt-0.5 text-[10px] text-sky-300 hover:underline"
                                  onClick={() => handleFocusScholarship(entry.id)}
                                >
                                  Adjust scholarship…
                                </button>
                              )}
                            </div>

                            {/* Coach's notes full width below */}
                            {entry.scholarshipNotes && (
                              <p className="mt-0.5 text-[10px] text-slate-500">
                                {entry.scholarshipNotes}
                              </p>
                            )}
                          </div>
                        );
                      })}
                      {Array.from({ length: emptySlots }).map((_, idx) => {
                        const slotKey = `${groupKey}-${idx}`;
                        const isHover = hoverSlotKey === slotKey;

                        return (
                          <div
                            key={`slot-${groupKey}-${idx}`}
                            className={`flex w-72 max-w-full flex-col items-center justify-center rounded-lg px-3 py-2 text-center transition-colors ${
                              isHover
                                ? "border border-sky-400 bg-sky-900/50"
                                : "border border-dashed border-slate-700 bg-slate-900/40"
                            }`}
                            style={{
                              aspectRatio: "2 / 3.75",
                            }}
                            onDragOver={(e) => {
                              if (!isManager || isLocked) return;
                              // For reliable drop, just prevent default when manager can edit
                              e.preventDefault();
                              e.dataTransfer.dropEffect = "copy";
                            }}
                            onDragEnter={() => {
                              if (!isManager || isLocked) return;
                              setHoverSlotKey(slotKey);
                            }}
                            onDragLeave={() => {
                              if (!isManager || isLocked) return;
                              setHoverSlotKey((current) =>
                                current === slotKey ? null : current
                              );
                            }}
                            onDrop={(e) => {
                              if (!isManager || isLocked) return;
                              try {
                                e.preventDefault();
                                const payload = e.dataTransfer.getData("text/plain");
                                if (!payload.startsWith("recruit:")) return;
                                const recruitId = payload.slice("recruit:".length);
                                const rec = recruits.find(
                                  (r) => r.programRecruitId === recruitId
                                );
                                if (rec) {
                                  void handleAddFromRecruit(rec, groupKey);
                                }
                              } catch {
                                // ignore
                              } finally {
                                setHoverSlotKey((current) =>
                                  current === slotKey ? null : current
                                );
                              }
                            }}
                          >
                            <span className="text-[10px] md:text-[11px] font-medium text-slate-500">
                              Slot available
                            </span>
                            {quota !== null && (
                              <span className="mt-0.5 text-[9px] text-slate-600">
                                Event group position
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Right-hand tools panel: animated, pushes roster when open */}
      <aside
        className={`w-full md:shrink-0 rounded-xl border bg-[radial-gradient(circle_at_top,_#020617,_#020617_40%,_#020617_80%)]/95 transition-all duration-500 ${
          isToolPanelOpen
            ? "md:w-80 border-slate-800 px-4 py-4 opacity-100"
            : "md:w-0 border-transparent px-0 py-0 opacity-0 pointer-events-none"
        }`}
        onDragOver={(e) => {
          if (!isManager || isLocked) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        }}
        onDrop={(e) => {
          if (!isManager || isLocked) return;
          try {
            const payload = e.dataTransfer.getData("text/plain");
            if (!payload.startsWith("roster:")) return;
            e.preventDefault();
            const rosterId = payload.slice("roster:".length);
            const entry = roster.find((r) => r.id === rosterId) || null;
            setPendingRemovalRosterId(rosterId);
            setPendingRemovalName(entry?.name ?? null);
          } catch {
            // ignore
          }
        }}
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Tools panel
          </p>
          <button
            type="button"
            onClick={() => setActiveTool("none")}
            className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-100"
          >
            <span>◀</span>
            <span>Hide tools</span>
          </button>
        </div>

        {activeTool === "recruits" && (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Add from recruits
            </p>
            <div className="mt-3 rounded-md border border-dashed border-slate-700 bg-slate-950/40 px-3 py-2 text-[11px] text-slate-400">
              <p className="font-semibold text-slate-200">
                Drag here to remove from roster
              </p>
              <p className="mt-0.5">
                Drag a roster card onto this panel to remove the athlete from this
                season&apos;s roster. They&apos;ll remain in your recruit pool.
              </p>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              This list shows recruits for this program who are marked as
              signed, enrolled, committed, or walk-ons. Adding them here will
              place them on this season&apos;s roster.
            </p>

            {/* Gender filter (only shown if team has a gender) */}
            {teamGender && (
              <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                <span>Filter:</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRecruitGenderFilter("program")}
                    className={`rounded-full px-2 py-0.5 ${
                      recruitGenderFilter === "program"
                        ? "bg-sky-700 text-sky-100"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {teamGender} only
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecruitGenderFilter("all")}
                    className={`rounded-full px-2 py-0.5 ${
                      recruitGenderFilter === "all"
                        ? "bg-sky-700 text-sky-100"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    All
                  </button>
                </div>
              </div>
            )}

            {recruitsError && (
              <p className="mt-2 text-[11px] text-rose-400">{recruitsError}</p>
            )}

            {loadingRecruits ? (
              <p className="mt-2 text-[11px] text-slate-500">
                Loading recruits…
              </p>
            ) : recruits.length === 0 ? (
              <p className="mt-2 text-[11px] text-slate-500">
                No eligible recruits available to add.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {recruits
                  .filter((rec) => {
                    if (recruitGenderFilter === "all") return true;
                    const teamGenderNorm = normalizeGender(teamGender);
                    if (!teamGenderNorm) return true;
                    const recGenderNorm = normalizeGender(rec.gender);
                    if (!recGenderNorm) return true;
                    return recGenderNorm === teamGenderNorm;
                  })
                  .map((rec) => (
                    <div
                      key={rec.programRecruitId}
                      data-recruit-id={rec.programRecruitId}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                        previewRecruitId === rec.programRecruitId
                          ? "border border-amber-400 bg-slate-950/70"
                          : "border border-slate-800 bg-slate-950/70"
                      }`}
                      draggable={isManager && !isLocked}
                      onDragStart={(e) => {
                        if (!isManager || isLocked) return;
                        try {
                          e.dataTransfer.setData(
                            "text/plain",
                            `recruit:${rec.programRecruitId}`
                          );
                          e.dataTransfer.effectAllowed = "copyMove";
                        } catch {
                          // ignore
                        }
                      }}
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-100">
                          {rec.fullName}
                          {rec.gradYear && (
                            <span className="ml-2 text-[10px] text-slate-400">
                              • {rec.gradYear}
                            </span>
                          )}
                        </p>
                        <div className="mt-0.5 flex flex-wrap gap-1 text-[10px] text-slate-400">
                          {rec.status && (
                            <span className="rounded-full border border-emerald-400/40 bg-emerald-900/40 px-2 py-0.5 text-emerald-100">
                              {rec.status}
                            </span>
                          )}
                          {rec.profileType && (
                            <span className="rounded-full border border-slate-500/40 bg-slate-900/60 px-2 py-0.5">
                              {rec.profileType}
                            </span>
                          )}
                          {rec.gender && (
                            <span className="rounded-full border border-slate-500/40 bg-slate-900/60 px-2 py-0.5">
                              {rec.gender}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            const rowEl = e.currentTarget.closest(
                              "[data-recruit-id]"
                            ) as HTMLElement | null;
                            if (rowEl) {
                              const rect = rowEl.getBoundingClientRect();
                              setPreviewRecruitRect({
                                top: rect.top,
                                left: rect.left,
                              });
                            } else {
                              setPreviewRecruitRect(null);
                            }
                            setPreviewRecruitId(rec.programRecruitId);
                          }}
                          className="rounded-md border border-sky-500 bg-sky-600 px-3 py-1 text-[11px] font-semibold text-slate-950 hover:bg-sky-500"
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  ))}
                {previewRecruit && previewRecruitRect && (
                  <div
                    className="fixed z-30"
                    style={{
                      top: previewRecruitRect.top,
                      left: Math.max(previewRecruitRect.left - 288, 8),
                    }}
                  >
                    <div
                      className="flex w-72 max-w-full flex-col rounded-lg border border-amber-400 bg-slate-900/70 px-3 py-2 shadow-xl"
                      style={{ aspectRatio: "2 / 3.75" }}
                      draggable={isManager && !isLocked}
                      onDragStart={(e) => {
                        if (!isManager || isLocked || !previewRecruit) return;
                        try {
                          e.dataTransfer.setData(
                            "text/plain",
                            `recruit:${previewRecruit.programRecruitId}`
                          );
                          e.dataTransfer.effectAllowed = "copyMove";
                        } catch {
                          // ignore
                        }
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-900">
                          Recruit details
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewRecruitId(null);
                            setPreviewRecruitRect(null);
                          }}
                          className="text-[11px] text-slate-900 hover:text-slate-800"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="mt-2 flex gap-3">
                        <div
                          className="relative overflow-hidden rounded-md bg-slate-800 text-xs font-semibold text-slate-100 basis-[35%]"
                          style={{ aspectRatio: "2 / 3.75" }}
                        >
                          <Avatar
                            src={undefined}
                            name={previewRecruit.fullName}
                            size="lg"
                            variant="square"
                            bordered={false}
                            className="h-full w-full"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs md:text-sm font-medium text-slate-900">
                            {previewRecruit.fullName}
                            {previewRecruit.gradYear && (
                              <span className="ml-2 text-[10px] text-slate-800">
                                • {previewRecruit.gradYear}
                              </span>
                            )}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1 text-[9px] md:text-[10px] text-slate-800">
                            {previewRecruit.status && (
                              <span className="rounded-full border border-emerald-600/60 bg-emerald-200/80 px-2 py-0.5 text-emerald-900">
                                {previewRecruit.status}
                              </span>
                            )}
                            {previewRecruit.profileType && (
                              <span className="rounded-full border border-slate-500/60 bg-slate-200/80 px-2 py-0.5 text-slate-900">
                                {previewRecruit.profileType}
                              </span>
                            )}
                            {previewRecruit.gender && (
                              <span className="rounded-full border border-slate-500/60 bg-slate-200/80 px-2 py-0.5 text-slate-900">
                                {previewRecruit.gender}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-[10px] text-slate-900">
                            Drag this recruit into an open slot in the roster to add them to
                            this season&apos;s team.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {activeTool === "budget" && (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Scholarship budget
            </p>

            {/* Budget summary (always visible) */}
            <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-[11px] text-slate-300">
              {scholarshipSummary.hasBudget ? (
                <>
                  <p className="text-[11px] font-semibold text-slate-200">
                    Equivalencies
                  </p>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-900">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{
                        width:
                          scholarshipSummary.budgetEquiv && scholarshipSummary.usedEquiv
                            ? `${Math.min(
                                100,
                                (scholarshipSummary.usedEquiv /
                                  scholarshipSummary.budgetEquiv) *
                                  100
                              )}%`
                            : "0%",
                      }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Budget:{" "}
                    <span className="font-semibold text-slate-100">
                      {scholarshipSummary.budgetEquiv ?? "—"}
                    </span>{" "}
                    eq • Used:{" "}
                    <span className="font-semibold text-slate-100">
                      {scholarshipSummary.usedEquiv ?? 0}
                    </span>{" "}
                    eq • Remaining:{" "}
                    <span className="font-semibold text-emerald-300">
                      {scholarshipSummary.remainingEquiv ?? 0}
                    </span>{" "}
                    eq
                  </p>

                  <p className="mt-2 text-[11px] font-semibold text-slate-200">
                    Scholarship amount
                  </p>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-900">
                    <div
                      className="h-full rounded-full bg-sky-500"
                      style={{
                        width:
                          scholarshipSummary.budgetAmount &&
                          scholarshipSummary.usedAmount
                            ? `${Math.min(
                                100,
                                (scholarshipSummary.usedAmount /
                                  scholarshipSummary.budgetAmount) *
                                  100
                              )}%`
                            : "0%",
                      }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Budget:{" "}
                    <span className="font-semibold text-slate-100">
                      {formatCurrency(scholarshipSummary.budgetAmount)}
                    </span>{" "}
                    • Used:{" "}
                    <span className="font-semibold text-slate-100">
                      {formatCurrency(scholarshipSummary.usedAmount)}
                    </span>{" "}
                    • Remaining:{" "}
                    <span className="font-semibold text-emerald-300">
                      {formatCurrency(scholarshipSummary.remainingAmount)}
                    </span>
                  </p>
                </>
              ) : (
                <p className="text-[11px] text-slate-400">
                  No scholarship budget set for this season yet.
                </p>
              )}
            </div>

            {/* Budget controls */}
            <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/70">
              <button
                type="button"
                onClick={() => setShowBudgetControls((prev) => !prev)}
                className="flex w-full items-center justify-between px-3 py-2 text-[11px] text-slate-300 hover:bg-slate-900/80"
              >
                <span className="font-semibold">Budget controls</span>
                <span className="text-[14px] text-slate-500">
                  {showBudgetControls ? "▾" : "▸"}
                </span>
              </button>
              {showBudgetControls && (
                <div className="border-t border-slate-800 px-3 py-2">
                  <SeasonBudgetControls
                    programId={programId}
                    teamId={teamId}
                    seasonId={seasonId}
                    currency={budgetCurrency}
                    initialEquiv={initialBudgetEquiv}
                    initialAmount={initialBudgetAmount}
                    initialIsLocked={initialSeasonLocked}
                  />
                </div>
              )}
            </div>

            {/* What-if calculator */}
            <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/70">
              <button
                type="button"
                onClick={() => setShowWhatIf((prev) => !prev)}
                className="flex w-full items-center justify-between px-3 py-2 text-[11px] text-slate-300 hover:bg-slate-900/80"
              >
                <span className="font-semibold">What-if calculator</span>
                <span className="text-[14px] text-slate-500">
                  {showWhatIf ? "▾" : "▸"}
                </span>
              </button>
              {showWhatIf && (
                <div className="border-t border-slate-800 px-3 py-2">
                  <ScholarshipWhatIf
                    budgetEquiv={scholarshipSummary.budgetEquiv ?? null}
                    usedEquiv={scholarshipSummary.usedEquiv ?? null}
                    budgetAmount={scholarshipSummary.budgetAmount ?? null}
                    usedAmount={scholarshipSummary.usedAmount ?? null}
                    currency={budgetCurrency}
                  />
                </div>
              )}
            </div>

            {/* Scholarship audit */}
            <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/70">
              <button
                type="button"
                onClick={() => setShowScholarshipAudit((prev) => !prev)}
                className="flex w-full items-center justify-between px-3 py-2 text-[11px] text-slate-300 hover:bg-slate-900/80"
              >
                <span className="font-semibold">Scholarship audit</span>
                <span className="text-[14px] text-slate-500">
                  {showScholarshipAudit ? "▾" : "▸"}
                </span>
              </button>
              {showScholarshipAudit && (
                <div className="border-t border-slate-800 px-3 py-2 max-h-64 overflow-y-auto">
                  <div className="mb-2 flex items-center justify-between text-[10px] text-slate-400">
                    <span>
                      Total equiv:{" "}
                      <span className="font-semibold text-slate-100">
                        {totalEquiv.toFixed(2)}
                      </span>
                    </span>
                    <span>
                      Total amount:{" "}
                      <span className="font-semibold text-slate-100">
                        {formatCurrency(totalDollar)}
                      </span>
                    </span>
                  </div>
                  <table className="w-full border-collapse text-[10px] text-slate-300">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="pb-1 text-left">
                          <button
                            type="button"
                            onClick={() => handleAuditSort("name")}
                            className="hover:text-slate-100"
                          >
                            Name
                          </button>
                        </th>
                        <th className="pb-1 text-right">
                          <button
                            type="button"
                            onClick={() => handleAuditSort("equiv")}
                            className="hover:text-slate-100"
                          >
                            Equiv
                          </button>
                        </th>
                        <th className="pb-1 text-right">
                          <button
                            type="button"
                            onClick={() => handleAuditSort("amount")}
                            className="hover:text-slate-100"
                          >
                            Amount
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditRows.map((row) => (
                        <tr key={row.id} className="border-b border-slate-900">
                          <td className="py-1 pr-2">
                            <div className="flex flex-col">
                              <span className="text-slate-100">{row.name}</span>
                              {row.gradYear && (
                                <span className="text-[9px] text-slate-500">
                                  {row.gradYear}
                                </span>
                              )}
                              {row.notes && (
                                <span className="mt-0.5 text-[9px] text-slate-500">
                                  {row.notes}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-1 text-right align-top">
                            {row.equiv != null ? row.equiv.toFixed(2) : "—"}
                          </td>
                          <td className="py-1 text-right align-top">
                            {row.dollar != null
                              ? formatCurrency(row.dollar)
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Budget history */}
            {budgetHistory.length > 0 && (
              <div className="mt-3 max-h-40 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-[11px] text-slate-300 overflow-y-auto">
                <p className="mb-1 text-[11px] font-semibold text-slate-200">
                  Budget changes
                </p>
                <ul className="space-y-1">
                  {budgetHistory.map((row) => (
                    <li
                      key={row.id}
                      className="border-t border-slate-800 pt-1 first:border-t-0"
                    >
                      <p className="text-[10px] text-slate-400">
                        {new Date(row.timestamp).toLocaleString()} •{" "}
                        <span className="font-semibold text-slate-200">
                          {row.coach}
                        </span>
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Equiv: {row.oldEquiv ?? "—"} →{" "}
                        <span className="font-semibold text-slate-100">
                          {row.newEquiv ?? "—"}
                        </span>{" "}
                        • Amount: {formatCurrency(row.oldAmount)} →{" "}
                        <span className="font-semibold text-slate-100">
                          {formatCurrency(row.newAmount)}
                        </span>
                      </p>
                      {row.notes && (
                        <p className="text-[10px] text-slate-500">{row.notes}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </aside>
      
       
      {activeDuplicate && !isMissingGradYearModal(activeDuplicate) && (
      // generic duplicate modal
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-3xl rounded-xl border border-slate-700 bg-slate-950 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-4 py-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Potential duplicate detected
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-100">
                  Review matches before continuing
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  We detected an existing athlete with similar identity details. Choose an action to prevent duplicate identities.
                </p>
              </div>
              <button
                type="button"
                onClick={closeDuplicateModal}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] font-semibold text-slate-200 hover:border-slate-500"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 px-4 py-4 md:grid-cols-2">
              <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Incoming athlete
                </p>

                {activeDuplicate.source === "import" ? (
                  <div className="mt-2 text-[12px] text-slate-200">
                    <p className="font-semibold">
                      {activeDuplicate.row.first_name} {activeDuplicate.row.last_name}
                      {activeDuplicate.row.grad_year ? (
                        <span className="ml-2 text-[11px] text-slate-500">• {activeDuplicate.row.grad_year}</span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">Source: CSV import</p>
                  </div>
                ) : (
                  <div className="mt-2 text-[12px] text-slate-200">
                    <p className="font-semibold">
                      {activeDuplicate.input.firstName} {activeDuplicate.input.lastName}
                      {activeDuplicate.input.gradYear ? (
                        <span className="ml-2 text-[11px] text-slate-500">• {activeDuplicate.input.gradYear}</span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">Source: manual add</p>
                  </div>
                )}

                <div className="mt-3 rounded-md border border-slate-800 bg-slate-900/40 p-2">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">Identity mode</p>
                  <p className="mt-1 text-[11px] text-slate-200">
                    {(activeDuplicate.response?.identity?.mode as string) || "unknown"}
                  </p>
                  {activeDuplicate.response?.identity?.key ? (
                    <p className="mt-1 break-all text-[10px] text-slate-500">
                      Key: {activeDuplicate.response.identity.key}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Match candidates
                </p>

                {!activeDuplicate.response?.candidates?.length ? (
                  <p className="mt-2 text-[11px] text-slate-500">
                    No candidate details were provided by the server.
                  </p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {activeDuplicate.response.candidates.map((c, idx) => (
                      <div
                        key={`${idx}-${c?.athlete_id ?? "candidate"}`}
                        className="rounded-lg border border-slate-800 bg-slate-900/40 p-2"
                      >
                        <p className="text-[12px] font-semibold text-slate-100">
                          {(c?.first_name || "?") + " " + (c?.last_name || "?")}
                          {c?.grad_year ? (
                            <span className="ml-2 text-[11px] text-slate-500">• {c.grad_year}</span>
                          ) : null}
                        </p>
                        <p className="mt-0.5 text-[10px] text-slate-500">
                          Athlete ID: {c?.athlete_id ?? "—"}
                        </p>
                        {c?.reason ? (
                          <p className="mt-1 text-[10px] text-slate-400">Match: {c.reason}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="mt-3 flex flex-wrap gap-2">
                  {(activeDuplicate.response?.resolver?.actions?.length
                    ? activeDuplicate.response.resolver.actions
                    : [{ id: "close", label: "Close" }]
                  ).map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => {
                        if (action.id === "close") {
                          closeDuplicateModal();
                          return;
                        }
                        void executeDuplicateAction(action);
                      }}
                      className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] font-semibold text-slate-200 hover:border-slate-500"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>

                {activeDuplicate.response?.message ? (
                  <p className="mt-2 text-[10px] text-slate-500">{activeDuplicate.response.message}</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

        {showAddAthlete && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70">
          <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100">
            <p className="text-sm font-semibold">Add athlete to roster</p>
            <p className="mt-1 text-[11px] text-slate-300">
              This creates a program athlete and places them directly on this
              season&apos;s roster. No user account is required.
            </p>

            <div className="mt-3 grid grid-cols-1 gap-2 text-[11px] md:grid-cols-2">
              <div className="md:col-span-1">
                <label className="mb-1 block text-slate-400">
                  First name<span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={newFirstName}
                  onChange={(e) => setNewFirstName(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-sky-500"
                />
              </div>
              <div className="md:col-span-1">
                <label className="mb-1 block text-slate-400">
                  Last name<span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={newLastName}
                  onChange={(e) => setNewLastName(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-slate-400">Grad year</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={newGradYear}
                  onChange={(e) => setNewGradYear(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-sky-500"
                  placeholder="e.g. 2027"
                />
              </div>

              <div>
                <label className="mb-1 block text-slate-400">Event group</label>
                <input
                  type="text"
                  value={newEventGroup}
                  onChange={(e) => setNewEventGroup(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-sky-500"
                  placeholder="e.g. Distance, Sprints"
                />
              </div>

              <div>
                <label className="mb-1 block text-slate-400">
                  Jersey number
                </label>
                <input
                  type="text"
                  value={newJerseyNumber}
                  onChange={(e) => setNewJerseyNumber(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-sky-500"
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="mb-1 block text-slate-400">Roster status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-sky-500"
                >
                  <option value="active">Active</option>
                  <option value="redshirt">Redshirt</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-slate-400">
                  Scholarship amount
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={newScholarshipAmount}
                  onChange={(e) => setNewScholarshipAmount(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-sky-500"
                  placeholder="Leave blank for none"
                />
                <p className="mt-0.5 text-[10px] text-slate-500">
                  Interpreted based on unit below.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-slate-400">Unit</label>
                <select
                  value={newScholarshipUnit}
                  onChange={(e) =>
                    setNewScholarshipUnit(e.target.value as ScholarshipUnit)
                  }
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-sky-500"
                >
                  <option value="percent">Percent of full</option>
                  <option value="equivalency">Equivalency</option>
                  <option value="amount">Dollar amount</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-slate-400">Notes</label>
                <textarea
                  rows={3}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full resize-none rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-sky-500"
                  placeholder="Optional coach notes about this athlete or award."
                />
              </div>
            </div>

            {addAthleteError && (
              <p className="mt-2 text-[10px] text-rose-400">{addAthleteError}</p>
            )}

            <div className="mt-3 flex justify-end gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => {
                  if (savingNewAthlete) return;
                  setShowAddAthlete(false);
                  setAddAthleteError(null);
                }}
                className="rounded-md border border-slate-600 px-3 py-1 text-slate-200 hover:bg-slate-800"
                disabled={savingNewAthlete}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddAthleteSubmit}
                disabled={savingNewAthlete || isLocked || !isManager}
                className="rounded-md bg-emerald-600 px-3 py-1 font-semibold text-slate-950 hover:bg-emerald-500 disabled:opacity-60"
              >
                {savingNewAthlete ? "Adding…" : "Add to roster"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showImportRoster && (
              <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70">
                <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100">
                  <p className="text-sm font-semibold">Import roster from CSV</p>
                  <p className="mt-1 text-[11px] text-slate-300">
                    Upload a CSV export of your roster. We&apos;ll parse it into a normalized
                    format and (for now) log the rows to the console so we can finalize
                    mapping before writing to the database.
                  </p>

                  <div className="mt-3 space-y-2 text-[11px]">
                    <div>
                      <label className="mb-1 block text-slate-400">
                        CSV file
                      </label>
                      <input
                        type="file"
                        accept=".csv,text/csv"
                        onChange={handleImportFileChange}
                        className="block w-full text-[11px] text-slate-200 file:mr-2 file:rounded-md file:border-0 file:bg-slate-800 file:px-2 file:py-1 file:text-[11px] file:font-semibold file:text-slate-100 hover:file:bg-slate-700"
                      />
                      <p className="mt-1 text-[10px] text-slate-500">
                        Expected columns can include: first_name, last_name, grad_year,
                        event_group, jersey_number, status, scholarship_amount,
                        scholarship_unit, notes, email. We&apos;ll make reasonable guesses
                        for similar names.
                      </p>
                    </div>

                    {isParsingImport && (
                      <p className="text-[11px] text-slate-400">
                        Parsing file…
                      </p>
                    )}

                    {importPreviewCount != null && !isParsingImport && (
                      <p className="text-[11px] text-emerald-300">
                        Parsed <span className="font-semibold">{importPreviewCount}</span>{" "}
                        rows. Check the browser console for the normalized output.
                      </p>
                    )}

                    {importError && (
                      <p className="text-[10px] text-rose-400">
                        {importError}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 flex justify-end gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        if (isParsingImport || isImporting) return;
                        setShowImportRoster(false);
                        setImportError(null);
                        setImportPreviewCount(null);
                        setImportRows([]);
                      }}
                      className="rounded-md border border-slate-600 px-3 py-1 text-slate-200 hover:bg-slate-800"
                      disabled={isParsingImport}
                    >
                      Close
                    </button>
                    {/* Future: when we wire the API, this becomes "Import to roster" */}
                    <button
                      type="button"
                      onClick={handleConfirmImport}
                      disabled={
                        isParsingImport || isImporting || !importPreviewCount || importPreviewCount === 0
                      }
                      className="rounded-md bg-emerald-600 px-3 py-1 font-semibold text-slate-950 hover:bg-emerald-500 disabled:opacity-60"
                    >
                      {isImporting ? "Importing…" : "Import to roster"}
                    </button>
                  </div>
                </div>
              </div>
            )}
       
      {editingScholarshipRosterId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70">
          <div className="w-full max-w-sm rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100">
            <p className="text-sm font-semibold">
              Adjust scholarship
              {editingScholarshipName && (
                <span className="mt-0.5 block text-[11px] font-normal text-slate-300">
                  {editingScholarshipName}
                </span>
              )}
            </p>

            <div className="mt-2 space-y-2 text-[11px]">
              <div>
                <label className="mb-1 block text-slate-400">
                  Amount
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-sky-500"
                  placeholder="Leave blank for no scholarship"
                  value={editingScholarshipAmount}
                  onChange={(e) => setEditingScholarshipAmount(e.target.value)}
                />
                <p className="mt-0.5 text-[10px] text-slate-500">
                  Interpreted based on unit: percent (e.g. 50), equivalency count (e.g. 0.5),
                  or dollar amount.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-slate-400">Unit</label>
                <select
                  value={editingScholarshipUnit}
                  onChange={(e) =>
                    setEditingScholarshipUnit(e.target.value as ScholarshipUnit)
                  }
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-sky-500"
                >
                  <option value="percent">Percent of full</option>
                  <option value="equivalency">Equivalency</option>
                  <option value="amount">Dollar amount</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-slate-400">Notes</label>
                <textarea
                  rows={3}
                  className="w-full resize-none rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-sky-500"
                  placeholder="Optional notes about this athlete's award (multi-year, conditions, etc.)"
                  value={editingScholarshipNotes}
                  onChange={(e) => setEditingScholarshipNotes(e.target.value)}
                />
              </div>

              {scholarshipError && (
                <p className="mt-1 text-[10px] text-rose-400">
                  {scholarshipError}
                </p>
              )}
            </div>

            <div className="mt-3 flex justify-end gap-2 text-[11px]">
              <button
                type="button"
                onClick={handleCancelScholarshipEdit}
                className="rounded-md border border-slate-600 px-3 py-1 text-slate-200 hover:bg-slate-800"
                disabled={savingScholarship}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveScholarshipEdit}
                disabled={savingScholarship || isLocked || !isManager}
                className="rounded-md bg-emerald-600 px-3 py-1 font-semibold text-slate-950 hover:bg-emerald-500 disabled:opacity-60"
              >
                {savingScholarship ? "Saving…" : "Save scholarship"}
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingRemovalRosterId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70">
          <div className="w-full max-w-sm rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100">
            <p className="text-sm font-semibold">Remove from roster?</p>
            <p className="mt-1 text-[11px] text-slate-300">
              {pendingRemovalName
                ? `This will remove ${pendingRemovalName} from this season's roster and return them to the recruiting pool.`
                : "This will remove the selected athlete from this season's roster and return them to the recruiting pool."}
            </p>
            <p className="mt-1 text-[10px] text-amber-300">
              This action cannot be undone from this page.
            </p>
            <div className="mt-3 flex justify-end gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => {
                  setPendingRemovalRosterId(null);
                  setPendingRemovalName(null);
                }}
                className="rounded-md border border-slate-600 px-3 py-1 text-slate-200 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (pendingRemovalRosterId) {
                    void handleRemoveFromRoster(pendingRemovalRosterId);
                  }
                }}
                className="rounded-md bg-rose-600 px-3 py-1 font-semibold text-slate-950 hover:bg-rose-500"
              >
                Remove from roster
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
      
    </>
  );
}