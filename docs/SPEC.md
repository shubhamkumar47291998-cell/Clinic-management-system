Clinic Management SaaS — Master Technical Specification

Stack: Supabase (PostgreSQL, Auth, Storage, Edge Functions) + React (web) + React Native (mobile)
Purpose: Master spec document to feed into Antigravity (or any AI coding agent) for development
Model: Multi-tenant B2B SaaS — sold to multiple independent clinics


Architecture update: Originally specified as MERN (MongoDB + Express). Switched to Supabase — frontend (React/React Native) talks directly to Supabase for most data operations (auth, database, storage), with Supabase Edge Functions handling custom server-side logic (notifications, invoice processing, referral rewards). This removes the need for a separate Node/Express server for most operations.




Assumption note: Target users assumed to be Clinic Owners/Admins, Doctors, and Staff as primary users (paying customers), with a lightweight Patient-facing portal for booking and viewing records. Adjust Section 1.3 if this isn't accurate.




PART 1 — PRODUCT PRD

1.1 Vision

Ek single platform jahan chhote-medium clinics (1-10 doctors) apna appointments, patient records, aur billing ek hi jagah manage kar sakein — paper registers/Excel/WhatsApp ki jagah.

1.2 Problem Statement

Most small clinics today rely on paper registers, Excel sheets, or WhatsApp for scheduling and patient history. This causes double-bookings, lost records, delayed billing, and no real reporting/visibility for the owner.

1.3 Target Users / Personas

PersonaRoleKey NeedsClinic Owner/AdminManages clinic settings, staff, billing reportsRevenue visibility, staff management, subscription controlDoctorSees patients, writes prescriptions/notesFast access to patient history, simple appointment viewReceptionist/StaffBooks appointments, handles billingEasy calendar, quick patient check-in, invoice generationPatientBooks own appointments, views recordsSimple booking, reminders, bill/receipt access

1.4 MVP Scope (In)


Multi-clinic tenant onboarding (signup, subscription plan)
Role-based dashboards (Admin / Doctor / Staff / Patient)
Appointment scheduling with calendar view + conflict prevention
Patient records (EMR-lite): demographics, visit history, prescriptions, notes, file/document uploads
Billing & invoicing: service-wise pricing, invoice generation, payment status tracking
Appointment reminders (SMS/WhatsApp/Email)
Public booking page — shareable, no-login link where new patients can view services and book a slot
Automated review requests — triggered after a completed appointment, sent via WhatsApp/SMS
Referral tracker — patients refer others via a unique code/link, both get a configurable reward
Basic reports: daily appointments, revenue summary, patient count, new-patient source (referral/walk-in/online)


1.5 Out of Scope (Phase 2+)


Video/telemedicine consultations
Insurance claim processing
Lab/diagnostic equipment integration
Advanced analytics or AI-based diagnosis support
Pharmacy/inventory management


1.6 Key User Stories

Clinic Admin


As an Admin, I can add/remove doctors and staff with specific roles, so access stays controlled.
As an Admin, I can view daily/monthly revenue and appointment reports, so I understand clinic performance.


Doctor


As a Doctor, I can view my day's appointment list, so I know who's coming and when.
As a Doctor, I can open a patient's history and add a new prescription/note during a visit.


Staff/Receptionist


As Staff, I can book/reschedule/cancel an appointment for a walk-in or phone caller.
As Staff, I can generate an invoice after a visit and mark it paid/unpaid.


Patient


As a Patient, I can book an available slot online without calling the clinic.
As a Patient, I can view my past visit summary and download my invoice/receipt.
As a Patient, I can share a referral link/code with friends and track if my reward was credited.


Clinic Admin (Growth)


As an Admin, I can see where new patients are coming from (referral, walk-in, online booking page), so I know what's working.
As an Admin, after each completed visit, the system automatically asks the patient for a review — I don't have to remember to ask.


1.7 Success Metrics


Number of clinics onboarded (target for pilot: 3-5 clinics in 60 days)
Appointments booked per clinic per month
Billing volume processed through the platform
Monthly churn rate (clinics cancelling subscription)


1.8 Non-Functional Requirements (Summary)

Detailed in Part 3 (Architecture) and Part 4 (Security). Summary: must support concurrent use by multiple clinics with isolated data, mobile-responsive, page loads under 2s, 99.5% uptime target post-launch.


PART 2 — SDLC & UML DIAGRAMS

2.1 SDLC Methodology

Recommended: Agile/Scrum, 2-week sprints.

PhaseDuration (est.)OutputDiscovery & Requirements1 weekFinalized PRD (this doc)UI/UX Design1-2 weeksWireframes, design systemBackend Development3-4 weeksAPIs, DB schema, authFrontend Development (Web)3-4 weeksReact app, all role dashboardsMobile App2-3 weeks (parallel)React Native app (patient + staff)Integration & Testing1-2 weeksQA, bug fixesPilot Launch2 weeks2-3 real clinics onboardedIterate & ScaleOngoingFeedback-driven improvements

2.2 Use Case Diagram

