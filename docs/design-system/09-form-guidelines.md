# Form Guidelines

- Status: accepted

## 1. Field anatomy

- Label above or floating via Material 3
- Helper / error below field
- Focus border: `primary` for customer CTAs; ink acceptable for dense employee forms
- Radius: `md` (14)
- Min height: 48 lp

## 2. Patterns

| Field       | Component                     | Notes                                   |
| ----------- | ----------------------------- | --------------------------------------- |
| Free text   | `MeTextField`                 | Trim on submit                          |
| Phone (IN)  | `MePhoneField`                | +91 prefix visual; digits normalised    |
| OTP         | `MeOtpField`                  | 6 digits, monospace-friendly tracking   |
| Search      | `MeSearchField`               | Leading search icon, clear affordance   |
| Select      | `MeDropdown`                  | Use for ≤ 12 options; sheets for longer |
| Date / time | `MeDateField` / `MeTimeField` | Platform pickers, tokenised triggers    |

## 3. Validation

- Inline errors in `error` colour using `bodySm`
- Disable primary submit while busy; show loader inside button
- Never clear user input on recoverable errors

## 4. Progressive disclosure

Long event planning forms: one job per section (PRD / direction IA). Group with section titles (`titleMd`) and `xxl` gaps.
