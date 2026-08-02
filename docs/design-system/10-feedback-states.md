# Feedback States

- Status: accepted

## 1. Toast / snackbar

- Success: short confirmation
- Error: actionable message from API `message`
- Dev-only OTP: allowed to surface `debugCode` in development

## 2. Dialogs

| Type         | Use                                       |
| ------------ | ----------------------------------------- |
| Confirmation | Destructive or irreversible actions       |
| Success      | Milestone completed (booking confirmed)   |
| Error        | Blocking failures needing acknowledgement |

## 3. Inline status

Badges/chips for enquiry, lead, payment, assignment states — map to success/warning/error/muted.

## 4. Busy

- Buttons show circular loader on primary
- Full-screen: `MeProgressOverlay` only for non-cancellable critical work
