import logging
import sys


def configure_logging() -> None:
    """Logging minimal mais structuré (paires clé=valeur), pas de dépendance
    supplémentaire (structlog, python-json-logger...) pour rester léger. Un
    vrai déploiement production voudrait probablement du JSON strict pour
    l'ingestion par un agrégateur de logs (Datadog, ELK...) — cette fonction
    est le point unique à modifier pour ça plus tard."""
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s"))

    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(logging.INFO)
