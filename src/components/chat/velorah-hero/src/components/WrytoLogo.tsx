import React from "react";

interface WrytoLogoProps {
  className?: string;
  size?: number;
  variant?: "full" | "emblem";
}

export const WrytoLogo: React.FC<WrytoLogoProps> = ({
  className = "h-12 w-auto",
  size,
  variant = "full",
}) => {
  if (variant === "emblem") {
    return (
      <svg
        width={size || 80}
        height={size || 80}
        viewBox="80 30 110 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={{ aspectRatio: "110/160" }}
        aria-label="Wryto Quill Emblem"
      >
        <g>
          {/* Mint accents */}
          <path
            d="M 112 127 C 110 120 114 113 118 108 C 117 114 117 121 114 127 Z"
            fill="#68C3B4"
          />
          <path
            d="M 126 126 C 132 127 137 122 140 117 C 134 119 129 122 126 126 Z"
            fill="#68C3B4"
          />

          {/* Main Coral Feather Plume */}
          <path
            d="M 114 125 
               C 113 112, 120 95, 128 82 
               C 137 68, 150 54, 172 38
               C 174 46, 170 60, 160 74
               C 152 85, 144 98, 140 108
               C 136 116, 131 123, 126 126
               Z"
            fill="#E76F64"
          />

          {/* Quill Shaft */}
          <path
            d="M 98 152 L 122 118 L 170 42"
            stroke="#68C3B4"
            strokeWidth="2.8"
            strokeLinecap="round"
          />

          {/* Nib */}
          <path d="M 98 152 L 95 157" stroke="#2C3D52" strokeWidth="3" strokeLinecap="round" />

          {/* Feather Barbs Detail */}
          <path d="M 132 80 L 144 87" stroke="#263445" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M 140 68 L 154 77" stroke="#263445" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M 148 56 L 163 65" stroke="#263445" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M 132 94 L 123 99" stroke="#263445" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M 137 106 L 128 112" stroke="#263445" strokeWidth="1.2" strokeLinecap="round" />

          {/* Ink Droplet */}
          <path
            d="M 98 163 C 98 163 103 170 103 174 C 103 177.3 100.3 180 97 180 C 93.7 180 91 177.3 91 174 C 91 170 96 163 98 163 Z"
            fill="#E76F64"
          />
        </g>
      </svg>
    );
  }

  return (
    <svg
      width={size ? (size * 220) / 160 : 220}
      height={size || 160}
      viewBox="30 25 220 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ aspectRatio: "220/160" }}
      aria-label="Wryto Logo"
    >
      <g>
        {/* Horizontal dividing line */}
        <path
          d="M 32 138 C 80 137.7, 180 137.7, 245 138"
          stroke="#E76F64"
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        {/* --- Quill Feather --- */}
        {/* Mint / Cyan accent patches */}
        <path d="M 112 127 C 110 120 114 113 118 108 C 117 114 117 121 114 127 Z" fill="#68C3B4" />
        <path d="M 126 126 C 132 127 137 122 140 117 C 134 119 129 122 126 126 Z" fill="#68C3B4" />

        {/* Main Coral Feather Plume */}
        <path
          d="M 114 125 
             C 113 112, 120 95, 128 82 
             C 137 68, 150 54, 172 38
             C 174 46, 170 60, 160 74
             C 152 85, 144 98, 140 108
             C 136 116, 131 123, 126 126
             Z"
          fill="#E76F64"
        />

        {/* Quill Shaft */}
        <path
          d="M 98 152 L 122 118 L 170 42"
          stroke="#68C3B4"
          strokeWidth="2.4"
          strokeLinecap="round"
        />

        {/* Nib */}
        <path d="M 98 152 L 95 157" stroke="#2C3D52" strokeWidth="2.8" strokeLinecap="round" />

        {/* Feather Inner Slits */}
        <path d="M 132 80 L 144 87" stroke="#263445" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M 140 68 L 154 77" stroke="#263445" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M 148 56 L 163 65" stroke="#263445" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M 132 94 L 123 99" stroke="#263445" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M 137 106 L 128 112" stroke="#263445" strokeWidth="1.2" strokeLinecap="round" />

        {/* Ink Droplet */}
        <path
          d="M 98 163 C 98 163 103 170 103 174 C 103 177.3 100.3 180 97 180 C 93.7 180 91 177.3 91 174 C 91 170 96 163 98 163 Z"
          fill="#E76F64"
        />

        {/* --- Wordmark --- */}
        {/* Stylized 'W' in Coral matching pen nib */}
        <path
          d="M 60 143 L 71 168 L 82 147 L 94 169 L 103 146"
          stroke="#E76F64"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 'ryto' in clean minimalist typography */}
        <text
          x="108"
          y="168"
          fill="#93A7BE"
          fontSize="36"
          fontWeight="400"
          letterSpacing="1px"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          ryto
        </text>
      </g>
    </svg>
  );
};
