"""Portable synthetic DNB HR contract. No Logfood records or customer data.

The 20 priorities are curated research-informed questions, not adoption ranks.
All coefficients below are explicit demonstration assumptions, not predictions.
"""
SCENARIOS = ["baseline", "hiring_surge", "balanced"]
REGIONS = ["AMER", "EMEA", "APJ"]
MONTHS = [f"2026-{m:02}-01" for m in range(1, 7)]
DOMAINS = {
    "workforce": ("Planification & coûts", "Workforce & costs", "Capacity gaps, headcount plans, workforce distribution and aggregate personnel costs."),
    "talent": ("Acquisition de talents", "Talent acquisition", "Recruitment funnels, hiring lead times, offers, sourcing costs and internal mobility. Never candidate ranking."),
    "retention": ("Rétention & expérience", "Retention & experience", "Historical cohort attrition, voluntary survey participation and favorable responses, manager span and learning coverage. No individual risk or health inference."),
    "operations": ("Opérations RH", "People operations", "Employee support SLAs, onboarding completion, payroll exception counts, policy self-service resolution and HR source reconciliation."),
}


def item(n, domain, title_fr, title_en, question_fr, question_en, metrics, by="department", trend=False):
    return dict(id=f"DNB{n:02}", order=n, domain=domain, title={"fr":title_fr,"en":title_en},
                question={"fr":question_fr,"en":question_en}, metrics=metrics, by=by, trend=trend,
                research_tier="research_informed_adaptation")


USE_CASES = [
    item(1,"workforce","Anticiper les écarts de capacité","Workforce capacity gaps",
         "Quels départements présentent le plus grand écart entre demande et capacité en ETP ?",
         "Which departments have the largest gap between demand and capacity in FTE?",["Demand FTE","Available FTE","Capacity gap FTE"]),
    item(2,"workforce","Piloter le plan d’effectifs","Headcount plan execution",
         "Compare les effectifs au plan approuvé par département.","Compare headcount with the approved plan by department.",["Headcount","Planned headcount","Headcount variance"]),
    item(3,"workforce","Expliquer la masse salariale","Personnel cost trends",
         "Comment évoluent les coûts de personnel depuis janvier ?","How have personnel costs evolved since January?",["Personnel cost EUR"],"month",True),
    item(4,"workforce","Maîtriser les écarts budgétaires","Workforce budget variance",
         "Quels départements dépassent leur budget mensuel de personnel ?","Which departments exceed their monthly personnel budget?",["Personnel cost EUR","Personnel budget EUR","Budget variance EUR"]),
    item(5,"workforce","Comprendre la répartition mondiale","Global workforce mix",
         "Compare les collaborateurs et les ETP disponibles par région.","Compare employee headcount and available FTE by region.",["Headcount","Available FTE"],"region"),
    item(6,"talent","Identifier les freins au recrutement","Hiring funnel visibility",
         "Compare les volumes de candidatures, d’entretiens, d’offres et d’embauches par département.","Compare application, interview, offer and hire volumes by department.",["Applications","Interviews","Offers","Hires"]),
    item(7,"talent","Réduire les délais de recrutement","Time to fill",
         "Quels départements ont les délais moyens de recrutement les plus longs ?","Which departments have the longest average time to fill?",["Hires","Average time to fill days"]),
    item(8,"talent","Comprendre l’acceptation des offres","Offer acceptance",
         "Compare les offres acceptées et le taux d’acceptation par département.","Compare accepted offers and offer acceptance rate by department.",["Offers","Accepted offers","Offer acceptance pct"]),
    item(9,"talent","Optimiser le coût d’acquisition","Cost per hire",
         "Compare les dépenses de recrutement et le coût par embauche par département.","Compare recruitment spend and cost per hire by department.",["Recruitment cost EUR","Hires","Cost per hire EUR"]),
    item(10,"talent","Développer la mobilité interne","Internal mobility",
         "Quelle part des postes pourvus provient de la mobilité interne par département ?","What share of filled roles comes from internal mobility by department?",["Hires","Internal fills","Internal fill pct"]),
    item(11,"retention","Comprendre l’attrition historique","Historical cohort attrition",
         "Compare les taux mensuels de départs volontaires par département, sans prédiction individuelle.","Compare monthly voluntary attrition rates by department, without individual prediction.",["Voluntary exits","Average headcount","Monthly attrition pct"]),
    item(12,"retention","Écouter les collectifs","Voluntary employee feedback",
         "Compare les réponses favorables au questionnaire volontaire par département et leur couverture.","Compare favorable voluntary survey responses and their coverage by department.",["Survey responses","Survey favorable pct","Survey participation pct"]),
    item(13,"retention","Vérifier la participation aux enquêtes","Survey participation gaps",
         "Quels départements ont la plus faible participation au questionnaire volontaire ?","Which departments have the lowest voluntary survey participation?",["Survey invited","Survey responses","Survey participation pct"]),
    item(14,"retention","Soutenir les managers","Manager span of support",
         "Compare les effectifs et le nombre de collaborateurs par manager par département.","Compare headcount and employees per manager by department.",["Average headcount","Managers","Employees per manager"]),
    item(15,"retention","Suivre la couverture de formation","Learning coverage",
         "Quelle est la couverture des formations planifiées par département ?","What is the completion coverage of planned learning by department?",["Learning assigned","Learning completed","Learning completion pct"]),
    item(16,"operations","Fluidifier l’intégration","Onboarding readiness",
         "Quels départements ont des parcours d’intégration incomplets ?","Which departments have incomplete onboarding journeys?",["Onboarding due","Onboarding completed","Onboarding completion pct"]),
    item(17,"operations","Prioriser les dossiers hors délai","Employee support SLA",
         "Compare les dossiers RH ouverts et hors délai par département.","Compare open and overdue HR support cases by department.",["Open cases","Overdue cases","Overdue pct"]),
    item(18,"operations","Contrôler les anomalies de paie","Payroll exception review",
         "Quels départements ont le plus d’anomalies de paie à vérifier ?","Which departments have the most payroll exceptions to review?",["Payroll checked","Payroll exceptions","Payroll exception pct"]),
    item(19,"operations","Mesurer le libre-service RH","HR policy self-service",
         "Compare les demandes de politique RH résolues en libre-service et celles escaladées.","Compare HR policy requests resolved through self-service with those escalated.",["Policy requests","Self-service resolved","Policy escalations","Self-service resolution pct"]),
    item(20,"operations","Fiabiliser les données RH","HR data reconciliation",
         "Compare les enregistrements RH vérifiés et non réconciliés par département.","Compare checked and unreconciled HR records by department.",["Records checked","Unreconciled records","Reconciliation pct"]),
]

