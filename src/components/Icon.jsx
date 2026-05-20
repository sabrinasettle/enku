const ICON_PATHS = {
  add: "/Add.svg",
  back: "/Back.svg",
  edit: "/Edit.svg",
  rotate: "/Rotate.svg",
  sub: "/Sub.svg",
};

export default function Icon({
  name,
  className = "",
  maskPosition = "center",
  maskSize = "contain",
}) {
  const path = ICON_PATHS[name];

  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 bg-current ${className}`}
      style={{
        mask: `url(${path}) ${maskPosition} / ${maskSize} no-repeat`,
        WebkitMask: `url(${path}) ${maskPosition} / ${maskSize} no-repeat`,
      }}
    />
  );
}
