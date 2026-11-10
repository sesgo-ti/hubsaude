import json
import ssl
import sys
import time
import uuid

import httpx
from hubsaude_client.builder import SmartTokenClientBuilder

SIMULADOR = "https://localhost:8443"
arquivo = sys.argv[1] if len(sys.argv) > 1 else "paciente.json"

client = (
    SmartTokenClientBuilder()
    .fhir_base(SIMULADOR)
    .client_id("meu-sistema")
    .private_key_pem("client-key.pem")
    .certificate_pem("client-cert.pem")
    .server_trust_anchor("simulador-server.pem")
    .build()
)
token = client.obtain_token("system/Patient.c system/Patient.rs system/Task.rs")

with open(arquivo, encoding="utf-8") as conteudo:
    paciente = json.load(conteudo)

conexao = ssl.create_default_context(cafile="simulador-server.pem")
conexao.load_cert_chain("client-cert.pem", "client-key.pem")

cabecalhos = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/fhir+json",
    "Accept": "application/fhir+json",
    "Prefer": "respond-async",
    "Idempotency-Key": str(uuid.uuid4()),
}

with httpx.Client(verify=conexao) as http:
    resposta = http.post(f"{SIMULADOR}/fhir/Patient", json=paciente, headers=cabecalhos)
    if resposta.status_code != 202:
        raise RuntimeError(f"Envio recusado: {resposta.status_code} {resposta.text}")
    endereco_task = resposta.headers["Content-Location"]
    print("Comprovante:", endereco_task)

    for tentativa in range(30):
        time.sleep(2)
        consulta = http.get(
            endereco_task,
            headers={"Authorization": f"Bearer {token}", "Accept": "application/fhir+json"},
        )
        if consulta.status_code != 200:
            raise RuntimeError(f"Consulta da Task recusada: {consulta.status_code} {consulta.text}")
        task = consulta.json()
        if task["status"] not in ("accepted", "in-progress"):
            break
    else:
        raise RuntimeError("A Task não foi concluída em 1 minuto")

    if task["status"] == "completed":
        print("Registro aceito:", task["output"][0]["valueReference"]["reference"])
    else:
        print("Registro recusado:", task["statusReason"]["text"])
        for recurso in task.get("contained", []):
            for problema in recurso.get("issue", []):
                print(" ", problema["severity"], problema.get("diagnostics"))

client.close()
