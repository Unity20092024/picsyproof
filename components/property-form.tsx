"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
} from "react";
import {
  ArrowDown,
  ArrowUp,
  Bath,
  BedDouble,
  Building2,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ClipboardList,
  Copy,
  Home,
  LoaderCircle,
  MapPin,
  Plus,
  Star,
  Trash2,
  Users,
} from "lucide-react";
import {
  freshTasks,
  labels,
  type Property,
  type PropertyPhoto,
  type Task,
  type View,
} from "@/lib/model";
import { SwoopButton, SwoopCard } from "@/components/ui";
import "./property-form.css";

const propertyTypes = [
  "Apartment",
  "Condominium",
  "Single-family house",
  "Townhouse",
  "Cabin",
  "Cottage",
  "Studio",
  "Guest suite",
  "Other",
];
const frequencies = [
  "After Each Stay",
  "Daily",
  "Weekly",
  "Biweekly",
  "Monthly",
  "As Needed",
  "Custom",
];
type Fields = {
  name: string;
  address: string;
  propertyType: string;
  otherType: string;
  bedrooms: string;
  bathrooms: string;
  guests: string;
  frequency: string;
  customFrequency: string;
};
const initial: Fields = {
  name: "",
  address: "",
  propertyType: "",
  otherType: "",
  bedrooms: "",
  bathrooms: "",
  guests: "",
  frequency: "After Each Stay",
  customFrequency: "",
};
type Errors = Partial<Record<keyof Fields | "checklist" | "save", string>>;
type ChecklistMode = "default" | "copy" | "custom";

