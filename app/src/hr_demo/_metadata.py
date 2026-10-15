from pathlib import Path

app_name = "hr-demo"
app_entrypoint = "hr_demo.backend.app:app"
app_slug = "hr_demo"
api_prefix = "/api"
dist_dir = Path(__file__).parent / "__dist__"