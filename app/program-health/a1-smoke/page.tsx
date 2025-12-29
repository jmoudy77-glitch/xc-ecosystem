import { notFound } from 'next/navigation';
import ProgramHealthA1SmokeClient from './smoke-client';

export default function ProgramHealthA1SmokePage() {
  // Dev-only surface. In any non-dev environment, this route does not exist.
  if (process.env.NODE_ENV !== 'development') {
    notFound();
  }
  return <ProgramHealthA1SmokeClient />;
}
