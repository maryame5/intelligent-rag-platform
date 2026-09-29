import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class IntegrationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    workspace_id: uuid.UUID | None
    provider: str
    name: str
    description: str | None
    status: str
    config: dict[str, Any]
    created_at: datetime


class IntegrationConnectRequest(BaseModel):
    workspace_id: uuid.UUID | None = None
    config: dict[str, Any] = {}