#mermaid-r2k6-r13 { font-family: "Anthropic Sans", system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 16px; fill: rgb(25, 25, 25); }
#mermaid-r2k6-r13 .edge-animation-slow { stroke-dashoffset: 900; animation: 50s linear 0s infinite normal none running dash; stroke-linecap: round; stroke-dasharray: 9, 5 !important; }
#mermaid-r2k6-r13 .edge-animation-fast { stroke-dashoffset: 900; animation: 20s linear 0s infinite normal none running dash; stroke-linecap: round; stroke-dasharray: 9, 5 !important; }
#mermaid-r2k6-r13 .error-icon { fill: rgb(204, 120, 92); }
#mermaid-r2k6-r13 .error-text { fill: rgb(51, 135, 163); stroke: rgb(51, 135, 163); }
#mermaid-r2k6-r13 .edge-thickness-normal { stroke-width: 1px; }
#mermaid-r2k6-r13 .edge-thickness-thick { stroke-width: 3.5px; }
#mermaid-r2k6-r13 .edge-pattern-solid { stroke-dasharray: 0; }
#mermaid-r2k6-r13 .edge-thickness-invisible { stroke-width: 0; fill: none; }
#mermaid-r2k6-r13 .edge-pattern-dashed { stroke-dasharray: 3; }
#mermaid-r2k6-r13 .edge-pattern-dotted { stroke-dasharray: 2; }
#mermaid-r2k6-r13 .marker { fill: rgb(145, 145, 141); stroke: rgb(145, 145, 141); }
#mermaid-r2k6-r13 .marker.cross { stroke: rgb(145, 145, 141); }
#mermaid-r2k6-r13 svg { font-family: "Anthropic Sans", system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 16px; }
#mermaid-r2k6-r13 p { margin: 0px; }
#mermaid-r2k6-r13 .label { font-family: "Anthropic Sans", system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: rgb(25, 25, 25); }
#mermaid-r2k6-r13 .cluster-label text { fill: rgb(51, 135, 163); }
#mermaid-r2k6-r13 .cluster-label span { color: rgb(51, 135, 163); }
#mermaid-r2k6-r13 .cluster-label span p { background-color: transparent; }
#mermaid-r2k6-r13 .label text, #mermaid-r2k6-r13 span { fill: rgb(25, 25, 25); color: rgb(25, 25, 25); }
#mermaid-r2k6-r13 .node rect, #mermaid-r2k6-r13 .node circle, #mermaid-r2k6-r13 .node ellipse, #mermaid-r2k6-r13 .node polygon, #mermaid-r2k6-r13 .node path { fill: rgb(240, 240, 235); stroke: rgb(217, 216, 213); stroke-width: 1px; }
#mermaid-r2k6-r13 .rough-node .label text, #mermaid-r2k6-r13 .node .label text, #mermaid-r2k6-r13 .image-shape .label, #mermaid-r2k6-r13 .icon-shape .label { text-anchor: middle; }
#mermaid-r2k6-r13 .node .katex path { fill: rgb(0, 0, 0); stroke: rgb(0, 0, 0); stroke-width: 1px; }
#mermaid-r2k6-r13 .rough-node .label, #mermaid-r2k6-r13 .node .label, #mermaid-r2k6-r13 .image-shape .label, #mermaid-r2k6-r13 .icon-shape .label { text-align: center; }
#mermaid-r2k6-r13 .node.clickable { cursor: pointer; }
#mermaid-r2k6-r13 .root .anchor path { stroke-width: 0; stroke: rgb(145, 145, 141); fill: rgb(145, 145, 141) !important; }
#mermaid-r2k6-r13 .arrowheadPath { fill: rgb(11, 11, 11); }
#mermaid-r2k6-r13 .edgePath .path { stroke: rgb(145, 145, 141); stroke-width: 1px; }
#mermaid-r2k6-r13 .flowchart-link { stroke: rgb(145, 145, 141); fill: none; }
#mermaid-r2k6-r13 .edgeLabel { background-color: rgb(245, 230, 216); text-align: center; }
#mermaid-r2k6-r13 .edgeLabel p { background-color: rgb(245, 230, 216); }
#mermaid-r2k6-r13 .edgeLabel rect { opacity: 0.5; background-color: rgb(245, 230, 216); fill: rgb(245, 230, 216); }
#mermaid-r2k6-r13 .labelBkg { background-color: rgba(245, 230, 216, 0.5); }
#mermaid-r2k6-r13 .cluster rect { fill: rgb(204, 120, 92); stroke: rgb(138, 115, 107); stroke-width: 1px; }
#mermaid-r2k6-r13 .cluster text { fill: rgb(51, 135, 163); }
#mermaid-r2k6-r13 .cluster span { color: rgb(51, 135, 163); }
#mermaid-r2k6-r13 div.mermaidTooltip { position: absolute; text-align: center; max-width: 200px; padding: 2px; font-family: "Anthropic Sans", system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 12px; background: rgb(204, 120, 92); border: 1px solid rgb(138, 115, 107); border-radius: 2px; pointer-events: none; z-index: 100; }
#mermaid-r2k6-r13 .flowchartTitleText { text-anchor: middle; font-size: 18px; fill: rgb(25, 25, 25); }
#mermaid-r2k6-r13 rect.text { fill: none; stroke-width: 0; }
#mermaid-r2k6-r13 .icon-shape, #mermaid-r2k6-r13 .image-shape { background-color: rgb(245, 230, 216); text-align: center; }
#mermaid-r2k6-r13 .icon-shape p, #mermaid-r2k6-r13 .image-shape p { background-color: rgb(245, 230, 216); padding: 2px; }
#mermaid-r2k6-r13 .icon-shape .label rect, #mermaid-r2k6-r13 .image-shape .label rect { opacity: 0.5; background-color: rgb(245, 230, 216); fill: rgb(245, 230, 216); }
#mermaid-r2k6-r13 .label-icon { display: inline-block; height: 1em; overflow: visible; vertical-align: -0.125em; }
#mermaid-r2k6-r13 .node .label-icon path { fill: currentcolor; stroke: revert; stroke-width: revert; }
#mermaid-r2k6-r13 .node .neo-node { stroke: rgb(217, 216, 213); }
#mermaid-r2k6-r13 [data-look="neo"].node rect, #mermaid-r2k6-r13 [data-look="neo"].cluster rect, #mermaid-r2k6-r13 [data-look="neo"].node polygon { stroke: url("#mermaid-r2k6-r13-gradient"); filter: drop-shadow(rgb(185, 185, 185) 1px 2px 2px); }
#mermaid-r2k6-r13 [data-look="neo"].node path { stroke: url("#mermaid-r2k6-r13-gradient"); stroke-width: 1px; }
#mermaid-r2k6-r13 [data-look="neo"].node .outer-path { filter: drop-shadow(rgb(185, 185, 185) 1px 2px 2px); }
#mermaid-r2k6-r13 [data-look="neo"].node .neo-line path { stroke: rgb(217, 216, 213); filter: none; }
#mermaid-r2k6-r13 [data-look="neo"].node circle { stroke: url("#mermaid-r2k6-r13-gradient"); filter: drop-shadow(rgb(185, 185, 185) 1px 2px 2px); }
#mermaid-r2k6-r13 [data-look="neo"].node circle .state-start { fill: rgb(0, 0, 0); }
#mermaid-r2k6-r13 [data-look="neo"].icon-shape .icon { fill: url("#mermaid-r2k6-r13-gradient"); filter: drop-shadow(rgb(185, 185, 185) 1px 2px 2px); }
#mermaid-r2k6-r13 [data-look="neo"].icon-shape .icon-neo path { stroke: url("#mermaid-r2k6-r13-gradient"); filter: drop-shadow(rgb(185, 185, 185) 1px 2px 2px); }
#mermaid-r2k6-r13 :root { --mermaid-font-family: "Anthropic Sans",system-ui,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }Clinic AdminDoctorReceptionist/StaffPatientManage Clinic SettingsManage Staff/DoctorsView ReportsView AppointmentsAdd Prescription/NotesBook/RescheduleAppointmentGenerate InvoiceBook AppointmentView Records/Invoice

2.3 Class Diagram (Core Entities)

