import { createFileRoute } from "@tanstack/react-router";
import { TrustPage } from "@/components/cockpit/pages";
export const Route = createFileRoute("/trust")({ component: TrustPage });
