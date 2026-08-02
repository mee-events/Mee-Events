# Component Library

- Status: accepted
- Flutter path: `apps/mobile/lib/design_system/`

## 1. Buttons

| Component | Class                | Variants                       |
| --------- | -------------------- | ------------------------------ |
| Primary   | `MeButton.primary`   | Brand fill, pill or rounded    |
| Secondary | `MeButton.secondary` | Ink fill                       |
| Outline   | `MeButton.outline`   | Hairline border                |
| Text      | `MeButton.text`      | Brand or ink text              |
| Icon      | `MeIconButton`       | Standard / brand / destructive |

## 2. Inputs

`MeTextField`, `MeSearchField`, `MePhoneField`, `MeOtpField`, `MeDropdown`, `MeDateField`, `MeTimeField`

## 3. Cards

`MeEventCard`, `MeCategoryCard`, `MeVendorCard`, `MeWorkerCard`, `MeOrderCard`, `MePaymentCard`, `MeDashboardCard`

## 4. Status

`MeChip`, `MeBadge`, `MeTag`, `MeProgress`, `MeTimeline`

## 5. Dialogs & sheets

`MeConfirmDialog`, `MeSuccessDialog`, `MeErrorDialog`, `MeBottomSheet`

## 6. Navigation

`MeAppBar`, `MeBottomNav` (wraps role bar patterns), `MeSideNav`, `MeDrawer`, `MeTabs`

## 7. Loading / empty / error

`MeSkeleton`, `MeCircularLoader`, `MeProgressOverlay`, `MeEmptyState`, `MeErrorState`, `MeRetry`

## 8. Consumption rule

Feature screens compose these widgets. Do not copy-paste ElevatedButton styles or ad-hoc InputDecoration.