#mermaid-r2k7-r14 { font-family: "Anthropic Sans", system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 16px; fill: rgb(25, 25, 25); }
#mermaid-r2k7-r14 .edge-animation-slow { stroke-dashoffset: 900; animation: 50s linear 0s infinite normal none running dash; stroke-linecap: round; stroke-dasharray: 9, 5 !important; }
#mermaid-r2k7-r14 .edge-animation-fast { stroke-dashoffset: 900; animation: 20s linear 0s infinite normal none running dash; stroke-linecap: round; stroke-dasharray: 9, 5 !important; }
#mermaid-r2k7-r14 .error-icon { fill: rgb(204, 120, 92); }
#mermaid-r2k7-r14 .error-text { fill: rgb(51, 135, 163); stroke: rgb(51, 135, 163); }
#mermaid-r2k7-r14 .edge-thickness-normal { stroke-width: 1px; }
#mermaid-r2k7-r14 .edge-thickness-thick { stroke-width: 3.5px; }
#mermaid-r2k7-r14 .edge-pattern-solid { stroke-dasharray: 0; }
#mermaid-r2k7-r14 .edge-thickness-invisible { stroke-width: 0; fill: none; }
#mermaid-r2k7-r14 .edge-pattern-dashed { stroke-dasharray: 3; }
#mermaid-r2k7-r14 .edge-pattern-dotted { stroke-dasharray: 2; }
#mermaid-r2k7-r14 .marker { fill: rgb(145, 145, 141); stroke: rgb(145, 145, 141); }
#mermaid-r2k7-r14 .marker.cross { stroke: rgb(145, 145, 141); }
#mermaid-r2k7-r14 svg { font-family: "Anthropic Sans", system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 16px; }
#mermaid-r2k7-r14 p { margin: 0px; }
#mermaid-r2k7-r14 g.classGroup text { fill: rgb(217, 216, 213); stroke: none; font-family: "Anthropic Sans", system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 10px; }
#mermaid-r2k7-r14 g.classGroup text .title { font-weight: bolder; }
#mermaid-r2k7-r14 .cluster-label text { fill: rgb(51, 135, 163); }
#mermaid-r2k7-r14 .cluster-label span { color: rgb(51, 135, 163); }
#mermaid-r2k7-r14 .cluster-label span p { background-color: transparent; }
#mermaid-r2k7-r14 .cluster rect { fill: rgb(204, 120, 92); stroke: rgb(138, 115, 107); stroke-width: 1px; }
#mermaid-r2k7-r14 .cluster text { fill: rgb(51, 135, 163); }
#mermaid-r2k7-r14 .cluster span { color: rgb(51, 135, 163); }
#mermaid-r2k7-r14 .nodeLabel, #mermaid-r2k7-r14 .edgeLabel { color: rgb(25, 25, 25); }
#mermaid-r2k7-r14 .noteLabel .nodeLabel, #mermaid-r2k7-r14 .noteLabel .edgeLabel { color: rgb(25, 25, 25); }
#mermaid-r2k7-r14 .edgeLabel .label rect { fill: rgb(240, 240, 235); }
#mermaid-r2k7-r14 .label text { fill: rgb(25, 25, 25); }
#mermaid-r2k7-r14 .labelBkg { background: rgb(240, 240, 235); }
#mermaid-r2k7-r14 .edgeLabel .label span { background: rgb(240, 240, 235); }
#mermaid-r2k7-r14 .classTitle { font-weight: bolder; }
#mermaid-r2k7-r14 .node rect, #mermaid-r2k7-r14 .node circle, #mermaid-r2k7-r14 .node ellipse, #mermaid-r2k7-r14 .node polygon, #mermaid-r2k7-r14 .node path { fill: rgb(240, 240, 235); stroke: rgb(217, 216, 213); stroke-width: 1; }
#mermaid-r2k7-r14 .divider { stroke: rgb(217, 216, 213); stroke-width: 1; }
#mermaid-r2k7-r14 g.clickable { cursor: pointer; }
#mermaid-r2k7-r14 g.classGroup rect { fill: rgb(240, 240, 235); stroke: rgb(217, 216, 213); }
#mermaid-r2k7-r14 g.classGroup line { stroke: rgb(217, 216, 213); stroke-width: 1; }
#mermaid-r2k7-r14 .classLabel .box { stroke: none; stroke-width: 0; fill: rgb(240, 240, 235); opacity: 0.5; }
#mermaid-r2k7-r14 .classLabel .label { fill: rgb(217, 216, 213); font-size: 10px; }
#mermaid-r2k7-r14 .relation { stroke: rgb(145, 145, 141); stroke-width: 1; fill: none; }
#mermaid-r2k7-r14 .dashed-line { stroke-dasharray: 3; }
#mermaid-r2k7-r14 .dotted-line { stroke-dasharray: 1, 2; }
#mermaid-r2k7-r14 [id$="-compositionStart"], #mermaid-r2k7-r14 .composition { stroke-width: 1; fill: rgb(145, 145, 141) !important; stroke: rgb(145, 145, 141) !important; }
#mermaid-r2k7-r14 [id$="-compositionEnd"], #mermaid-r2k7-r14 .composition { stroke-width: 1; fill: rgb(145, 145, 141) !important; stroke: rgb(145, 145, 141) !important; }
#mermaid-r2k7-r14 [id$="-dependencyStart"], #mermaid-r2k7-r14 .dependency { stroke-width: 1; fill: rgb(145, 145, 141) !important; stroke: rgb(145, 145, 141) !important; }
#mermaid-r2k7-r14 [id$="-dependencyEnd"], #mermaid-r2k7-r14 .dependency { stroke-width: 1; fill: rgb(145, 145, 141) !important; stroke: rgb(145, 145, 141) !important; }
#mermaid-r2k7-r14 [id$="-extensionStart"], #mermaid-r2k7-r14 .extension { stroke-width: 1; fill: transparent !important; stroke: rgb(145, 145, 141) !important; }
#mermaid-r2k7-r14 [id$="-extensionEnd"], #mermaid-r2k7-r14 .extension { stroke-width: 1; fill: transparent !important; stroke: rgb(145, 145, 141) !important; }
#mermaid-r2k7-r14 [id$="-aggregationStart"], #mermaid-r2k7-r14 .aggregation { stroke-width: 1; fill: transparent !important; stroke: rgb(145, 145, 141) !important; }
#mermaid-r2k7-r14 [id$="-aggregationEnd"], #mermaid-r2k7-r14 .aggregation { stroke-width: 1; fill: transparent !important; stroke: rgb(145, 145, 141) !important; }
#mermaid-r2k7-r14 [id$="-lollipopStart"], #mermaid-r2k7-r14 .lollipop { stroke-width: 1; fill: rgb(240, 240, 235) !important; stroke: rgb(145, 145, 141) !important; }
#mermaid-r2k7-r14 [id$="-lollipopEnd"], #mermaid-r2k7-r14 .lollipop { stroke-width: 1; fill: rgb(240, 240, 235) !important; stroke: rgb(145, 145, 141) !important; }
#mermaid-r2k7-r14 .edgeTerminals { font-size: 11px; line-height: initial; }
#mermaid-r2k7-r14 .classTitleText { text-anchor: middle; font-size: 18px; fill: rgb(25, 25, 25); }
#mermaid-r2k7-r14 .edgeLabel[data-look="neo"] { background-color: rgb(245, 230, 216); text-align: center; }
#mermaid-r2k7-r14 .edgeLabel[data-look="neo"] p { background-color: rgb(245, 230, 216); }
#mermaid-r2k7-r14 .edgeLabel[data-look="neo"] rect { opacity: 0.5; background-color: rgb(245, 230, 216); fill: rgb(245, 230, 216); }
#mermaid-r2k7-r14 .label-icon { display: inline-block; height: 1em; overflow: visible; vertical-align: -0.125em; }
#mermaid-r2k7-r14 .node .label-icon path { fill: currentcolor; stroke: revert; stroke-width: revert; }
#mermaid-r2k7-r14 .node .neo-node { stroke: rgb(217, 216, 213); }
#mermaid-r2k7-r14 [data-look="neo"].node rect, #mermaid-r2k7-r14 [data-look="neo"].cluster rect, #mermaid-r2k7-r14 [data-look="neo"].node polygon { stroke: url("#mermaid-r2k7-r14-gradient"); filter: drop-shadow(rgb(185, 185, 185) 1px 2px 2px); }
#mermaid-r2k7-r14 [data-look="neo"].node path { stroke: url("#mermaid-r2k7-r14-gradient"); stroke-width: 1px; }
#mermaid-r2k7-r14 [data-look="neo"].node .outer-path { filter: drop-shadow(rgb(185, 185, 185) 1px 2px 2px); }
#mermaid-r2k7-r14 [data-look="neo"].node .neo-line path { stroke: rgb(217, 216, 213); filter: none; }
#mermaid-r2k7-r14 [data-look="neo"].node circle { stroke: url("#mermaid-r2k7-r14-gradient"); filter: drop-shadow(rgb(185, 185, 185) 1px 2px 2px); }
#mermaid-r2k7-r14 [data-look="neo"].node circle .state-start { fill: rgb(0, 0, 0); }
#mermaid-r2k7-r14 [data-look="neo"].icon-shape .icon { fill: url("#mermaid-r2k7-r14-gradient"); filter: drop-shadow(rgb(185, 185, 185) 1px 2px 2px); }
#mermaid-r2k7-r14 [data-look="neo"].icon-shape .icon-neo path { stroke: url("#mermaid-r2k7-r14-gradient"); filter: drop-shadow(rgb(185, 185, 185) 1px 2px 2px); }
#mermaid-r2k7-r14 :root { --mermaid-font-family: "Anthropic Sans",system-ui,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }11111manymanymany11Clinic+String id+String name+String address+String subscriptionPlan+Date createdAtProfile+String id+String clinicId+String name+String email+String rolePatient+String id+String clinicId+String name+String phone+Date dob+String[] medicalHistoryRefsAppointment+String id+String clinicId+String patientId+String doctorId+DateTime slotStart+DateTime slotEnd+String statusMedicalRecord+String id+String patientId+String doctorId+String notes+String[] prescriptions+Date visitDateInvoice+String id+String clinicId+String patientId+String appointmentId+Number amount+String paymentStatus+Date issuedDate

2.4 Entity-Relationship (Database) Diagram

