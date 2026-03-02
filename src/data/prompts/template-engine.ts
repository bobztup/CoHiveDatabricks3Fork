/**
 * CoHive Prompt System - Simple Template Engine
 * Lightweight templating without external dependencies
 */

/**
 * Replace {{variable}} placeholders with values
 */
export function template(str: string, vars: Record<string, any>): string {
  return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = vars[key];
    if (value === undefined || value === null) return '';
    return String(value);
  });
}

/**
 * Handle conditional sections in templates
 * Supports: {{#if condition}}...{{/if}} and {{#unless condition}}...{{/unless}}
 */
export function conditionalTemplate(
  str: string,
  vars: Record<string, any>
): string {
  let result = str;

  // Handle {{#if condition}}...{{/if}}
  result = result.replace(
    /\{\{#if (\w+)\}\}(.*?)\{\{\/if\}\}/gs,
    (match, key, content) => {
      const value = vars[key];
      return value ? content : '';
    }
  );

  // Handle {{#unless condition}}...{{/unless}}
  result = result.replace(
    /\{\{#unless (\w+)\}\}(.*?)\{\{\/unless\}\}/gs,
    (match, key, content) => {
      const value = vars[key];
      return !value ? content : '';
    }
  );

  // Handle {{#each array}}...{{/each}}
  result = result.replace(
    /\{\{#each (\w+)\}\}(.*?)\{\{\/each\}\}/gs,
    (match, key, content) => {
      const array = vars[key];
      if (!Array.isArray(array)) return '';
      return array.map(item => 
        typeof item === 'object' 
          ? template(content, item) 
          : content.replace(/\{\{this\}\}/g, String(item))
      ).join('');
    }
  );

  // Replace remaining variables
  return template(result, vars);
}

/**
 * Format arrays into bullet points
 */
export function formatList(items: string[], prefix: string = '- '): string {
  if (!items || items.length === 0) return '';
  return items.map(item => `${prefix}${item}`).join('\n');
}

/**
 * Format key-value pairs
 */
export function formatKeyValue(obj: Record<string, any>, separator: string = ': '): string {
  return Object.entries(obj)
    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}${separator}${value}`)
    .join('\n');
}

/**
 * Escape special characters for Python string literals
 */
export function escapePythonString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

/**
 * Format as Python code block
 */
export function pythonCodeBlock(code: string): string {
  return `\`\`\`python\n${code}\n\`\`\``;
}
