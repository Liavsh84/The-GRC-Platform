# The GRC Platform

A comprehensive, web-based **Governance, Risk & Compliance (GRC)** platform built for GRC professionals and managers. Manage your organization's policies, risk register, compliance frameworks, and generate board-ready reports — all in one place.

---

## Features

### Governance
- Central document repository (policies, procedures, standards, guidelines)
- Filter by type, department, and status
- **List view** + **visual hierarchy graph view**
- Full document editor with version tracking
- Export to CSV or PDF

### Risk Management
- Interactive **5×5 risk heat map**
- Full **risk register** with probability & impact scoring
- Automatic risk level calculation (Critical / High / Medium / Low)
- NIST RMF, ISO 27001, COSO ERM framework references
- Expandable rows with treatment plans
- Export to CSV or PDF

### Compliance
- Track any framework, standard, regulation, or law (ISO 27001, NIST CSF, GDPR, PCI DSS, etc.)
- **Gap analysis** per framework with control-level tracking
- Status tracking: Compliant / Partial / Non-Compliant / N/A
- Owner and due date assignment
- Visual progress bars and stacked charts
- Export per-framework gap analysis to CSV or PDF

### Reports
- **Executive Summary** — board-ready overview with KPIs and charts
- **Governance Report** — full document inventory
- **Compliance Status Report** — framework-by-framework gap summary
- **Risk Register Report** — complete risk register
- All reports export to **PDF**

### Administration
- Role-based access control (Admin / User)
- Admin-only user management panel
- Add, edit, and delete platform users

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or higher
- npm v9 or higher

### Installation

```bash
# Clone the repository
git clone https://github.com/Liavsh84/the-grc-platform.git
cd the-grc-platform

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open `http://localhost:5173` in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

---

## Default Credentials

| Role  | Username | Password   |
|-------|----------|------------|
| Admin | `admin`  | `admin123` |
| User  | `jsmith` | `user123`  |
| User  | `mjones` | `user123`  |

> **Note:** Change passwords after first login for production use.

---

## Tech Stack

| Technology | Purpose |
|---|---|
| React 18 | UI framework |
| React Router v6 | Client-side routing |
| Tailwind CSS | Styling |
| Recharts | Charts and visualizations |
| jsPDF + jspdf-autotable | PDF export |
| Lucide React | Icons |
| localStorage | Data persistence (no backend required) |

---

## Data Persistence

All data is stored in the browser's **localStorage**. This means:
- Data persists across browser sessions
- Each browser/device has its own data
- For multi-user production use, a backend database would be needed

---

## License

MIT
