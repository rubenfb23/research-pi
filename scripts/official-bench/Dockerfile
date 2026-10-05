FROM python:3.11-slim-bookworm@sha256:2333bd330d12de02514770b3585cad313644316047cdee24a7acfdece6de6efb
RUN apt-get update && apt-get install -y --no-install-recommends bash git ripgrep ca-certificates libstdc++6 && rm -rf /var/lib/apt/lists/*
COPY requirements.lock.txt /requirements.lock.txt
RUN pip install --no-cache-dir -r /requirements.lock.txt
COPY node /usr/local/bin/node
COPY app /app
ENV MPLBACKEND=Agg OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 MKL_NUM_THREADS=1 HOME=/home/repi RESEARCH_PI_DATA_DIR=/state
WORKDIR /work
CMD ["node", "/app/dist/cli.js", "--help"]
