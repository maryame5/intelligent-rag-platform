import io

from minio import Minio
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.core.config import settings

# Erreurs réseau transitoires typiques face à MinIO/S3 : connexion refusée,
# timeout, DNS pas encore prêt au démarrage des conteneurs... Pas les erreurs
# applicatives (bucket inexistant, permission refusée), qui ne se résoudront
# jamais en réessayant.
_TRANSIENT_STORAGE_ERRORS = (ConnectionError, TimeoutError, OSError)

_retry_storage = retry(
    reraise=True,
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=0.5, max=4),
    retry=retry_if_exception_type(_TRANSIENT_STORAGE_ERRORS),
)


def get_minio_client() -> Minio:
    return Minio(
        settings.minio_endpoint,
        access_key=settings.minio_root_user,
        secret_key=settings.minio_root_password,
        secure=False,
    )


def ensure_bucket(client: Minio, bucket: str) -> None:
    if not client.bucket_exists(bucket):
        client.make_bucket(bucket)


@_retry_storage
def upload_bytes(client: Minio, bucket: str, object_name: str, data: bytes, content_type: str) -> None:
    ensure_bucket(client, bucket)
    client.put_object(bucket, object_name, io.BytesIO(data), length=len(data), content_type=content_type)


@_retry_storage
def download_bytes(client: Minio, bucket: str, object_name: str) -> bytes:
    response = client.get_object(bucket, object_name)
    try:
        return response.read()
    finally:
        response.close()
        response.release_conn()


@_retry_storage
def delete_object(client: Minio, bucket: str, object_name: str) -> None:
    client.remove_object(bucket, object_name)