#mermaid-r2k8-r15 { font-family: "Anthropic Sans", system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 16px; fill: rgb(25, 25, 25); }
#mermaid-r2k8-r15 .edge-animation-slow { stroke-dashoffset: 900; animation: 50s linear 0s infinite normal none running dash; stroke-linecap: round; stroke-dasharray: 9, 5 !important; }
#mermaid-r2k8-r15 .edge-animation-fast { stroke-dashoffset: 900; animation: 20s linear 0s infinite normal none running dash; stroke-linecap: round; stroke-dasharray: 9, 5 !important; }
#mermaid-r2k8-r15 .error-icon { fill: rgb(204, 120, 92); }
#mermaid-r2k8-r15 .error-text { fill: rgb(51, 135, 163); stroke: rgb(51, 135, 163); }
#mermaid-r2k8-r15 .edge-thickness-normal { stroke-width: 1px; }
#mermaid-r2k8-r15 .edge-thickness-thick { stroke-width: 3.5px; }
#mermaid-r2k8-r15 .edge-pattern-solid { stroke-dasharray: 0; }
#mermaid-r2k8-r15 .edge-thickness-invisible { stroke-width: 0; fill: none; }
#mermaid-r2k8-r15 .edge-pattern-dashed { stroke-dasharray: 3; }
#mermaid-r2k8-r15 .edge-pattern-dotted { stroke-dasharray: 2; }
#mermaid-r2k8-r15 .marker { fill: rgb(145, 145, 141); stroke: rgb(145, 145, 141); }
#mermaid-r2k8-r15 .marker.cross { stroke: rgb(145, 145, 141); }
#mermaid-r2k8-r15 svg { font-family: "Anthropic Sans", system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 16px; }
#mermaid-r2k8-r15 p { margin: 0px; }
#mermaid-r2k8-r15 .entityBox { fill: rgb(240, 240, 235); stroke: rgb(217, 216, 213); }
#mermaid-r2k8-r15 .relationshipLabelBox { fill: rgb(204, 120, 92); opacity: 0.7; background-color: rgb(204, 120, 92); }
#mermaid-r2k8-r15 .relationshipLabelBox rect { opacity: 0.5; }
#mermaid-r2k8-r15 .labelBkg { background-color: rgba(204, 120, 92, 0.5); }
#mermaid-r2k8-r15 .edgeLabel { background-color: rgb(245, 230, 216); }
#mermaid-r2k8-r15 .edgeLabel .label rect { fill: rgb(245, 230, 216); }
#mermaid-r2k8-r15 .edgeLabel .label text { fill: rgb(25, 25, 25); }
#mermaid-r2k8-r15 .edgeLabel .label { fill: rgb(217, 216, 213); font-size: 14px; }
#mermaid-r2k8-r15 .label { font-family: "Anthropic Sans", system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: rgb(25, 25, 25); }
#mermaid-r2k8-r15 .edge-pattern-dashed { stroke-dasharray: 8, 8; }
#mermaid-r2k8-r15 .node rect, #mermaid-r2k8-r15 .node circle, #mermaid-r2k8-r15 .node ellipse, #mermaid-r2k8-r15 .node polygon { fill: rgb(240, 240, 235); stroke: rgb(217, 216, 213); stroke-width: 1px; }
#mermaid-r2k8-r15 .relationshipLine { stroke: rgb(145, 145, 141); stroke-width: 1px; fill: none; }
#mermaid-r2k8-r15 .marker { stroke-width: 1; fill: none !important; stroke: rgb(145, 145, 141) !important; }
#mermaid-r2k8-r15 [data-look="neo"].labelBkg { background-color: rgba(204, 120, 92, 0.5); }
#mermaid-r2k8-r15 .node .neo-node { stroke: rgb(217, 216, 213); }
#mermaid-r2k8-r15 [data-look="neo"].node rect, #mermaid-r2k8-r15 [data-look="neo"].cluster rect, #mermaid-r2k8-r15 [data-look="neo"].node polygon { stroke: url("#mermaid-r2k8-r15-gradient"); filter: drop-shadow(rgb(185, 185, 185) 1px 2px 2px); }
#mermaid-r2k8-r15 [data-look="neo"].node path { stroke: url("#mermaid-r2k8-r15-gradient"); stroke-width: 1px; }
#mermaid-r2k8-r15 [data-look="neo"].node .outer-path { filter: drop-shadow(rgb(185, 185, 185) 1px 2px 2px); }
#mermaid-r2k8-r15 [data-look="neo"].node .neo-line path { stroke: rgb(217, 216, 213); filter: none; }
#mermaid-r2k8-r15 [data-look="neo"].node circle { stroke: url("#mermaid-r2k8-r15-gradient"); filter: drop-shadow(rgb(185, 185, 185) 1px 2px 2px); }
#mermaid-r2k8-r15 [data-look="neo"].node circle .state-start { fill: rgb(0, 0, 0); }
#mermaid-r2k8-r15 [data-look="neo"].icon-shape .icon { fill: url("#mermaid-r2k8-r15-gradient"); filter: drop-shadow(rgb(185, 185, 185) 1px 2px 2px); }
#mermaid-r2k8-r15 [data-look="neo"].icon-shape .icon-neo path { stroke: url("#mermaid-r2k8-r15-gradient"); filter: drop-shadow(rgb(185, 185, 185) 1px 2px 2px); }
#mermaid-r2k8-r15 :root { --mermaid-font-family: "Anthropic Sans",system-ui,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }employsregistersbooksdoctor handlesgeneratesgeneratesCLINICPROFILEPATIENTAPPOINTMENTMEDICAL_RECORDINVOICE

2.5 Sequence Diagram — Appointment Booking

