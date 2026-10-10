import { Hero } from './Hero';
import { HomeBackground } from './HomeBackground';
import { MotionRoot } from './motion';
import { WhyBarakaLi } from './WhyBarakaLi';

/** Desktop-only opening: animated hero and the problem/solution story, loaded as its own chunk. */
export default function HomeLanding() {
  return (
    <MotionRoot>
      <div className="relative space-y-28">
        <HomeBackground />
        <Hero />
        <WhyBarakaLi />
      </div>
    </MotionRoot>
  );
}
