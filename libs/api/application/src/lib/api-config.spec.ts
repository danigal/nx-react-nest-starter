import { loadApiConfig, loadMigrationConfig } from './api-config';

describe('API environment configuration', () => {
  it('parses numbers and booleans explicitly', () => {
    expect(
      loadApiConfig({
        DATABASE_URL: 'postgresql://localhost/test',
        API_PORT: '3100',
        API_DOCS_ENABLED: 'false',
      }),
    ).toMatchObject({ port: 3100, docsEnabled: false });
  });

  it('requires a dedicated production migration URL', () => {
    expect(() =>
      loadMigrationConfig({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://localhost/runtime',
      }),
    ).toThrow();
  });
});