Postgres (RLS-protected)Supabase Client SDKFrontend (React/RN)Patient/StaffPostgres (RLS-protected)Supabase Client SDKFrontend (React/RN)Patient/Staff#mermaid-r2k9-r16 { font-family: "Anthropic Sans", system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 16px; fill: rgb(25, 25, 25); }
#mermaid-r2k9-r16 .edge-animation-slow { stroke-dashoffset: 900; animation: 50s linear 0s infinite normal none running dash; stroke-linecap: round; stroke-dasharray: 9, 5 !important; }
#mermaid-r2k9-r16 .edge-animation-fast { stroke-dashoffset: 900; animation: 20s linear 0s infinite normal none running dash; stroke-linecap: round; stroke-dasharray: 9, 5 !important; }
#mermaid-r2k9-r16 .error-icon { fill: rgb(204, 120, 92); }
#mermaid-r2k9-r16 .error-text { fill: rgb(51, 135, 163); stroke: rgb(51, 135, 163); }
#mermaid-r2k9-r16 .edge-thickness-normal { stroke-width: 1px; }
#mermaid-r2k9-r16 .edge-thickness-thick { stroke-width: 3.5px; }
#mermaid-r2k9-r16 .edge-pattern-solid { stroke-dasharray: 0; }
#mermaid-r2k9-r16 .edge-thickness-invisible { stroke-width: 0; fill: none; }
#mermaid-r2k9-r16 .edge-pattern-dashed { stroke-dasharray: 3; }
#mermaid-r2k9-r16 .edge-pattern-dotted { stroke-dasharray: 2; }
#mermaid-r2k9-r16 .marker { fill: rgb(145, 145, 141); stroke: rgb(145, 145, 141); }
#mermaid-r2k9-r16 .marker.cross { stroke: rgb(145, 145, 141); }
#mermaid-r2k9-r16 svg { font-family: "Anthropic Sans", system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 16px; }
#mermaid-r2k9-r16 p { margin: 0px; }
#mermaid-r2k9-r16 .actor { stroke: rgb(217, 216, 213); fill: rgb(240, 240, 235); stroke-width: 1; }
#mermaid-r2k9-r16 rect.actor.outer-path[data-look="neo"] { filter: drop-shadow(rgb(185, 185, 185) 1px 2px 2px); }
#mermaid-r2k9-r16 rect.note[data-look="neo"] { stroke: rgb(217, 216, 213); fill: rgb(240, 240, 235); filter: drop-shadow(rgb(185, 185, 185) 1px 2px 2px); }
#mermaid-r2k9-r16 text.actor > tspan { fill: rgb(25, 25, 25); stroke: none; }
#mermaid-r2k9-r16 .actor-line { stroke: rgb(145, 145, 141); }
#mermaid-r2k9-r16 .innerArc { stroke-width: 1.5; stroke-dasharray: none; }
#mermaid-r2k9-r16 .messageLine0 { stroke-width: 1.5; stroke-dasharray: none; stroke: rgb(25, 25, 25); }
#mermaid-r2k9-r16 .messageLine1 { stroke-width: 1.5; stroke-dasharray: 2, 2; stroke: rgb(25, 25, 25); }
#mermaid-r2k9-r16 [id$="-arrowhead"] path { fill: rgb(25, 25, 25); stroke: rgb(25, 25, 25); }
#mermaid-r2k9-r16 .sequenceNumber { fill: rgb(110, 110, 114); }
#mermaid-r2k9-r16 [id$="-sequencenumber"] { fill: rgb(25, 25, 25); }
#mermaid-r2k9-r16 [id$="-crosshead"] path { fill: rgb(25, 25, 25); stroke: rgb(25, 25, 25); }
#mermaid-r2k9-r16 .messageText { fill: rgb(25, 25, 25); stroke: none; }
#mermaid-r2k9-r16 .labelBox { stroke: rgb(217, 216, 213); fill: rgb(240, 240, 235); filter: none; }
#mermaid-r2k9-r16 .labelText, #mermaid-r2k9-r16 .labelText > tspan { fill: rgb(25, 25, 25); stroke: none; }
#mermaid-r2k9-r16 .loopText, #mermaid-r2k9-r16 .loopText > tspan { fill: rgb(25, 25, 25); stroke: none; }
#mermaid-r2k9-r16 .sectionTitle, #mermaid-r2k9-r16 .sectionTitle > tspan { fill: rgb(25, 25, 25); stroke: none; }
#mermaid-r2k9-r16 .loopLine { stroke-width: 2px; stroke-dasharray: 2, 2; stroke: rgb(217, 216, 213); fill: rgb(217, 216, 213); }
#mermaid-r2k9-r16 .note { stroke: rgb(217, 216, 213); fill: rgb(240, 240, 235); }
#mermaid-r2k9-r16 .noteText, #mermaid-r2k9-r16 .noteText > tspan { fill: rgb(25, 25, 25); stroke: none; font-weight: normal; }
#mermaid-r2k9-r16 .activation0 { fill: rgb(245, 230, 216); stroke: rgb(235, 204, 175); }
#mermaid-r2k9-r16 .activation1 { fill: rgb(245, 230, 216); stroke: rgb(235, 204, 175); }
#mermaid-r2k9-r16 .activation2 { fill: rgb(245, 230, 216); stroke: rgb(235, 204, 175); }
#mermaid-r2k9-r16 .actorPopupMenu { position: absolute; }
#mermaid-r2k9-r16 .actorPopupMenuPanel { position: absolute; fill: rgb(240, 240, 235); box-shadow: rgba(0, 0, 0, 0.2) 0px 8px 16px 0px; filter: drop-shadow(rgba(0, 0, 0, 0.4) 3px 5px 2px); }
#mermaid-r2k9-r16 .actor-man circle, #mermaid-r2k9-r16 line { fill: rgb(240, 240, 235); stroke-width: 2px; }
#mermaid-r2k9-r16 g rect.rect { filter: drop-shadow(rgb(185, 185, 185) 1px 2px 2px); stroke: rgb(217, 216, 213); }
#mermaid-r2k9-r16 .node .neo-node { stroke: rgb(217, 216, 213); }
#mermaid-r2k9-r16 [data-look="neo"].node rect, #mermaid-r2k9-r16 [data-look="neo"].cluster rect, #mermaid-r2k9-r16 [data-look="neo"].node polygon { stroke: url("#mermaid-r2k9-r16-gradient"); filter: drop-shadow(rgb(185, 185, 185) 1px 2px 2px); }
#mermaid-r2k9-r16 [data-look="neo"].node path { stroke: url("#mermaid-r2k9-r16-gradient"); stroke-width: 1px; }
#mermaid-r2k9-r16 [data-look="neo"].node .outer-path { filter: drop-shadow(rgb(185, 185, 185) 1px 2px 2px); }
#mermaid-r2k9-r16 [data-look="neo"].node .neo-line path { stroke: rgb(217, 216, 213); filter: none; }
#mermaid-r2k9-r16 [data-look="neo"].node circle { stroke: url("#mermaid-r2k9-r16-gradient"); filter: drop-shadow(rgb(185, 185, 185) 1px 2px 2px); }
#mermaid-r2k9-r16 [data-look="neo"].node circle .state-start { fill: rgb(0, 0, 0); }
#mermaid-r2k9-r16 [data-look="neo"].icon-shape .icon { fill: url("#mermaid-r2k9-r16-gradient"); filter: drop-shadow(rgb(185, 185, 185) 1px 2px 2px); }
#mermaid-r2k9-r16 [data-look="neo"].icon-shape .icon-neo path { stroke: url("#mermaid-r2k9-r16-gradient"); filter: drop-shadow(rgb(185, 185, 185) 1px 2px 2px); }
#mermaid-r2k9-r16 :root { --mermaid-font-family: "Anthropic Sans",system-ui,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }A Database Webhook/Edge Function triggers the reminder on insertSelect doctor + date/time slotinsert into appointments {clinic_id, patient_id, doctor_id, slot}Check slot conflict (DB constraint/function) for doctor_idNo conflict foundInsert new appointment (status: confirmed) - RLS checks clinic_idRow insertedAppointment createdBooking confirmed

2.6 Sequence Diagram — Billing Flow