# Scrubbed evidence-level mapping; exact internal provenance lives outside App.
FIELD_THEMES = {1,2,5,6,7,11,12,15,16}
for case in USE_CASES:
    case["research_tier"] = "field_theme" if case["order"] in FIELD_THEMES else "editorial" if case["order"] == 14 else "theme_adaptation"

# (business measure, canonical expression, definition). Ratios reaggregate from
# numerators/denominators; snapshots must be grouped by month, never summed over time.
METRICS = {
    "workforce": [
        ("Headcount","SUM(headcount)","Employees at month end; not FTE. Snapshot: group by month for trends."),
        ("Planned headcount","SUM(planned_headcount)","Assumed approved monthly staffing plan; employees."),
        ("Headcount variance","SUM(headcount-planned_headcount)","Employees above or below the assumed monthly staffing plan."),
        ("Available FTE","SUM(available_fte)","Available full-time-equivalent capacity at month end. Not employee count."),
        ("Demand FTE","SUM(demand_fte)","Hypothetical full-time-equivalent demand for this month; not a trained forecast."),
        ("Capacity gap FTE","SUM(GREATEST(demand_fte-available_fte,0))","Sum of positive department-region demand gaps in FTE for one month; not FTE-months."),
        ("Personnel cost EUR","SUM(personnel_cost_eur)","Synthetic fully loaded monthly personnel costs in EUR; no individual compensation."),
        ("Personnel budget EUR","SUM(personnel_budget_eur)","Assumed monthly personnel budget in EUR."),
        ("Budget variance EUR","SUM(personnel_cost_eur-personnel_budget_eur)","Positive means over budget, EUR per month."),
    ],
    "talent": [
        ("Applications","SUM(applications)","Applications in the same closed requisition cohort; not distinct people."),
        ("Interviews","SUM(interviews)","Interviewed applications in the same closed requisition cohort."),
        ("Offers","SUM(offers)","Offers made in the same requisition cohort, including declined offers."),
        ("Accepted offers","SUM(accepted_offers)","Accepted offers in the same closed requisition cohort."),
        ("Hires","SUM(hires)","Filled roles including internal moves, grouped by closure month; not net new headcount."),
        ("Average time to fill days","ROUND(SUM(fill_days_total)/NULLIF(SUM(hires),0),2)","Hire-weighted arithmetic average calendar days from opening to fill. NOT a median."),
        ("Offer acceptance pct","ROUND(100.0*SUM(accepted_offers)/NULLIF(SUM(offers),0),2)","100 times accepted offers divided by offers made in the same cohort."),
        ("Recruitment cost EUR","SUM(recruitment_cost_eur)","Assumed recruitment spend for the same filled-requisition cohort, EUR."),
        ("Cost per hire EUR","ROUND(SUM(recruitment_cost_eur)/NULLIF(SUM(hires),0),2)","Recruitment spend divided by filled roles, EUR per hire."),
        ("Internal fills","SUM(internal_fills)","Filled roles from internal mobility, included in hires."),
        ("Internal fill pct","ROUND(100.0*SUM(internal_fills)/NULLIF(SUM(hires),0),2)","100 times internal fills divided by all filled roles."),
    ],
    "retention": [
        ("Average headcount","SUM(average_headcount)","Average daily employee headcount within each calendar month. Group by month; never sum months for a headcount."),
        ("Voluntary exits","SUM(voluntary_exits)","Observed fictional voluntary departures during the month; no individual risk scores."),
        ("Monthly attrition pct","ROUND(100.0*SUM(voluntary_exits)/NULLIF(SUM(average_headcount),0),2)","Monthly voluntary exits divided by average daily headcount times100. Not annualized; group by month for trends."),
        ("Survey invited","SUM(survey_invited)","Employees invited to a voluntary monthly pulse; no sentiment or health inference."),
        ("Survey responses","SUM(survey_responses)","Voluntary survey respondents; aggregate only."),
        ("Survey favorable pct","ROUND(100.0*SUM(survey_favorable)/NULLIF(SUM(survey_responses),0),2)","Favorable responses / respondents times100; descriptive, not causal or predictive."),
        ("Survey participation pct","ROUND(100.0*SUM(survey_responses)/NULLIF(SUM(survey_invited),0),2)","Respondents / invited employees times100; report alongside favorable results."),
        ("Managers","SUM(managers)","Fictional people managers in the cohort, also included in headcount."),
        ("Employees per manager","ROUND(SUM(average_headcount)/NULLIF(SUM(managers),0),2)","All employees including managers divided by managers. Not exact direct reports or workload."),
        ("Learning assigned","SUM(learning_assigned)","Planned learning assignments, not distinct people or inferred skills."),
        ("Learning completed","SUM(learning_completed)","Completed assignments; not proof of learning effectiveness."),
        ("Learning completion pct","ROUND(100.0*SUM(learning_completed)/NULLIF(SUM(learning_assigned),0),2)","Completed / assigned learning items times100."),
    ],
    "operations": [
        ("Onboarding due","SUM(onboarding_due)","Onboarding checklists due this month."),
        ("Onboarding completed","SUM(onboarding_completed)","Checklists completed on time among those due."),
        ("Onboarding completion pct","ROUND(100.0*SUM(onboarding_completed)/NULLIF(SUM(onboarding_due),0),2)","On-time completed / due checklists times100."),
        ("Open cases","SUM(open_cases)","Open employee HR service cases at month end; snapshot."),
        ("Overdue cases","SUM(overdue_cases)","Open cases past their assumed SLA deadline at month end."),
        ("Overdue pct","ROUND(100.0*SUM(overdue_cases)/NULLIF(SUM(open_cases),0),2)","Overdue / open cases times100; not all received cases."),
        ("Payroll checked","SUM(payroll_checked)","Synthetic payroll records checked this month."),
        ("Payroll exceptions","SUM(payroll_exceptions)","Payroll records flagged for human reconciliation; NOT fraud allegations."),
        ("Payroll exception pct","ROUND(100.0*SUM(payroll_exceptions)/NULLIF(SUM(payroll_checked),0),2)","Flagged / checked payroll records times100."),
        ("Policy requests","SUM(policy_requests)","HR policy help requests this month; policy text/legal advice not available."),
        ("Self-service resolved","SUM(policy_resolved)","Policy requests recorded resolved by self-service; hypothetical, not proven AI savings."),
        ("Policy escalations","SUM(policy_requests-policy_resolved)","Policy requests requiring human HR review."),
        ("Self-service resolution pct","ROUND(100.0*SUM(policy_resolved)/NULLIF(SUM(policy_requests),0),2)","Self-service resolved / policy requests times100."),
        ("Records checked","SUM(records_checked)","HR integration records checked across illustrative source systems."),
        ("Unreconciled records","SUM(unreconciled_records)","Unmatched records requiring manual source reconciliation."),
        ("Reconciliation pct","ROUND(100.0*SUM(records_checked-unreconciled_records)/NULLIF(SUM(records_checked),0),2)","Matched / checked integration records times100. Not universal source completeness."),
    ],
}


def reference_sql(case, namespace, scenario="baseline", region="ALL", month="2026-06-01"):
    if scenario not in SCENARIOS or region not in ["ALL",*REGIONS] or month not in MONTHS:
        raise ValueError("Invalid synthetic scope")
    dims = [case["by"]]
    fields = [f"m.`{dim}`" for dim in dims]
    fields += [f"MEASURE(m.`{name}`) AS `{name}`" for name in case["metrics"]]
    filters = [f"m.scenario='{scenario}'", f"m.month {'<=' if case['trend'] else '='} DATE'{month}'"]
    if region != "ALL": filters.append(f"m.region='{region}'")
    return ("SELECT "+", ".join(fields)+f" FROM {namespace}.dnb_{case['domain']}_metrics AS m WHERE "
            +" AND ".join(filters)+" GROUP BY ALL ORDER BY 1 LIMIT 50")
