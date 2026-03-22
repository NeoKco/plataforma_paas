import sys
import argparse
import json
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.bootstrap.app_factory import create_app


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Exporta el snapshot OpenAPI actual del backend."
    )
    parser.add_argument(
        "--output",
        default="../docs/api/openapi.snapshot.json",
        help="Ruta relativa a backend/ donde escribir el snapshot.",
    )
    args = parser.parse_args()

    app = create_app()
    schema = app.openapi()

    output_path = (Path.cwd() / args.output).resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as file:
        json.dump(schema, file, ensure_ascii=False, indent=2, sort_keys=True)
        file.write("\n")

    print(f"OpenAPI snapshot exported to: {output_path}")
    print(f"Paths exported: {len(schema.get('paths', {}))}")


if __name__ == "__main__":
    main()
