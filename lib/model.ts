export type Task = { id: string; label: string; done: boolean; photo?: string };
export type Property = {
  id: string;
  name: string;
  address: string;
  image?: string;
  sample?: boolean;
  tasks: Task[];
  completedAt?: string;
};
export type RecordEntry = {
  id: string;
  propertyId: string;
  name: string;
  address: string;
  completedAt: string;
  tasks: Task[];
  sample?: boolean;
};
export type Workspace = { properties: Property[]; records: RecordEntry[] };
export type View =
  | "home"
  | "properties"
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
        return data;
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
    properties: data.properties.map((p) => ({ ...p, tasks: strip(p.tasks) })),
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
