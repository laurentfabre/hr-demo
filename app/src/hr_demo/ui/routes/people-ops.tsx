import { createFileRoute } from "@tanstack/react-router";
import { OperationsPage } from "@/components/cockpit/pages";
export const Route = createFileRoute("/people-ops")({ component: OperationsPage });
