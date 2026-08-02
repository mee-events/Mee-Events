# Data Display

- Status: accepted

## 1. Cards

Default: bordered surface, no heavy shadow. Use dashboard cards for metrics (value + label + optional tone).

## 2. Lists

- 1 primary line (`titleMd`)
- 1 secondary line (`captionSm` + `muted`)
- Trailing status badge when needed
- Dividers: `hairlineSoft`

## 3. Tables (ERP/CRM)

- Header: uppercase micro labels, `muted`
- Row hover: `surfaceSoft`
- Overdue / SLA breach: soft error wash, never colour-only

## 4. Timeline

Vertical timeline for enquiry → lead → quote → booking → event. Active step uses `primary`; completed uses `success`; upcoming uses `muted`.
