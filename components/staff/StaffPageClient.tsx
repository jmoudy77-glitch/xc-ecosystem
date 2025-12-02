// StaffPageClient.tsx
'use client';

import { useEffect, useState } from 'react';

interface StaffMember {
  id: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
}

export default function StaffPageClient() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/staff');
        if (!res.ok) {
          throw new Error('Failed to load staff');
        }
        const data = (await res.json()) as StaffMember[];
        setStaff(data);
      } catch (err: any) {
        setError(err?.message ?? 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return <p>Loading staff…</p>;
  }

  if (error) {
    return <p>Error loading staff: {error}</p>;
  }

  if (staff.length === 0) {
    return <p>No staff members found.</p>;
  }

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Staff</h1>
      <table className="min-w-full border text-sm">
        <thead>
          <tr className="border-b">
            <th className="p-2 text-left">Name</th>
            <th className="p-2 text-left">Role</th>
            <th className="p-2 text-left">Email</th>
            <th className="p-2 text-left">Phone</th>
          </tr>
        </thead>
        <tbody>
          {staff.map((member) => (
            <tr key={member.id} className="border-b">
              <td className="p-2">{member.name}</td>
              <td className="p-2">{member.role}</td>
              <td className="p-2">{member.email ?? '—'}</td>
              <td className="p-2">{member.phone ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
