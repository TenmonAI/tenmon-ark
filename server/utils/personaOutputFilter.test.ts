/**
 * Unit Tests for Persona Output Filter
 * 
 * Tests for removeInternalTags() and removeInternalTagsStreaming()
 */

import { describe, it, expect } from 'vitest';
import { removeInternalTags, removeInternalTagsStreaming, detectInternalTags } from './personaOutputFilter';

describe('removeInternalTags', () => {
  it('should remove balanced_layer tags', () => {
    const input = '<balanced_layer>This is balanced content</balanced_layer>';
    const output = removeInternalTags(input);
    expect(output).toBe('This is balanced content');
  });

  it('should remove fire_layer tags', () => {
    const input = '<fire_layer>This is fire content</fire_layer>';
    const output = removeInternalTags(input);
    expect(output).toBe('This is fire content');
  });

  it('should remove water_layer tags', () => {
    const input = '<water_layer>This is water content</water_layer>';
    const output = removeInternalTags(input);
    expect(output).toBe('This is water content');
  });

  it('should remove minaka_layer tags', () => {
    const input = '<minaka_layer>This is minaka content</minaka_layer>';
    const output = removeInternalTags(input);
    expect(output).toBe('This is minaka content');
  });

  it('should remove multiple different tags', () => {
    const input = '<fire_layer>Fire</fire_layer> and <water_layer>Water</water_layer>';
    const output = removeInternalTags(input);
    expect(output).toBe('Fire and Water');
  });

  it('should remove nested tags', () => {
    const input = '<balanced_layer><fire_layer>Nested content</fire_layer></balanced_layer>';
    const output = removeInternalTags(input);
    expect(output).toBe('Nested content');
  });

  it('should preserve allowed HTML tags', () => {
    const input = 'This is <strong>bold</strong> and <em>italic</em> text';
    const output = removeInternalTags(input);
    expect(output).toBe('This is <strong>bold</strong> and <em>italic</em> text');
  });

  it('should remove unknown tags but preserve allowed HTML', () => {
    const input = '<unknown_tag>Remove this</unknown_tag> but keep <b>this</b>';
    const output = removeInternalTags(input);
    expect(output).toBe('Remove this but keep <b>this</b>');
  });

  it('should trim excessive whitespace', () => {
    const input = '  <fire_layer>  Content  </fire_layer>  ';
    const output = removeInternalTags(input);
    expect(output).toBe('Content');
  });

  it('should reduce multiple newlines to maximum 2', () => {
    const input = 'Line 1\n\n\n\nLine 2';
    const output = removeInternalTags(input);
    expect(output).toBe('Line 1\n\nLine 2');
  });

  it('should handle empty string', () => {
    const input = '';
    const output = removeInternalTags(input);
    expect(output).toBe('');
  });

  it('should handle text without tags', () => {
    const input = 'This is plain text without any tags';
    const output = removeInternalTags(input);
    expect(output).toBe('This is plain text without any tags');
  });

  it('should remove all internal persona tags', () => {
    const input = `
      <twin_core>Twin Core</twin_core>
      <ark_core>Ark Core</ark_core>
      <soul_sync>Soul Sync</soul_sync>
      <centerline>Centerline</centerline>
      <synaptic_memory>Memory</synaptic_memory>
      <stm_layer>STM</stm_layer>
      <mtm_layer>MTM</mtm_layer>
      <ltm_layer>LTM</ltm_layer>
      <ife_layer>IFE</ife_layer>
      <reasoning_layer>Reasoning</reasoning_layer>
      <semantic_layer>Semantic</semantic_layer>
    `;
    const output = removeInternalTags(input);
    expect(output).not.toContain('<twin_core>');
    expect(output).not.toContain('<ark_core>');
    expect(output).not.toContain('<soul_sync>');
    expect(output).not.toContain('<centerline>');
    expect(output).not.toContain('<synaptic_memory>');
    expect(output).not.toContain('<stm_layer>');
    expect(output).not.toContain('<mtm_layer>');
    expect(output).not.toContain('<ltm_layer>');
    expect(output).not.toContain('<ife_layer>');
    expect(output).not.toContain('<reasoning_layer>');
    expect(output).not.toContain('<semantic_layer>');
  });
});

describe('removeInternalTagsStreaming', () => {
  it('should handle complete tags in a single chunk', () => {
    const chunk = '<fire_layer>Content</fire_layer>';
    const { filtered, buffer } = removeInternalTagsStreaming(chunk);
    expect(filtered).toBe('Content');
    expect(buffer).toBe('');
  });

  it('should buffer incomplete tag at end of chunk', () => {
    const chunk = 'Some text <fire_la';
    const { filtered, buffer } = removeInternalTagsStreaming(chunk);
    expect(filtered).toBe('Some text');
    expect(buffer).toBe('<fire_la');
  });

  it('should combine buffer with next chunk', () => {
    const chunk1 = 'Text <fire_';
    const { filtered: filtered1, buffer: buffer1 } = removeInternalTagsStreaming(chunk1);
    
    const chunk2 = 'layer>Content</fire_layer>';
    const { filtered: filtered2, buffer: buffer2 } = removeInternalTagsStreaming(chunk2, buffer1);
    
    expect(filtered1).toBe('Text');
    expect(filtered2).toBe('Content');
    expect(buffer2).toBe('');
  });

  it('should handle multiple chunks with split tags', () => {
    let buffer = '';
    
    const chunk1 = 'Start <bal';
    const result1 = removeInternalTagsStreaming(chunk1, buffer);
    buffer = result1.buffer;
    expect(result1.filtered).toBe('Start');
    
    const chunk2 = 'anced_layer>Middle</balanced_';
    const result2 = removeInternalTagsStreaming(chunk2, buffer);
    buffer = result2.buffer;
    expect(result2.filtered).toBe('Middle');
    
    const chunk3 = 'layer> End';
    const result3 = removeInternalTagsStreaming(chunk3, buffer);
    expect(result3.filtered).toBe('End');
    expect(result3.buffer).toBe('');
  });

  it('should flush final buffer', () => {
    const chunk1 = 'Text <incomplete';
    const { filtered: filtered1, buffer: buffer1 } = removeInternalTagsStreaming(chunk1);
    
    // Flush buffer with empty chunk
    const { filtered: filtered2 } = removeInternalTagsStreaming('', buffer1);
    
    expect(filtered1).toBe('Text');
    expect(filtered2).toBe('');
  });
});

describe('detectInternalTags', () => {
  it('should detect all internal tags', () => {
    const text = '<fire_layer>Fire</fire_layer> <water_layer>Water</water_layer>';
    const tags = detectInternalTags(text);
    expect(tags).toContain('fire_layer');
    expect(tags).toContain('water_layer');
  });

  it('should not duplicate tag names', () => {
    const text = '<fire_layer>1</fire_layer> <fire_layer>2</fire_layer>';
    const tags = detectInternalTags(text);
    expect(tags.filter(t => t === 'fire_layer')).toHaveLength(1);
  });

  it('should return empty array for text without tags', () => {
    const text = 'Plain text without tags';
    const tags = detectInternalTags(text);
    expect(tags).toHaveLength(0);
  });

  it('should detect both opening and closing tags', () => {
    const text = '<fire_layer>Content</fire_layer>';
    const tags = detectInternalTags(text);
    expect(tags).toContain('fire_layer');
  });
});
