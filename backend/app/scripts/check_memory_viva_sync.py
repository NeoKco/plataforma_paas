#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
MEMORY_VIVA_FILES = {
    "ESTADO_ACTUAL.md",
    "SIGUIENTE_PASO.md",
    "HISTORIAL_ITERACIONES.md",
    "HANDOFF_STATE.json",
}
REQUIRED_ROOT_FILES = [
    "PROJECT_CONTEXT.md",
    "REGLAS_IMPLEMENTACION.md",
    "CHECKLIST_CIERRE_ITERACION.md",
    "ESTADO_ACTUAL.md",
    "SIGUIENTE_PASO.md",
    "HISTORIAL_ITERACIONES.md",
    "HANDOFF_STATE.json",
]
CODE_PREFIXES = (
    "backend/",
    "frontend/",
    "deploy/",
    "infra/",
)
IGNORED_PREFIXES = (
    "backend/app/scripts/__pycache__/",
    "frontend/node_modules/",
)


def git_output(*args: str) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "git command failed")
    return result.stdout


def parse_changed_paths() -> list[str]:
    output = git_output("status", "--porcelain=v1")
    paths: list[str] = []
    for raw_line in output.splitlines():
        line = raw_line.rstrip()
        if not line:
            continue
        path = line[3:]
        if " -> " in path:
            path = path.split(" -> ", 1)[1]
        paths.append(path)
    return paths


def main() -> int:
    missing_files = [path for path in REQUIRED_ROOT_FILES if not (ROOT / path).exists()]
    if missing_files:
        print("ERROR: faltan archivos raíz obligatorios:")
        for path in missing_files:
            print(f" - {path}")
        return 1

    handoff_path = ROOT / "HANDOFF_STATE.json"
    try:
        with handoff_path.open("r", encoding="utf-8") as handle:
            json.load(handle)
    except Exception as exc:  # pragma: no cover - simple CLI guard
        print(f"ERROR: HANDOFF_STATE.json inválido: {exc}")
        return 1

    try:
        changed_paths = parse_changed_paths()
    except RuntimeError as exc:
        print(f"ERROR: no se pudo leer el estado git: {exc}")
        return 1

    relevant_changes = [
        path
        for path in changed_paths
        if path.startswith(CODE_PREFIXES) and not path.startswith(IGNORED_PREFIXES)
    ]
    memory_viva_changes = [path for path in changed_paths if path in MEMORY_VIVA_FILES]

    print("check_memory_viva_sync")
    print(f"project_root={ROOT}")
    print(f"changed_paths={len(changed_paths)}")
    print(f"relevant_code_changes={len(relevant_changes)}")
    print(f"memory_viva_changes={len(memory_viva_changes)}")

    if relevant_changes and not memory_viva_changes:
        print("ERROR: hay cambios relevantes en código/runtime sin actualización de memoria viva.")
        print("Archivos relevantes detectados:")
        for path in relevant_changes:
            print(f" - {path}")
        print("Debes actualizar al menos uno de estos archivos raíz antes de cerrar la iteración:")
        for path in sorted(MEMORY_VIVA_FILES):
            print(f" - {path}")
        return 1

    if changed_paths:
        print("Estado: OK")
        if relevant_changes:
            print("La memoria viva acompaña cambios relevantes.")
        else:
            print("No se detectaron cambios relevantes en código/runtime que obliguen memoria viva.")
    else:
        print("Estado: OK")
        print("Working tree limpio.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
