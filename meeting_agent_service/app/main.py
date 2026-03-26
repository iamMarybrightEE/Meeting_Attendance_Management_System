from pathlib import Path

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.rate_limit import limiter
from app.core.security import decode_bearer_token
from app.db.session import engine, get_db
from app.models import Base, Meeting, Transcript, TranscriptChunk
from app.schemas import (
    ChatMessageRequest,
    ChatMessageResponse,
    ChatSessionRequest,
    ChatSessionResponse,
    IndexResponse,
    MinutesIngestResponse,
    TranscriptResponse,
)
from app.services import (
    answer_with_rag,
    create_chat_session,
    create_or_update_meeting,
    extract_minutes_text,
    run_indexing_job,
    save_minutes_file,
)
from app.models.entities import IndexStatus

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


@app.post(f"{settings.api_prefix}/meetings/{{meeting_id}}/minutes", response_model=MinutesIngestResponse)
async def ingest_minutes(
    meeting_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user=Depends(decode_bearer_token),
) -> MinutesIngestResponse:
    limiter.allow(f"minutes:{user.get('sub', 'anon')}", limit=30, period_seconds=60)
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")

    suffix = Path(file.filename).suffix.lower()
    if suffix not in (".pdf", ".docx"):
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported")

    data = await file.read()
    max_size = settings.max_minutes_mb * 1024 * 1024
    if len(data) > max_size:
        raise HTTPException(status_code=400, detail="File too large")

    tenant_id = user.get("tenant_id", "default")
    title = f"Meeting {meeting_id}"
    saved_path = save_minutes_file(meeting_id, file.filename, data)

    try:
        text = extract_minutes_text(Path(saved_path))
    except ValueError as exc:
        Path(saved_path).unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception:
        Path(saved_path).unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="Could not read document") from None

    if not text.strip():
        Path(saved_path).unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="Document contains no extractable text")

    meeting = create_or_update_meeting(
        db,
        meeting_id=meeting_id,
        tenant_id=tenant_id,
        title=title,
        organizer_id=user.get("sub"),
        recording_uri=None,
    )
    transcript = Transcript(meeting_id=meeting_id, source_type="minutes", language=None, full_text=text)
    db.add(transcript)
    meeting.index_status = IndexStatus.pending
    db.commit()

    return MinutesIngestResponse(meeting_id=meeting_id, status="READY")


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
        detail = str(exc)
        code = 404 if "not found" in detail.lower() else 400
        raise HTTPException(status_code=code, detail=detail) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Indexing failed: {exc!s}") from exc
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
    chunks = (
        db.query(func.count(TranscriptChunk.id)).filter(TranscriptChunk.meeting_id == meeting_id).scalar() or 0
    )
    return IndexResponse(meeting_id=meeting_id, status=meeting.index_status.value, chunks_indexed=int(chunks))


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
    try:
        answer, citations = answer_with_rag(db, session_id, payload.message, top_k)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return ChatMessageResponse(answer=answer, citations=citations)


@app.websocket(f"{settings.api_prefix}/chat/stream")
async def stream_chat(socket: WebSocket) -> None:
    await socket.accept()
    data = await socket.receive_json()
    answer = data.get("message", "")
    await socket.send_json({"type": "token", "content": "Streaming is not implemented for Ollama RAG yet. "})
    await socket.send_json({"type": "token", "content": answer})
    await socket.send_json({"type": "final", "answer": answer, "citations": []})
    await socket.close()
