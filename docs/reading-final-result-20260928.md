# Reading final-result handling (mic4)

Teacher verification after mic3: desktop works; iPad Home Screen mode still aborts, while a Safari tab records. In Safari the third question repeatedly reports no final text after the teacher presses Send. We do not have a physical iPad trace proving whether that attempt returned interim text or only speech-start events.

This release targets the stop/result boundary rather than asserting a known Safari root cause:

- Apple mobile recognition uses continuous capture until Send (or the existing 12-second limit), retaining the synchronous user-gesture start and system microphone.
- Send retains 350 ms of audio tail before stop. Cancellation clears the tail timer and stale callbacks cannot affect another question.
- When capture ends after detected speech without a final transcript, Apple mobile retains the same run for up to 1.2 seconds for a delayed final event. It stops microphone capture during this wait. Interim-only text is never graded.
- Store confirmed final segments by result index; later interim/empty updates or terminal errors cannot erase already-final text. Explicit cancellation still discards all text and never grades.
- Failure keeps the same question and explains retry. Adult diagnostics distinguish no result events from interim-only results and show whether Send was requested. They store or upload no words, recordings, device IDs, or student data.
- Desktop retains single-utterance mode and immediate stop; lesson filtering, five questions, awards, characters and backend are unchanged.

Validation: 35 speech, microphone, lesson and score tests pass, including a five-question native sequence with delayed third final, an ungraded retry, stale callbacks, cancellation during tail/final wait, and a final followed by abort. Browser fixture with real character assets and fake recognition completed five questions and three stars after an interim-only failure and a delayed-final retry at question three. These do not prove recovery on the teacher's iPad. Ask for a fresh Safari round using reading.html?v=20260928-mic4.
