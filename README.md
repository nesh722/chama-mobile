# Chama Savings Management App — Mobile

A mobile app for managing chama (group savings association) activity: contributions, loans, payout rotations, savings targets, and reporting — with role-based permissions enforced on the backend, not just the UI.

Built as a 4th-year Computer Science final year project.

## Tech Stack

- **Framework:** React Native with [Expo](https://expo.dev) (Expo Router, file-based routing)
- **Language:** TypeScript
- **State/Theming:** React Context (`ThemeContext`), AsyncStorage-persisted light/dark/system mode
- **Backend:** Node.js + Express + MySQL (raw SQL) — see the [backend repo](#) for setup
- **Key native modules:** `react-native-qrcode-svg`, `expo-clipboard`, `expo-file-system`, `expo-sharing`, `@react-native-community/datetimepicker`, `react-native-keyboard-aware-scroll-view`

## Features

### Authentication
- Register / login (JWT-based)
- Email-based password reset (real emailed reset code)
- Profile editing: name, phone, email, password, profile picture, account deletion

### Groups
- Create a group (creator becomes treasurer)
- Join via QR code or shareable invite link (with a public preview before logging in)
- Role management (chair/treasurer/secretary/member), member removal, group deletion

### Contributions
- Log contributions (self or on a member's behalf, if treasurer)
- Automatic cycle tracking (monthly/weekly — computed server-side, not typed by hand)
- Defaulters list per cycle

### Loans
- Request, approve/reject, repay
- Due dates with overdue detection and notification
- One outstanding loan per group at a time

### Payout Rotations
- Treasurer/chair sets rotation order
- Mark-next-payout with automatic amount calculation

### Savings Target
- Per-cycle target with on-track/behind status per member
- Includes both regular contributions and voluntary "Extra Savings" deposits

### Reports
- Five report types: Contributions, Loans, Payouts, Savings Target, Full Summary
- Role-scoped: regular members see their own data, treasurer/chair sees the whole group
- Export to CSV or PDF, shared via the native share sheet

### Notifications
- In-app notification list with unread badge on Home
- Clear-all with confirmation prompt

### Activity Feed
- Personal history log of every action across groups, loans, contributions, and payouts

### Dark Mode
- Full light/dark/system theme support across every screen

## Project Structure

```
src/
├── app/                  # Expo Router screens (file-based routing)
│   ├── (tabs)/            # Bottom tab screens: Home, Groups, Activity, Profile
│   ├── group/              # Group Details and its internal tabs
│   └── join/                # Invite link landing screen
├── components/            # Shared UI components (ReportsTab, logo, etc.)
│   └── ui/
├── constants/              # App-wide constants
├── context/                # ThemeContext and other React Context providers
├── hooks/                  # Custom hooks
└── services/               # API client layer (one file per domain: auth, groups,
                              contributions, loans, payouts, savings, notifications,
                              activity, reports)
```

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure the API base URL**

   Set `API_BASE_URL` in `src/config/api.js` to point at your running backend (see the backend README for setup). This is typically your machine's local network IP (e.g. `http://192.168.x.x:5000/api`) when testing on a physical device with Expo Go, so you'll need to update it to match your own network rather than reuse the committed value as-is.

3. **Start the app**
   ```bash
   npx expo start
   ```

   Scan the QR code with [Expo Go](https://expo.dev/go), or press `a` / `i` for an Android emulator / iOS simulator.

## Known Limitations / Technical Debt

- Deep linking (`mobile://` scheme) has only been tested through Expo Go's `exp://` development format, not as a standalone/dev-client build
- Broader real-device testing (multiple accounts/devices, edge cases) is ongoing for recently added features: QR invites, loan due dates, Extra Savings, Reports

## Roadmap

- [ ] Finish the in-app logo component
- [ ] Expand real-device test coverage
- [ ] Project documentation (SRS, ERD, architecture diagrams, testing chapter)