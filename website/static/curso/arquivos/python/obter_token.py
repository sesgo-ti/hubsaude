from hubsaude_client.builder import SmartTokenClientBuilder

client = (
    SmartTokenClientBuilder()
    .fhir_base("https://localhost:8443")
    .client_id("meu-sistema")
    .private_key_pem("client-key.pem")
    .certificate_pem("client-cert.pem")
    .server_trust_anchor("simulador-server.pem")
    .build()
)

token = client.obtain_token("system/Patient.c system/Patient.rs system/Task.rs")
print(token[:40])
client.close()
