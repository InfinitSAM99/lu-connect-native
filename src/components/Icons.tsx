import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
// Minimal inline SVG icon set — native version (react-native-svg)
import React from 'react';
import Svg, { Path, Circle, Rect, Polyline } from 'react-native-svg';

type IconProps = {
  color?: string;
  fill?: string;
  width?: number;
  height?: number;
  strokeWidth?: number;
  style?: any;
};

type BaseProps = IconProps & { children: React.ReactNode };

const I = ({
  children,
  color,
  fill,
  width = 20,
  height = 20,
  strokeWidth = 2,
  style,
}: BaseProps) => (
  <Svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={color || '#ffffff'}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    width={width}
    height={height}
    style={style}
  >
    {fill ? (
      <>{React.Children.map(children, (c) =>
        React.isValidElement(c) ? React.cloneElement(c as any, { fill }) : c
      )}</>
    ) : (
      children
    )}
  </Svg>
);

// ---- Navigation ----
export const HomeIcon = (p: IconProps) => <I {...p}><Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z" /></I>;
export const UsersIcon = (p: IconProps) => <I {...p}><Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><Circle cx="9" cy="7" r="4" /><Path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></I>;
export const SearchIcon = (p: IconProps) => <I {...p}><Circle cx="11" cy="11" r="8" /><Path d="m21 21-4.35-4.35" /></I>;
export const MessageIcon = (p: IconProps) => <I {...p}><Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></I>;
export const BellIcon = (p: IconProps) => <I {...p}><Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><Path d="M13.73 21a2 2 0 0 1-3.46 0" /></I>;
export const GroupIcon = (p: IconProps) => <I {...p}><Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><Circle cx="9" cy="7" r="4" /><Path d="M23 21v-2a4 4 0 0 0-3-3.87" /></I>;
export const CalendarIcon = (p: IconProps) => <I {...p}><Rect x="3" y="4" width="18" height="18" rx="2" /><Path d="M16 2v4M8 2v4M3 10h18" /></I>;
export const MegaphoneIcon = (p: IconProps) => <I {...p}><Path d="m3 11 18-5v12L3 14v-3z" /><Path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></I>;
export const BookmarkIcon = (p: IconProps) => <I {...p}><Path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></I>;
export const SettingsIcon = (p: IconProps) => <I {...p}><Circle cx="12" cy="12" r="3" /><Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></I>;

// ---- Post / Feed ----
export const HeartIcon = (p: IconProps) => <I {...p}><Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></I>;
export const CommentIcon = (p: IconProps) => <I {...p}><Path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" /></I>;
export const ShareIcon = (p: IconProps) => <I {...p}><Circle cx="18" cy="5" r="3" /><Circle cx="6" cy="12" r="3" /><Circle cx="18" cy="19" r="3" /><Path d="m8.59 13.51 6.83 3.98M15.41 6.51 8.59 10.49" /></I>;
export const MoreIcon = (p: IconProps) => <I {...p}><Circle cx="12" cy="12" r="1" /><Circle cx="19" cy="12" r="1" /><Circle cx="5" cy="12" r="1" /></I>;
export const ImageIcon = (p: IconProps) => <I {...p}><Rect x="3" y="3" width="18" height="18" rx="2" /><Circle cx="9" cy="9" r="2" /><Path d="m21 15-5-5L5 21" /></I>;
export const TrashIcon = (p: IconProps) => <I {...p}><Path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><Path d="M10 11v6M14 11v6" /></I>;
export const RocketIcon = (p: IconProps) => <I {...p}><Path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><Path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /><Path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" /></I>;
export const FlagIcon = (p: IconProps) => <I {...p}><Path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7" /></I>;
export const LinkIcon = (p: IconProps) => <I {...p}><Path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><Path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></I>;

// ---- Profile info ----
export const GraduationIcon = (p: IconProps) => <I {...p}><Path d="M22 10v6M2 10l10-5 10 5-10 5z" /><Path d="M6 12v5c3 3 9 3 12 0v-5" /></I>;
export const BookIcon = (p: IconProps) => <I {...p}><Path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></I>;
export const MapPinIcon = (p: IconProps) => <I {...p}><Path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" /><Circle cx="12" cy="10" r="3" /></I>;
export const HomePlaceIcon = (p: IconProps) => <I {...p}><Path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z" /></I>;
export const BedIcon = (p: IconProps) => <I {...p}><Path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9" /></I>;
export const RingIcon = (p: IconProps) => <I {...p}><Circle cx="12" cy="16" r="5" /><Path d="m9 6 3 5 3-5-3-3z" /></I>;
export const CakeIcon = (p: IconProps) => <I {...p}><Path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" /><Path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1" /><Path d="M2 21h20" /><Path d="M7 8v3M12 8v3M17 8v3" /><Path d="M7 4h.01M12 4h.01M17 4h.01" /></I>;
export const StarIcon = (p: IconProps) => <I {...p}><Path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" /></I>;
export const HandshakeIcon = (p: IconProps) => <I {...p}><Path d="m11 17 2 2a1 1 0 1 0 3-3" /><Path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4" /><Path d="m21 3 1 11h-2M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3M3 4h8" /></I>;
export const FollowersIcon = (p: IconProps) => <I {...p}><Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><Circle cx="9" cy="7" r="4" /><Path d="M22 21v-2a4 4 0 0 0-3-3.87" /><Path d="M16 3.13a4 4 0 0 1 0 7.75" /></I>;

