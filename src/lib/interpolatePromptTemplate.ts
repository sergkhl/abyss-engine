const templatePattern = /\{\{([^{}]+)\}\}|\{([^{}]+)\}/g;

export function interpolatePromptTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(templatePattern, (_match, doubleKey?: string, singleKey?: string) => {
    const key = (doubleKey || singleKey || '').trim();
    return variables[key] ?? '';
  });
}
