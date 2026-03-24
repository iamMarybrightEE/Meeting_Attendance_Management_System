import uuid
from pathlib import Path

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.rate_limit import limiter
from app.core.security import decode_bearer_token
from app.db.session import engine, get_db
from app.models import Base, IngestionJob, Meeting, Transcript
from app.schemas import (
    ChatMessageRequest,
    ChatMessageResponse,
    ChatSessionRequest,
    ChatSessionResponse,
    IndexResponse,
    ManualTranscriptRequest,
    RecordingIngestRequest,
    RecordingIngestResponse,
    TranscriptResponse,
)
from app.services import (
    answer_with_rag,
    create_chat_session,
    create_job,
    create_or_update_meeting,
    run_indexing_job,
    run_transcription_job,
    save_recording_file,
)
from app.models.entities import IndexStatus, JobType

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Meeting Agent Service", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/ready")
def ready() -> dict[str, str]:
    return {"status": "ready"}


@app.post(f"{settings.api_prefix}/meetings/{{meeting_id}}/recordings", response_model=RecordingIngestResponse)
async def ingest_recording(
    meeting_id: str,
    payload: str | None = None,
    file: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
    user=Depends(decode_bearer_token),
) -> RecordingIngestResponse:
    limiter.allow(f"ingest:{user.get('sub', 'anon')}", limit=30, period_seconds=60)
    tenant_id = user.get("tenant_id", "default")
    title = f"Meeting {meeting_id}"
    recording_uri = payload
    if file:
        data = await file.read()
        max_size = settings.max_recording_mb * 1024 * 1024
        if len(data) > max_size:
            raise HTTPException(status_code=400, detail="Recording too large")
        recording_uri = save_recording_file(meeting_id, file.filename or "recording.bin", data)

    create_or_update_meeting(
        db,
        meeting_id=meeting_id,
        tenant_id=tenant_id,
        title=title,
        organizer_id=user.get("sub"),
        recording_uri=recording_uri,
    )
    job = create_job(db, meeting_id, JobType.transcription)
    run_transcription_job(db, meeting_id, job.id)
    return RecordingIngestResponse(meeting_id=meeting_id, job_id=job.id, status="PROCESSING")


@app.get(f"{settings.api_prefix}/meetings/{{meeting_id}}/transcript", response_model=TranscriptResponse)
def get_transcript(
    meeting_id: str,
    db: Session = Depends(get_db),
    user=Depends(decode_bearer_token),
) -> TranscriptResponse:
    limiter.allow(f"transcript:{user.get('sub', 'anon')}", limit=120, period_seconds=60)
    meeting = db.get(Meeting, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    transcript = db.query(Transcript).filter(Transcript.meeting_id == meeting_id).order_by(Transcript.id.desc()).first()
    if not transcript:
        return TranscriptResponse(meeting_id=meeting_id, status="PENDING", transcript=None)
    return TranscriptResponse(meeting_id=meeting_id, status="READY", transcript=transcript.full_text)


@app.post(f"{settings.api_prefix}/meetings/{{meeting_id}}/transcript/manual", response_model=TranscriptResponse)
def save_manual_transcript(
    meeting_id: str,
    payload: ManualTranscriptRequest,
    db: Session = Depends(get_db),
    user=Depends(decode_bearer_token),
) -> TranscriptResponse:
    limiter.allow(f"manual-transcript:{user.get('sub', 'anon')}", limit=60, period_seconds=60)
    tenant_id = payload.tenant_id or user.get("tenant_id", "default")
    meeting = create_or_update_meeting(
        db,
        meeting_id=meeting_id,
        tenant_id=tenant_id,
        title=payload.title or f"Meeting {meeting_id}",
        organizer_id=user.get("sub"),
        recording_uri=None,
    )
    transcript = Transcript(meeting_id=meeting_id, source_type="manual", language="en", full_text=payload.transcript.strip())
    db.add(transcript)
    meeting.index_status = IndexStatus.pending  # will switch to READY after /index call
    db.commit()
    return TranscriptResponse(meeting_id=meeting_id, status="READY", transcript=transcript.full_text)


@app.post(f"{settings.api_prefix}/meetings/{{meeting_id}}/index", response_model=IndexResponse)
def index_meeting(
    meeting_id: str,
    db: Session = Depends(get_db),
    user=Depends(decode_bearer_token),
) -> IndexResponse:
    limiter.allow(f"index:{user.get('sub', 'anon')}", limit=20, period_seconds=60)
    try:
        count = run_indexing_job(db, meeting_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return IndexResponse(meeting_id=meeting_id, status="READY", chunks_indexed=count)


@app.get(f"{settings.api_prefix}/meetings/{{meeting_id}}/index/status", response_model=IndexResponse)
def index_status(
    meeting_id: str,
    db: Session = Depends(get_db),
    user=Depends(decode_bearer_token),
) -> IndexResponse:
    meeting = db.get(Meeting, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    chunks = db.query(IngestionJob).filter(IngestionJob.meeting_id == meeting_id).count()
    return IndexResponse(meeting_id=meeting_id, status=meeting.index_status.value, chunks_indexed=chunks)


@app.post(f"{settings.api_prefix}/chat/sessions", response_model=ChatSessionResponse)
def create_session(
    payload: ChatSessionRequest,
    db: Session = Depends(get_db),
    user=Depends(decode_bearer_token),
) -> ChatSessionResponse:
    limiter.allow(f"session:{user.get('sub', 'anon')}", limit=60, period_seconds=60)
    session = create_chat_session(db, payload.meeting_id, payload.tenant_id, user.get("sub", "anonymous"))
    return ChatSessionResponse(session_id=session.id, meeting_id=session.meeting_id, user_id=session.user_id)


@app.post(f"{settings.api_prefix}/chat/sessions/{{session_id}}/messages", response_model=ChatMessageResponse)
def send_message(
    session_id: str,
    payload: ChatMessageRequest,
    db: Session = Depends(get_db),
    user=Depends(decode_bearer_token),
) -> ChatMessageResponse:
    limiter.allow(f"chat:{user.get('sub', 'anon')}", limit=120, period_seconds=60)
    top_k = min(payload.top_k or settings.default_top_k, settings.max_top_k)
    answer, citations = answer_with_rag(db, session_id, payload.message, top_k)
    return ChatMessageResponse(answer=answer, citations=citations)


@app.websocket(f"{settings.api_prefix}/chat/stream")
async def stream_chat(socket: WebSocket) -> None:
    await socket.accept()
    data = await socket.receive_json()
    answer = data.get("message", "")
    await socket.send_json({"type": "token", "content": "Prototype streaming is enabled. "})
    await socket.send_json({"type": "token", "content": answer})
    await socket.send_json({"type": "final", "answer": answer, "citations": []})
    await socket.close()