// ---- Actions / status ----
export const CheckIcon = (p: IconProps) => <I {...p}><Path d="M20 6 9 17l-5-5" /></I>;
export const CheckCircleIcon = (p: IconProps) => <I {...p}><Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><Path d="m9 11 3 3L22 4" /></I>;
export const XCircleIcon = (p: IconProps) => <I {...p}><Circle cx="12" cy="12" r="10" /><Path d="m15 9-6 6M9 9l6 6" /></I>;
export const WarningIcon = (p: IconProps) => <I {...p}><Path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z" /><Path d="M12 9v4M12 17h.01" /></I>;
export const HourglassIcon = (p: IconProps) => <I {...p}><Path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" /></I>;

// ---- App / Misc ----
export const CameraIcon = (p: IconProps) => <I {...p}><Path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z" /><Circle cx="12" cy="13" r="3" /></I>;
export const PaletteIcon = (p: IconProps) => <I {...p}><Circle cx="13.5" cy="6.5" r=".5" /><Circle cx="17.5" cy="10.5" r=".5" /><Circle cx="8.5" cy="7.5" r=".5" /><Circle cx="6.5" cy="12.5" r=".5" /><Path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" /></I>;
export const FireIcon = (p: IconProps) => <I {...p}><Path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></I>;
export const UsersFollowIcon = (p: IconProps) => <I {...p}><Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><Circle cx="9" cy="7" r="4" /><Path d="M22 21v-2a4 4 0 0 0-3-3.87" /><Path d="M16 3.13a4 4 0 0 1 0 7.75" /></I>;

// ---- Theme ----
export const SunIcon = (p: IconProps) => <I {...p}><Circle cx="12" cy="12" r="4" /><Path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></I>;
export const MoonIcon = (p: IconProps) => <I {...p}><Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></I>;

// ---- System ----
export const LogoutIcon = (p: IconProps) => <I {...p}><Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></I>;
export const XIcon = (p: IconProps) => <I {...p}><Path d="M18 6 6 18M6 6l12 12" /></I>;
export const Lock = (p: IconProps) => <I {...p}><Rect x="3" y="11" width="18" height="11" rx="2" /><Path d="M7 11V7a5 5 0 0 1 10 0v4" /></I>;

// ---- Settings-specific ----
export const UserIcon = (p: IconProps) => <I {...p}><Path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><Circle cx="12" cy="7" r="4" /></I>;
export const PencilIcon = (p: IconProps) => <I {...p}><Path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" /></I>;
export const AtSignIcon = (p: IconProps) => <I {...p}><Circle cx="12" cy="12" r="4" /><Path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" /></I>;
export const ShieldCheckIcon = (p: IconProps) => <I {...p}><Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><Path d="m9 12 2 2 4-4" /></I>;

// ---- Messaging / Chat ----
export const PaperclipIcon = (p: IconProps) => <I {...p}><Path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></I>;
export const MicIcon = (p: IconProps) => <I {...p}><Rect x="9" y="2" width="6" height="12" rx="3" /><Path d="M19 10a7 7 0 0 1-14 0M12 19v4M8 23h8" /></I>;
export const SmileyIcon = (p: IconProps) => <I {...p}><Circle cx="12" cy="12" r="10" /><Path d="M8 14s1.5 2 4 2 4-2 4-2" /><Path d="M9 9h.01M15 9h.01" /></I>;
export const DownloadIcon = (p: IconProps) => <I {...p}><Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></I>;
export const BanIcon = (p: IconProps) => <I {...p}><Circle cx="12" cy="12" r="10" /><Path d="m4.93 4.93 14.14 14.14" /></I>;
export const EyeIcon = (p: IconProps) => <I {...p}><Path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" /><Circle cx="12" cy="12" r="3" /></I>;
export const ReplyIcon = (p: IconProps) => <I {...p}><Polyline points="9 17 4 12 9 7" /><Path d="M20 18v-2a4 4 0 0 0-4-4H4" /></I>;

// ---- Video ----
export const VideoIcon = (p: IconProps) => <I {...p}><Rect x="2" y="6" width="14" height="12" rx="2" /><Path d="m22 8-4 4 4 4V8z" /></I>;

// ---- Chevrons ----
export const ChevronRightIcon = (p: IconProps) => <I {...p}><Path d="m9 18 6-6-6-6" /></I>;
export const ChevronDownIcon = (p: IconProps) => <I {...p}><Path d="m6 9 6 6 6-6" /></I>;

// ---- Preferences extras ----
export const VibrateIcon = (p: IconProps) => <I {...p}><Rect x="8" y="2" width="8" height="20" rx="2" /><Path d="M4 8v8M20 8v8M2 10v4M22 10v4" /></I>;
export const SpeakerIcon = (p: IconProps) => <I {...p}><Path d="M11 5 6 9H2v6h4l5 4z" /><Path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" /></I>;
export const PostsIcon = (p: IconProps) => <I {...p}><Rect x="3" y="4" width="18" height="16" rx="2" /><Path d="M3 9h18" /><Path d="M7 14h6M7 17h10" /></I>;
export const PhoneIcon = (p: IconProps) => <I {...p}><Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></I>;
export const MailIcon = (p: IconProps) => <I {...p}><Rect x="2" y="4" width="20" height="16" rx="3" /><Path d="m2 7 10 6 10-6" /></I>;
export const AlertTriangleIcon = (p: IconProps) => <I {...p}><Path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z" /><Path d="M12 9v4M12 17h.01" /></I>;
export const ClockIcon = (p: IconProps) => <I {...p}><Circle cx="12" cy="12" r="10" /><Path d="M12 6v6l4 2" /></I>;

// ---- Media ----
export const PlayIcon = (p: IconProps) => <I {...p}><Path d="m5 3 14 9-14 9V3z" /></I>;
