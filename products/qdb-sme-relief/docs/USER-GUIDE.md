# QDB SME Relief Portal — Applicant User Guide
# دليل المتقدم — بوابة دعم المنشآت الصغيرة والمتوسطة

**For**: SME owners and authorized signatories applying for NRGP relief
**Language**: English (Arabic translations shown for all key steps)
**Version**: 1.0 | March 2026

---

## Table of Contents

1. [Before You Start — Prerequisites](#1-before-you-start--prerequisites)
2. [Step 1: Visit the Portal and Select Your Language](#2-step-1-visit-the-portal-and-select-your-language)
3. [Step 2: Login with Tawtheeq / النقطة 2: تسجيل الدخول بتوثيق](#3-step-2-login-with-tawtheeq)
4. [Step 3: Enter Your CR Number / النقطة 3: إدخال رقم السجل التجاري](#4-step-3-enter-your-cr-number)
5. [Step 4: Review Eligibility Result / النقطة 4: مراجعة نتيجة الأهلية](#5-step-4-review-eligibility-result)
6. [Step 5: Upload Your Documents / النقطة 5: رفع المستندات](#6-step-5-upload-your-documents)
7. [Step 6: Review and Submit / النقطة 6: المراجعة والتقديم](#7-step-6-review-and-submit)
8. [Step 7: Track Your Application Status](#8-step-7-track-your-application-status)
9. [Document Requirements Checklist](#9-document-requirements-checklist)
10. [Understanding Your Result](#10-understanding-your-result)
11. [Auto-Disbursement vs Manual Review](#11-auto-disbursement-vs-manual-review)
12. [Application Status Guide](#12-application-status-guide)
13. [Frequently Asked Questions](#13-frequently-asked-questions)
14. [Contact QDB Support](#14-contact-qdb-support)

---

## 1. Before You Start — Prerequisites

Before applying, ensure you have the following ready. Missing any of these will interrupt your
application mid-way.

### Required Before You Begin

| Item | Details |
|------|---------|
| **Tawtheeq account** | Your active Qatar National Authentication account linked to your QID. If you do not have one, see Section 2. |
| **CR Number** | Your company's 10-digit Commercial Registration number (must be active and not expired). |
| **Authorized signatory status** | You must be listed as an authorized signatory for the company in MOCI records. |
| **WPS file** | Your company's most recent WPS (Wage Protection System) export from the Ministry of Labour portal. The file must be in CSV format and cover the last 90 days. |
| **Salary evidence** | Bank transfer confirmations or payroll run reports showing recent salary payments. |
| **Rent evidence** | If applicable: your commercial lease agreement and most recent rent payment receipts. |
| **CR copy** | A scanned copy of your Commercial Registration certificate. |

### What You Do NOT Need to Prepare

- You do not need to fill in any company details manually — the portal retrieves your company information
  directly from the Ministry of Commerce and Industry (MOCI).
- You do not need to calculate your relief amount — the portal calculates this from your WPS records.

---

## 2. Step 1: Visit the Portal and Select Your Language

Navigate to the QDB SME Relief Portal at:

```
https://sme-relief.qdb.com.qa
```

On the home page, you will see:
- A language selector (Arabic / English) — choose your preferred language
- A brief overview of the program and what you need to prepare
- A button: **Apply for Relief** / **تقديم طلب الإغاثة**

Your language choice is saved for your entire session and for future visits.

> **Important**: The portal only accepts applications during the program's active window. If the
> program has closed, the home page will show a closure notice and you can still track an
> existing application.

---

## 3. Step 2: Login with Tawtheeq
## النقطة 2: تسجيل الدخول بتوثيق

Clicking "Apply for Relief" redirects you to Tawtheeq (Qatar's National Authentication Service).

**What to do**:
1. Enter your QID and Tawtheeq password
2. Complete the biometric or OTP verification as prompted by Tawtheeq
3. You will be automatically redirected back to the portal once authentication is complete

**Common issues**:

| Problem | Solution |
|---------|---------|
| Tawtheeq login failed | Check your credentials. Your Tawtheeq password may differ from your QDB portal password. Try resetting at the Tawtheeq website. |
| "Authentication service temporarily unavailable" | The national service is experiencing downtime. Wait 30 minutes and try again. Contact QDB Operations if it continues. |
| "I don't have a Tawtheeq account" | Click the link on the home page for NAS registration instructions. Contact QDB Operations for assisted onboarding. |

> **Security note**: Your Tawtheeq credentials are never shared with or stored by the QDB portal.
> Authentication happens entirely on the Tawtheeq system. The portal only receives confirmation
> that you authenticated successfully and your QID.

---

## 4. Step 3: Enter Your CR Number
## النقطة 3: إدخال رقم السجل التجاري

After login, you arrive at the Company Verification screen.

**What to do**:
1. Enter your company's 10-digit CR number in the field provided
2. Click **Verify Company** / **التحقق من الشركة**
3. The portal queries the Ministry of Commerce and Industry (MOCI) in real time

**What happens next**:
- If your CR is active and you are an authorized signatory: your company details appear (company
  name in Arabic and English, sector, registration date, employee count)
- Review the displayed details — they are read-only and sourced directly from MOCI
- Click **Confirm and Continue** / **تأكيد والمتابعة** to proceed

**If you see an error**:

| Error Message | Meaning | What to Do |
|---------------|---------|------------|
| "CR number not found in MOCI" | The number you entered could not be found | Check for typos; verify your CR number on your registration certificate |
| "Your CR is inactive / expired" | MOCI shows your CR is not active | Renew your CR at MOCI before applying |
| "You are not listed as an authorized signatory" | Your QID is not on MOCI's signatory list for this company | Contact QDB Operations with your authorization documentation |
| "Company verification temporarily unavailable" | MOCI API is down | Wait 10 minutes and try again; your progress is saved |

> **Note on authorized signatory check**: If MOCI does not return signatory data for your company
> (a known data gap in some older registrations), the portal will ask you to confirm with a
> statutory declaration: "I confirm that I am legally authorized to submit this application on
> behalf of [Company Name]." This declaration is recorded in the audit trail.

---

## 5. Step 4: Review Eligibility Result
## النقطة 4: مراجعة نتيجة الأهلية

After company verification, the portal automatically evaluates your company's eligibility for the
NRGP program. This takes less than 5 seconds.

### The 7 Eligibility Criteria

| Code | Criterion | Details |
|------|-----------|---------|
| EC-001 | Active Commercial Registration | Your CR must be in active status at MOCI |
| EC-002 | Company registered before 01/01/2024 | Company must have been registered for at least 12 months |
| EC-003 | SME classification | Fewer than 250 employees, or annual revenue under QAR 30 million |
| EC-004 | Active WPS enrollment | Company must be enrolled and active in the Wage Protection System |
| EC-005 | Impacted sector or revenue decline | Operating in a sector affected by geopolitical disruption, or declared revenue decline |
| EC-006 | No QDB non-performing loans | No outstanding non-performing loans with Qatar Development Bank |
| EC-007 | No judicial dissolution | Company has no judicial dissolution order |

### If Your Company is Eligible

You will see a confirmation: **Your company is eligible for NRGP relief** / **شركتك مؤهلة للحصول على إغاثة NRGP**

The portal immediately checks the NRGP beneficiary list and tells you whether your application
will be processed automatically (returning NRGP beneficiary) or sent for QDB review (new applicant).

You then proceed automatically to the Document Upload step.

### If Your Company is Ineligible

The portal shows exactly which criteria your company failed, with:
- The specific reason in plain language (Arabic and English)
- The data value that caused the failure (e.g., "CR expired on 15/06/2023")
- A recommended action if one exists (e.g., "Renew CR at MOCI before applying")
- QDB Operations contact details for borderline cases

**An ineligibility result is not permanent.** If your circumstances change (e.g., you renew an
expired CR), you may apply again.

---

## 6. Step 5: Upload Your Documents
## النقطة 5: رفع المستندات

The document upload screen shows four sections. Each section has a file upload area.

### Document Sections

| Section | Required? | Accepted Formats | Max Size |
|---------|-----------|-----------------|----------|
| Salary Payment Evidence | Yes | PDF, JPEG, PNG, TIFF | 10 MB per file |
| WPS File | Yes | CSV (Ministry of Labour format) | 10 MB |
| Rent Evidence | Optional | PDF, JPEG, PNG, TIFF | 10 MB per file |
| Company Documents | Yes | PDF, JPEG, PNG, TIFF | 10 MB per file |

**Total upload limit**: 50 MB across all documents for one application.

### Uploading Your WPS File

The WPS file is your company's payroll export from the Ministry of Labour WPS portal. When you
upload this file:

1. The portal parses it automatically
2. You will see a summary: employee count, total monthly payroll (last 90 days), payment date range
3. The portal may cross-check this data against Ministry of Labour records
4. If there is a difference of more than 10% between your uploaded file and the system's records,
   you will see a **yellow warning** (not a block): "There is a discrepancy. Your application will
   continue but will be flagged for QDB review."

### Document Status Indicators

| Indicator | Meaning |
|-----------|---------|
| Green checkmark | Document uploaded, validated, and accepted |
| Yellow warning | Document uploaded but has a minor issue (e.g., WPS discrepancy) — application can proceed |
| Red error icon | Document rejected (wrong format, too large, or failed virus scan) — must be replaced |
| Grey "Not provided" | Optional document not uploaded — application can still proceed |

### The Submit Button

The **Submit Application** button is only active when:
- All required documents (salary evidence, WPS file, company documents) show a green checkmark
- No documents have a red error icon

If you need to replace a document, click the remove icon next to it and upload a new version.

---

## 7. Step 6: Review and Submit
## النقطة 6: المراجعة والتقديم

Before submitting, the Review screen shows a complete summary of your application:

- Your verified company information (from MOCI)
- Your eligibility result and the criteria checked
- Your disbursement path (automatic or manual review)
- Your uploaded documents list with validation status
- Your WPS validation result

Review all details carefully. Click **Submit Application** / **تقديم الطلب** when ready.

### After Submission

You immediately see a **Confirmation Screen** with:
- Your **Case Reference Number** (format: `QDB-RELIEF-2026-XXXXX` or `CAS-2026-XXXXX`)
- The expected timeline for your application path
- A link to track your application status

**Save your Case Reference Number.** You will need it if you contact QDB Operations.

An email confirmation (and SMS if you provided a mobile number) is sent to you within 5 minutes.

---

## 8. Step 7: Track Your Application Status

Log back into the portal at any time to check your status at:

```
https://sme-relief.qdb.com.qa/status
```

The status page shows:
- Your current application status (see Section 12 for all status meanings)
- A chronological timeline of all status changes with timestamps
- Your Case Reference Number and CRM Case ID
- The next expected step

The portal syncs with QDB's Dynamics CRM every 5 minutes. If a QDB Relationship Manager updates
your case status, you will see it reflected within 5 minutes.

You also receive email and SMS notifications when your status changes.

---

## 9. Document Requirements Checklist

Use this checklist before uploading:

### Salary Payment Evidence
- [ ] Bank transfer confirmation showing salary payments, OR
- [ ] Payroll run report from your payroll software
- [ ] Document covers recent months (last 90 days)
- [ ] Company name and CR number are visible on the document
- [ ] File format: PDF, JPEG, PNG, or TIFF
- [ ] File size: under 10 MB

### WPS File
- [ ] Downloaded from the Ministry of Labour WPS portal (not manually created)
- [ ] File format: CSV (Ministry of Labour standard export format)
- [ ] Data covers the last 90 days
- [ ] Filename should not be modified from the system export name

### Rent Evidence (if applicable)
- [ ] Copy of your commercial lease agreement showing: property address, monthly rent amount, lease term
- [ ] Most recent rent payment receipt or bank transfer confirmation
- [ ] If you have no commercial lease (home-based business or free zone), skip this section

### Company Documents
- [ ] Scanned copy of your Commercial Registration certificate
- [ ] Any applicable business licenses (up to 5 files)
- [ ] Documents should be clear and legible scans
- [ ] File format: PDF, JPEG, PNG, or TIFF, under 10 MB each

---

## 10. Understanding Your Result

### Eligible

Your company passed all 7 NRGP eligibility criteria. Proceed to upload your documents.

The portal will also tell you whether your company is:
- **Listed in the NRGP beneficiary list** (previous NRGP activation): automatic disbursement path
- **Not listed**: manual review path — a QDB Relationship Manager will assess your application

### Ineligible

One or more eligibility criteria were not met. The portal shows exactly which criteria failed and
why.

**Common ineligibility reasons and actions**:

| Reason | Action |
|--------|--------|
| CR is expired or inactive | Renew your Commercial Registration at MOCI |
| Company registered after 01/01/2024 | Company does not yet meet the 12-month registration requirement |
| QDB non-performing loan on record | Contact your QDB Relationship Manager to discuss your loan status |
| Sector not covered in current cycle | Contact QDB Operations — your sector may have been added to the covered list |
| Employee count above SME threshold | Verify your employee count with MOCI; contact QDB if you believe the count is incorrect |

If you believe you were incorrectly determined ineligible, contact QDB Operations with your Case
Reference Number.

---

## 11. Auto-Disbursement vs Manual Review

### Auto-Disbursement Path (Returning NRGP Beneficiaries)

You are on this path if your company's CR number was in QDB's NRGP beneficiary list from the
COVID-19 activation.

**What to expect**:
- Your CRM case is created automatically with status `pending_disbursement`
- No QDB Relationship Manager review is required
- Target processing time: less than 1 business day from submission
- You will receive a confirmation that your case is in automatic processing

### Manual Review Path (New Applicants)

You are on this path if your company was not in the prior NRGP beneficiary list.

**What to expect**:
- Your CRM case is created with status `pending_review`
- A QDB Relationship Manager is assigned to your case
- Target processing time: within 5 business days of submission
- You will receive status notifications as your case progresses

**Both paths result in the same outcome** if approved — funds disbursed from QDB to your company's
bank account.

---

## 12. Application Status Guide

| Status | Arabic | Meaning |
|--------|--------|---------|
| `Draft` | مسودة | Your application is in progress but not yet submitted |
| `Submitted` | مقدم | Application submitted and received by QDB system |
| `Under Review` | قيد المراجعة | A QDB Relationship Manager is reviewing your application |
| `Approved` | موافق عليه | Your application has been approved for disbursement |
| `Rejected` | مرفوض | Your application was not approved — reason shown in the portal |
| `Disbursed` | تم الصرف | Funds have been released — contact your QDB RM for transfer details |
| `Ineligible` | غير مؤهل | Company did not meet eligibility criteria — see eligibility result page |

---

## 13. Frequently Asked Questions

**Q: Can I apply on behalf of more than one company?**
A: Yes, if you are an authorized signatory for multiple companies, you must complete a separate
application for each CR number. You will need to log in and start a new application session for
each company.

**Q: What happens if I lose my internet connection during the application?**
A: Your progress is saved at each completed step. When you log back in, you can resume from where
you left off. Documents you have already uploaded are retained.

**Q: Can I update my application after submitting?**
A: Once submitted, you cannot modify the application through the portal. If you need to correct
information, contact QDB Operations with your Case Reference Number.

**Q: My WPS file shows a different employee count than MOCI. Which is correct?**
A: The portal uses the WPS file figure for salary relief calculation. If there is a significant
discrepancy, your case will be flagged for QDB Relationship Manager review. Bring both documents
to any discussion with QDB.

**Q: How long does it take to receive funds after approval?**
A: Fund disbursement is handled by QDB's internal banking system. The portal only routes your case —
it does not disburse funds directly. Contact your QDB Relationship Manager after your case shows
`Approved` for bank transfer details.

**Q: What is the relief amount I will receive?**
A: The portal does not display a specific relief amount during the application (the relief quantum
is confirmed by QDB Credit Risk at approval). QDB will communicate the approved amount when your
case is approved.

**Q: Can I submit a second application if my first was rejected?**
A: Only one application per company per relief period is permitted. If your application was rejected,
contact QDB Operations for guidance. If your circumstances have changed (e.g., a failing eligibility
criterion has been resolved), you may contact QDB Operations to discuss re-application.

**Q: I don't have a commercial lease. Can I still apply?**
A: Yes. If your business operates from a home address or free zone, you may skip the rent evidence
section. The rent relief component of your application will be set to QAR 0, but the salary relief
component is still processed.

**Q: My CR was renewed recently and MOCI shows it as active, but the portal says it is inactive.**
A: MOCI data in the portal is live. If your CR was renewed very recently (same business day), it
may not yet appear in MOCI's API. Wait a few hours and try again. If the issue persists, contact
MOCI at `www.moci.gov.qa` or QDB Operations.

**Q: The portal is showing an error and I cannot proceed. What should I do?**
A: Note the error message shown and the step you were on. Contact QDB Operations with this
information and your QID. Do not attempt to submit multiple applications.

---

## 14. Contact QDB Support

| Contact Method | Details |
|----------------|---------|
| **QDB Operations Phone** | +974 4411 4141 |
| **QDB SME Support Email** | sme-relief@qdb.com.qa |
| **Portal Help Page** | https://sme-relief.qdb.com.qa/help |
| **QDB Website** | www.qdb.com.qa |
| **Office Hours** | Sunday to Thursday, 07:30 – 15:00 AST |

When contacting support, please have the following ready:
- Your QID number
- Your CR number
- Your Case Reference Number (if you have already submitted an application)
- A description of the issue you encountered

---

*This guide is for applicant reference only. For QDB staff administration guidance, see ADMIN-GUIDE.md.*
*Classification: Public — for distribution to applicants*
