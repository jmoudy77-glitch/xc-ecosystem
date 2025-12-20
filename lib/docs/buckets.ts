export type DocsBucket = "Governance" | "Product" | "Architecture" | "UI & UX" | "ai" | "Snapshots";

export const BUCKETS: { id: DocsBucket; title: string; description: string }[] = [
  {
    id: "Governance",
    title: "Governance",
    description: "Constitutional doctrine, conflict resolution, and foundational guidance.",
  },
  {
    id: "Product",
    title: "Product",
    description: "Product intent, feature definitions, ops modules, AI modules, and planning artifacts.",
  },
  {
    id: "Architecture",
    title: "Architecture",
    description: "System architecture, schemas, security/RLS, and developer handbooks.",
  },
  {
    id: "UI & UX",
    title: "UI & UX",
    description: "Cognitive ergonomics, navigation/IA rules, layout standards, and UI workflows.",
  },
  {
    id: "ai",
    title: "AI Doctrine",
    description: "Foundational rules for AI presence, behavior, and onboarding",
  },
  {
    id: "Snapshots",
    title: "Snapshots",
    description: "Session snapshots and historical change records.",
  },
];
