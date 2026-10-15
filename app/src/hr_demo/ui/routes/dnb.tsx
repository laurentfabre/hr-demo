import { createFileRoute } from "@tanstack/react-router";
import { DnbPage } from "@/components/cockpit/dnb";
export const Route = createFileRoute("/dnb")({ component: DnbPage });
