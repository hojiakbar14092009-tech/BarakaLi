import { CateringHero } from './CateringHero';

/** The catering story shown first on `/` and on its own at `/catering`. */
export function CateringLanding() {
  return (
    <div className="flex flex-col gap-16 lg:gap-28">
      <CateringHero />
    </div>
  );
}
