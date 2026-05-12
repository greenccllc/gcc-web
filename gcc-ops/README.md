# gcc-ops

Operational scripts for the GCC LLC stack. Lives at `C:\ProgramData\GCC\scripts\`
on the production box. Sister repo to:

- [`gcc-site`](https://github.com/Particles816/gcc-site) — the public site, client/staff portals, admin console
- [`gcc-api`](https://github.com/Particles816/gcc-api) — the .NET 8 API behind `api.greencommllc.com`

## What's in here

### GCP service-account tooling

These scripts authenticate as `claude@micro-enigma-494403-d0.iam.gserviceaccount.com`
using the SA key at `C:\ProgramData\GCC\secrets\gcc-claude-sa.json` (NOT in this
repo — see the `secrets/` directory next to this one). They use the Application
Default Credentials env var: `GOOGLE_APPLICATION_CREDENTIALS=C:\ProgramData\GCC\secrets\gcc-claude-sa.json`.

| Script | Purpose |
|---|---|
| `gcp_enable_apis.py` | Idempotent enable of every GCP API the gcc-api connector needs (Service Usage, IAM, Drive, Sheets, Gemini, Vertex, Places, Secret Manager, Document AI, Vision, Pub/Sub, Cloud Run, BigQuery). |
| `gcp_grant_sa_roles.py` | Grant project-level IAM roles to the SA (currently `roles/secretmanager.admin`). Idempotent. |
| `gcp_migrate_settings_to_secrets.py` | One-shot (idempotent) migration of `dbo.Settings` rows from SQL Server into Google Cloud Secret Manager. Re-runnable to pick up new entries. |
| `gcp_smoke_test.py` | End-to-end smoke test of the SA: auth + Gemini + IAM + Drive. |
| `setup_adc_gcc.sh` | Sets `GOOGLE_APPLICATION_CREDENTIALS` and related env vars in the current shell (bash). |

### IIS / deploy tooling

| Script | Purpose |
|---|---|
| `_iis-inspect.ps1` | Read-only IIS site / app-pool / binding inventory. Needs admin. |
| `_recover-iis.ps1` | Bring IIS sites back online if they stopped. Needs admin. |
| `_run-deploys.ps1` | Convenience wrapper to publish gcc-api and roll the scheduled task. |
| `_run-autosync-setup.ps1` | Bootstrap the gcc-site auto-sync (git pull on a schedule into `C:\GCC_LLC\IIS\gcc-site\`). |
| `setup_gcc_site_autosync.ps1` | Underlying scheduled-task creation for the above. |
| `get-task-info.ps1` | Dump info about the `\GCC-Api-Service` scheduled task. |

## Required env

Set once at the user level (`setx`):

```
GOOGLE_APPLICATION_CREDENTIALS = C:\ProgramData\GCC\secrets\gcc-claude-sa.json
GCC_GCP_PROJECT_ID             = micro-enigma-494403-d0
GCC_GCP_SA_EMAIL               = claude@micro-enigma-494403-d0.iam.gserviceaccount.com
GCC_API_BASE                   = http://localhost:5099
```

## Why these aren't in `gcc-api`

These scripts span concerns wider than the API: GCP project setup, IIS infra,
deploy automation, secret migration. Keeping them in their own repo means
gcc-api stays focused on application code, and operations can be reviewed
and rolled forward independently.
