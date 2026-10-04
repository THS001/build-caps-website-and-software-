import { redirect } from "next/navigation"

/** Leads now live in the CRM, grouped by person. */
export default function AdminLeads() {
  redirect("/admin/crm")
}
