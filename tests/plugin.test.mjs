import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { createTestHarness } from '@paperclipai/plugin-sdk/testing';

describe('plugin-documents', () => {
  let harness;
  let plugin;

  before(async () => {
    const manifest = (await import('../dist/plugin-manifest.mjs')).default;
    plugin = (await import('../dist/worker.mjs')).default;
    harness = createTestHarness({ manifest });
    await plugin.definition.setup(harness.ctx);
  });

  it('returns empty documents when no index exists', async () => {
    const result = await harness.getData('documents', { companyId: 'test-co' });
    assert.deepEqual(result, { documents: [], lastIndexedAt: null });
  });

  it('returns empty when companyId is missing', async () => {
    const result = await harness.getData('documents', {});
    assert.deepEqual(result, { documents: [], lastIndexedAt: null });
  });

  it('health check returns ok', async () => {
    const result = await plugin.definition.onHealth();
    assert.equal(result.status, 'ok');
  });

  it('health data returns document count', async () => {
    const result = await harness.getData('health', {});
    assert.equal(result.status, 'ok');
    assert.equal(result.documentCount, 0);
    assert.equal(result.lastIndexedAt, null);
  });

  it('reindex requires companyId', async () => {
    await assert.rejects(
      () => harness.performAction('reindex', {}),
      { message: 'companyId is required' },
    );
  });
});
