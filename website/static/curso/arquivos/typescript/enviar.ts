import { readFile } from "node:fs/promises";
import { Agent } from "undici";
import { createSmartTokenClient } from "hubsaude-cliente-ts";

const SIMULADOR = "https://localhost:8443";
const arquivo = process.argv[2] ?? "paciente.json";

await using client = await createSmartTokenClient({
  fhirBase: SIMULADOR,
  clientId: "meu-sistema",
  privateKeyPem: "client-key.pem",
  certificatePem: "client-cert.pem",
  serverTrustAnchor: "simulador-server.pem",
});
const token = await client.obtainToken("system/Patient.c system/Patient.rs system/Task.rs");

const paciente = JSON.parse(await readFile(arquivo, "utf-8"));

const conexao = new Agent({
  connect: {
    cert: await readFile("client-cert.pem"),
    key: await readFile("client-key.pem"),
    ca: await readFile("simulador-server.pem"),
  },
});

const resposta = await fetch(`${SIMULADOR}/fhir/Patient`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/fhir+json",
    Accept: "application/fhir+json",
    Prefer: "respond-async",
    "Idempotency-Key": crypto.randomUUID(),
  },
  body: JSON.stringify(paciente),
  dispatcher: conexao,
});
if (resposta.status !== 202) {
  throw new Error(`Envio recusado: ${resposta.status} ${await resposta.text()}`);
}
const enderecoTask = resposta.headers.get("Content-Location")!;
console.log("Comprovante:", enderecoTask);

let task: any;
for (let tentativa = 1; ; tentativa++) {
  await new Promise((r) => setTimeout(r, 2000));
  const respostaTask = await fetch(enderecoTask, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/fhir+json" },
    dispatcher: conexao,
  });
  if (respostaTask.status !== 200) {
    throw new Error(`Consulta da Task recusada: ${respostaTask.status} ${await respostaTask.text()}`);
  }
  task = await respostaTask.json();
  if (task.status !== "accepted" && task.status !== "in-progress") break;
  if (tentativa === 30) throw new Error("A Task não foi concluída em 1 minuto");
}

if (task.status === "completed") {
  console.log("Registro aceito:", task.output[0].valueReference.reference);
} else {
  console.log("Registro recusado:", task.statusReason?.text);
  for (const recurso of task.contained ?? []) {
    for (const problema of recurso.issue ?? []) {
      console.log(" ", problema.severity, problema.diagnostics);
    }
  }
}
await conexao.close();
