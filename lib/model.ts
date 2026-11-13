export type Task = {
  id: string;
  label: string;
  done: boolean;
  photo?: string;
  requiresPhoto?: boolean;
};
export type PropertyPhoto = { id: string; name: string; url: string };
export type Property = {
  id: string;
  name: string;
  address: string;
  image?: string;
  photos?: PropertyPhoto[];
  timeZone?: string;
  estimatedDurationMinutes?: number;
  propertyType?: string;
  otherType?: string;
  bedrooms?: number;
  bathrooms?: number;
  guests?: number;
  cleaningSetup?: {
    mode: "default" | "copy" | "custom";
    sourcePropertyId?: string;
    frequency: string;
    customFrequency?: string;
  };
  sample?: boolean;
  tasks: Task[];
  completedAt?: string;
};
export type RecordEntry = {
  turnoverId?: string;
  id: string;
  propertyId: string;
  name: string;
  address: string;
  completedAt: string;
  tasks: Task[];
  sample?: boolean;
};
export type Cleaner = {
  id: string;
  name: string;
  avatar?: string;
  sample?: boolean;
};
export type Turnover = {
  id: string;
  propertyId: string;
  name: string;
  address: string;
  sample?: boolean;
  scheduledAt: string;
  scheduledLocal: string;
  timeZone: string;
  timeZoneSource: "property" | "device";
  cleanerId?: string;
  cleanerName?: string;
  cleanerIsDemo?: boolean;
  status: "scheduled" | "in-progress" | "completed";
  checklistSnapshot: Task[];
  checklistSourcePropertyId: string;
  requirePhotoEvidence: boolean;
  notifyCleanerPreference: boolean;
  specialInstructions: string;
  estimatedDurationMinutes?: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
};
export type Workspace = {
  properties: Property[];
  records: RecordEntry[];
  turnovers: Turnover[];
  cleaners?: Cleaner[];
};
export type View =
  | "home"
  | "properties"
  | "add-property"
  | "create-turnover"
  | "detail"
  | "cleaner"
  | "turnovers"
  | "reports"
  | "settings";
export type Theme = "system" | "light" | "dark";
export const labels = [
  "Entryway is clean and ready",
  "Kitchen counters, sink and appliances",
  "Bathroom cleaned and restocked",
  "Beds made and linens replaced",
  "Floors vacuumed or mopped",
  "Final room-condition photos",
];
export const freshTasks = (): Task[] =>
  labels.map((label, i) => ({ id: String(i), label, done: false }));
export const starter: Workspace = {
  properties: [
    {
      id: "loft",
      name: "Lakeside Retreat",
      address: "Lakeview, CA",
      image: "/images/living.jpg",
      sample: true,
      tasks: freshTasks(),
    },
    {
      id: "studio",
      name: "City Loft",
      address: "Downtown, CA",
      image: "/images/bedroom.jpg",
      sample: true,
      tasks: freshTasks(),
    },
  ],
  records: [],
  turnovers: [],
};
export function isProperty(value: unknown): value is Property {
  if (!value || typeof value !== "object") return false;
  const p = value as Property;
  return (
    typeof p.id === "string" &&
    typeof p.name === "string" &&
    typeof p.address === "string" &&
    Array.isArray(p.tasks) &&
    p.tasks.length > 0 &&
    p.tasks.every(
      (t) =>
        t &&
        typeof t.id === "string" &&
        typeof t.label === "string" &&
        typeof t.done === "boolean",
    )
  );
}
export function loadWorkspace(): Workspace {
  try {
    const saved = localStorage.getItem("picsyproof-workspace-v2");
    if (saved) {
      const data = JSON.parse(saved);
      if (
        Array.isArray(data.properties) &&
        data.properties.every(isProperty) &&
        Array.isArray(data.records) &&
        data.records.every(
          (r: RecordEntry) =>
            isProperty(r) &&
            typeof r.completedAt === "string" &&
            typeof r.propertyId === "string",
        )
      )
        return {
          ...data,
          turnovers: Array.isArray(data.turnovers) ? data.turnovers : [],
        };
    }
    const legacy = JSON.parse(
      localStorage.getItem("picsyproof-pilot-v1") || "null",
    );
    if (Array.isArray(legacy) && legacy.length && legacy.every(isProperty))
      return {
        properties: legacy.map((p) => ({
          ...p,
          sample: p.id === "loft" || p.id === "studio",
          image: p.id === "loft" ? "/images/living.jpg" : "/images/bedroom.jpg",
        })),
        records: [],
        turnovers: [],
      };
  } catch {
    /* A corrupt or unavailable store leaves the usable sample workspace. */
  }
  return starter;
}
export function withoutPhotos(data: Workspace): Workspace {
  const strip = (tasks: Task[]) =>
    tasks.map(({ photo, ...task }) => {
      void photo;
      return task;
    });
  return {
    ...data,
    turnovers: (data.turnovers || []).map((t) => ({
      ...t,
      checklistSnapshot: strip(t.checklistSnapshot),
    })),
    properties: data.properties.map(({ photos, ...p }) => {
      void photos; // Original property files remain in browser memory only.
      return {
        ...p,
        image: p.image?.startsWith("blob:") ? undefined : p.image,
        tasks: strip(p.tasks),
      };
    }),
    records: data.records.map((r) => ({ ...r, tasks: strip(r.tasks) })),
  };
}
export function dateLabel(value?: string) {
  return value
    ? new Date(value).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Not completed";
}
