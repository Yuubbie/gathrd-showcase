# Gathrd demo video script and screenshot plan

Everything below is recorded on the **Grace Chapel Demo** church, filled by `supabase/seed/demo_grace_chapel.sql`.
All names, phone numbers and amounts are fictional (phones are `08000xxxxxx`, emails are `example.com`).

**Audience:** pastors, church administrators and cell leaders in Nigeria. **Tone:** warm, practical, plain English.
**One-line promise:** "Know your people, follow up every visitor, and run your church from one place."

---

## 1. Before you record (checklist)

1. **Refresh the data the day before** so dates are current (birthdays, "this week", the latest Sunday):
   `supabase db query --linked -f supabase/seed/demo_grace_chapel.sql`
2. **Log in as Pastor Dee** (senior pastor) for most scenes. Use a private window with no other tabs.
3. **Browser:** Chrome, 1920x1080, zoom 110%, bookmarks bar hidden, notifications off, dark-mode off.
4. **Phone scenes:** record on a real phone (or Chrome device mode 390x844). Install Gathrd to the home screen and allow phone alerts first.
5. **Go live for the QR scene:** on **Attendance**, press **Start service** shortly before filming so the QR code and 6-digit code are live. End it afterwards.
6. **Never show:** the Supabase dashboard, real church names (for example Your church), the Billing page unless you want the plans, or anyone's real number.
7. **Numbers to quote (approximate, the seed changes slightly with the date):** about 140 people, 8 cell groups, 8 departments, Sunday attendance in the 80s and midweek around 40, 36 visitors in 12 weeks, about ₦10 million in recorded giving over 12 weeks.

> **Do not claim in the video:** WhatsApp message sending (not switched on yet), card payments on the public giving page (bank transfer only), or any AI feature.

---

## 2. Master video, about 4 minutes (16:9)

| # | Time | Screen (menu, route) | What to do | What the viewer sees | Voice-over (draft) | On-screen text |
|---|------|----------------------|-----------|----------------------|--------------------|----------------|
| 1 | 0:00-0:12 | Landing page `/` | Slow scroll of the top section | Gathrd name and promise | "Running a church is more than Sunday. It is people, follow-up, giving and growth. Gathrd puts it all in one place." | **Gathrd**, church management for Nigerian churches |
| 2 | 0:12-0:35 | **Today** `/dashboard` | Pause on the dashboard, then hover the cards | Members, visitors, giving this month, people needing follow-up, birthdays, the latest message, cell group activity | "Open Gathrd and you see your church at a glance: who is new, who needs a call, who is celebrating a birthday." | Your church today |
| 3 | 0:35-1:05 | **Attendance** `/attendance` | Show a past service, open the attendance list, then the **missed 3 Sundays** list | Real attendance per service, and members who stopped coming | "Attendance is recorded by QR code or by hand, and Gathrd tells you who has not been seen for three Sundays, so no one slips away." | No one slips away |
| 4 | 1:05-1:25 | Phone: member scans the QR | Scan the live QR (or enter the 6-digit code) | Check-in success screen, then the count rising on the laptop | "Members check themselves in from their phone. The count updates the moment they walk in." | Check in with a scan |
| 5 | 1:25-1:55 | **People** > **Members** `/members`, open one member | Search a name, open a profile, tap **Call** and **WhatsApp** | A complete record: contact, cell group, department, attendance history, giving history | "Every member has one complete record. Call or message in one tap." | One record per person |
| 6 | 1:55-2:25 | **People** > **Visitors**, then **Follow-up** `/follow-up` | Open Follow-Up and Care, show overdue items, change one status | Visitors with assigned follow-up, overdue ones highlighted, notes | "First-timers are assigned to someone the same day. Overdue follow-ups are flagged, so every visitor gets a call." | Every visitor followed up |
| 7 | 2:25-2:45 | **People** > **Converts** `/discipleship` | Show the stages: salvation to membership class | New converts moving through baptism, classes and membership | "Track every new convert from salvation to membership, and see who is stuck." | From salvation to membership |
| 8 | 2:45-3:10 | **Cell Groups** `/cell-groups`, open one group | Show weekly reports, on-time and late, and prayer points | Eight groups, attendance, new faces, testimonies | "Cell leaders submit a short report after each meeting. You see which groups are growing and which have gone quiet." | Cell groups that report |
| 9 | 3:10-3:40 | **Giving** `/giving/transfers`, `/giving/counting`, `/giving/top-givers` | Verify a pending transfer, then show a counted offering and the discrepancy | Bank transfers to verify, two counters agreeing, a flagged mismatch, giving by category | "Giving stays honest. Two people count the offering, finance verifies every transfer, and any difference is flagged." | Honest, transparent giving |
| 10 | 3:40-4:00 | **Reports** `/reports` | Show the monthly report | Attendance, growth, giving and department notes in one report | "At month end, one report for your elders, ready to share." | Reports your leaders will read |
| 11 | 4:00-4:20 | **Announcements** `/announcements`, then **Settings > Alerts & Reminders** | Open an announcement; show the service reminders | Announcements to everyone, a department or a cell group; reminder times per service | "Reach the whole church, one department or one cell group. Set reminders for each service, at the times you choose." | Reach the right people |
| 12 | 4:20-4:35 | Phone: lock screen alert | Show an alert arriving, then the bell inside the app | A lock-screen alert, then the bell list | "Members get alerts on their phone, even when the app is closed." | Alerts on every phone |
| 13 | 4:35-4:50 | End card | Logo and call to action | Gathrd logo, website, "Start your 30-day free trial" | "Start your free trial today and bring your church together." | gathrd.com.ng |

