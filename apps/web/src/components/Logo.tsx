interface LogoProps {
  className?: string;
}

export function Logo({ className = '' }: LogoProps) {
  return (
    <span className={`font-bold tracking-tight ${className}`} aria-label="BarakaLi">
      <span className="text-espresso">Baraka</span>
      <span className="text-mocha">Li</span>
    </span>
  );
}
