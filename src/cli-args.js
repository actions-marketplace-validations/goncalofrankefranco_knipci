function takeValue(argv, index, option) {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${option} requires a value`);
  return value;
}

export function parseArgs(argv) {
  const command = argv[0];
  if (!['scan', 'fix'].includes(command)) {
    throw new Error('usage: knipci <scan|fix> [options]');
  }

  const result = { command, configPath: '.knipci.json' };
  if (command === 'scan') result.format = 'markdown';

  for (let index = 1; index < argv.length; index += 1) {
    const option = argv[index];
    if (option === '--format') {
      const format = takeValue(argv, index, option);
      if (!['json', 'markdown'].includes(format)) throw new Error(`unsupported format: ${format}`);
      result.format = format;
      index += 1;
    } else if (option === '--config') {
      result.configPath = takeValue(argv, index, option);
      index += 1;
    } else if (option === '--apply') {
      result.apply = true;
    } else if (option === '--dry-run') {
      result.dryRun = true;
    } else if (option === '--create-pr') {
      result.createPr = true;
    } else if (option === '--build') {
      result.build = takeValue(argv, index, option);
      index += 1;
    } else if (option === '--test') {
      result.test = takeValue(argv, index, option);
      index += 1;
    } else if (option === '--max-dependency-removals') {
      const value = Number(takeValue(argv, index, option));
      if (!Number.isInteger(value) || value < 1) throw new Error(`${option} must be a positive integer`);
      result.maxDependencyRemovals = value;
      index += 1;
    } else {
      throw new Error(`unknown option: ${option}`);
    }
  }

  if (result.dryRun && result.apply) throw new Error('--dry-run and --apply cannot be combined');
  if (result.createPr && !result.apply) throw new Error('--create-pr requires --apply');
  return result;
}
