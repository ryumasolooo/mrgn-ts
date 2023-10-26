import React from "react";
import Image from "next/image";
import { minidenticon } from "minidenticons";
import { shortenAddress } from "@mrgnlabs/mrgn-common";
import { cn } from "~/utils/themeUtils";

type WalletAvatarProps = {
  address: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export const WalletAvatar = ({ address, size = "md", className }: WalletAvatarProps) => {
  const svgURI = React.useMemo(() => {
    return "data:image/svg+xml;utf8," + encodeURIComponent(minidenticon(address));
  }, [address]);

  const sizeInPx = React.useMemo(() => {
    if (size === "sm") return 32;
    if (size === "md") return 40;
    if (size === "lg") return 64;
  }, [size]);

  const containerSizeInPx = React.useMemo(() => {
    if (!sizeInPx) return 0;
    return sizeInPx + 8;
  }, [sizeInPx]);

  return (
    <div
      className={cn("flex items-center justify-center rounded-full p-0 bg-muted/50", className)}
      style={{
        width: containerSizeInPx,
        height: containerSizeInPx,
      }}
    >
      <Image src={svgURI} alt={shortenAddress(address)} width={sizeInPx} height={sizeInPx} />
    </div>
  );
};