import { defineConfig } from 'orval';

export default defineConfig({
  courtly: {
    input: '../api/openapi.json',
    output: {
      mode: 'tags-split',
      target: 'src/shared/api/generated',
      schemas: 'src/shared/api/generated/model',
      client: 'react-query',
      httpClient: 'fetch',
      clean: true,
      formatter: 'prettier',
      override: {
        mutator: { path: 'src/shared/api/fetcher.ts', name: 'apiFetch' },
        fetch: { includeHttpResponseReturnType: false },
      },
    },
  },
});
