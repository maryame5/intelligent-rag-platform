from datetime import datetime
from pydantic import BaseModel

class UsagePoint(BaseModel):
    date: str
    queries: int
    users: int

class RAGQuality(BaseModel):
    faithfulness: float
    answerRelevance: float
    contextRecall: float
    contextPrecision: float

class PlatformMetricsOut(BaseModel):
    series: list[UsagePoint]
    quality: RAGQuality
    queriesThisWeek: int
    answeredRate: float
    indexedDocuments: int
    indexedChunks: int
    monthlyCost: float
    latencyP95: int
    errorRate: float
    throughput: int
    costPerQuery: float

class ActivityItemOut(BaseModel):
    id: str
    action: str
    user: str
    target: str
    time: str
    kind: str  # job, access, feedback, kb, doc
