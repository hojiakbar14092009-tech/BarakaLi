import { CateringHero } from './CateringHero';
import { WhyBarakaLi } from './WhyBarakaLi';

/** The catering story shown first on `/` and on its own at `/catering`. */
export function CateringLanding() {
  return (
    <div className="flex flex-col gap-16 lg:gap-28">
      <CateringHero />
      <WhyBarakaLi />
    </div>
  );
}