function FieldFrame({
  id,
  label,
  icon,
  error,
  required,
  children,
  className = "",
}: {
  id: string;
  label: string;
  icon: ReactNode;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={"property-field-wrap " + className}>
      <div className={"property-field " + (error ? "has-error" : "")}>
        <span className="property-field-icon" aria-hidden="true">
          {icon}
        </span>
        <div className="property-field-control">
          <label htmlFor={id}>
            {label}
            {required && (
              <span className="required-mark" aria-hidden="true">
                {" "}
                *
              </span>
            )}
          </label>
          {children}
        </div>
      </div>
      {error && (
        <p className="field-error" id={id + "-error"} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
export function SwoopInput({
  id,
  label,
  icon,
  error,
  required,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  icon: ReactNode;
  error?: string;
}) {
  return (
    <FieldFrame {...{ id, label, icon, error, required, className }}>
      <input
        {...props}
        id={id}
        required={required}
        aria-invalid={!!error}
        aria-describedby={error ? id + "-error" : undefined}
      />
    </FieldFrame>
  );
}
export function SwoopSelect({
  id,
  label,
  icon,
  error,
  required,
  children,
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  id: string;
  label: string;
  icon: ReactNode;
  error?: string;
}) {
  return (
    <FieldFrame {...{ id, label, icon, error, required, className }}>
      <select
        {...props}
        id={id}
        required={required}
        aria-invalid={!!error}
        aria-describedby={error ? id + "-error" : undefined}
      >
        {children}
      </select>
    </FieldFrame>
  );
}

export function PropertyPhotoUploader({
  photos,
  setPhotos,
  onProcessingChange,
}: {
  photos: PropertyPhoto[];
  setPhotos: (photos: PropertyPhoto[]) => void;
  onProcessingChange: (busy: boolean) => void;
}) {
  const picker = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  const photosRef = useRef(photos);
  photosRef.current = photos;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  async function addFiles(files: FileList | null) {
    if (!files || busy) return;
    setBusy(true);
    onProcessingChange(true);
    const errors: string[] = [];
    const accepted: PropertyPhoto[] = [];
    for (const file of Array.from(files)) {
      if (photosRef.current.length + accepted.length >= 12) {
        errors.push("You can select up to 12 property photos.");
        break;
      }
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        errors.push(file.name + ": choose a JPEG, PNG or WebP image.");
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        errors.push(file.name + ": choose an image no larger than 10 MB.");
        continue;
      }
      const url = URL.createObjectURL(file);
      const readable = await new Promise<boolean>((resolve) => {
        const img = new window.Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
      });
      if (!alive.current) {
        URL.revokeObjectURL(url);
        for (const p of accepted) URL.revokeObjectURL(p.url);
        return;
      }
      if (!readable) {
        URL.revokeObjectURL(url);
        errors.push(file.name + ": this image could not be read.");
        continue;
      }
      accepted.push({ id: crypto.randomUUID(), name: file.name, url });
    }
    if (alive.current) {
      setPhotos([...photosRef.current, ...accepted]);
      setErrors(errors);
      setBusy(false);
      onProcessingChange(false);
    }
  }
  function remove(id: string) {
    const target = photos.find((p) => p.id === id);
    if (target) URL.revokeObjectURL(target.url);
    setPhotos(photos.filter((p) => p.id !== id));
  }
  function move(index: number, direction: number) {
    const next = [...photos];
    [next[index], next[index + direction]] = [
      next[index + direction],
      next[index],
    ];
    setPhotos(next);
  }
  return (
    <section className="property-photos" aria-label="Property photos">
      <div className="property-photo-grid">
        <div className="cover-photo-frame">
          <img
            src={photos[0]?.url || "/images/house.jpg"}
            alt={
              photos[0]
                ? "Selected cover: " + photos[0].name
                : "Illustrative house exterior"
            }
          />
          <button
            className="cover-upload-action"
            type="button"
            onClick={() => picker.current?.click()}
            disabled={busy}
          >
            <span>
              <Camera />
            </span>
            <strong>
              {busy
                ? "Reading photos…"
                : photos.length
                  ? "Add More Photos"
                  : "Add Property Photo"}
            </strong>
          </button>
          <button
            type="button"
            className="add-photo-plus"
            aria-label="Add property photos"
            disabled={busy}
            onClick={() => picker.current?.click()}
          >
            <Plus />
          </button>
        </div>
        <div className="supporting-photos">
          {[0, 1, 2].map((i) => (
            <div key={i} className="supporting-photo-slot">
              {photos.length > 0 && !photos[i + 1] ? (
                <button
                  type="button"
                  aria-label={"Add photo in slot " + (i + 2)}
                  disabled={busy}
                  onClick={() => picker.current?.click()}
                >
                  <Plus size={20} />
                </button>
              ) : (
                <img
                  src={
                    photos[i + 1]?.url ||
                    [
                      "/images/living.jpg",
                      "/images/bedroom.jpg",
                      "/images/kitchen.jpg",
                    ][i]
                  }
                  alt={
                    photos[i + 1]
                      ? "Selected property photo: " + photos[i + 1].name
                      : "Illustrative " +
                        ["living room", "bedroom", "kitchen"][i]
                  }
                  width="180"
                  height="130"
                />
              )}
            </div>
          ))}
        </div>
      </div>
      <input
        ref={picker}
        className="visually-hidden"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        aria-label="Select property photos"
        disabled={busy}
        onChange={(e) => {
          void addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={camera}
        className="visually-hidden"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        aria-label="Take a property photo"
        disabled={busy}
        onChange={(e) => {
          void addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <div className="photo-actions">
        <span>
          {photos.length
            ? `${photos.length} photo${photos.length === 1 ? "" : "s"} selected · first photo is the cover`
            : "Illustrative photos · add your own to replace"}
        </span>
        <button
          type="button"
          onClick={() => camera.current?.click()}
          disabled={busy}
        >
          <Camera size={14} />
          Use camera
        </button>
      </div>
      {errors.length > 0 && (
        <div className="field-error" role="alert">
          {errors.map((e, i) => (
            <p key={i}>{e}</p>
          ))}
        </div>
      )}
      {photos.length > 0 && (
        <ol
          className="selected-property-photos"
          aria-label="Selected property photos"
        >
          {photos.map((photo, i) => (
            <li key={photo.id}>
              <img src={photo.url} alt={photo.name} />
              <div>
                <strong>{photo.name}</strong>
                <span>{i === 0 ? "Cover photo" : "Photo " + (i + 1)}</span>
              </div>
              <div className="selected-photo-controls">
                <button
                  type="button"
                  aria-label={"Set cover: " + photo.name}
                  aria-pressed={i === 0}
                  disabled={busy || i === 0}
                  onClick={() =>
                    setPhotos([
                      photo,
                      ...photos.filter((p) => p.id !== photo.id),
                    ])
                  }
                >
                  <Star size={16} fill={i === 0 ? "currentColor" : "none"} />
                </button>
                <button
                  type="button"
                  aria-label={"Move photo earlier: " + photo.name}
                  disabled={busy || i === 0}
                  onClick={() => move(i, -1)}
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  type="button"
                  aria-label={"Move photo later: " + photo.name}
                  disabled={busy || i === photos.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <ArrowDown size={16} />
                </button>
                <button
                  type="button"
                  aria-label={"Remove photo: " + photo.name}
                  disabled={busy}
                  onClick={() => remove(photo.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function CustomChecklistEditor({
  tasks,
  setTasks,
  error,
}: {
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  error?: string;
}) {
  function move(i: number, direction: number) {
    const next = [...tasks];
    [next[i], next[i + direction]] = [next[i + direction], next[i]];
    setTasks(next);
  }
  return (
    <div className="custom-checklist-editor">
      <h3>Your cleaning tasks</h3>
      <p>Make the plan your own. Reorder with the arrows.</p>
      <ol>
        {tasks.map((t, i) => (
          <li key={t.id}>
            <div className="custom-task-name">
              <label htmlFor={"custom-task-" + t.id}>Task {i + 1}</label>
              <input
                id={"custom-task-" + t.id}
                value={t.label}
                maxLength={120}
                aria-invalid={!!error && !t.label.trim()}
                placeholder="e.g. Restock the coffee station"
                onChange={(e) =>
                  setTasks(
                    tasks.map((task) =>
                      task.id === t.id
                        ? { ...task, label: e.target.value }
                        : task,
                    ),
                  )
                }
              />
              <label className="photo-required-label">
                <input
                  type="checkbox"
                  checked={!!t.requiresPhoto}
                  onChange={(e) =>
                    setTasks(
                      tasks.map((task) =>
                        task.id === t.id
                          ? { ...task, requiresPhoto: e.target.checked }
                          : task,
                      ),
                    )
                  }
                />
                Photo required
              </label>
            </div>
            <div className="custom-task-controls">
              <button
                type="button"
                aria-label={"Move task " + (i + 1) + " up"}
                disabled={i === 0}
                onClick={() => move(i, -1)}
              >
                <ArrowUp size={16} />
              </button>
              <button
                type="button"
                aria-label={"Move task " + (i + 1) + " down"}
                disabled={i === tasks.length - 1}
                onClick={() => move(i, 1)}
              >
                <ArrowDown size={16} />
              </button>
              <button
                type="button"
                aria-label={"Remove task " + (i + 1)}
                onClick={() =>
                  setTasks(tasks.filter((task) => task.id !== t.id))
                }
              >
                <Trash2 size={16} />
              </button>
            </div>
          </li>
        ))}
      </ol>
      <button
        type="button"
        className="secondary"
        disabled={tasks.length >= 50}
        onClick={() =>
          setTasks([
            ...tasks,
            { id: crypto.randomUUID(), label: "", done: false },
          ])
        }
      >
        <Plus size={16} />
        Add cleaning task
      </button>
      <span className="task-limit">{tasks.length} / 50 tasks</span>
    </div>
  );
}
export function ChecklistSelector({
  mode,
  setMode,
  properties,
  sourceId,
  setSourceId,
}: {
  mode: ChecklistMode;
  setMode: (mode: ChecklistMode) => void;
  properties: Property[];
  sourceId: string;
  setSourceId: (value: string) => void;
}) {
  const available = properties.filter((p) => p.tasks.length > 0);
  return (
    <>
      <fieldset className="checklist-choices">
        <legend className="visually-hidden">Cleaning checklist choice</legend>
        {(
          [
            {
              value: "default",
              label: (
                <>
                  Use Default
                  <br />
                  Checklist
                </>
              ),
              icon: ClipboardList,
            },
            {
              value: "copy",
              label: (
                <>
                  Copy from
                  <br />
                  Another Property
                </>
              ),
              icon: Copy,
            },
            {
              value: "custom",
              label: (
                <>
                  Create
                  <br />
                  Custom Checklist
                </>
              ),
              icon: Plus,
            },
          ] as const
        ).map(({ value, label, icon: Icon }) => (
          <label
            key={value}
            className={
              "checklist-choice " + (mode === value ? "is-selected" : "")
            }
          >
            <input
              type="radio"
              name="checklist-choice"
              value={value}
              checked={mode === value}
              disabled={value === "copy" && !available.length}
              onChange={() => setMode(value)}
            />
            <Icon size={25} aria-hidden="true" />
            <span>{label}</span>
            {mode === value && (
              <span className="choice-check">
                <Check size={12} />
              </span>
            )}
          </label>
        ))}
      </fieldset>
      {!available.length && (
        <p className="local-caption">
          Copy is unavailable until a property has a checklist.
        </p>
      )}
      {mode === "copy" && (
        <SwoopSelect
          id="source-property"
          label="Copy checklist from"
          icon={<Copy />}
          value={sourceId}
          onChange={(e) => setSourceId(e.target.value)}
        >
          <option value="">Choose an existing property</option>
          {available.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.sample ? " (sample)" : ""}
            </option>
          ))}
        </SwoopSelect>
      )}
    </>
  );
}
export function TurnoverFrequencySelect({
  value,
  onChange,
  custom,
  onCustomChange,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  custom: string;
  onCustomChange: (v: string) => void;
  error?: string;
}) {
  return (
    <div className="turnover-frequency">
      <div className="frequency-heading">
        <span className="property-field-icon">
          <CalendarDays />
        </span>
        <div>
          <label htmlFor="turnover-frequency">Turnover Frequency</label>
          <p>How often is this property cleaned?</p>
        </div>
      </div>
      <select
        id="turnover-frequency"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {frequencies.map((f) => (
          <option key={f}>{f}</option>
        ))}
      </select>
      {value === "Custom" && (
        <SwoopInput
          id="custom-frequency"
          label="Custom cleaning preference"
          icon={<CalendarDays />}
          value={custom}
          onChange={(e) => onCustomChange(e.target.value)}
          placeholder="e.g. Every Monday and after long stays"
          maxLength={200}
          required
          error={error}
        />
      )}
    </div>
  );
}
function CleaningBroomIcon() {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m25 5-13 15M10 17l7 6-6 6-9-7 8-5Z" />
      <path d="m7 21 5 4M5 24l3 2M5 5v6M2 8h6M23 25v4M21 27h4" />
      <circle cx="27" cy="3" r="1" />
    </svg>
  );
}
export function CleaningSetupCard({ children }: { children: ReactNode }) {
  return (
    <SwoopCard className="cleaning-setup-card">
      <div className="cleaning-setup-heading">
        <span className="property-field-icon">
          <CleaningBroomIcon />
        </span>
        <div>
          <h2>Cleaning Setup</h2>
          <p>Choose your cleaning checklist and turnover preferences.</p>
        </div>
      </div>
      {children}
    </SwoopCard>
  );
}

export function UnsavedChangesDialog({
  destination,
  onStay,
  onDiscard,
}: {
  destination: View | null;
  onStay: () => void;
  onDiscard: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (destination) ref.current?.showModal();
    else ref.current?.close();
  }, [destination]);
  return (
    <dialog
      ref={ref}
      className="property-dialog unsaved-changes-dialog"
      aria-labelledby="unsaved-title"
      onCancel={(e) => {
        e.preventDefault();
        onStay();
      }}
    >
      <h2 id="unsaved-title">Keep your property setup?</h2>
      <p className="muted">
        You have unsaved changes. Discarding will remove the details, checklist
        edits and selected photo previews.
      </p>
      <div className="action-row">
        <button type="button" className="secondary" autoFocus onClick={onStay}>
          Keep editing
        </button>
        <SwoopButton type="button" onClick={onDiscard}>
          Discard changes
        </SwoopButton>
      </div>
    </dialog>
  );
}

export function PropertyForm({
  properties,
  onSave,
  onDirtyChange,
  onCancel,
}: {
  properties: Property[];
  onSave: (property: Property) => Promise<void>;
  onDirtyChange: (dirty: boolean) => void;
  onCancel: () => void;
}) {
  const [fields, setFields] = useState<Fields>(initial);
  const [photos, setPhotos] = useState<PropertyPhoto[]>([]);
  const [mode, setMode] = useState<ChecklistMode>("default");
  const [sourceId, setSourceId] = useState("");
  const [customTasks, setCustomTasks] = useState<Task[]>(freshTasks);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const savingRef = useRef(false);
  const transferred = useRef(false);
  const photosRef = useRef(photos);
  photosRef.current = photos;
  const dirty =
    photos.length > 0 ||
    sourceId !== "" ||
    customTasks.length !== labels.length ||
    customTasks.some(
      (task, index) => task.label !== labels[index] || task.requiresPhoto,
    ) ||
    mode !== "default" ||
    Object.keys(initial).some(
      (key) => fields[key as keyof Fields] !== initial[key as keyof Fields],
    );
  useEffect(() => {
    onDirtyChange(dirty);
    return () => onDirtyChange(false);
  }, [dirty, onDirtyChange]);
  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty && !transferred.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);
  useEffect(
    () => () => {
      if (!transferred.current)
        for (const p of photosRef.current) URL.revokeObjectURL(p.url);
    },
    [],
  );
  function update(key: keyof Fields, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined, save: undefined }));
  }
  function validate(): { errors: Errors; tasks: Task[] } {
    const e: Errors = {};
    if (!fields.name.trim()) e.name = "Enter a property name.";
    if (!fields.address.trim()) e.address = "Enter the full property address.";
    if (!propertyTypes.includes(fields.propertyType))
      e.propertyType = "Choose a property type.";
    for (const key of ["bedrooms", "bathrooms", "guests"] as const) {
      const value = fields[key];
      if (!value) continue;
      const n = Number(value),
        whole = key !== "bathrooms";
      if (
        !Number.isFinite(n) ||
        n < (key === "guests" ? 1 : 0) ||
        n > (key === "guests" ? 100 : 20) ||
        (whole ? !Number.isInteger(n) : !Number.isInteger(n * 2))
      )
        e[key] =
          key === "guests"
            ? "Choose a whole guest count from 1 to 100."
            : key === "bedrooms"
              ? "Choose 0 to 20 bedrooms."
              : "Choose 0 to 20 bathrooms, in half increments.";
    }
    if (fields.frequency === "Custom" && !fields.customFrequency.trim())
      e.customFrequency = "Describe your cleaning preference.";
    let tasks =
      mode === "custom"
        ? customTasks
        : mode === "copy"
          ? properties.find((p) => p.id === sourceId)?.tasks || []
          : freshTasks();
    if (!tasks.length)
      e.checklist =
        mode === "copy"
          ? "Choose a property to copy its checklist."
          : "Add at least one cleaning task.";
    else if (tasks.some((t) => !t.label.trim()))
      e.checklist = "Give every cleaning task a name.";
    tasks = tasks.map((t) => ({
      id: crypto.randomUUID(),
      label: t.label.trim(),
      done: false,
      requiresPhoto: !!t.requiresPhoto,
    }));
    return { errors: e, tasks };
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (savingRef.current || processing) return;
    const result = validate();
    setErrors(result.errors);
    if (Object.keys(result.errors).length) {
      requestAnimationFrame(() => {
        const invalid =
          form.current?.querySelector<HTMLElement>('[aria-invalid="true"]') ||
          form.current?.querySelector<HTMLElement>("#checklist-error");
        invalid?.focus();
        invalid?.scrollIntoView({ block: "center", behavior: "instant" });
      });
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
      transferred.current = true;
      await onSave({
        id: crypto.randomUUID(),
        name: fields.name.trim(),
        address: fields.address.trim(),
        propertyType: fields.propertyType,
        otherType:
          fields.propertyType === "Other"
            ? fields.otherType.trim() || undefined
            : undefined,
        bedrooms: fields.bedrooms === "" ? undefined : Number(fields.bedrooms),
        bathrooms:
          fields.bathrooms === "" ? undefined : Number(fields.bathrooms),
        guests: fields.guests === "" ? undefined : Number(fields.guests),
        cleaningSetup: {
          mode,
          sourcePropertyId: mode === "copy" ? sourceId : undefined,
          frequency: fields.frequency,
          customFrequency:
            fields.frequency === "Custom"
              ? fields.customFrequency.trim()
              : undefined,
        },
        tasks: result.tasks,
        photos,
        image: photos[0]?.url,
      });
      transferred.current = true;
    } catch {
      transferred.current = false;
      setErrors((prev) => ({
        ...prev,
        save: "This property could not be saved to this browser. Storage may be unavailable or full. Your entries are still here; try again.",
      }));
      savingRef.current = false;
      setSaving(false);
    }
  }
  return (
    <>
      <section className="property-intro">
        <div className="property-intro-photo">
          <img
            src="/images/house.jpg"
            alt="Illustrative welcoming rental house"
            width="400"
            height="320"
            fetchPriority="high"
          />
        </div>
        <h1>Add New Property</h1>
        <p>
          Set up your rental, add details, and
          <br className="property-intro-break" /> create a cleaning plan.
        </p>
      </section>
      <form
        ref={form}
        className="property-form"
        onSubmit={submit}
        noValidate
        aria-label="Add new property"
        aria-busy={saving}
        onKeyDown={(e) => {
          if (
            e.key === "Enter" &&
            (e.target as HTMLElement).tagName === "INPUT" &&
            (e.target as HTMLInputElement).type !== "radio" &&
            (e.target as HTMLInputElement).type !== "checkbox"
          )
            e.preventDefault();
        }}
      >
        <fieldset className="property-form-fields" disabled={saving}>
          <legend className="visually-hidden">New property setup</legend>
          <PropertyPhotoUploader
            photos={photos}
            setPhotos={setPhotos}
            onProcessingChange={setProcessing}
          />
          <div className="property-details-grid">
            <SwoopInput
              id="property-name"
              label="Property Name"
              icon={<Home />}
              placeholder="e.g. Lakeside Retreat"
              autoComplete="off"
              maxLength={100}
              required
              value={fields.name}
              onChange={(e) => update("name", e.target.value)}
              error={errors.name}
              className="field-full"
            />
            <SwoopInput
              id="property-address"
              label="Address"
              icon={<MapPin />}
              placeholder="Enter full address"
              autoComplete="street-address"
              maxLength={250}
              required
              value={fields.address}
              onChange={(e) => update("address", e.target.value)}
              error={errors.address}
              className="field-full"
            />
            <SwoopSelect
              id="property-type"
              label="Property Type"
              icon={<Building2 />}
              value={fields.propertyType}
              onChange={(e) => update("propertyType", e.target.value)}
              required
              error={errors.propertyType}
            >
              <option value="">Select type</option>
              {propertyTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </SwoopSelect>
            <SwoopSelect
              id="bedrooms"
              label="Bedrooms"
              icon={<BedDouble />}
              value={fields.bedrooms}
              onChange={(e) => update("bedrooms", e.target.value)}
              error={errors.bedrooms}
            >
              <option value="">Select</option>
              {Array.from({ length: 21 }, (_, i) => (
                <option key={i} value={i}>
                  {i === 0 ? "0 (Studio)" : i}
                </option>
              ))}
            </SwoopSelect>
            {fields.propertyType === "Other" && (
              <SwoopInput
                id="other-property-type"
                label="Describe property type (optional)"
                icon={<Building2 />}
                value={fields.otherType}
                onChange={(e) => update("otherType", e.target.value)}
                maxLength={80}
                placeholder="e.g. Houseboat"
                className="field-full"
              />
            )}
            <SwoopSelect
              id="bathrooms"
              label="Bathrooms"
              icon={<Bath />}
              value={fields.bathrooms}
              onChange={(e) => update("bathrooms", e.target.value)}
              error={errors.bathrooms}
            >
              <option value="">Select</option>
              {Array.from({ length: 41 }, (_, i) => (
                <option key={i} value={i / 2}>
                  {i / 2}
                </option>
              ))}
            </SwoopSelect>
            <SwoopSelect
              id="guests"
              label="Sleeps (Guests)"
              icon={<Users />}
              value={fields.guests}
              onChange={(e) => update("guests", e.target.value)}
              error={errors.guests}
            >
              <option value="">Select</option>
              {Array.from({ length: 100 }, (_, i) => (
                <option key={i} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </SwoopSelect>
          </div>
          <CleaningSetupCard>
            <ChecklistSelector
              mode={mode}
              setMode={setMode}
              properties={properties}
              sourceId={sourceId}
              setSourceId={setSourceId}
            />
            {mode === "custom" && (
              <CustomChecklistEditor
                tasks={customTasks}
                setTasks={setCustomTasks}
                error={errors.checklist}
              />
            )}{" "}
            {mode === "copy" && sourceId && (
              <p className="checklist-copy-summary">
                <CheckCircle2 size={14} />
                {properties.find((p) => p.id === sourceId)?.tasks.length ||
                  0}{" "}
                tasks will be copied with a fresh, unchecked status.
              </p>
            )}
            {errors.checklist && (
              <p
                className="field-error"
                role="alert"
                id="checklist-error"
                tabIndex={-1}
              >
                {errors.checklist}
              </p>
            )}
            <TurnoverFrequencySelect
              value={fields.frequency}
              onChange={(value) => update("frequency", value)}
              custom={fields.customFrequency}
              onCustomChange={(value) => update("customFrequency", value)}
              error={errors.customFrequency}
            />
          </CleaningSetupCard>
          <div className="property-save-area">
            {errors.save && (
              <p className="field-error save-error" role="alert">
                {errors.save}
              </p>
            )}
            <SwoopButton
              type="submit"
              className="save-property-button"
              disabled={saving || processing}
            >
              <span className="plus-circle">
                {saving ? (
                  <LoaderCircle size={24} className="saving-spinner" />
                ) : (
                  <Plus size={24} />
                )}
              </span>
              {saving ? "Saving Property…" : "Save Property"}
            </SwoopButton>
            <p className="property-storage-note">
              Saved locally on this device.{" "}
              {photos.length
                ? "Selected photo previews will disappear on reload."
                : "Photos are session-only previews."}{" "}
              Cleaning preferences do not schedule jobs.
            </p>
            <button
              type="button"
              className="cancel-property"
              disabled={saving}
              onClick={onCancel}
            >
              Cancel and return to My Properties
            </button>
          </div>
        </fieldset>
      </form>
    </>
  );
}
