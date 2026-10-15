"""Synthetic enterprise fixtures and field content; no customer records."""
from decimal import Decimal, ROUND_HALF_UP


def text(en, fr):
    return {"en": en, "fr": fr}


ENTITIES = [
    dict(id="FR", name="Aster France SAS", currency="EUR", fx="1", fiscal_start=1, source="HRIS-A", region="EMEA"),
    dict(id="DE", name="Aster Deutschland GmbH", currency="EUR", fx="1", fiscal_start=1, source="HRIS-B", region="EMEA"),
    dict(id="GB", name="Aster UK Ltd", currency="GBP", fx="1.17", fiscal_start=4, source="HRIS-B", region="EMEA"),
    dict(id="US", name="Aster Americas Inc", currency="USD", fx="0.92", fiscal_start=1, source="HRIS-A", region="AMER"),
    dict(id="IN", name="Aster India Pvt Ltd", currency="INR", fx="0.011", fiscal_start=4, source="HRIS-C", region="APJ"),
    dict(id="JP", name="Aster Japan KK", currency="JPY", fx="0.0062", fiscal_start=4, source="HRIS-C", region="APJ"),
]
PERIODS = ["2026-07", "2026-08", "2026-09"]
DEPARTMENTS = ["Engineering", "Operations", "Sales", "People"]
POLICIES = [
    dict(id=f"SYN-{entity['id']}-MOB-2026", entity=entity["id"], version=1,
         effective_from="2026-07-01", effective_to="2026-12-31", synthetic=True,
         title=text("Internal mobility review", "Revue de mobilité interne"),
         passage=text("A proposed team capacity transfer requires review by the local HR owner and budget owner. No employee transfer is executed by this demonstration.",
                      "Un transfert de capacité proposé exige une revue par le responsable RH local et le responsable budgétaire. Aucun salarié n'est transféré par cette démonstration."))
    for entity in ENTITIES
]
REFERENCES = [
    dict(id="dxc", customer="DXC Technology", url="https://www.databricks.com/customers/dxc/lakebase", accessed="2026-10-07",
         title=text("Workforce skills at global scale", "Compétences à l'échelle mondiale"),
         outcome=text("Databricks reports a reduction from about two hours to seven minutes per 1,000 consultants in a competency workflow serving 130,000 consultants.",
                      "Databricks rapporte un passage d'environ deux heures à sept minutes pour 1 000 consultants, dans un parcours de compétences destiné à 130 000 consultants."),
         relevance=text("Cross-system workforce data, Lakebase operational serving and reviewed updates.", "Données RH multisources, service opérationnel Lakebase et mises à jour revues."),
         boundary=text("Publisher-reported customer result; not independently reproduced here, not a forecast for this demo. Individual skills inference is outside this demo.",
                       "Résultat client rapporté par l'éditeur, non reproduit ici et non prévisionnel. L'inférence de compétences individuelles est hors périmètre.")),
    dict(id="la-county", customer="Los Angeles County", url="https://www.databricks.com/customers/la-county", accessed="2026-10-07",
         title=text("Shared hiring data across departments", "Données de recrutement partagées"),
         outcome=text("The published story describes an employer with over 112,000 employees unifying hiring data and building pipelines feeding reports in ten minutes or less, previously weeks.",
                      "Le cas publié décrit un employeur de plus de 112 000 salariés unifiant ses données de recrutement et créant des pipelines alimentant les rapports en dix minutes ou moins, contre des semaines auparavant."),
         relevance=text("Common definitions, data availability and departmental analytics.", "Définitions communes, disponibilité des données et analyses par département."),
         boundary=text("Publisher-reported result. The 384-day hiring baseline is not a documented post-project reduction or a demo target.",
                       "Résultat rapporté par l'éditeur. Le délai initial de 384 jours n'est ni une réduction finale documentée ni une cible du démo.")),
]

