# VKU Study Room & Lab Booking

A React Native app for discovering and reserving study rooms at Vietnam–Korea University (VKU). The app uses Expo SDK 57, React Navigation, TanStack Query, Zustand, and Supabase.

Download the installable Android APK from [GitHub Release v1.0.0](https://github.com/duongdatdev/vku-study-room-booking/releases/tag/v1.0.0). The [technical report](output/pdf/Mini-Project-2-Technical-Report.pdf) includes screenshots captured on a Pixel 6 API 36 emulator stored under `D:\Android\avd`.

## Features

- Browse and filter 21 sample rooms, with Supabase room data when configured and local sample data as a browse-only fallback.
- Sign in using a one-time code sent to an `@vku.udn.vn` email address. Supabase Auth persists the session on the device.
- See shared room occupancy through a Realtime feed that contains only the room, date, and time-slot identifiers.
- Create, cancel, and check in to bookings through Supabase. The database owns booking state and prevents two active reservations for the same slot.
- View your own bookings from any signed-in device. Row Level Security prevents one student from reading or changing another student's reservations.
- Show a QR booking reference and schedule a local reminder only after the server confirms a booking.
- Disable online booking if Supabase is not configured, the schedule cannot be reached, or the device is offline.

Booking dates use the campus timezone, `Asia/Ho_Chi_Minh`.

## Requirements

- Node.js 22.13 or later (Expo SDK 57 requirement)
- npm
- Android APK or a native development build (the notification module requires a native build on Android)

## Install and run

```bash
npm install
npx expo start
```

For Android, install the APK from the GitHub Release or build the native app with `npm run android`. After the native app is installed, use `npx expo start` for JavaScript development. Use `npx expo start --web` for the web version. Expo Go cannot run this project's Android notification module on SDK 57.

## Build an installable Android APK

The `preview` profile in [`eas.json`](eas.json) builds a signed APK for direct installation:

```bash
npx eas-cli build -p android --profile preview
```

Configure `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the EAS `preview` environment before building. These values are included in the client app; never configure a `service_role` key there. The build link appears in the Expo build output and the APK is attached to the GitHub Release.

## Configure Supabase

1. Create a Supabase project and copy its project URL and publishable key from **Connect** into `.env` (use `.env.example` as the format). If `.env` already points to your project, keep it.
2. In **SQL Editor**, run [`supabase/schema.sql`](supabase/schema.sql), then [`supabase/seed.sql`](supabase/seed.sql). The app cannot book until `room_occupancy` exists.
3. In **Authentication → Providers → Email**, enable email sign-in; in **Authentication → General**, keep **Allow new users to sign up** on. In **Authentication → Email Templates**, edit **both Confirm signup and Magic Link** to show the six-digit code, for example `<p>Your VKU sign-in code: {{ .Token }}</p>`, instead of only a `{{ .ConfirmationURL }}` link. New accounts receive the Confirm signup template; returning accounts receive the Magic Link template. Save each template.
4. In **Authentication → SMTP Settings**, configure a custom SMTP sender if students outside the Supabase project's team must receive codes. Supabase's default sender only delivers to team member addresses and has a low rate limit. Do not add students as project team members just to receive OTP emails.
5. Restart Expo (`npx expo start`) after changing `.env`. Sign in with a real `@vku.udn.vn` inbox and enter the emailed code.

New VKU email addresses are automatically registered by the app's OTP sign-in flow. They still need a working SMTP sender and access to their inbox. Other email domains are rejected by the app and by the database booking policy.

As captured in the technical report on 25 September 2026, the Android app can browse rooms and select slots, but a live OTP attempt returned `Error sending confirmation email`. Configure custom SMTP (for example, a verified Resend sending domain) before demonstrating a completed reservation or QR pass.

Use only the Supabase publishable key in the app. Never put a secret or `service_role` key in a mobile client.

The app does not need Supabase credentials to browse the bundled sample rooms, but it cannot sign in, load the shared schedule, or create bookings until a project is configured and the SQL is applied.

## Database protections

`supabase/schema.sql` is repeatable and upgrades the earlier demo bookings table. It:

- enables Row Level Security and grants students access only to their own booking records;
- verifies the authenticated VKU email and booking state on the database before writes;
- enforces a partial unique index for active (`confirmed` or `checked-in`) room/date/slot combinations;
- maintains `public.room_occupancy` as a privacy-safe projection for live availability;
- treats the older `rooms.is_available_now` sample value as non-authoritative; live slot badges use `room_occupancy` and show an unknown state outside defined booking slots;
- grants app clients read access to that projection, but no direct write access; and
- adds the occupancy and authenticated booking tables to the `supabase_realtime` publication when it is available.

Booking creation is checked against the Supabase database, so a stale client schedule cannot approve a duplicate reservation. The UI only shows a booking pass after it has read the newly committed booking through the user's RLS policy.

## Project layout

- `src/screens/` — room browsing, room details, sign-in, profile, and booking screens
- `src/services/` — Supabase client, room queries, and booking mutations
- `src/providers/` — persisted auth session and Realtime booking synchronization
- `src/store/useBookingStore.ts` — UI filters and in-memory server snapshots
- `supabase/schema.sql` — database schema, RLS, validation, occupancy projection, and Realtime setup
- `supabase/seed.sql` — sample rooms

## Expo SDK documentation

This project targets [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/). Install Expo modules with `npx expo install` so the package versions match the SDK.
