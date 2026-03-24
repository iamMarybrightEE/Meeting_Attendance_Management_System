import tempfile
import uuid
from pathlib import Path

import httpx
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.entities import (
    ChatMessage,
    ChatSession,
    IndexStatus,
    IngestionJob,
    JobStatus,
    JobType,
    Meeting,
    MessageRole,
    Transcript,
    TranscriptChunk,
)


def ensure_storage_dir() -> Path:
    path = Path(settings.storage_dir)
    path.mkdir(parents=True, exist_ok=True)
    return path


def save_recording_file(meeting_id: str, filename: str, data: bytes) -> str:
    storage = ensure_storage_dir()
    safe_name = filename.replace("/", "_")
    target = storage / f"{meeting_id}_{safe_name}"
    target.write_bytes(data)
    return str(target)


def create_or_update_meeting(
    db: Session,
    *,
    meeting_id: str,
    tenant_id: str,
    title: str,
    organizer_id: str | None,
    recording_uri: str | None,
) -> Meeting:
    meeting = db.get(Meeting, meeting_id)
    if not meeting:
        meeting = Meeting(id=meeting_id, tenant_id=tenant_id, title=title)
        db.add(meeting)
    meeting.organizer_id = organizer_id
    meeting.recording_uri = recording_uri
    meeting.index_status = IndexStatus.pending
    db.commit()
    db.refresh(meeting)
    return meeting


def create_job(db: Session, meeting_id: str, job_type: JobType) -> IngestionJob:
    job = IngestionJob(id=uuid.uuid4().hex, meeting_id=meeting_id, job_type=job_type, status=JobStatus.pending)
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def _resolve_audio_file(recording_uri: str) -> tuple[Path, bool]:
    candidate = Path(recording_uri)
    if candidate.exists():
        return candidate, False
    if recording_uri.startswith("http://") or recording_uri.startswith("https://"):
        with httpx.Client(timeout=120.0) as client:
            response = client.get(recording_uri)
            response.raise_for_status()
        suffix = Path(recording_uri).suffix or ".bin"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_file.write(response.content)
            return Path(temp_file.name), True
    raise ValueError("recording file path is invalid and URL download is unsupported")


def transcribe_audio(recording_uri: str) -> tuple[str, str]:
    if not settings.openai_api_key:
        raise ValueError("MEETING_AGENT_OPENAI_API_KEY is not configured")

    audio_path, is_temp = _resolve_audio_file(recording_uri)
    try:
        with audio_path.open("rb") as audio_file:
            files = {"file": (audio_path.name, audio_file, "application/octet-stream")}
            data = {"model": settings.transcription_model}
            headers = {"Authorization": f"Bearer {settings.openai_api_key}"}
            with httpx.Client(timeout=300.0) as client:
                response = client.post(
                    "https://api.openai.com/v1/audio/transcriptions",
                    headers=headers,
                    data=data,
                    files=files,
                )
                response.raise_for_status()
                payload = response.json()
    finally:
        if is_temp and audio_path.exists():
            audio_path.unlink(missing_ok=True)

    transcript_text = payload.get("text", "").strip()
    if not transcript_text:
        raise ValueError("transcription provider returned empty text")
    return transcript_text, "en"


def run_transcription_job(db: Session, meeting_id: str, job_id: str) -> Transcript:
    job = db.get(IngestionJob, job_id)
    if not job:
        raise ValueError("job not found")
    job.status = JobStatus.processing
    db.commit()

    meeting = db.get(Meeting, meeting_id)
    if not meeting or not meeting.recording_uri:
        job.status = JobStatus.failed
        job.error_message = "recording not found for meeting"
        db.commit()
        raise ValueError("recording not found for meeting")

    try:
        transcript_text, language = transcribe_audio(meeting.recording_uri)
        transcript = Transcript(meeting_id=meeting_id, source_type="audio", language=language, full_text=transcript_text)
        db.add(transcript)
        job.status = JobStatus.completed
        job.error_message = None
        db.commit()
        db.refresh(transcript)
        return transcript
    except Exception as exc:
        job.status = JobStatus.failed
        job.error_message = str(exc)
        db.commit()
        raise


def split_into_chunks(text: str, chunk_size: int, overlap: int) -> list[str]:
    if len(text) <= chunk_size:
        return [text]
    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = min(len(text), start + chunk_size)
        chunks.append(text[start:end])
        if end >= len(text):
            break
        start = max(0, end - overlap)
    return chunks


def run_indexing_job(db: Session, meeting_id: str) -> int:
    meeting = db.get(Meeting, meeting_id)
    if not meeting:
        raise ValueError("meeting not found")
    transcript = db.execute(
        select(Transcript).where(Transcript.meeting_id == meeting_id).order_by(Transcript.id.desc())
    ).scalars().first()
    if not transcript:
        raise ValueError("transcript not found")

    meeting.index_status = IndexStatus.processing
    db.commit()

    db.execute(delete(TranscriptChunk).where(TranscriptChunk.meeting_id == meeting_id))
    chunks = split_into_chunks(transcript.full_text, settings.chunk_size, settings.chunk_overlap)
    for idx, chunk in enumerate(chunks):
        db.add(
            TranscriptChunk(
                meeting_id=meeting_id,
                transcript_id=transcript.id,
                chunk_index=idx,
                text=chunk,
                vector_ref=f"local-{meeting_id}-{idx}",
            )
        )
    meeting.index_status = IndexStatus.ready
    db.commit()
    return len(chunks)


def create_chat_session(db: Session, meeting_id: str, tenant_id: str, user_id: str) -> ChatSession:
    session = ChatSession(id=uuid.uuid4().hex, meeting_id=meeting_id, tenant_id=tenant_id, user_id=user_id)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def retrieve_chunks(db: Session, meeting_id: str, query: str, top_k: int) -> list[TranscriptChunk]:
    chunks = db.execute(
        select(TranscriptChunk).where(TranscriptChunk.meeting_id == meeting_id).order_by(TranscriptChunk.chunk_index.asc())
    ).scalars().all()
    # Simple lexical scoring keeps prototype dependency-light.
    scored = sorted(chunks, key=lambda c: query.lower() in c.text.lower(), reverse=True)
    return scored[:top_k]


def answer_with_rag(db: Session, session_id: str, message: str, top_k: int) -> tuple[str, list[dict]]:
    session = db.get(ChatSession, session_id)
    if not session:
        raise ValueError("chat session not found")
    chunks = retrieve_chunks(db, session.meeting_id, message, top_k)
    citations = [{"chunk_id": c.id, "start_time": c.start_time, "end_time": c.end_time} for c in chunks]
    context = "\n".join(f"- {c.text}" for c in chunks)
    answer = (
        "Prototype grounded answer based on indexed transcript context:\n"
        f"{context if context else 'No indexed context found for this meeting.'}"
    )

    db.add(ChatMessage(session_id=session_id, role=MessageRole.user, content=message))
    db.add(ChatMessage(session_id=session_id, role=MessageRole.assistant, content=answer, citations_json={"items": citations}))
    db.commit()
    return answer, citations
