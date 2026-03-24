from pydantic import BaseModel, Field


class RecordingIngestRequest(BaseModel):
    tenant_id: str = Field(min_length=1)
    title: str = Field(min_length=1)
    recording_url: str | None = None
    organizer_id: str | None = None


class RecordingIngestResponse(BaseModel):
    meeting_id: str
    job_id: str
    status: str


class TranscriptResponse(BaseModel):
    meeting_id: str
    status: str
    transcript: str | None = None


class ManualTranscriptRequest(BaseModel):
    transcript: str = Field(min_length=1)
    tenant_id: str | None = None
    title: str | None = None


class IndexResponse(BaseModel):
    meeting_id: str
    status: str
    chunks_indexed: int = 0


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
