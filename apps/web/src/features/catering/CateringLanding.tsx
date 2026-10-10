import { CateringHero } from './CateringHero';
import { useHashScroll } from './sectionScroll';
import { WhyBarakaLi } from './WhyBarakaLi';

/** The catering story, shown on desktop only: first on `/` and on its own at `/catering`. */
export default function CateringLanding() {
  // The landing loads as its own chunk, after the page's own hash handling has already run.
  useHashScroll();
  return (
    <div className="flex flex-col gap-28">
      <CateringHero />
      <WhyBarakaLi />
    </div>
  );
}
