from pydantic import BaseModel, Field


class TranscriptResponse(BaseModel):
    meeting_id: str
    status: str
    transcript: str | None = None


class IndexResponse(BaseModel):
    meeting_id: str
    status: str
    chunks_indexed: int = 0


class MinutesIngestResponse(BaseModel):
    meeting_id: str
    status: str = "READY"


class ChatSessionRequest(BaseModel):
    meeting_id: str
    tenant_id: str


class ChatSessionResponse(BaseModel):
    session_id: str
    meeting_id: str
    user_id: str


class ChatMessageRequest(BaseModel):
    message: str
    top_k: int | None = None


class ChatMessageResponse(BaseModel):
    answer: str
    citations: list[dict]
