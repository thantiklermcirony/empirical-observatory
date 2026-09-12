'use client';
import PaperChallenges from '@/components/observatory/PaperChallenges';
import { returnToRoom } from '@/lib/instrument-activity';
export default function PaperChallengePage() {
  return <PaperChallenges onBack={() => returnToRoom('/labs/mathematics')} />;
}
