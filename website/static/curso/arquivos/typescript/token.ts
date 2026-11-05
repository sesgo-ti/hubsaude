import { createSmartTokenClient } from "hubsaude-cliente-ts";

const client = await createSmartTokenClient({
  fhirBase: "https://localhost:8443",
  clientId: "meu-sistema",
  privateKeyPem: "client-key.pem",
  certificatePem: "client-cert.pem",
  serverTrustAnchor: "simulador-server.pem",
});

const token = await client.obtainToken("system/Patient.c system/Patient.rs system/Task.rs");
console.log(token.slice(0, 40));
