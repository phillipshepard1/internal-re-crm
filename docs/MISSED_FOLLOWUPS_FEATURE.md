# Missed Follow-ups Feature

## Overview
This feature ensures that when agents miss follow-ups from previous weeks, those follow-ups are automatically rescheduled to appear in the current week's "Follow Up" list, while still being recorded as missed in reports.

## How It Works

### 1. Automatic Detection of Missed Follow-ups
- When the follow-ups page loads, it automatically checks for any missed follow-ups
- The system runs `check_and_create_missed_followups()` function on component mount
- This identifies leads that should have had follow-ups based on their frequency settings but don't have any pending follow-ups for the current week

### 2. Rescheduling Logic
- **Twice a Week**: If missed, creates a follow-up for the next available Monday or Thursday in the current week
- **Weekly**: If missed, creates a follow-up for the specified day in the current week (or today if that day has passed)
- **Biweekly**: If it's been 2+ weeks since last follow-up, creates one for the current week
- **Monthly**: If it's been 28+ days since last follow-up, creates one for the current week

### 3. Database Functions
- `create_next_followup_for_person()`: Enhanced to handle missed follow-ups by checking current week status
- `calculate_next_followup_date_for_current_week()`: New function that schedules within the current week
- `check_and_create_missed_followups()`: Scans all leads and creates follow-ups for those who need them

### 4. Reporting
- Missed follow-ups are still tracked in the agent reports
- The system maintains a complete history of scheduled vs completed follow-ups
- Reports show both completed and missed follow-ups for accountability

## User Experience
1. Agent opens the Follow-ups page
2. System automatically checks for missed follow-ups
3. Any missed follow-ups are created for the current week
4. Agent sees all due follow-ups in their list, including rescheduled ones
5. Agent can complete them normally
6. Reports still show the original missed follow-ups for tracking purposes

## Technical Implementation
- SQL migration: `20250805000000_handle_missed_followups.sql`
- Frontend changes: `src/app/follow-ups/page.tsx`
- Automatic check runs on page load via useEffect hook
- No manual intervention required from agents or admins