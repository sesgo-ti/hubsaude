import br.gov.go.saude.hubsaude.client.SmartTokenClient;

import java.nio.file.Path;

public class ObterToken {

    public static void main(String[] args) throws Exception {
        try (var client = SmartTokenClient.builder()
                .fhirBase("https://localhost:8443")
                .clientId("meu-sistema")
                .privateKeyPem(Path.of("client-key.pem"))
                .certificatePem(Path.of("client-cert.pem"))
                .serverTrustAnchor(Path.of("simulador-server.pem"))
                .build()) {

            String token = client.obtainToken("system/Patient.c system/Patient.rs system/Task.rs");
            System.out.println(token.substring(0, 40));
        }
    }
}