Edge FunctionPostgres (RLS-protected)Supabase Client SDKFrontendStaffEdge FunctionPostgres (RLS-protected)Supabase Client SDKFrontendStaff#mermaid-r2ka-r17 { font-family: "Anthropic Sans", system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 16px; fill: rgb(25, 25, 25); }
#mermaid-r2ka-r17 .edge-animation-slow { stroke-dashoffset: 900; animation: 50s linear 0s infinite normal none running dash; stroke-linecap: round; stroke-dasharray: 9, 5 !important; }
#mermaid-r2ka-r17 .edge-animation-fast { stroke-dashoffset: 900; animation: 20s linear 0s infinite normal none running dash; stroke-linecap: round; stroke-dasharray: 9, 5 !important; }
#mermaid-r2ka-r17 .error-icon { fill: rgb(204, 120, 92); }
#mermaid-r2ka-r17 .error-text { fill: rgb(51, 135, 163); stroke: rgb(51, 135, 163); }
#mermaid-r2ka-r17 .edge-thickness-normal { stroke-width: 1px; }
#mermaid-r2ka-r17 .edge-thickness-thick { stroke-width: 3.5px; }
#mermaid-r2ka-r17 .edge-pattern-solid { stroke-dasharray: 0; }
#mermaid-r2ka-r17 .edge-thickness-invisible { stroke-width: 0; fill: none; }
#mermaid-r2ka-r17 .edge-pattern-dashed { stroke-dasharray: 3; }
#mermaid-r2ka-r17 .edge-pattern-dotted { stroke-dasharray: 2; }
#mermaid-r2ka-r17 .marker { fill: rgb(145, 145, 141); stroke: rgb(145, 145, 141); }
#mermaid-r2ka-r17 .marker.cross { stroke: rgb(145, 145, 141); }
#mermaid-r2ka-r17 svg { font-family: "Anthropic Sans", system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 16px; }
#mermaid-r2ka-r17 p { margin: 0px; }
#mermaid-r2ka-r17 .actor { stroke: rgb(217, 216, 213); fill: rgb(240, 240, 235); stroke-width: 1; }
#mermaid-r2ka-r17 rect.actor.outer-path[data-look="neo"] { filter: drop-shadow(rgb(185, 185, 185) 1px 2px 2px); }
#mermaid-r2ka-r17 rect.note[data-look="neo"] { stroke: rgb(217, 216, 213); fill: rgb(240, 240, 235); filter: drop-shadow(rgb(185, 185, 185) 1px 2px 2px); }
#mermaid-r2ka-r17 text.actor > tspan { fill: rgb(25, 25, 25); stroke: none; }
#mermaid-r2ka-r17 .actor-line { stroke: rgb(145, 145, 141); }
#mermaid-r2ka-r17 .innerArc { stroke-width: 1.5; stroke-dasharray: none; }
#mermaid-r2ka-r17 .messageLine0 { stroke-width: 1.5; stroke-dasharray: none; stroke: rgb(25, 25, 25); }
#mermaid-r2ka-r17 .messageLine1 { stroke-width: 1.5; stroke-dasharray: 2, 2; stroke: rgb(25, 25, 25); }
#mermaid-r2ka-r17 [id$="-arrowhead"] path { fill: rgb(25, 25, 25); stroke: rgb(25, 25, 25); }
#mermaid-r2ka-r17 .sequenceNumber { fill: rgb(110, 110, 114); }
#mermaid-r2ka-r17 [id$="-sequencenumber"] { fill: rgb(25, 25, 25); }
#mermaid-r2ka-r17 [id$="-crosshead"] path { fill: rgb(25, 25, 25); stroke: rgb(25, 25, 25); }
#mermaid-r2ka-r17 .messageText { fill: rgb(25, 25, 25); stroke: none; }
#mermaid-r2ka-r17 .labelBox { stroke: rgb(217, 216, 213); fill: rgb(240, 240, 235); filter: none; }
#mermaid-r2ka-r17 .labelText, #mermaid-r2ka-r17 .labelText > tspan { fill: rgb(25, 25, 25); stroke: none; }
#mermaid-r2ka-r17 .loopText, #mermaid-r2ka-r17 .loopText > tspan { fill: rgb(25, 25, 25); stroke: none; }
#mermaid-r2ka-r17 .sectionTitle, #mermaid-r2ka-r17 .sectionTitle > tspan { fill: rgb(25, 25, 25); stroke: none; }
#mermaid-r2ka-r17 .loopLine { stroke-width: 2px; stroke-dasharray: 2, 2; stroke: rgb(217, 216, 213); fill: rgb(217, 216, 213); }
#mermaid-r2ka-r17 .note { stroke: rgb(217, 216, 213); fill: rgb(240, 240, 235); }
#mermaid-r2ka-r17 .noteText, #mermaid-r2ka-r17 .noteText > tspan { fill: rgb(25, 25, 25); stroke: none; font-weight: normal; }
#mermaid-r2ka-r17 .activation0 { fill: rgb(245, 230, 216); stroke: rgb(235, 204, 175); }
#mermaid-r2ka-r17 .activation1 { fill: rgb(245, 230, 216); stroke: rgb(235, 204, 175); }
#mermaid-r2ka-r17 .activation2 { fill: rgb(245, 230, 216); stroke: rgb(235, 204, 175); }
#mermaid-r2ka-r17 .actorPopupMenu { position: absolute; }
#mermaid-r2ka-r17 .actorPopupMenuPanel { position: absolute; fill: rgb(240, 240, 235); box-shadow: rgba(0, 0, 0, 0.2) 0px 8px 16px 0px; filter: drop-shadow(rgba(0, 0, 0, 0.4) 3px 5px 2px); }
#mermaid-r2ka-r17 .actor-man circle, #mermaid-r2ka-r17 line { fill: rgb(240, 240, 235); stroke-width: 2px; }
#mermaid-r2ka-r17 g rect.rect { filter: drop-shadow(rgb(185, 185, 185) 1px 2px 2px); stroke: rgb(217, 216, 213); }
#mermaid-r2ka-r17 .node .neo-node { stroke: rgb(217, 216, 213); }
#mermaid-r2ka-r17 [data-look="neo"].node rect, #mermaid-r2ka-r17 [data-look="neo"].cluster rect, #mermaid-r2ka-r17 [data-look="neo"].node polygon { stroke: url("#mermaid-r2ka-r17-gradient"); filter: drop-shadow(rgb(185, 185, 185) 1px 2px 2px); }
#mermaid-r2ka-r17 [data-look="neo"].node path { stroke: url("#mermaid-r2ka-r17-gradient"); stroke-width: 1px; }
#mermaid-r2ka-r17 [data-look="neo"].node .outer-path { filter: drop-shadow(rgb(185, 185, 185) 1px 2px 2px); }
#mermaid-r2ka-r17 [data-look="neo"].node .neo-line path { stroke: rgb(217, 216, 213); filter: none; }
#mermaid-r2ka-r17 [data-look="neo"].node circle { stroke: url("#mermaid-r2ka-r17-gradient"); filter: drop-shadow(rgb(185, 185, 185) 1px 2px 2px); }
#mermaid-r2ka-r17 [data-look="neo"].node circle .state-start { fill: rgb(0, 0, 0); }
#mermaid-r2ka-r17 [data-look="neo"].icon-shape .icon { fill: url("#mermaid-r2ka-r17-gradient"); filter: drop-shadow(rgb(185, 185, 185) 1px 2px 2px); }
#mermaid-r2ka-r17 [data-look="neo"].icon-shape .icon-neo path { stroke: url("#mermaid-r2ka-r17-gradient"); filter: drop-shadow(rgb(185, 185, 185) 1px 2px 2px); }
#mermaid-r2ka-r17 :root { --mermaid-font-family: "Anthropic Sans",system-ui,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }Mark appointment complete, add servicesinsert into invoices {appointment_id, items, amount}Create invoice (status: unpaid) - RLS checks clinic_idInvoice savedInvoice generatedMark as paid (cash/UPI/card)update invoices set payment_status = 'paid'Update invoice rowUpdatedConfirmationTrigger review-request function (post-payment)


PART 3 — SUPABASE TECHNICAL ARCHITECTURE

3.1 High-Level Architecture

