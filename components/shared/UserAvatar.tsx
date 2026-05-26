import React from "react";
import Image from "next/image";

interface UserAvatarProps {
  user: any;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function UserAvatar({ user, size = "md", className = "" }: UserAvatarProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12"
  };

  const seed = user?.fullName || user?.profile?.username || user?.email || "Guest";

  return (
    <div className={`${sizeClasses[size]} rounded-full border border-white/10 overflow-hidden bg-zinc-800 relative ${className}`}>
      <Image 
        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`} 
        alt="User Avatar" 
        fill
        sizes="(max-width: 768px) 32px, 48px"
        className="object-cover" 
      />
    </div>
  );
}
