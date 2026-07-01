# Project Gap Analysis - Aura Healthcare System

This document outlines the complete project comparison audit comparing the current monorepo structure against the original **Aura Healthcare Clinic Management System** architecture.

---

## 1. Feature-by-Feature Status Checklist

### Core Portal Views
*   **Homepage Layout & Section Order**: **WORKING**
    *   *Details*: Renders sections sequentially in their original order: Hero metrics, NABH/ISO certifications, Specialists preview, Clinical Services, Why Choose Us, Testimonials, and inline Scheduler.
*   **Specialists Directory (`/doctors`)**: **WORKING**
    *   *Details*: Loads and maps audited doctor profiles directly from database records. Supports search inputs and department filters.
*   **Floating WhatsApp Widget**: **WORKING**
    *   *Details*: Floating support icon links directly to the Bicholim center contact line.
*   **Health Blog & Contact Pages**: **WORKING**
    *   *Details*: Structural templates, contact form fields, and Google Map frames render without issue.
*   **Emergency Trauma Helpline**: **WORKING**
    *   *Details*: Renders 24/7 hotline alerts and records emergency contact submissions.

### Appointment Booking & Payments
*   **Doctor / Date Selector Grid**: **WORKING**
    *   *Details*: Loads 14-day booking calendar and updates color-coded availability cells based on active schedules.
*   **Slot Generation & Double-Book Check**: **WORKING**
    *   *Details*: Partitions working hours into 15-minute segments and checks database constraints to prevent slot overlaps.
*   **Standalone Booking Wizard (`/public-book/:clinicId`)**: **WORKING**
    *   *Details*: Comprehensive 4-step wizard covering slots, patient demographics, multi-method payments, and receipt generation.
*   **Cash, Card, UPI, and Net Banking Gateways**: **WORKING**
    *   *Details*: UPI IDs and card numbers are validated on the client side (using Luhn's algorithm for cards), committing transactions under their respective payment types in the database.
*   **Transaction Commits (Supabase RPC)**: **WORKING**
    *   *Details*: Calls corrected 16-parameter `book_public_appointment` transaction function to insert patients, bookings, invoices, notifications, and payments in one SQL block.
*   **Medical Receipt & PDF Prints**: **WORKING**
    *   *Details*: Renders thermal-style receipts with sequential numbers (`APT-...`, `INV-...`, `RCP-...`) and splits GST (18%) properly. Renders standard browser printing frame formats.

### Data Loading & Connection
*   **Database Connectivity (Supabase pooler)**: **WORKING**
    *   *Details*: Successful connections established.
*   **Tenant Scoping / Isolation**: **WORKING**
    *   *Details*: Lock configurations default to the primary Aura clinic UUID (`11111111-1111-1111-1111-111111111111`) across booking and specialist directories.
*   **Doctor Loading Delay (Cache)**: **WORKING**
    *   *Details*: Implemented a dual caching layer (memory + `localStorage`) to pull doctors instantly on mount, refreshing records in the background to eliminate the `"Loading specialists..."` lag screen.
*   **Zero-Doctor Fallback**: **WORKING**
    *   *Details*: Configured the `"No doctors available"` fallback if doctor tables are empty.

### Internal Panel Dashboards
*   **RBAC Redirect Router (`/dashboard`)**: **WORKING**
    *   *Details*: Redirects logged-in users to corresponding layouts based on metadata profile roles.
*   **Patient Dashboard**: **WORKING**
    *   *Details*: Visited history timeline, print invoices, and interactive vitals tracking charts function correctly.
*   **Staff Dashboard (Reception)**: **WORKING**
    *   *Details*: Walk-in appointment registration and invoicing are functional.
*   **Doctor Dashboard**: **WORKING**
    *   *Details*: EMR records timeline viewer, prescription inputs, and vitals form tools are operational.
*   **Nurse Dashboard**: **WORKING**
    *   *Details*: Bed reservation and vitals log entries are operational.

---

## 2. Gap Identification Analysis

### Features Replaced by Redesign
*   **Static Booking Forms**: **REPLACED**
    *   *Details*: Static details submission has been replaced with the dynamic 14-day booking calendar slot validation.
*   **Legacy Patient Portal**: **REPLACED**
    *   *Details*: Replaced with secure, authenticated dashboards featuring timeline histories and vital sign telemetry logs.

### Partially Broken / strict Build Blocks
*   **Production Bundler Compiles**: **PARTIAL**
    *   *Details*: The development server hot-reloads and compiles perfectly. However, running a production build (`npm run build`) is blocked by three strict unused import compilation errors in `PublicBooking.tsx` (`useRef`, `X`, `MapPin`) due to `noUnusedLocals` TS rules in `tsconfig.json`.

### Missing Modules
*   **B2B Onboarding UI**: **MISSING** (by design)
    *   *Details*: SaaS tenant onboarding controls are missing from the public site to lock the portal to a single-clinic brand experience. This keeps the frontend dedicated to Aura Healthcare Clinic.
