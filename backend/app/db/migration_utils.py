from sqlalchemy.exc import ProgrammingError


def create_enum_idempotent(enum_type, bind) -> None:
    """Crée un type ENUM Postgres de façon réellement idempotente.

    `checkfirst=True` fait un "vérifie puis crée" — pas atomique : si deux
    process lancent `alembic upgrade head` en même temps (ex. un redémarrage
    de conteneur qui chevauche le lancement précédent), les deux peuvent
    passer le "ça n'existe pas encore" avant que l'un des deux n'ait commité
    sa création, et le second échoue avec "already exists" malgré le
    checkfirst. On attrape ce cas précis (et lui seul) plutôt que de le
    laisser remonter — la migration reste correcte : le type existe bien à
    la fin, peu importe lequel des deux process l'a créé."""
    try:
        enum_type.create(bind, checkfirst=True)
    except ProgrammingError as exc:
        if "already exists" not in str(exc).lower():
            raise
