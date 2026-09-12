import RoomEntrance from '@/components/observatory/RoomEntrance';
import { notFound } from 'next/navigation';
import { resolveRoom } from '@/lib/observatory-catalogue';
export async function generateMetadata({ params }: { params: Promise<{ branch: string }> }) {
  const { branch } = await params;
  const room = resolveRoom(branch);
  return { title: room ? room.title + ' — Empirical Observatory' : 'Laboratory — Empirical Observatory', description: room?.description };
}
export default async function Laboratory({ params }: { params: Promise<{ branch: string }> }) {
  const { branch } = await params;
  const room=resolveRoom(branch);
  if (!room) notFound();
  return <RoomEntrance room={room} branch={branch} />;
}
