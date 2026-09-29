FROM python:3.11-slim
ENV PYTHONUNBUFFERED=1 OMP_NUM_THREADS=2
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libglib2.0-0 libgl1 && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN useradd --create-home --uid 10001 tow
COPY --chown=tow:tow worker.py analyze.py ./
COPY --chown=tow:tow backend/cv ./backend/cv
COPY --chown=tow:tow backend/__init__.py ./backend/__init__.py
USER tow
RUN python -c "from fast_alpr import ALPR; ALPR(detector_model='yolo-v9-t-384-license-plate-end2end', ocr_model='cct-xs-v2-global-model')"
CMD ["python", "worker.py"]
