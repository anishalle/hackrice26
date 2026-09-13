/**
 * Authored icon set. One 24px grid, 1.5px stroke, round caps and joins, no
 * fills. Drawn rather than borrowed so the stroke weight matches the chart
 * rules exactly.
 */

type IconProps = React.SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      width={20}
      height={20}
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconVision = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z" />
    <circle cx="12" cy="12" r="2.75" />
  </Icon>
);

export const IconHearing = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 8a5 5 0 0 1 10 0c0 2.2-1.4 3.2-2.4 4.3-.9 1-1.3 1.9-1.3 3.2a2.6 2.6 0 0 1-2.6 2.6" />
    <path d="M4.5 14.5A9 9 0 0 1 4 11.5" />
    <path d="M10.2 8.3a2 2 0 0 1 3.5 1.3" />
  </Icon>
);

export const IconMotor = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11" />
    <path d="M12 10.5V4.8a1.5 1.5 0 0 1 3 0V11" />
    <path d="M15 11V7.3a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-1a6 6 0 0 1-5.2-3l-1.6-2.8a1.6 1.6 0 0 1 2.6-1.8L9 15" />
  </Icon>
);

export const IconSpeech = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 11v2" />
    <path d="M8 8v8" />
    <path d="M12 5.5v13" />
    <path d="M16 9v6" />
    <path d="M20 11v2" />
  </Icon>
);

export const IconPace = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Icon>
);

export const IconCheck = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4.5 12.5 9.5 17.5 19.5 7" />
  </Icon>
);

export const IconBlocked = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M6.2 6.2 17.8 17.8" />
  </Icon>
);

export const IconShield = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3 5 5.8v5.4c0 4.2 2.9 7.6 7 9.3 4.1-1.7 7-5.1 7-9.3V5.8Z" />
    <path d="M9 12.2 11.2 14.5 15.4 10" />
  </Icon>
);

export const IconMic = (p: IconProps) => (
  <Icon {...p}>
    <rect x="9.25" y="2.75" width="5.5" height="11" rx="2.75" />
    <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" />
    <path d="M12 18v3.25" />
  </Icon>
);

export const IconFeed = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 6.5h16" />
    <path d="M4 12h16" />
    <path d="M4 17.5h10" />
  </Icon>
);

export const IconAgent = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3.5 13.9 9 19.5 10.9 13.9 12.8 12 18.3 10.1 12.8 4.5 10.9 10.1 9Z" />
    <path d="M18.5 16.5 19.3 18.7 21.5 19.5 19.3 20.3 18.5 22.5 17.7 20.3 15.5 19.5 17.7 18.7Z" />
  </Icon>
);

export const IconArrowRight = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4.5 12h15" />
    <path d="M13.5 6 19.5 12 13.5 18" />
  </Icon>
);

export const IconArrowLeft = (p: IconProps) => (
  <Icon {...p}>
    <path d="M19.5 12h-15" />
    <path d="M10.5 6 4.5 12l6 6" />
  </Icon>
);

export const IconComment = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20 12.5c0 3.9-3.6 7-8 7a9 9 0 0 1-2.6-.4L4 21l1.3-3.7A6.7 6.7 0 0 1 4 12.5c0-3.9 3.6-7 8-7s8 3.1 8 7Z" />
  </Icon>
);

export const IconSolved = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 20.5V14" />
    <path d="M7 14V4.5h10l-2.2 3.2L17 11H7" />
    <circle cx="7" cy="21" r="1" />
  </Icon>
);

export const IconSun = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="5" />
    <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
  </Icon>
);

export const IconMoon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20.5 14.6A8.6 8.6 0 0 1 9.4 3.5a8.6 8.6 0 1 0 11.1 11.1Z" />
  </Icon>
);

export const IconLock = (p: IconProps) => (
  <Icon {...p}>
    <rect x="4.75" y="10.25" width="14.5" height="10" rx="2" />
    <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
  </Icon>
);

export const IconExternal = (p: IconProps) => (
  <Icon {...p}>
    <path d="M14 4.5h5.5V10" />
    <path d="M19.5 4.5 11 13" />
    <path d="M18 14.5v4a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6h4" />
  </Icon>
);

export const IconWall = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
  </Icon>
);

export const AXIS_ICONS = {
  vision: IconVision,
  hearing: IconHearing,
  motor: IconMotor,
  speech: IconSpeech,
  cognitive: IconPace,
} as const;