#mermaid-r2kb-r18 { font-family: "Anthropic Sans", system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 16px; fill: rgb(25, 25, 25); }
#mermaid-r2kb-r18 .edge-animation-slow { stroke-dashoffset: 900; animation: 50s linear 0s infinite normal none running dash; stroke-linecap: round; stroke-dasharray: 9, 5 !important; }
#mermaid-r2kb-r18 .edge-animation-fast { stroke-dashoffset: 900; animation: 20s linear 0s infinite normal none running dash; stroke-linecap: round; stroke-dasharray: 9, 5 !important; }
#mermaid-r2kb-r18 .error-icon { fill: rgb(204, 120, 92); }
#mermaid-r2kb-r18 .error-text { fill: rgb(51, 135, 163); stroke: rgb(51, 135, 163); }
#mermaid-r2kb-r18 .edge-thickness-normal { stroke-width: 1px; }
#mermaid-r2kb-r18 .edge-thickness-thick { stroke-width: 3.5px; }
#mermaid-r2kb-r18 .edge-pattern-solid { stroke-dasharray: 0; }
#mermaid-r2kb-r18 .edge-thickness-invisible { stroke-width: 0; fill: none; }
#mermaid-r2kb-r18 .edge-pattern-dashed { stroke-dasharray: 3; }
#mermaid-r2kb-r18 .edge-pattern-dotted { stroke-dasharray: 2; }
#mermaid-r2kb-r18 .marker { fill: rgb(145, 145, 141); stroke: rgb(145, 145, 141); }
#mermaid-r2kb-r18 .marker.cross { stroke: rgb(145, 145, 141); }
#mermaid-r2kb-r18 svg { font-family: "Anthropic Sans", system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 16px; }
#mermaid-r2kb-r18 p { margin: 0px; }
#mermaid-r2kb-r18 .label { font-family: "Anthropic Sans", system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: rgb(25, 25, 25); }
#mermaid-r2kb-r18 .cluster-label text { fill: rgb(51, 135, 163); }
#mermaid-r2kb-r18 .cluster-label span { color: rgb(51, 135, 163); }
#mermaid-r2kb-r18 .cluster-label span p { background-color: transparent; }
#mermaid-r2kb-r18 .label text, #mermaid-r2kb-r18 span { fill: rgb(25, 25, 25); color: rgb(25, 25, 25); }
#mermaid-r2kb-r18 .node rect, #mermaid-r2kb-r18 .node circle, #mermaid-r2kb-r18 .node ellipse, #mermaid-r2kb-r18 .node polygon, #mermaid-r2kb-r18 .node path { fill: rgb(240, 240, 235); stroke: rgb(217, 216, 213); stroke-width: 1px; }
#mermaid-r2kb-r18 .rough-node .label text, #mermaid-r2kb-r18 .node .label text, #mermaid-r2kb-r18 .image-shape .label, #mermaid-r2kb-r18 .icon-shape .label { text-anchor: middle; }
#mermaid-r2kb-r18 .node .katex path { fill: rgb(0, 0, 0); stroke: rgb(0, 0, 0); stroke-width: 1px; }
#mermaid-r2kb-r18 .rough-node .label, #mermaid-r2kb-r18 .node .label, #mermaid-r2kb-r18 .image-shape .label, #mermaid-r2kb-r18 .icon-shape .label { text-align: center; }
#mermaid-r2kb-r18 .node.clickable { cursor: pointer; }
#mermaid-r2kb-r18 .root .anchor path { stroke-width: 0; stroke: rgb(145, 145, 141); fill: rgb(145, 145, 141) !important; }
#mermaid-r2kb-r18 .arrowheadPath { fill: rgb(11, 11, 11); }
#mermaid-r2kb-r18 .edgePath .path { stroke: rgb(145, 145, 141); stroke-width: 1px; }
#mermaid-r2kb-r18 .flowchart-link { stroke: rgb(145, 145, 141); fill: none; }
#mermaid-r2kb-r18 .edgeLabel { background-color: rgb(245, 230, 216); text-align: center; }
#mermaid-r2kb-r18 .edgeLabel p { background-color: rgb(245, 230, 216); }
#mermaid-r2kb-r18 .edgeLabel rect { opacity: 0.5; background-color: rgb(245, 230, 216); fill: rgb(245, 230, 216); }
#mermaid-r2kb-r18 .labelBkg { background-color: rgba(245, 230, 216, 0.5); }
#mermaid-r2kb-r18 .cluster rect { fill: rgb(204, 120, 92); stroke: rgb(138, 115, 107); stroke-width: 1px; }
#mermaid-r2kb-r18 .cluster text { fill: rgb(51, 135, 163); }
#mermaid-r2kb-r18 .cluster span { color: rgb(51, 135, 163); }
#mermaid-r2kb-r18 div.mermaidTooltip { position: absolute; text-align: center; max-width: 200px; padding: 2px; font-family: "Anthropic Sans", system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 12px; background: rgb(204, 120, 92); border: 1px solid rgb(138, 115, 107); border-radius: 2px; pointer-events: none; z-index: 100; }
#mermaid-r2kb-r18 .flowchartTitleText { text-anchor: middle; font-size: 18px; fill: rgb(25, 25, 25); }
#mermaid-r2kb-r18 rect.text { fill: none; stroke-width: 0; }
#mermaid-r2kb-r18 .icon-shape, #mermaid-r2kb-r18 .image-shape { background-color: rgb(245, 230, 216); text-align: center; }
#mermaid-r2kb-r18 .icon-shape p, #mermaid-r2kb-r18 .image-shape p { background-color: rgb(245, 230, 216); padding: 2px; }
#mermaid-r2kb-r18 .icon-shape .label rect, #mermaid-r2kb-r18 .image-shape .label rect { opacity: 0.5; background-color: rgb(245, 230, 216); fill: rgb(245, 230, 216); }
#mermaid-r2kb-r18 .label-icon { display: inline-block; height: 1em; overflow: visible; vertical-align: -0.125em; }
#mermaid-r2kb-r18 .node .label-icon path { fill: currentcolor; stroke: revert; stroke-width: revert; }
#mermaid-r2kb-r18 .node .neo-node { stroke: rgb(217, 216, 213); }
#mermaid-r2kb-r18 [data-look="neo"].node rect, #mermaid-r2kb-r18 [data-look="neo"].cluster rect, #mermaid-r2kb-r18 [data-look="neo"].node polygon { stroke: url("#mermaid-r2kb-r18-gradient"); filter: drop-shadow(rgb(185, 185, 185) 1px 2px 2px); }
#mermaid-r2kb-r18 [data-look="neo"].node path { stroke: url("#mermaid-r2kb-r18-gradient"); stroke-width: 1px; }
#mermaid-r2kb-r18 [data-look="neo"].node .outer-path { filter: drop-shadow(rgb(185, 185, 185) 1px 2px 2px); }
#mermaid-r2kb-r18 [data-look="neo"].node .neo-line path { stroke: rgb(217, 216, 213); filter: none; }
#mermaid-r2kb-r18 [data-look="neo"].node circle { stroke: url("#mermaid-r2kb-r18-gradient"); filter: drop-shadow(rgb(185, 185, 185) 1px 2px 2px); }
#mermaid-r2kb-r18 [data-look="neo"].node circle .state-start { fill: rgb(0, 0, 0); }
#mermaid-r2kb-r18 [data-look="neo"].icon-shape .icon { fill: url("#mermaid-r2kb-r18-gradient"); filter: drop-shadow(rgb(185, 185, 185) 1px 2px 2px); }
#mermaid-r2kb-r18 [data-look="neo"].icon-shape .icon-neo path { stroke: url("#mermaid-r2kb-r18-gradient"); filter: drop-shadow(rgb(185, 185, 185) 1px 2px 2px); }
#mermaid-r2kb-r18 :root { --mermaid-font-family: "Anthropic Sans",system-ui,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }ExternalSupabaseClientoptional live updatesReact Web AppReact Native AppSupabase AuthPostgres DB + Row LevelSecuritySupabase StorageEdge Functions - DenoRealtime - optional, liveappointment updatesPayment Gateway -Razorpay/StripeSMS/WhatsApp API

3.2 Tech Stack

LayerTechnologyNotesFrontend (Web)React + TypeScript, Tailwind CSSRole-based routing (Admin/Doctor/Staff/Patient)MobileReact NativeShares Supabase client logic with web; staff + patient appsBackend-as-a-ServiceSupabaseAuto-generated API (PostgREST) over Postgres — no custom Express server needed for standard CRUDDatabasePostgreSQL (via Supabase)Multi-tenant via clinic_id column + Row Level Security (RLS) policiesAuthSupabase AuthBuilt-in JWT issuance, email/phone OTP, social login if neededCustom server logicSupabase Edge Functions (Deno)Notifications, invoice processing, referral rewards, review-request triggersFile StorageSupabase StoragePatient documents, reports — bucket policies enforce clinic-level accessPaymentsRazorpay (India-first)Called from an Edge Function for invoicing + subscription billingNotificationsWhatsApp Business API / Twilio SMSTriggered from Edge Functions or Database WebhooksHostingSupabase Cloud (managed)Frontend on Vercel/Netlify

3.3 Multi-Tenancy Strategy

Approach: Shared database, shared schema, with a clinic_id column on every tenant-scoped table (patients, appointments, invoices, medical_records, profiles).


