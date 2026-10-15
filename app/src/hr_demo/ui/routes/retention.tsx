import { createFileRoute } from "@tanstack/react-router";
import { RetentionPage } from "@/components/cockpit/pages";
export const Route = createFileRoute("/retention")({ component: RetentionPage });
