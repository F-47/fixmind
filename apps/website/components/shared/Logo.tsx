import Image from "next/image";

export function Logo() {
  return (
    <Image
      src="/logo.jpeg"
      alt="fixmind logo"
      width={24}
      height={24}
      className="h-6 w-6"
      priority
    />
  );
}
