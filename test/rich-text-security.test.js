import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeRichTextHtml, sanitizeWorkspaceRichText } from '../server/services/rich-text.js';

test('sanitizeRichTextHtml strips scripts and unsafe attributes but keeps allowed formatting', () => {
  const input = '<p onclick="alert(1)">Hola <strong>mundo</strong><script>alert(1)</script><span data-type="variable" id="project_name" style="color:red">X</span></p>';
  const output = sanitizeRichTextHtml(input);

  assert.match(output, /<p>Hola <strong>mundo<\/strong><span data-type="variable" id="project_name">X<\/span><\/p>/);
  assert.doesNotMatch(output, /script|onclick|style=/);
});

test('sanitizeWorkspaceRichText sanitizes rich text formData and structure nodes', () => {
  const workspace = {
    projects: [],
    coverConfig: {},
    documents: {
      demo: [
        {
          id: 'doc-1',
          structure: [
            {
              id: 'block-1',
              type: 'rich_text',
              content: '<p>Hola<script>alert(1)</script></p>'
            }
          ],
          formData: {
            'block-1': '<p><img src=x onerror=alert(1)>ok</p>'
          }
        }
      ]
    }
  };

  const sanitized = sanitizeWorkspaceRichText(workspace);
  const document = sanitized.documents.demo[0];

  assert.equal(document.structure[0].content, '<p>Hola</p>');
  assert.equal(document.formData['block-1'], '<p>ok</p>');
});
