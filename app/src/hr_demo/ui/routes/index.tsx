import { createFileRoute } from "@tanstack/react-router";
import { EnterprisePage } from "@/components/cockpit/enterprise";
export const Route = createFileRoute("/")({ component: EnterprisePage });