*(Total is closer to 4:50. Trim scenes 7 and 10 for a strict 4 minutes.)*

---

## 3. Short cuts for social media

### 15 seconds, vertical 9:16 (WhatsApp status, Reels)
1. 0-3s: Today dashboard, caption "Your whole church, one screen."
2. 3-8s: Follow-Up screen with an overdue visitor, caption "Never lose a visitor again."
3. 8-12s: Phone check-in by QR, caption "Check in with a scan."
4. 12-15s: Logo + "Free for 30 days."

### 30 seconds, vertical
Today, then QR check-in on a phone, then Follow-Up, then Giving (transfers to verify), then the logo and "Free for 30 days."

### 60 seconds, horizontal or vertical
Scenes 2, 3, 4, 6, 8, 9 and 13 from the master video, with one voice-over line each.

---

## 4. Role-based mini demos (about 45 seconds each)

Set a password for these demo logins first (Supabase: Authentication > Users). They exist after `scripts/create-demo-staff.mjs` is run.

| Role | Login (demo) | Show |
|------|--------------|------|
| **Cell leader** | `demo.cell.apo@example.com` | **Cell Groups**: submit a meeting report with prayer points and testimonies |
| **Finance** | `demo.finance@example.com` | **Giving**: verify a bank transfer and count the offering |
| **Children's teacher** | `demo.children.teacher@example.com` | **Children**: check a child in and out on a Sunday |
| **Head of department** | `demo.ushering.head@example.com` | **Reports**: the department's monthly report |
| **Member** (phone) | `demo.member@example.com` | **My Attendance**, **Giving** (bank details), **Souls** (soul winning), the bell and the **Calendar** |

---

## 5. Screenshot list (static images)

Take each at 1920x1080 on desktop, and the starred ones also on a phone (390x844). Name files exactly as below.

| File | Screen | Notes |
|------|--------|-------|
| `01-today-dashboard.png` * | **Today** | Hero image for the website |
| `02-attendance-history.png` | **Attendance** | Show the last 12 services |
| `03-missed-three-sundays.png` | **Attendance**, missed 3 Sundays | Crop to the list |
| `04-live-service-qr.png` * | **Attendance**, live service | Start a service first |
| `05-members-list.png` * | **Members** | Search box visible |
| `06-member-profile.png` | A member profile | Choose one with attendance and giving history |
| `07-visitors-log.png` | **Visitor Log** | |
| `08-follow-up-dashboard.png` * | **Follow-Up and Care** | Overdue items in view |
| `09-converts-pipeline.png` | **Converts** | All stages visible |
| `10-cell-groups.png` * | **Cell Groups** | |
| `11-cell-group-report.png` | A cell group, weekly reports | |
| `12-children-desk.png` | **Children** | Do this during a live service |
| `13-giving-transfers.png` * | **Bank transfers** | Pending, verified and rejected visible |
| `14-offering-count.png` | **Count offering** | Include the discrepancy |
| `15-top-givers.png` | **Top Givers** | Use only fake names (they are) |
| `16-giving-cash-log.png` | **Cash log** | |
| `17-reports-monthly.png` * | **Reports** | |
| `18-announcements.png` | **Announcements** | |
| `19-announcement-targeting.png` | New announcement form | Show the audience choices |
| `20-calendar.png` | **Calendar** | Month view |
| `21-roster.png` | **Roster** | Order of service and duties |
| `22-message-highlight.png` | **Message** | Latest highlight |
| `23-milestones-birthdays.png` * | **Birthdays and Milestones** | Celebrants today |
| `24-souls-won.png` | **Souls won** | |
| `25-team-roles.png` | **Team** | Staff with their roles |
| `26-alerts-settings.png` | **Settings > Alerts and Reminders** | Three activities with times |
| `27-bell-notifications.png` * | The bell panel (open) | Phone and desktop |
| `28-phone-alert-lockscreen.png` * | A real phone, lock screen | Send a test alert from the bell |
| `29-public-giving-page.png` | `/give/<giving link>` | Bank details visible |
| `30-join-link-qr.png` | Church join or registration link | For the "self sign-up" story |

---

## 6. Voice-over style guide

- Short sentences. Say "your church", "your people", "your visitors".
- Use Nigerian examples: "First-timer on Sunday", "midweek service", "cell group", "tithe and offering", "thanksgiving".
- Name the pain first (lost visitors, unclear offering counts, scattered notebooks and WhatsApp lists), then the fix.
- Avoid technical words such as database, platform, module, dashboard-as-a-word-overuse. Say "screen" or "page".
- Do not promise results ("double your growth"). Promise clarity and follow-through.

## 7. Call to action options

- "Start your 30-day free trial at gathrd.com.ng."
- "Message us on WhatsApp for a free walkthrough." (use the help number in the app)
- "See how it works for your church." (book a demo)

## 8. After recording

1. End the live service you started.
2. Re-run the seed if you want a clean state for the next recording.
3. Delete any test announcement you created during filming.
