# Tech Management Helper - User Manual

**Version**: 1.0
**Last Updated**: 2026-01-28
**Product**: Tech Management Helper

---

## Introduction

Tech Management Helper is a GRC (Governance, Risk, and Compliance) platform designed for Technology Managers in regulated industries. It provides unified visibility across multiple compliance frameworks (NIST CSF, ISO 27001, COBIT, IT4IT), risk management, control tracking, and asset inventory management.

### Who Is This For?

- **Technology Managers** - Demonstrate compliance, track risks across IT portfolio
- **GRC Analysts** - Efficiently assess controls, track remediation, prepare audit evidence
- **IT Asset Owners** - Maintain accurate inventory, understand asset risk exposure
- **Executive Sponsors** - Board-ready compliance reports, risk trend visibility

### Key Features

- Compliance Dashboard with framework metrics across NIST CSF, ISO 27001, COBIT, IT4IT
- IT4IT Value Stream Visualization (S2P, R2D, R2F, D2C)
- Risk Register with 5x5 matrix visualization
- Control Catalog with framework mapping
- Control Assessment workflow with approval process
- Asset Inventory with CSV import
- Role-Based Access Control (Admin, Manager, Analyst, Viewer)
- 7-year audit log retention

---

## Getting Started

### Logging In

1. Navigate to the Tech Management Helper URL
2. Enter your email and password
3. Click "Log In"
4. You'll be directed to the dashboard based on your role

### Dashboard Overview

The main dashboard displays:
- **Compliance Percentages** - For each framework (NIST CSF, ISO 27001, COBIT, IT4IT)
- **IT4IT Value Streams** - S2P, R2D, R2F, D2C with phase compliance
- **Quick Stats** - Total risks, controls, assets, recent assessments

---

## Managing Risks

### Viewing the Risk Register

1. Click "Risks" in the sidebar
2. View all risks in paginated list format
3. Each risk shows: Title, Category, Likelihood × Impact Score, Status, Owner

### Creating a New Risk

1. Navigate to Risks page
2. Click "Add Risk" button
3. Fill in required fields:
   - **Title**: Brief description (e.g., "Data breach via phishing")
   - **Description**: Detailed explanation
   - **Category**: Technology, Security, Compliance, etc.
   - **Likelihood**: 1-5 (1=Rare, 5=Almost Certain)
   - **Impact**: 1-5 (1=Insignificant, 5=Catastrophic)
   - **Status**: Identified, Analyzing, Mitigating, Monitoring, Closed
   - **Owner**: Assigned person
4. Click "Save"

### Risk Matrix View

1. Click "Risk Matrix" tab
2. View 5x5 grid with risks plotted by Likelihood × Impact
3. Click any cell to see risks in that category
4. High risks (15-25) appear in red cells

### Linking Risks to Controls and Assets

1. Open a risk detail page
2. Click "Link Controls" to associate mitigating controls
3. Click "Link Assets" to show which assets are exposed
4. Linked items appear in risk detail view

---

## Managing Controls

### Viewing the Control Catalog

1. Click "Controls" in the sidebar
2. View paginated list of all controls
3. Filter by: Framework, Status, Category
4. Search by code or title

### Creating a New Control

1. Click "Add Control"
2. Fill in details:
   - **Code**: Unique identifier (e.g., AC-01, PR.AC-1)
   - **Title**: Short description
   - **Description**: Detailed control statement
   - **Category**: Access Control, Network Security, etc.
   - **Status**: Not Implemented, Partially Implemented, Implemented, Monitored
   - **Owner**: Responsible person
3. Click "Save"

### Mapping Controls to Frameworks

1. Open control detail page
2. Click "Map to Framework"
3. Select framework (NIST CSF, ISO 27001, COBIT, IT4IT)
4. Enter framework reference (e.g., PR.AC-1 for NIST CSF)
5. Save mapping

### Assessing a Control

1. Navigate to control detail page
2. Click "New Assessment"
3. Fill assessment form:
   - **Rating**: 1-5 (1=Ineffective, 5=Highly Effective)
   - **Findings**: What you observed
   - **Recommendations**: Improvement suggestions
   - **Evidence**: Links or file references
4. Click "Save as Draft" or "Submit for Approval"
5. Manager reviews and approves/rejects

---

## Managing Assets

### Viewing Asset Inventory

