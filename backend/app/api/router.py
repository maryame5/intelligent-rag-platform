from fastapi import APIRouter

from app.api.routes import (
    admin,
    analytics,
    auth,
    chat,
    documents,
    feedback,
    integrations,
    jobs,
    knowledge_bases,
    notifications,
    retrieval,
    verified_answers,
    workspaces,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(knowledge_bases.router)
api_router.include_router(documents.router)
api_router.include_router(jobs.router)
api_router.include_router(retrieval.router)
api_router.include_router(chat.router)
api_router.include_router(feedback.router)
api_router.include_router(admin.router)
api_router.include_router(workspaces.router)
api_router.include_router(verified_answers.router)
api_router.include_router(notifications.router)
api_router.include_router(integrations.router)
api_router.include_router(analytics.router)
