"""Build a portable allowlisted source/wheel archive without private authoring data."""
import argparse
from datetime import datetime, timezone
import hashlib
import io
import json
from pathlib import Path
import tarfile
import subprocess

ROOT=Path(__file__).resolve().parents[1]


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument("--out",type=Path,required=True)
    args=parser.parse_args()
    if args.out.exists(): raise SystemExit("Release output already exists")
    wheels=list((ROOT/"app/.build").glob("*.whl"))
    if len(wheels)!=1: raise SystemExit("Build exactly one current wheel before packaging")
    files={}
    for path in (ROOT/"app/src").rglob("*"):
        if path.is_file() and "__pycache__" not in path.parts and path.suffix not in {".pyc"}:
            files[path.relative_to(ROOT).as_posix()]=path
    for directory in (ROOT/"delivery",):
        for path in directory.iterdir():
            if path.is_file() and path.suffix in {".py",".md",".json"} and ".local." not in path.name:
                files[path.relative_to(ROOT).as_posix()]=path
    # Authoring lockfiles resolve through private package proxies; recipients
    # resolve their own public dependencies or deploy the included wheel.
    for name in ("pyproject.toml","package.json","tsconfig.json","tools/deploy.py","tests/test_enterprise.py"):
        path=ROOT/"app"/name;files[path.relative_to(ROOT).as_posix()]=path
    for path in [wheels[0],ROOT/"app/.build/requirements.txt"]:
        files[path.relative_to(ROOT).as_posix()]=path
    files["README.md"]=ROOT/"delivery/README.md"
    files[".gitignore"]=ROOT/"delivery/release.gitignore"
    files["delivery/release.gitignore"]=ROOT/"delivery/release.gitignore"
    files["app/README.md"]=ROOT/"delivery/README.md"
    files["target.example.json"]=ROOT/"delivery/target.example.json"
    manifest=dict(version=1,source_commit=subprocess.check_output(["git","rev-parse","HEAD"],cwd=ROOT,text=True).strip(),created_at=datetime.now(timezone.utc).isoformat(),synthetic=True,
                  scope="Enterprise supporting release, not full A/G certification",files=[dict(path=name,sha256=hashlib.sha256(path.read_bytes()).hexdigest()) for name,path in sorted(files.items())])
    args.out.mkdir(parents=True)
    archive=args.out/"hr-enterprise.tar.gz"
    with tarfile.open(archive,"w:gz") as bundle:
        for name,path in sorted(files.items()): bundle.add(path,arcname="hr-enterprise/"+name,recursive=False)
        body=json.dumps(manifest,indent=2).encode();info=tarfile.TarInfo("hr-enterprise/MANIFEST.json");info.size=len(body);bundle.addfile(info,io.BytesIO(body))
    (args.out/"manifest.json").write_text(json.dumps(manifest,indent=2)+"\n")
    print(json.dumps(dict(archive=str(archive),files=len(files),sha256=hashlib.sha256(archive.read_bytes()).hexdigest())))


if __name__=="__main__": main()
