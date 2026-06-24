export function Logo({ size = 20 }: { size?: number }) {
  return (
    <img
      src="/logo.jpeg"
      alt="Fixmind Logo"
      aria-hidden="true"
      width={size}
      height={size}
      className="rounded-[7px]"
      style={{ width: size, height: size }}
    />
  );
}
