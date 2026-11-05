using HubSaude.Cliente;

await using var client = SmartTokenClient.CreateBuilder()
    .FhirBase("https://localhost:8443")
    .ClientId("meu-sistema")
    .PrivateKeyPem("client-key.pem")
    .CertificatePem("client-cert.pem")
    .ServerTrustAnchor("simulador-server.pem")
    .Build();

string token = await client.ObtainTokenAsync("system/Patient.c system/Patient.rs system/Task.rs");
Console.WriteLine(token[..40]);
