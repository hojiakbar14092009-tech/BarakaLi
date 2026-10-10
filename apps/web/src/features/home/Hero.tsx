import { HeroCollage } from './HeroCollage';
import { HeroCopy, HERO_TITLE_ID } from './HeroCopy';

/** First desktop screen: copy on the left, photo collage on the right. */
export function Hero() {
  return (
    <section
      aria-labelledby={HERO_TITLE_ID}
      className="relative grid min-h-[calc(100dvh-7rem)] grid-cols-[1.3fr_1fr] items-center gap-12 overflow-x-clip xl:gap-16"
    >
      <HeroCopy />
      <HeroCollage />
    </section>
  );
}
