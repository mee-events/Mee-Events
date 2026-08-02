import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Mee Events | Employee CRM + ERP",
  description:
    "Hyderabad operations command centre for Mee Events leads, bookings, events, approvals, warehouse and finance.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
