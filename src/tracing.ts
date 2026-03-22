import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

export function initTracing(serviceName: string): void {
    const exporterUrl =
        process.env.OTEL_EXPORTER_OTLP_ENDPOINT ??
        'http://otel-collector:4318/v1/traces';

    const exporter = new OTLPTraceExporter({ url: exporterUrl });

    const sdk = new NodeSDK({
        resource: new Resource({
            [ATTR_SERVICE_NAME]: serviceName,
            [ATTR_SERVICE_VERSION]: process.env.SERVICE_VERSION ?? '1.0.0',
        }),
        traceExporter: exporter,
        instrumentations: [
            getNodeAutoInstrumentations({
                '@opentelemetry/instrumentation-fs': { enabled: false },
            }),
        ],
    });

    sdk.start();

    process.on('SIGTERM', () => {
        sdk.shutdown().finally(() => process.exit(0));
    });
}
