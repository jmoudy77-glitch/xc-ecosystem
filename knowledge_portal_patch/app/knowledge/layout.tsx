import type { ReactNode } from "react";

export const metadata = {
  title: "Knowledge Base",
};

export default function KnowledgeLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: "100vh" }}>
      {children}
    </div>
  );
}
