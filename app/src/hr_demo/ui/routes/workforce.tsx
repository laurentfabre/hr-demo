import { createFileRoute } from "@tanstack/react-router";
import { WorkforcePage } from "@/components/cockpit/pages";
export const Route = createFileRoute("/workforce")({ component: WorkforcePage });
