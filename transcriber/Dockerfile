FROM alphacep/kaldi-en:latest

ENV VOSK_MODEL_PATH=/opt/vosk-model-en/model \
    VOSK_SAMPLE_RATE=16000 \
    VOSK_SHOW_WORDS=true

WORKDIR /opt/vosk-server

EXPOSE 2700

CMD ["python3", "/opt/vosk-server/websocket/asr_server.py", "/opt/vosk-model-en/model"]