A profiles table extends auth.users with clinic_id and role for each logged-in user
Row Level Security (RLS) policies on every table enforce: clinic_id = (select clinic_id from profiles where id = auth.uid()) — this means tenant isolation is enforced at the database level, not just in application code
This is actually a stronger guarantee than the original MERN approach (which relied on every Express controller remembering to scope by clinicId) — RLS cannot be accidentally bypassed by a forgotten check in one controller
Public booking page uses a separate, narrowly-scoped RLS policy allowing anonymous (anon role) read access to a clinic's public profile and open slots only — never to patient/medical data


3.4 Backend Structure (Supabase Project)

/supabase
  /migrations         (SQL files defining tables, RLS policies, functions — versioned)
  /functions
    /send-reminder         (Edge Function: appointment reminders via SMS/WhatsApp)
    /request-review        (Edge Function: triggered after appointment marked completed)
    /process-referral      (Edge Function: validates code, credits reward)
    /generate-invoice-pdf   (Edge Function: optional, for downloadable receipts)
  config.toml

3.5 Frontend Folder Structure (React Web)

/web
  /src
    /pages          (Login, AdminDashboard, DoctorDashboard, StaffDashboard, PatientPortal)
    /components      (Calendar, PatientCard, InvoiceTable, etc.)
    /lib             (supabaseClient.ts — initialized Supabase client)
    /context         (Auth context, role context)
    /hooks
    /routes          (role-protected routes)

(React Native app mirrors this structure under /mobile, reusing the same /lib/supabaseClient logic where possible.)

3.6 Data Access Pattern (Supabase Client + Edge Functions)

Most CRUD operations go directly from the frontend to Supabase via the client SDK (supabase.from('appointments').select()...), protected by RLS — no custom REST layer needed. Custom business logic that can't be expressed as a simple RLS-protected query runs in Edge Functions:

ModuleAccess PatternDescriptionAuthsupabase.auth.signUp / signInWithOtpClinic signup, staff/patient loginPatientssupabase.from('patients')List/add/update — RLS-scoped to clinicAppointmentssupabase.from('appointments')List/create/update — RLS-scoped; conflict check via a Postgres functionMedical Recordssupabase.from('medical_records')View/add visit notes & prescriptionsInvoicessupabase.from('invoices')List/create/update payment statusReportssupabase.rpc('get_revenue_summary', {...})Postgres function for aggregated reportingPublic Bookingsupabase.from('clinics').select() (anon role, restricted RLS policy)Public clinic profile + open slots, no loginPublic BookingEdge Function book-public-slotValidates and inserts a booking from an unauthenticated visitorReviewsEdge Function request-reviewTriggered on appointment status → completedReferralsEdge Function process-referralGenerates/redeems referral codes, credits rewards

3.7 Database Schema (Key Tables)

clinics: id, name, address, phone, subscription_plan, is_active, created_at

profiles (extends auth.users): id (= auth.users.id), clinic_id, name, role [admin|doctor|staff|patient], specialization, is_active

patients: id, clinic_id, name, phone, dob, gender, address, created_at

appointments: id, clinic_id, patient_id, doctor_id, slot_start, slot_end, status [confirmed|completed|cancelled|no_show], notes

medical_records: id, clinic_id, patient_id, doctor_id, appointment_id, visit_date, diagnosis, prescriptions (jsonb), attachments (jsonb — Storage paths)

invoices: id, clinic_id, patient_id, appointment_id, items (jsonb), total_amount, payment_status [unpaid|paid|partially_paid], payment_method, issued_date

reviews: id, clinic_id, patient_id, appointment_id, request_sent_at, rating, comment, source [google|in_app], status [requested|completed]

referrals: id, clinic_id, referring_patient_id, code, referred_patient_id, reward_status [pending|credited], created_at

Every table above (except the narrowly-scoped public read policy on clinics) has RLS enabled with a clinic_id matching policy.

3.8 Third-Party Integrations


Payments: Razorpay (India) for invoice payment links + subscription billing, called from an Edge Function
Notifications: WhatsApp Business API or Twilio, called from Edge Functions/Database Webhooks
File storage: Supabase Storage for scanned reports/prescriptions, bucket policies scoped by clinic_id


3.9 Deployment & DevOps


Backend: Supabase Cloud (managed Postgres, Auth, Storage, Edge Functions) — free tier sufficient for pilot
Frontend: Vercel or Netlify
Schema management: SQL migrations in /supabase/migrations, applied via Supabase CLI
CI/CD: GitHub Actions — run migrations + deploy Edge Functions + deploy frontend on merge to main
Environments: separate Supabase projects for dev and production



PART 4 — SECURITY PRD

4.1 Authentication & Authorization


Supabase Auth issues JWTs automatically on login — no custom token-signing code to maintain
Passwords/OTP handled by Supabase Auth (industry-standard hashing, never touches application code)
Role-Based Access Control (RBAC): role stored in profiles.role, enforced via RLS policies on every table — not just application-level checks
Patients authenticate via phone OTP (signInWithOtp) rather than password, for lower friction


4.2 Data Protection


All traffic over HTTPS/TLS by default (Supabase-managed)
Sensitive fields never logged (Supabase Auth handles credentials; application code never sees raw passwords/OTPs)
Database encryption at rest (Supabase/Postgres default)
Regular automated backups (Supabase daily backups; verify retention period on chosen plan)


4.3 Compliance Considerations

Patient/medical data is sensitive personal data. Relevant frameworks to review with a legal/compliance professional before handling real patient data at scale:


India's Digital Personal Data Protection (DPDP) Act, 2023 — consent, data minimization, breach notification obligations
Sector-specific health data handling norms (evolving; confirm current rules before launch)
Confirm which Supabase data region/hosting is used, relevant if any data residency requirements apply


Note: This is not legal advice — consult a lawyer/compliance consultant before processing real patient health data commercially, especially before the first paying clinic goes live.

4.4 API Security


Input validation in every Edge Function (e.g., using zod) before writing to the database
Supabase has built-in rate limiting on Auth endpoints; add additional limits on public Edge Functions (e.g., book-public-slot) to prevent abuse
Row Level Security is the primary access-control layer — every table must have RLS enabled (a table with RLS disabled is fully exposed via the auto-generated API)
Never trust a client-supplied clinic_id in any insert/update — RLS policies must independently derive it from auth.uid() via the profiles table


4.5 Multi-Tenant Data Isolation


Every table must have an RLS policy scoping rows by clinic_id, derived server-side from auth.uid() — never from client input
Write automated tests (using two test users from two different clinics) verifying neither can read or write the other's data through any table or Edge Function
Double-check the public booking RLS policy only exposes intended public fields (clinic profile, open slots) — never patient or financial data


4.6 Audit Logging


Use a Postgres trigger or Supabase's built-in logging to record create/update/delete actions on patients, appointments, invoices, medical_records with user_id, action, timestamp
Retain audit logs in a separate table with read-only access for Admin role (enforced via its own RLS policy)


4.7 Backup & Disaster Recovery


Rely on Supabase's automated backups (confirm frequency/retention for the chosen plan; upgrade plan if pilot clients require longer retention)
Documented recovery runbook (RTO/RPO targets defined before pilot launch)


4.8 OWASP Top 10 — Quick Mapping

RiskMitigation in this systemBroken Access ControlRLS policies enforced at the database level on every table (cannot be bypassed by a missed check in app code)InjectionSupabase client/PostgREST use parameterized queries; Edge Functions validate all input before queryingSensitive Data ExposureTLS everywhere, encryption at rest, RLS prevents cross-tenant leaks, no plaintext secrets in logsSecurity MisconfigurationRLS enabled-by-default check on every new table, environment-based config, no default credentialsVulnerable Dependenciesnpm audit for frontend deps, scheduled Supabase platform updates (managed by Supabase)


Next Steps


Create a Supabase project (free tier) before starting development in Antigravity
Paste this document into Antigravity as the master project brief
Confirm the multi-tenancy assumption (Section 1.3) before development starts
Start with Part 1 (PRD) scope only for MVP — resist adding Phase 2 features early
Build database tables + RLS policies first (Section 3.7) before any frontend screens — this is the part most worth getting right early