STORIES = [
    dict(id="capacity", title=text("Fund the capacity that protects delivery", "Financer la capacité nécessaire à la livraison"),
         buyer="CFO + CHRO + COO", trigger=text("A September services backlog exceeds the approved team capacity.", "Le portefeuille de septembre dépasse la capacité approuvée des équipes."),
         decision=text("Compare hiring and redeployment within a documented budget.", "Comparer recrutement et redéploiement dans un budget documenté."),
         outcome=text("Uncovered FTE-months, modeled delivery hours and one-time plan cost.", "ETP-mois non couverts, heures de livraison modélisées et coût ponctuel du plan."),
         question=text("Which entities have a capacity gap, and which options fit the budget?", "Quelles entités ont un écart de capacité et quelles options respectent le budget ?"),
         reference_ids=["dxc"],
         discovery=[text("Which committed demand is at risk, and how is capacity measured?", "Quelle demande engagée est à risque et comment mesurez-vous la capacité ?"),
                    text("Which costs are incremental cash costs versus released staff time?", "Quels coûts sont des flux financiers additionnels ou du temps libéré ?"),
                    text("Who owns the budget and can approve the next evaluation?", "Qui porte le budget et peut approuver l'évaluation suivante ?")],
         success=[text("Reconcile one period and entity to the approved staffing baseline.", "Rapprocher une période et une entité du plan d'effectifs approuvé."),
                  text("Agree capacity effects and budget assumptions with Finance.", "Valider les effets de capacité et les hypothèses avec Finance."),
                  text("Read the reviewed decision and its audit from a fresh session.", "Relire la décision revue et son audit dans une nouvelle session.")]),
    dict(id="harmonization", title=text("Reconcile the group after an acquisition", "Rapprocher le groupe après une acquisition"),
         buyer="CHRO + CFO + Data platform", trigger=text("The acquired entity counts contractors in its local workforce total.", "L'entité acquise inclut les prestataires dans son total local."),
         decision=text("Approve common group definitions while preserving local reporting.", "Approuver les définitions du groupe en préservant les rapports locaux."),
         outcome=text("Employee/contractor reconciliation, FX translation and dated group rollups.", "Rapprochement salariés/prestataires, conversion de devises et périmètres datés."),
         question=text("Why do local workforce totals differ from group employee headcount?", "Pourquoi les totaux locaux diffèrent-ils des effectifs salariés du groupe ?"),
         reference_ids=["la-county"],
         discovery=[text("Which HR systems and worker definitions differ by entity?", "Quels systèmes et définitions diffèrent selon les entités ?"),
                    text("Which effective date and FX policy govern group reporting?", "Quelles date d'effet et politique de change régissent le reporting ?"),
                    text("Which local details may leave the country?", "Quels détails locaux peuvent quitter le pays ?")],
         success=[text("Explain every local-to-group variance without double counting.", "Expliquer chaque écart local/groupe sans double comptage."),
                  text("Reproduce both sides of the dated reorganization.", "Reproduire les périmètres avant et après réorganisation."),
                  text("Reject a malformed batch and recover without changing accepted data.", "Rejeter un lot invalide et reprendre sans modifier les données acceptées.")]),
    dict(id="self_service", title=text("Answer in the employee's existing workspace", "Répondre dans l'espace de travail existant"),
         buyer="CIO + CHRO + Security", trigger=text("HR depends on data specialists to obtain a trusted answer.", "Les RH dépendent des spécialistes data pour obtenir une réponse fiable."),
         decision=text("Expose a narrow governed tool to the chosen agent interface.", "Exposer un outil gouverné limité à l'interface d'agent choisie."),
         outcome=text("Scoped response, dated policy citation, latency and operating effort.", "Réponse au bon périmètre, politique datée, latence et effort d'exploitation."),
         question=text("What needs local HR review, and which policy applies this month?", "Quels sujets exigent une revue RH locale et quelle politique s'applique ce mois-ci ?"),
         reference_ids=["dxc", "la-county"],
         discovery=[text("Which interface must remain the entry point: Dust, Teams or another agent?", "Quelle interface reste le point d'entrée : Dust, Teams ou un autre agent ?"),
                    text("Is the missing data already in the warehouse or still in the source system?", "La donnée manquante est-elle dans l'entrepôt ou encore dans le système source ?"),
                    text("Who maintains new tables, permissions and failed refreshes?", "Qui maintient les nouvelles tables, permissions et reprises ?")],
         success=[text("Two authenticated scopes return only their permitted entities.", "Deux périmètres authentifiés ne reçoivent que leurs entités autorisées."),
                  text("The external client retrieves the same revision as the app.", "Le client externe reçoit la même révision que l'application."),
                  text("Record answer latency, token usage and maintenance steps.", "Mesurer la latence, les jetons et les étapes de maintenance.")]),
]

ALTERNATIVES = [
    dict(id="hr_suite", name=text("Existing HR suite", "SIRH existant"), fit=text("One source, standard metrics and existing permissions.", "Une source, indicateurs standards et droits existants."), gap=text("Validate cross-system reconciliation and external-agent access.", "Vérifier le rapprochement multisource et l'accès des agents externes.")),
    dict(id="bi", name=text("Current BI platform", "Plateforme BI actuelle"), fit=text("Curated reporting on already available data.", "Reporting organisé sur des données déjà disponibles."), gap=text("Validate missing-source ingestion and reviewed operational actions.", "Vérifier l'ingestion des sources manquantes et les actions revues.")),
    dict(id="internal", name=text("Internal agent / MCP", "Agent / MCP interne"), fit=text("A narrow tool with an established owner and source access.", "Un outil limité avec un responsable et un accès source établis."), gap=text("Measure maintenance, shared definitions and policy enforcement across tools.", "Mesurer maintenance, définitions partagées et application des règles entre outils.")),
    dict(id="databricks", name=text("Databricks + existing interface", "Databricks + interface existante"), fit=text("Shared cross-system data, reusable metrics and governed operational workflows.", "Données multisources, indicateurs réutilisables et parcours opérationnels gouvernés."), gap=text("Validate platform cost, required skills and actual interface compatibility.", "Vérifier coût, compétences et compatibilité réelle de l'interface.")),
]


def group_for(entity, period):
    return "Aster Services" if entity == "DE" and period < "2026-09" else "Aster Platforms"


def source_rows(scale=1):
    """Scale adds independent synthetic cost centres, never duplicated identities."""
    for centre in range(scale):
        for month_index, period in enumerate(PERIODS):
            for entity_index, entity in enumerate(ENTITIES):
                for department_index, department in enumerate(DEPARTMENTS):
                    employees = 180 + entity_index * 21 + department_index * 33 + month_index * 4
                    contractors = 8 + department_index * 3
                    fte = employees * 95
                    demand = fte + (2600 if department == "Engineering" else 300) + month_index * 100
                    eur_cents = employees * (650000 if entity["id"] not in ("IN", "JP") else 410000)
                    local_cents = int((Decimal(eur_cents) / Decimal(entity["fx"])).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
                    yield dict(key=f"{entity['id']}-{period}-{department_index}-{centre}", entity=entity["id"],
                               period=period, department=department, centre=centre, source=entity["source"],
                               employees=employees, contractors=contractors, fte_centi=fte, demand_centi=demand,
                               local_cost_cents=local_cents, currency=entity["currency"], cases=12+department_index,
                               overdue=2+month_index, survey_responses=3 if department == "People" else employees//2)
