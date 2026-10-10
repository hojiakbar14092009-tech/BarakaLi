import { CateringLanding } from './CateringLanding';
import { useHashScroll } from './sectionScroll';

export default function CateringPage() {
  useHashScroll();
  return <CateringLanding />;
}