1. Click "Assets" in the sidebar
2. View all IT assets in paginated list
3. Filter by: Type, Criticality, Status
4. Search by name or identifier

### Adding an Asset Manually

1. Click "Add Asset"
2. Fill in details:
   - **Name**: Asset name (e.g., "Production Web Server")
   - **Type**: Server, Workstation, Network Device, etc.
   - **Criticality**: Low, Medium, High, Critical
   - **Owner**: Responsible person
   - **Metadata**: Serial number, IP address, etc. (JSON format)
3. Click "Save"

### Importing Assets from CSV

1. Click "Import CSV" button
2. Download CSV template
3. Fill template with asset data
4. Upload completed CSV file
5. Review preview with any errors highlighted
6. Confirm import
7. Choose "Update" or "Skip" for duplicates

---

## Framework Library

### Viewing Frameworks

1. Click "Frameworks" in the sidebar
2. View available frameworks: NIST CSF, ISO 27001, COBIT, IT4IT
3. Click a framework to view categories and requirements
4. See compliance percentage (controls implemented vs. total)

### Understanding IT4IT Value Streams

**Strategy to Portfolio (S2P)**: Manage demand, portfolio planning, investment tracking
**Requirement to Deploy (R2D)**: Development lifecycle, releases, deployments
**Request to Fulfill (R2F)**: Service catalog, request management, fulfillment
**Detect to Correct (D2C)**: Event monitoring, incident management, change control

Click any value stream phase to see:
- Mapped controls
- Compliance percentage
- Associated risks

---

## Reports and Analytics

### Generating PDF Reports

1. Navigate to Reports page
2. Select report type:
   - **Risk Register**: All risks with details
   - **Compliance Summary**: Framework compliance status
   - **Control Assessment Report**: Assessment results
3. Click "Generate Report"
4. Wait for processing (progress indicator shown)
5. Click "Download" when ready

### Exporting Data

1. Navigate to any list view (Risks, Controls, Assets)
2. Apply desired filters
3. Click "Export CSV"
4. CSV file downloads with filtered results

---

## User Settings

### Updating Your Profile

1. Click your name in the top-right corner
2. Select "Settings"
3. Update email, password, or preferences
4. Click "Save Changes"

### Managing API Keys (Admin only)

1. Go to Settings → API Keys
2. Click "Generate New Key"
3. Copy key immediately (shown only once)
4. Use key for programmatic access
5. Revoke keys as needed

---

## Role-Based Access

### User Roles

**Admin**: Full access, manage users, settings, API keys
**Manager**: Create, edit, approve assessments, generate reports
**Analyst**: Create and edit risks, controls, assets; submit assessments
**Viewer**: Read-only access to all data

### What You Can Do By Role

| Action | Admin | Manager | Analyst | Viewer |
|--------|-------|---------|---------|--------|
| View Dashboard | ✓ | ✓ | ✓ | ✓ |
| Create/Edit Risks | ✓ | ✓ | ✓ | ✗ |
| Create/Edit Controls | ✓ | ✓ | ✓ | ✗ |
| Approve Assessments | ✓ | ✓ | ✗ | ✗ |
| Manage Users | ✓ | ✗ | ✗ | ✗ |
| Generate Reports | ✓ | ✓ | ✓ | ✗ |

---

## Best Practices

### Risk Management

- Review risk register monthly
- Update risk status as mitigation progresses
- Link all risks to mitigating controls
- Use consistent risk categories across the organization

### Control Management

- Map all controls to relevant frameworks
- Conduct control assessments annually (minimum)
- Document evidence for every assessment
- Keep control descriptions current

### Asset Management

- Update asset inventory quarterly
- Tag assets with criticality based on business impact
- Link high-risk assets to risk register
- Decommission outdated assets promptly

---

## Troubleshooting

**Issue: Can't log in**
- Verify email and password
- Check Caps Lock
- Use "Reset Password" link if needed

**Issue: Compliance percentages seem wrong**
- Ensure all controls are mapped to frameworks correctly
- Check control statuses are up to date
- Refresh the dashboard

**Issue: CSV import fails**
- Download the template and verify format
- Check for special characters in data
- Ensure required fields are filled
- Review error messages for specific issues

**Issue: Reports take too long to generate**
- Large datasets may take 1-2 minutes
- Simplify filters to reduce data volume
- Contact support if consistent delays occur

---

**End of User Manual**
