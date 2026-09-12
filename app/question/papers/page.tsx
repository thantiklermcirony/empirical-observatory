'use client';
import PaperChallenges from '@/components/observatory/PaperChallenges';
export default function PaperChallengePage() {
  return <PaperChallenges onBack={() => window.location.assign('/question')} />;
}
