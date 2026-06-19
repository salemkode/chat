import { getBrandIcon, type BrandIconName } from "@chat/core/brand-icons";
import { Path, Svg } from "react-native-svg";

export function BrandIcon({
  name,
  size = 20,
}: {
  name: BrandIconName;
  size?: number;
}) {
  const icon = getBrandIcon(name);

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={icon.path} fill={`#${icon.hex}`} />
    </Svg>
  );
}
