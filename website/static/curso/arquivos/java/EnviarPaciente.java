import br.gov.go.saude.hubsaude.client.PemLoader;
import br.gov.go.saude.hubsaude.client.SmartTokenClient;
import br.gov.go.saude.hubsaude.client.SslContextFactory;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Path;
import java.util.UUID;

import javax.net.ssl.SSLContext;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

public class EnviarPaciente {

    private static final String SIMULADOR = "https://localhost:8443";

    public static void main(String[] args) throws Exception {
        String arquivo = args.length > 0 ? args[0] : "paciente.json";

        try (var client = SmartTokenClient.builder()
                .fhirBase(SIMULADOR)
                .clientId("meu-sistema")
                .privateKeyPem(Path.of("client-key.pem"))
                .certificatePem(Path.of("client-cert.pem"))
                .serverTrustAnchor(Path.of("simulador-server.pem"))
                .build()) {

            String token = client.obtainToken("system/Patient.c system/Patient.rs system/Task.rs");

            SSLContext conexao = SslContextFactory.buildSslContext(
                    Path.of("simulador-server.pem"),
                    SslContextFactory.DEFAULT_TLS_PROTOCOL,
                    PemLoader.loadPrivateKey(Path.of("client-key.pem")),
                    PemLoader.loadCertificate(Path.of("client-cert.pem")));

            var mapper = new ObjectMapper();

            try (var http = HttpClient.newBuilder().sslContext(conexao).build()) {
                var envio = HttpRequest.newBuilder(URI.create(SIMULADOR + "/fhir/Patient"))
                        .header("Authorization", "Bearer " + token)
                        .header("Content-Type", "application/fhir+json")
                        .header("Accept", "application/fhir+json")
                        .header("Prefer", "respond-async")
                        .header("Idempotency-Key", UUID.randomUUID().toString())
                        .POST(HttpRequest.BodyPublishers.ofFile(Path.of(arquivo)))
                        .build();

                var resposta = http.send(envio, HttpResponse.BodyHandlers.ofString());
                if (resposta.statusCode() != 202) {
                    throw new IllegalStateException(
                            "Envio recusado: " + resposta.statusCode() + " " + resposta.body());
                }
                String enderecoTask = resposta.headers().firstValue("Content-Location").orElseThrow();
                System.out.println("Comprovante: " + enderecoTask);

                JsonNode task;
                String status;
                for (int tentativa = 1; ; tentativa++) {
                    Thread.sleep(2000);
                    var consulta = HttpRequest.newBuilder(URI.create(enderecoTask))
                            .header("Authorization", "Bearer " + token)
                            .header("Accept", "application/fhir+json")
                            .GET()
                            .build();
                    var respostaTask = http.send(consulta, HttpResponse.BodyHandlers.ofString());
                    if (respostaTask.statusCode() != 200) {
                        throw new IllegalStateException(
                                "Consulta da Task recusada: " + respostaTask.statusCode() + " " + respostaTask.body());
                    }
                    task = mapper.readTree(respostaTask.body());
                    status = task.path("status").asString();
                    if (!status.equals("accepted") && !status.equals("in-progress")) {
                        break;
                    }
                    if (tentativa == 30) {
                        throw new IllegalStateException("A Task não foi concluída em 1 minuto");
                    }
                }

                if (status.equals("completed")) {
                    System.out.println("Registro aceito: "
                            + task.path("output").path(0).path("valueReference").path("reference").asString());
                } else {
                    System.out.println("Registro recusado: " + task.path("statusReason").path("text").asString());
                    for (JsonNode recurso : task.path("contained")) {
                        for (JsonNode problema : recurso.path("issue")) {
                            System.out.println("  " + problema.path("severity").asString()
                                    + " " + problema.path("diagnostics").asString());
                        }
                    }
                }
            }
        }
    }
}
