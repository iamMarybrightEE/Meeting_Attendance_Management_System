# Meeting Agent Service (Python)

FastAPI-based RAG backend for meeting transcript ingestion, indexing, and chat.

## Quick start

1. Copy `.env.example` to `.env`.
2. Install dependencies:
   - `python -m venv .venv && source .venv/bin/activate`
   - `pip install -r requirements.txt`
3. Run API:
   - `uvicorn app.main:app --host 0.0.0.0 --port 8100 --reload`
4. Optional worker:
   - `celery -A app.worker.celery_app worker --loglevel=INFO`
5. Set your transcription key in `.env`:
   - `MEETING_AGENT_OPENAI_API_KEY=...`

## Endpoints

- `GET /health`
- `GET /ready`
- `POST /v1/meetings/{meeting_id}/recordings`
- `GET /v1/meetings/{meeting_id}/transcript`
- `POST /v1/meetings/{meeting_id}/index`
- `GET /v1/meetings/{meeting_id}/index/status`
- `POST /v1/chat/sessions`
- `POST /v1/chat/sessions/{session_id}/messages`
- `WS /v1/chat/stream`

## Notes

- Transcription now uses OpenAI audio transcription API (`/v1/audio/transcriptions`) with `MEETING_AGENT_TRANSCRIPTION_MODEL`.
- If transcription fails, check API key, audio format, and the `meeting_agent_jobs.error_message` value.
- This implementation still includes a prototype local chunk-retrieval strategy to keep setup simple.
- Provider interfaces can be expanded to wire managed transcription/embedding/LLM services.
