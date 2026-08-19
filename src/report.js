function items(value) {
  return Array.isArray(value) ? value : [];
}

function itemName(item) {
  return typeof item === 'string' ? item : item?.name;
}

export function normalizeKnipReport(raw, engineVersion = 'unknown') {
  if (!raw || !Array.isArray(raw.issues)) {
    throw new Error('Knip output must contain an issues array');
  }

  const findings = [];
  for (const issue of raw.issues) {
    const manifest = issue.file;
    for (const item of items(issue.dependencies)) {
      const name = itemName(item);
      if (name) findings.push({ kind: 'unused-dependency', name, manifest });
    }
    for (const item of items(issue.files)) {
      const name = itemName(item);
      if (name) findings.push({ kind: 'unused-file', name, manifest });
    }
    for (const item of items(issue.exports)) {
      const name = itemName(item);
      if (!name) continue;
      const finding = { kind: 'unused-export', name, manifest };
      if (Number.isInteger(item.line)) finding.line = item.line;
      findings.push(finding);
    }
  }

  return {
    schema: 1,
    status: findings.length > 0 ? 'findings' : 'clean',
    engine: { name: 'knip', version: engineVersion },
    findings
  };
}

export function selectDependencyFindings(report, options = {}) {
  const allowPackages = new Set(options.allowPackages ?? []);
  const maxDependencyRemovals = options.maxDependencyRemovals ?? 10;
  const findings = report.findings.filter(
    (finding) => finding.kind === 'unused-dependency' && !allowPackages.has(finding.name)
  );

  if (findings.length > maxDependencyRemovals) {
    return {
      blocked: true,
      reason: 'max-dependency-removals-exceeded',
      total: findings.length,
      findings: []
    };
  }

  return { blocked: false, findings };
}

export function formatReport(report, format = 'markdown') {
  if (format === 'json') return `${JSON.stringify(report, null, 2)}\n`;
  if (format !== 'markdown') throw new Error(`unsupported format: ${format}`);

  const lines = [
    '# KnipCI report',
    '',
    `Status: **${report.status}**`,
    `Engine: Knip ${report.engine.version}`,
    ''
  ];

  if (report.findings.length === 0) {
    lines.push('No findings.');
    return `${lines.join('\n')}\n`;
  }

  lines.push('## Findings', '');
  for (const finding of report.findings) {
    const location = finding.line ? `:${finding.line}` : '';
    lines.push(`- **${finding.kind}**: \`${finding.name}\` in \`${finding.manifest}${location}\``);
  }
  return `${lines.join('\n')}\n`;
}
