"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  CalendarDays,
  Camera,
  Check,
  ChevronDown,
  ClipboardList,
  Clock3,
  MapPin,
  Plus,
  Search,
  Sparkles,
  UserRound,
  X,
  LoaderCircle,
  Bell,
} from "lucide-react";
import { SwoopButton, SwoopCard } from "./ui";
import { CustomChecklistEditor } from "./property-form";
import type { Cleaner, Property, Task, Turnover } from "@/lib/model";
import {
  localParts,
  scheduleInstant,
  snapshotTasks,
  todayInZone,
  zoneFor,
} from "@/lib/scheduling";
import "./create-turnover-form.css";
const demoCleaners: Cleaner[] = [
  { id: "demo-jamie", name: "Jamie Taylor", sample: true },
  { id: "demo-alex", name: "Alex Morgan", sample: true },
];
function Panel({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) ref.current?.showModal();
    else ref.current?.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="property-dialog turnover-panel"
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <button
        type="button"
        className="dialog-close"
        aria-label={"Close " + title}
        onClick={onClose}
      >
        <X />
      </button>
      <h2>{title}</h2>
      {children}
    </dialog>
  );
}
export function PropertySelector({
  properties,
  selected,
  onChange,
}: {
  properties: Property[];
  selected: Property;
  onChange: (p: Property) => void;
}) {
  const [open, setOpen] = useState(false),
    [search, setSearch] = useState("");
  return (
    <>
      <SwoopCard className="turnover-property-card">
        <img
          src={selected.image || "/images/living.jpg"}
          alt={"Property illustration: " + selected.name}
        />
        <div>
          <h2>{selected.name}</h2>
          <p>
            <MapPin size={14} />
            {selected.address}
          </p>
          {selected.sample && <small>Sample property</small>}
        </div>
        <button type="button" onClick={() => setOpen(true)}>
          Change <ArrowRight size={16} />
        </button>
      </SwoopCard>
      <Panel open={open} title="Choose property" onClose={() => setOpen(false)}>
        {properties.length > 1 && (
          <label className="selector-search">
            <Search size={17} />
            <span className="visually-hidden">Search properties</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search properties"
            />
          </label>
        )}
        <div className="selection-list">
          {properties
            .filter((p) =>
              (p.name + " " + p.address)
                .toLowerCase()
                .includes(search.toLowerCase()),
            )
            .map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={p.id === selected.id}
                onClick={() => {
                  onChange(p);
                  setOpen(false);
                }}
              >
                <img src={p.image || "/images/living.jpg"} alt="" />
                <span>
                  <strong>{p.name}</strong>
                  <small>
                    {p.address}
                    {p.sample ? " · Sample" : ""}
                  </small>
                </span>
                {p.id === selected.id ? <Check /> : <ArrowRight size={18} />}
              </button>
            ))}
          {!properties.some((p) =>
            (p.name + " " + p.address)
              .toLowerCase()
              .includes(search.toLowerCase()),
          ) && <p className="muted">No properties match your search.</p>}
        </div>
      </Panel>
    </>
  );
}
export function DatePicker({
  value,
  onChange,
  min,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  min: string;
  error?: string;
}) {
  return (
    <div className="schedule-field">
      <label htmlFor="turnover-date">
        <CalendarDays />
        Date
      </label>
      <input
        id="turnover-date"
        type="date"
        value={value}
        min={min}
        max="2100-12-31"
        required
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={error ? "turnover-date-error" : undefined}
      />
      {error && (
        <p className="field-error" id="turnover-date-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
export function TimePicker({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const display = /^\d{2}:\d{2}$/.test(value)
    ? new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "UTC",
      }).format(new Date("2000-01-01T" + value + ":00Z"))
    : "Choose local time";
  return (
    <div className="schedule-field">
      <label htmlFor="turnover-time">
        <Clock3 />
        Time
      </label>
      <input
        id="turnover-time"
        type="time"
        value={value}
        required
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={error ? "turnover-time-error" : "time-display"}
      />
      <small id="time-display">{display}</small>
      {error && (
        <p className="field-error" id="turnover-time-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
export function CleanerSelector({
  cleaners,
  value,
  onChange,
}: {
  cleaners: Cleaner[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = cleaners.find((c) => c.id === value);
  return (
    <>
      <button
        className="assign-cleaner swoop-card"
        type="button"
        onClick={() => setOpen(true)}
      >
        <span className="turnover-icon">
          <UserRound />
        </span>
        <span>
          <strong>Assign Cleaner</strong>
          <small>
            {current
              ? current.name +
                (current.sample ? " · Demo cleaner" : " · Local cleaner")
              : "Unassigned · choose a cleaner"}
          </small>
        </span>
        {current?.avatar ? (
          <img src={current.avatar} alt="" />
        ) : (
          current && (
            <span className="cleaner-initials">
              {current.name
                .split(" ")
                .map((s) => s[0])
                .slice(0, 2)
                .join("")}
            </span>
          )
        )}
        <ArrowRight size={20} />
      </button>
      <Panel open={open} title="Assign cleaner" onClose={() => setOpen(false)}>
        <p className="local-caption">
          Local assignment only. No acceptance, availability or notification
          delivery is recorded.
        </p>
        <div className="selection-list">
          {[{ id: "", name: "Unassigned" }, ...cleaners].map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={c.id === value}
              onClick={() => {
                onChange(c.id);
                setOpen(false);
              }}
            >
              <span className="cleaner-initials">
                <UserRound size={20} />
              </span>
              <span>
                <strong>{c.name}</strong>
                <small>
                  {"sample" in c && c.sample
                    ? "Demonstration cleaner · not a real assignment"
                    : c.id
                      ? "Local cleaner record"
                      : "No cleaner assigned"}
                </small>
              </span>
              {c.id === value && <Check />}
            </button>
          ))}
        </div>
      </Panel>
    </>
  );
}
export function ChecklistSelector({
  properties,
  property,
  tasks,
  sourceId,
  onSelect,
}: {
  properties: Property[];
  property: Property;
  tasks: Task[];
  sourceId: string;
  onSelect: (p: Property) => void;
}) {
  const [open, setOpen] = useState(false);
  const source = properties.find((p) => p.id === sourceId);
  return (
    <>
      <button
        type="button"
        className={
          "turnover-checklist-choice " +
          (sourceId === property.id ? "is-selected" : "")
        }
        aria-pressed={sourceId === property.id}
        onClick={() => onSelect(property)}
      >
        <ClipboardList />
        <span>
          <strong>Default Turnover Checklist</strong>
          <small>
            {sourceId === property.id ? tasks.length : property.tasks.length}{" "}
            tasks · property default
          </small>
        </span>
        {sourceId === property.id && <Check />}
      </button>
      <button
        type="button"
        className={
          "turnover-checklist-choice " +
          (sourceId !== property.id ? "is-selected" : "")
        }
        onClick={() => setOpen(true)}
      >
        <ClipboardList />
        <span>
          Choose Another Checklist
          {sourceId !== property.id && (
            <small>
              {source?.name} · {tasks.length} assigned tasks
            </small>
          )}
        </span>
        <ArrowRight size={18} />
      </button>
      <Panel
        open={open}
        title="Choose checklist"
        onClose={() => setOpen(false)}
      >
        <p className="local-caption">
          Copy a saved property's checklist. Completed checkmarks and photos are
          never copied.
        </p>
        <div className="selection-list">
          {properties
            .filter((p) => p.tasks.length)
            .map((p) => (
              <button
                type="button"
                key={p.id}
                aria-pressed={p.id === sourceId}
                onClick={() => {
                  onSelect(p);
                  setOpen(false);
                }}
              >
                <ClipboardList />
                <span>
                  <strong>{p.name}</strong>
                  <small>
                    {p.tasks.length} tasks ·{" "}
                    {p.id === property.id
                      ? "Property default"
                      : p.cleaningSetup?.mode === "custom"
                        ? "Saved custom checklist"
                        : "Saved property checklist"}
                  </small>
                </span>
                {p.id === sourceId && <Check />}
              </button>
            ))}
        </div>
      </Panel>
    </>
  );
}
export function SwoopToggle({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="swoop-toggle">
      <div>
        <strong>{label}</strong>
        <p>{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-label={label}
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
      >
        <span />
      </button>
    </div>
  );
}
export function SpecialInstructionsField({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <SwoopCard className="special-instructions">
      <label htmlFor="turnover-instructions">
        <Sparkles size={20} />
        Special Instructions
      </label>
      <textarea
        id="turnover-instructions"
        placeholder="Add any special cleaning instructions..."
        rows={4}
        maxLength={2000}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={error ? "instructions-error" : undefined}
      />
      <small>{value.length} / 2,000</small>
      {error && (
        <p id="instructions-error" className="field-error" role="alert">
          {error}
        </p>
      )}
    </SwoopCard>
  );
}
export function DurationSelector({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const n = Number(value);
  return (
    <div className="duration-selector swoop-card">
      <Clock3 />
      <label htmlFor="turnover-duration">
        Estimated time
        <small>
          {value && n > 0
            ? `${Math.floor(n / 60) ? Math.floor(n / 60) + "h " : ""}${n % 60 ? (n % 60) + "m" : ""}`
            : "Set estimated cleaning time"}
        </small>
      </label>
      <input
        type="number"
        id="turnover-duration"
        min="1"
        max="1440"
        step="1"
        inputMode="numeric"
        placeholder="Minutes"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={error ? "duration-error" : undefined}
      />
      {error && (
        <p id="duration-error" className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
export function CreateTurnoverForm({
  properties,
  cleaners,
  initialPropertyId,
  onSave,
  onDirtyChange,
  onAddProperty,
}: {
  properties: Property[];
  cleaners?: Cleaner[];
  initialPropertyId?: string;
  onSave: (turnover: Turnover) => Promise<void>;
  onDirtyChange: (dirty: boolean) => void;
  onAddProperty: () => void;
}) {
  const initial =
    properties.find((p) => p.id === initialPropertyId) || properties[0];
  const [propertyId, setPropertyId] = useState(initial?.id || "");
  const property = properties.find((p) => p.id === propertyId) || initial;
  const zone = zoneFor(property);
  const [date, setDate] = useState(() => todayInZone(zone.timeZone)),
    [time, setTime] = useState(""),
    [cleanerId, setCleanerId] = useState(""),
    [sourceId, setSourceId] = useState(initial?.id || "");
  const clean = (tasks: Task[]) =>
    tasks.map((t) => ({
      id: t.id,
      label: t.label,
      done: false,
      requiresPhoto: !!t.requiresPhoto,
    }));
  const [tasks, setTasks] = useState<Task[]>(() => clean(initial?.tasks || [])),
    [editing, setEditing] = useState(false),
    [requirePhotos, setRequirePhotos] = useState(true),
    [notify, setNotify] = useState(false),
    [instructions, setInstructions] = useState(""),
    [duration, setDuration] = useState(
      initial?.estimatedDurationMinutes?.toString() || "",
    );
  const [errors, setErrors] = useState<Record<string, string>>({}),
    [saving, setSaving] = useState(false),
    [pendingChange, setPendingChange] = useState<{
      kind: "property" | "checklist";
      property: Property;
    } | null>(null);
  const locked = useRef(false),
    form = useRef<HTMLFormElement>(null);
  const cleanerList = cleaners?.length ? cleaners : demoCleaners;
  const modified =
    JSON.stringify(tasks) !==
    JSON.stringify(
      clean(properties.find((p) => p.id === sourceId)?.tasks || []),
    );
  const extraRequired =
    property?.tasks.filter(
      (t) =>
        t.requiresPhoto &&
        !tasks.some(
          (task) =>
            task.label.trim().toLowerCase() === t.label.trim().toLowerCase(),
        ),
    ) || [];
  const displayedTasks = [...tasks, ...extraRequired];
  const dirty =
    propertyId !== (initial?.id || "") ||
    time !== "" ||
    date !== todayInZone(zoneFor(initial).timeZone) ||
    cleanerId !== "" ||
    sourceId !== (initial?.id || "") ||
    modified ||
    !requirePhotos ||
    notify ||
    instructions !== "" ||
    duration !== (initial?.estimatedDurationMinutes?.toString() || "");
  useEffect(() => {
    onDirtyChange(dirty);
    return () => onDirtyChange(false);
  }, [dirty, onDirtyChange]);
  useEffect(() => {
    const unload = (e: BeforeUnloadEvent) => {
      if (dirty && !locked.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", unload);
    return () => window.removeEventListener("beforeunload", unload);
  }, [dirty]);
  function applyChange(kind: "property" | "checklist", p: Property) {
    if (kind === "property") {
      setPropertyId(p.id);
      setDuration(p.estimatedDurationMinutes?.toString() || "");
    }
    setSourceId(p.id);
    setTasks(clean(p.tasks));
    setEditing(false);
    setErrors({});
    setPendingChange(null);
  }
  function requestChange(kind: "property" | "checklist", p: Property) {
    if (
      (kind === "property" && p.id === propertyId) ||
      (kind === "checklist" && p.id === sourceId && !modified)
    )
      return;
    if (modified || (kind === "property" && sourceId !== propertyId)) {
      setPendingChange({ kind, property: p });
      return;
    }
    applyChange(kind, p);
  }
  function clearError(...names: string[]) {
    setErrors((previous) => {
      const next = { ...previous };
      for (const name of [...names, "save"]) delete next[name];
      return next;
    });
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (locked.current) return;
    const err: Record<string, string> = {};
    if (!property) err.property = "Choose a property before scheduling.";
    if (!date || date < todayInZone(zone.timeZone))
      err.date =
        "Choose today or a later date. Past scheduling is not supported.";
    if (!time) err.time = "Choose a local cleaning time.";
    const instant = scheduleInstant(date, time, zone.timeZone);
    if (instant.error && date && time) err.time = instant.error;
    if (instant.iso && new Date(instant.iso).getTime() <= Date.now())
      err.time = "This date and time are in the past. Choose a future time.";
    if (!tasks.length || tasks.some((t) => !t.label.trim()))
      err.checklist = "Include at least one task and give every task a name.";
    if (instructions.length > 2000)
      err.instructions = "Keep special instructions within 2,000 characters.";
    if (
      duration &&
      (!Number.isInteger(Number(duration)) ||
        Number(duration) < 1 ||
        Number(duration) > 1440)
    )
      err.duration = "Use a whole number of minutes from 1 to 1,440.";
    if (cleanerId && !cleanerList.some((c) => c.id === cleanerId))
      err.cleaner = "Choose a listed local cleaner or Unassigned.";
    setErrors(err);
    if (Object.keys(err).length) {
      requestAnimationFrame(() => {
        const field = form.current?.querySelector<HTMLElement>(
          '[aria-invalid="true"], [role="alert"]',
        );
        field?.focus();
        field?.scrollIntoView({ block: "center", behavior: "instant" });
      });
      return;
    }
    if (!property || !instant.iso) return;
    locked.current = true;
    setSaving(true);
    try {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
      const now = new Date().toISOString(),
        cleaner = cleanerList.find((c) => c.id === cleanerId);
      await onSave({
        id: crypto.randomUUID(),
        propertyId: property.id,
        name: property.name,
        address: property.address,
        sample: property.sample,
        scheduledAt: instant.iso,
        scheduledLocal: date + "T" + time,
        timeZone: zone.timeZone,
        timeZoneSource: zone.source,
        cleanerId: cleaner?.id,
        cleanerName: cleaner?.name,
        cleanerIsDemo: cleaner?.sample,
        status: "scheduled",
        checklistSourcePropertyId: sourceId,
        checklistSnapshot: snapshotTasks(tasks, property, requirePhotos),
        requirePhotoEvidence: requirePhotos,
        notifyCleanerPreference: !!cleaner && notify,
        specialInstructions: instructions.trim(),
        estimatedDurationMinutes: duration ? Number(duration) : undefined,
        createdAt: now,
        updatedAt: now,
      });
    } catch {
      locked.current = false;
      setSaving(false);
      setErrors({
        save: "Could not save this turnover to local browser storage. Your entries are still here. Free space or enable storage and try again.",
      });
    }
  }
  return (
    <>
      <section className="property-intro turnover-intro">
        <div className="property-intro-photo">
          <img
            src={property?.image || "/images/house.jpg"}
            alt="Illustrative property interior"
            width="400"
            height="320"
          />
        </div>
        <h1>Create Turnover</h1>
        <p>Schedule a cleaning turnover, assign tasks, and get photo proof.</p>
      </section>
      {!property ? (
        <SwoopCard className="empty-state">
          <div>
            <h2>A property comes first.</h2>
            <p>Add a property to set up its cleaning turnover.</p>
            <SwoopButton onClick={onAddProperty}>
              <Plus />
              Add Property
            </SwoopButton>
          </div>
        </SwoopCard>
      ) : (
        <form
          ref={form}
          className="create-turnover-form"
          aria-label="Create turnover"
          noValidate
          onSubmit={submit}
          aria-busy={saving}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              (e.target as HTMLElement).tagName === "INPUT"
            )
              e.preventDefault();
          }}
        >
          <fieldset disabled={saving} className="turnover-fields">
            <legend className="visually-hidden">Turnover setup</legend>
            <PropertySelector
              properties={properties}
              selected={property}
              onChange={(p) => requestChange("property", p)}
            />
            <div className="schedule-grid">
              <DatePicker
                value={date}
                onChange={(value) => {
                  setDate(value);
                  clearError("date", "time");
                }}
                min={todayInZone(zone.timeZone)}
                error={errors.date}
              />
              <TimePicker
                value={time}
                onChange={(value) => {
                  setTime(value);
                  clearError("time");
                }}
                error={errors.time}
              />
            </div>
            <p className="zone-notice">
              {zone.source === "property"
                ? "Property time zone: "
                : "Property time zone " +
                  (zone.invalid ? "is invalid" : "is not configured") +
                  ". Using device time zone: "}
              <strong>{zone.timeZone}</strong>.
              {zone.source === "device"
                ? " Confirm this matches the rental before scheduling."
                : ""}
            </p>
            <CleanerSelector
              cleaners={cleanerList}
              value={cleanerId}
              onChange={(id) => {
                setCleanerId(id);
                if (!id) setNotify(false);
              }}
            />
            {errors.cleaner && (
              <p className="field-error" role="alert">
                {errors.cleaner}
              </p>
            )}
            <SwoopCard className="turnover-checklist">
              <h2>
                <ClipboardList />
                Checklist
              </h2>
              <ChecklistSelector
                properties={properties}
                property={property}
                tasks={displayedTasks}
                sourceId={sourceId}
                onSelect={(p) => requestChange("checklist", p)}
              />
              <p className="mandatory-note">
                Assigned checklist: {displayedTasks.length} tasks.
                {extraRequired.length > 0
                  ? " Includes " +
                    extraRequired.map((t) => t.label).join(", ") +
                    " from mandatory property requirements."
                  : ""}
              </p>
              <button
                className="text-button"
                type="button"
                onClick={() => setEditing(!editing)}
              >
                {editing ? "Hide task editor" : "Customize these tasks"}
                <ChevronDown size={15} />
              </button>
              {editing && (
                <CustomChecklistEditor
                  tasks={tasks}
                  setTasks={(value) => {
                    setTasks(value);
                    clearError("checklist");
                  }}
                  error={errors.checklist}
                />
              )}{" "}
              {errors.checklist && (
                <p className="field-error" role="alert" tabIndex={-1}>
                  {errors.checklist}
                </p>
              )}
              <SwoopToggle
                label="Require Photo Evidence"
                checked={requirePhotos}
                onChange={setRequirePhotos}
                description={
                  requirePhotos
                    ? "A photo preview is required for every task."
                    : "Checklist-only completion is allowed except for individually required photos."
                }
              />
              <p className="mandatory-note">
                {property.tasks.filter((t) => t.requiresPhoto).length} property
                tasks require photos. These requirements remain mandatory, even
                with another checklist or this switch off. Missing mandatory
                tasks are included automatically.
              </p>
              <SwoopToggle
                label="Notify Cleaner"
                checked={notify}
                onChange={setNotify}
                disabled={!cleanerId}
                description={
                  cleanerId
                    ? "Save notification preference only."
                    : "Assign a cleaner to save a notification preference."
                }
              />
              <p className="mandatory-note">
                <Bell size={12} />
                Notifications coming soon. No message will be sent and no
                acceptance is implied.
              </p>
            </SwoopCard>
            <SpecialInstructionsField
              value={instructions}
              onChange={(value) => {
                setInstructions(value);
                clearError("instructions");
              }}
              error={errors.instructions}
            />
            <DurationSelector
              value={duration}
              onChange={(value) => {
                setDuration(value);
                clearError("duration");
              }}
              error={errors.duration}
            />
            {errors.save && (
              <p className="field-error" role="alert">
                {errors.save}
              </p>
            )}
            <SwoopButton
              className="create-turnover-button"
              type="submit"
              disabled={saving}
            >
              <span className="plus-circle">
                {saving ? (
                  <LoaderCircle className="saving-spinner" />
                ) : (
                  <Plus />
                )}
              </span>
              {saving ? "Creating Turnover…" : "Create Turnover"}
            </SwoopButton>
            <p className="property-storage-note">
              Local browser record only. Photo previews expire on reload.
              Evidence and device timestamps are unverified. Assignments do not
              notify real cleaners.
            </p>
          </fieldset>
        </form>
      )}
      <Panel
        open={!!pendingChange}
        title="Replace checklist changes?"
        onClose={() => setPendingChange(null)}
      >
        <p className="muted">
          Switching will replace your edited tasks with the chosen checklist.
          The rest of your form stays in place.
        </p>
        <div className="action-row">
          <button
            type="button"
            className="secondary"
            onClick={() => setPendingChange(null)}
          >
            Keep current tasks
          </button>
          <SwoopButton
            type="button"
            onClick={() => {
              if (pendingChange)
                applyChange(pendingChange.kind, pendingChange.property);
            }}
          >
            Replace tasks
          </SwoopButton>
        </div>
      </Panel>
    </>
  );
}
