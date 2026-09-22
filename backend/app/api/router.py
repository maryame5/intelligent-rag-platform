from fastapi import APIRouter

from app.api.routes import admin, auth, chat, documents, feedback, jobs, knowledge_bases, retrieval

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(knowledge_bases.router)
api_router.include_router(documents.router)
api_router.include_router(jobs.router)
api_router.include_router(retrieval.router)
api_router.include_router(chat.router)
api_router.include_router(feedback.router)
api_router.include_router(admin.router)
