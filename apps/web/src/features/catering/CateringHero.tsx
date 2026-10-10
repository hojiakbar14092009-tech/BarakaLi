import { HeroCollage } from './HeroCollage';
import { HeroCopy } from './HeroCopy';

export function CateringHero() {
  return (
    <section
      aria-labelledby="catering-hero-title"
      className="relative grid min-h-[calc(100dvh-7rem)] grid-cols-[1.3fr_1fr] overflow-x-clip items-center gap-12 xl:gap-16"
    >
      <HeroCopy />
      <HeroCollage />
    </section>
  );
}
