using System.Net.Http.Headers;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Text.Json;
using HubSaude.Cliente;

const string Simulador = "https://localhost:8443";
string arquivo = args.Length > 0 ? args[0] : "paciente.json";

await using var client = SmartTokenClient.CreateBuilder()
    .FhirBase(Simulador)
    .ClientId("meu-sistema")
    .PrivateKeyPem("client-key.pem")
    .CertificatePem("client-cert.pem")
    .ServerTrustAnchor("simulador-server.pem")
    .Build();
string token = await client.ObtainTokenAsync("system/Patient.c system/Patient.rs system/Task.rs");

using var certificadoPem = X509Certificate2.CreateFromPemFile("client-cert.pem", "client-key.pem");
using var certificadoCliente = X509CertificateLoader.LoadPkcs12(certificadoPem.Export(X509ContentType.Pkcs12), null);
using var certificadoSimulador = X509CertificateLoader.LoadCertificateFromFile("simulador-server.pem");

var conexao = new SocketsHttpHandler();
conexao.SslOptions.ClientCertificates = new X509CertificateCollection { certificadoCliente };
conexao.SslOptions.CertificateChainPolicy = new X509ChainPolicy
{
    TrustMode = X509ChainTrustMode.CustomRootTrust,
    RevocationMode = X509RevocationMode.NoCheck,
};
conexao.SslOptions.CertificateChainPolicy.CustomTrustStore.Add(certificadoSimulador);
using var http = new HttpClient(conexao);

string paciente = await File.ReadAllTextAsync(arquivo);
using var envio = new HttpRequestMessage(HttpMethod.Post, $"{Simulador}/fhir/Patient")
{
    Content = new StringContent(paciente, Encoding.UTF8, "application/fhir+json"),
};
envio.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
envio.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/fhir+json"));
envio.Headers.Add("Prefer", "respond-async");
envio.Headers.Add("Idempotency-Key", Guid.NewGuid().ToString());

using var resposta = await http.SendAsync(envio);
if ((int)resposta.StatusCode != 202)
{
    throw new InvalidOperationException(
        $"Envio recusado: {(int)resposta.StatusCode} {await resposta.Content.ReadAsStringAsync()}");
}
string enderecoTask = resposta.Content.Headers.ContentLocation!.ToString();
Console.WriteLine($"Comprovante: {enderecoTask}");

JsonElement task;
string status;
do
{
    await Task.Delay(2000);
    using var consulta = new HttpRequestMessage(HttpMethod.Get, enderecoTask);
    consulta.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
    using var respostaTask = await http.SendAsync(consulta);
    task = JsonDocument.Parse(await respostaTask.Content.ReadAsStringAsync()).RootElement;
    status = task.GetProperty("status").GetString()!;
} while (status is "accepted" or "in-progress");

if (status == "completed")
{
    string registro = task.GetProperty("output")[0].GetProperty("valueReference").GetProperty("reference").GetString()!;
    Console.WriteLine($"Registro aceito: {registro}");
}
else
{
    Console.WriteLine($"Registro recusado: {task.GetProperty("statusReason").GetProperty("text").GetString()}");
    if (task.TryGetProperty("contained", out var contidos))
    {
        foreach (var recurso in contidos.EnumerateArray())
        {
            if (!recurso.TryGetProperty("issue", out var problemas)) continue;
            foreach (var problema in problemas.EnumerateArray())
            {
                string diagnostico = problema.TryGetProperty("diagnostics", out var d) ? d.GetString()! : "";
                Console.WriteLine($"  {problema.GetProperty("severity").GetString()} {diagnostico}");
            }
        }
    }
}
