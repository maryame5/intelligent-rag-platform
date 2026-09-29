from typing import Optional

from pydantic import BaseModel


class UsagePoint(BaseModel):
    date: str
    queries: int
    users: int


class RAGQuality(BaseModel):
    faithfulness: Optional[float] = None
    answerRelevance: Optional[float] = None
    contextRecall: Optional[float] = None
    contextPrecision: Optional[float] = None


class PlatformMetricsOut(BaseModel):
    series: list[UsagePoint]
    quality: RAGQuality
    queriesThisWeek: int
    answeredRate: Optional[float] = None
    indexedDocuments: int
    indexedChunks: int
    monthlyCost: Optional[float] = None
    latencyP95: Optional[float] = None
    errorRate: Optional[float] = None
    throughput: Optional[float] = None
    costPerQuery: Optional[float] = None


class ActivityItemOut(BaseModel):
    id: str
    action: str
    user: str
    target: str
    time: str
    kind: str  # job, access, feedback, kb, doc
